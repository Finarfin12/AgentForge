import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const host = process.env.SMTP_HOST;
    if (!host) {
      this.logger.warn('SMTP not configured — emails will not be sent. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
      return;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
    this.logger.log(`Mailer configured for ${host}`);
  }

  async send(options: { to: string; subject: string; text?: string; html?: string }) {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (SMTP not configured): to=${options.to} subject=${options.subject}`);
      return;
    }
    const from = process.env.SMTP_FROM || 'noreply@agentforge.local';
    await this.transporter.sendMail({ from, ...options });
    this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
  }
}
