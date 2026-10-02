import { randomUUID, scrypt as scryptCb, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
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
}

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
    this.users.delete(id);
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
    )`);
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
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
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

export const validPassword = (value: unknown): value is string => typeof value === 'string' && value.length >= 8 && value.length <= 200;
