import { randomUUID, scrypt as scryptCb, randomBytes, randomInt, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export type User = { id: string; email: string; name: string | null; createdAt: string };
type StoredUser = User & { passwordHash: string };

export interface UserStore {
  create(email: string, name: string | null, passwordHash: string): Promise<User | null>; // null = email taken
  findByEmail(email: string): Promise<StoredUser | null>;
  findById(id: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  setPassword(id: string, passwordHash: string): Promise<void>;
  // Password reset codes are stored hashed, keyed by email, so they survive restarts and work across server instances.
  saveReset(email: string, codeHash: string, expiresAt: number): Promise<void>;
  getReset(email: string): Promise<ResetCode | null>;
  /** Records a wrong guess and returns the new attempt count. */
  bumpReset(email: string): Promise<number>;
  clearReset(email: string): Promise<void>;
}

export type ResetCode = { codeHash: string; expiresAt: number; attempts: number };

/** Used for tests and local previews only: accounts vanish on restart. */
export class MemoryUserStore implements UserStore {
  private users = new Map<string, StoredUser>();
  async create(email: string, name: string | null, passwordHash: string) {
    if ([...this.users.values()].some((u) => u.email === email)) return null;
    const user = { id: randomUUID(), email, name, passwordHash, createdAt: new Date().toISOString() };
    this.users.set(user.id, user);
    return publicUser(user);
  }
  async findByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }
  async findById(id: string) {
    const user = this.users.get(id);
    return user ? publicUser(user) : null;
  }
  async delete(id: string) {
    const user = this.users.get(id);
    if (user) this.resets.delete(user.email);
    this.users.delete(id);
  }
  async setPassword(id: string, passwordHash: string) {
    const user = this.users.get(id);
    if (user) user.passwordHash = passwordHash;
  }
  private resets = new Map<string, ResetCode>();
  async saveReset(email: string, codeHash: string, expiresAt: number) {
    this.resets.set(email, { codeHash, expiresAt, attempts: 0 });
  }
  async getReset(email: string) {
    return this.resets.get(email) ?? null;
  }
  async bumpReset(email: string) {
    const reset = this.resets.get(email);
    if (!reset) return 0;
    reset.attempts += 1;
    return reset.attempts;
  }
  async clearReset(email: string) {
    this.resets.delete(email);
  }
}

export class PostgresUserStore implements UserStore {
  private pool: pg.Pool;
  private ready: Promise<unknown>;
  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 5 });
    this.ready = this.pool.query(`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`).then(() => this.pool.query(`CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    )`));
  }
  private row(r: any): StoredUser {
    return { id: r.id, email: r.email, name: r.name, passwordHash: r.password_hash, createdAt: new Date(r.created_at).toISOString() };
  }
  async create(email: string, name: string | null, passwordHash: string) {
    await this.ready;
    const result = await this.pool.query(
      'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING *',
      [randomUUID(), email, name, passwordHash],
    );
    return result.rows[0] ? publicUser(this.row(result.rows[0])) : null;
  }
  async findByEmail(email: string) {
    await this.ready;
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? this.row(result.rows[0]) : null;
  }
  async findById(id: string) {
    await this.ready;
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? publicUser(this.row(result.rows[0])) : null;
  }
  async delete(id: string) {
    await this.ready;
    await this.pool.query('DELETE FROM password_resets WHERE email = (SELECT email FROM users WHERE id = $1)', [id]);
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
  async setPassword(id: string, passwordHash: string) {
    await this.ready;
    await this.pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [id, passwordHash]);
  }
  async saveReset(email: string, codeHash: string, expiresAt: number) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO password_resets (email, code_hash, expires_at, attempts) VALUES ($1, $2, to_timestamp($3 / 1000.0), 0)
       ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
      [email, codeHash, expiresAt],
    );
  }
  async getReset(email: string) {
    await this.ready;
    const result = await this.pool.query('SELECT code_hash, expires_at, attempts FROM password_resets WHERE email = $1', [email]);
    const r = result.rows[0];
    return r ? { codeHash: r.code_hash, expiresAt: new Date(r.expires_at).getTime(), attempts: r.attempts } : null;
  }
  async bumpReset(email: string) {
    await this.ready;
    const result = await this.pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE email = $1 RETURNING attempts', [email]);
    return result.rows[0]?.attempts ?? 0;
  }
  async clearReset(email: string) {
    await this.ready;
    await this.pool.query('DELETE FROM password_resets WHERE email = $1', [email]);
  }
}

const publicUser = ({ id, email, name, createdAt }: StoredUser): User => ({ id, email, name, createdAt });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString('base64')}:${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

// Stateless session tokens: base64url(userId.expiry).signature, signed with SESSION_SECRET.
const TOKEN_DAYS = 90;
const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export function issueToken(userId: string, secret: string, now = Date.now()): string {
  const payload = b64(`${userId}.${now + TOKEN_DAYS * 86400000}`);
  return `${payload}.${sign(payload, secret)}`;
}

export function readToken(token: string | undefined, secret: string, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const [userId, expiry] = Buffer.from(payload, 'base64url').toString().split('.');
  return userId && Number(expiry) > now ? userId : null;
}

export const normaliseEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

// ---------- Password reset codes ----------
export const RESET_CODE_MINUTES = 15;
export const RESET_MAX_ATTEMPTS = 5;
export const newResetCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
/** Codes are stored as an HMAC (keyed with SESSION_SECRET), never in plain text. */
export const hashResetCode = (email: string, code: string, secret: string) => createHmac('sha256', secret).update(`reset:${email}:${code}`).digest('hex');
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 8 && value.length <= 200;
