import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

export async function sendPlatformEmail(
  configService: ConfigService,
  options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }
) {
  const fromEmail = configService.get<string>('MAIL_FROM_ADDRESS');
  const fromName = configService.get<string>('MAIL_FROM_NAME');
  const clientId = configService.get<string>('GMAIL_CLIENT_ID');
  
  // If we have a Google Client ID, we use the HTTP API to bypass strict outbound SMTP firewalls
  if (clientId) {
    const clientSecret = configService.get<string>('GMAIL_CLIENT_SECRET');
    const refreshToken = configService.get<string>('GMAIL_REFRESH_TOKEN');
    
    const oAuth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );

    oAuth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Use nodemailer locally to seamlessly compile the MIME message
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    // Convert raw MIME buffer to base64url format required by Gmail HTTP API
    const encodedMessage = (info.message as Buffer).toString('base64url');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    return;
  }

  // Fallback to standard SMTP if no OAuth credentials are provided (good for local dev)
  const transporter = nodemailer.createTransport({
    host: configService.get<string>('SMTP_HOST'),
    port: configService.get<number>('SMTP_PORT'),
    secure: Number(configService.get<number>('SMTP_PORT')) === 465,
    family: 4, // Force IPv4 to prevent Render IPv6 network unreachable errors
    auth: {
      user: configService.get<string>('SMTP_USER'),
      pass: configService.get<string>('SMTP_PASS'),
    },
  } as any);

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
