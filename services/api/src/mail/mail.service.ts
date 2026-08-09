import { Injectable, Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

import { env } from "../config/env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * SMTP sender.
 *
 * Provider-shaped like the payment and OTP providers: dev points at Mailhog
 * (already in docker-compose on :1025, inbox on :8025) and production points at
 * a real relay through the same env vars. Nothing here knows the difference.
 *
 * Sending NEVER throws into the caller. These are reminders — a dead SMTP host
 * must not fail the job that scheduled them, and must certainly not roll back a
 * booking. Failures are logged and counted instead.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private get transport(): Transporter | null {
    if (!env.SMTP_HOST) return null;
    this.transporter ??= createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // Mailhog speaks plaintext on 1025; a real relay on 587 will upgrade.
      secure: env.SMTP_PORT === 465,
      ...(env.SMTP_USER
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
        : {}),
    });
    return this.transporter;
  }

  async send(mail: Mail): Promise<boolean> {
    const transport = this.transport;
    if (!transport) {
      this.logger.warn(`SMTP_HOST unset — dropping mail "${mail.subject}" to ${mail.to}`);
      return false;
    }
    try {
      await transport.sendMail({ from: env.MAIL_FROM, ...mail });
      return true;
    } catch (error) {
      this.logger.error(`mail "${mail.subject}" to ${mail.to} failed: ${String(error)}`);
      return false;
    }
  }
}
