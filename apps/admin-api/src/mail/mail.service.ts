import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = (nodemailer.createTransport as any)({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Force IPv4. Node 17+ prefers IPv6 by default, which can cause
      // ENETUNREACH errors on platforms like Render when connecting to Google SMTP
      family: 4, 
    });
  }

  async sendAdminInvite(to: string, token: string, fullName: string) {
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite?token=${token}`;
    
    // Only attempt to send if SMTP_USER or RESEND_API_KEY is configured
    if (!process.env.SMTP_USER && !process.env.RESEND_API_KEY) {
      this.logger.warn(`No Email credentials configured. Invitation link for ${to}: ${inviteLink}`);
      return;
    }

    const htmlContent = `
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
    `;

    try {
      // 1. If Brevo API Key exists, use it (Perfect for Render, allows sending to anyone without custom domain)
      if (process.env.BREVO_API_KEY) {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            sender: { 
              name: process.env.SMTP_FROM_NAME || 'LGU Platform Admin', 
              email: process.env.SMTP_FROM || process.env.SMTP_USER || 'admin@example.com' 
            },
            to: [{ email: to }],
            subject: 'You have been invited as an Administrator',
            htmlContent: htmlContent
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Brevo API error: ${response.status} ${errorText}`);
        }
      }
      // 2. If Resend API Key exists, use it (Strict sandbox if no domain)
      else if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.SMTP_FROM || 'Admin Dashboard <onboarding@resend.dev>',
            to: [to],
            subject: 'You have been invited as an Administrator',
            html: htmlContent
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API error: ${response.status} ${errorText}`);
        }
      } 
      // 3. Otherwise fall back to Nodemailer (Perfect for VPS, but BLOCKED on Render Free)
      else {
        await this.transporter.sendMail({
          from: `"Admin Dashboard" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
          to,
          subject: 'You have been invited as an Administrator',
          html: htmlContent,
        });
      }

      this.logger.log(`Sent invitation email to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${to}`, error);
    }
  }
}
