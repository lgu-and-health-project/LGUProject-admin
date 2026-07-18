import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendAdminInvite(to: string, token: string, fullName: string) {
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?token=${token}`;
    
    // Only attempt to send if SMTP_USER is configured, otherwise just log it
    if (!process.env.SMTP_USER) {
      this.logger.warn(`SMTP credentials not configured. Invitation link for ${to}: ${inviteLink}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"Admin Dashboard" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'You have been invited as an Administrator',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Welcome to the Platform, ${fullName}!</h2>
            <p style="color: #555; line-height: 1.5;">
              You have been invited to join the platform as an Administrator.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Accept Invitation & Set Password
              </a>
            </div>
            <p style="color: #777; font-size: 12px; margin-top: 20px;">
              If you cannot click the button, copy and paste this link into your browser:<br/>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
              This link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      this.logger.log(`Sent invitation email to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}`, error);
    }
  }
}
