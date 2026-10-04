import { createApp } from './app.js';
import { MODEL } from './coach.js';
import { MemoryUserStore, PostgresUserStore } from './accounts.js';
import { pruneQuotas } from './quota.js';
import { createMailer } from './mailer.js';

const coachEnabled = !!process.env.ANTHROPIC_API_KEY;
if (!coachEnabled) console.warn('ANTHROPIC_API_KEY is not set (Replit → Secrets). Coach endpoints will return 503.');

const sessionSecret = process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16 ? process.env.SESSION_SECRET : null;
if (!sessionSecret) console.warn('SESSION_SECRET is not set (or shorter than 16 characters). Sign-up/sign-in will be unavailable.');

const users = process.env.DATABASE_URL ? new PostgresUserStore(process.env.DATABASE_URL) : new MemoryUserStore();
if (!process.env.DATABASE_URL) console.warn('DATABASE_URL is not set: accounts are kept in memory and lost on restart. Add a database in Replit → Database.');

if (!process.env.REVENUECAT_SECRET_KEY) console.warn('REVENUECAT_SECRET_KEY is not set: everyone gets the free coach limit.');

const sendMail = createMailer();
if (!sendMail) console.warn('SMTP_USER / SMTP_PASS are not set: password reset emails are unavailable.');

const app = createApp({ users, sessionSecret, coachEnabled, webDist: process.env.WEB_DIST, sendMail, database: !!process.env.DATABASE_URL });

setInterval(() => pruneQuotas(), 60 * 60 * 1000).unref();

const port = Number(process.env.PORT ?? 3000);
// Express 5 passes listen errors (e.g. port already in use) to this callback.
app.listen(port, '0.0.0.0', (error?: Error) => {
  if (error) {
    console.error(`Could not start on port ${port}: ${error.message}`);
    console.error('Another program is using this port. Press Stop in Replit (or run: pkill -f expo) and try again.');
    process.exit(1);
  }
  console.log(`Wellbeing server listening on :${port} using ${MODEL}`);
});
