import { getBaseEmailTemplate } from '../base.template';

export interface OtpEmailTemplateOptions {
  code: string;
  appName?: string;
  companyName?: string;
  teamName?: string;
  validityMinutes?: number;
}

export const getOtpEmailTemplate = ({
  code,
  appName = 'One City LGU Platform',
  companyName = 'Infinite Motion Xpress Inc.',
  teamName = 'The One City Team',
  validityMinutes,
}: OtpEmailTemplateOptions) => {
  const content = `
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi there,</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Thank you for registering. Use the following OTP to complete your sign-up procedure. This code is valid for <strong>${validityMinutes} minutes</strong>.</p>
    
    <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 32px 0;">
      <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #00466a; margin: 0;">
        ${code}
      </div>
    </div>
    
    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
      Best regards,<br />
      <span style="font-weight: 600; color: #0f172a;">${teamName}</span>
    </p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
