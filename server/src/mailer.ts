import nodemailer from 'nodemailer';

export type Mailer = (to: string, subject: string, text: string) => Promise<void>;

/**
 * Sends email over SMTP. Defaults suit Gmail with an App Password:
 *   SMTP_USER = the Gmail address, SMTP_PASS = the 16-character App Password.
 * To move to another provider later (e.g. Resend), set SMTP_HOST / SMTP_PORT / MAIL_FROM too; no code change needed.
 */
export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer | null {
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.replace(/\s+/g, ''); // Google shows App Passwords with spaces
  if (!user || !pass) return null;
  const port = Number(env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  const from = env.MAIL_FROM?.trim() || `Wellbeing <${user}>`;
  return async (to, subject, text) => {
    await transport.sendMail({ from, to, subject, text });
  };
}

export function resetEmail(code: string, minutes: number): { subject: string; text: string } {
  return {
    subject: `Your Wellbeing reset code: ${code}`,
    text: [
      'Hello,',
      '',
      `Your code to reset your Wellbeing password is: ${code}`,
      '',
      `Enter it in the app within ${minutes} minutes. If you did not ask to reset your password, you can ignore this email; your password will not change.`,
      '',
      'Wellbeing support: wellbeingsupport247@gmail.com',
    ].join('\n'),
  };
}
