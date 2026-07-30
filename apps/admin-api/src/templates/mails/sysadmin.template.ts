import { getBaseEmailTemplate } from '../base.template';

export interface SysadminEmailTemplateOptions {
  registrationKey: string;
  appName?: string;
  companyName?: string;
  teamName?: string;
}

export const getSysadminEmailTemplate = ({
  registrationKey,
  appName = 'One City LGU Platform',
  companyName = 'Infinite Motion Xpress Inc.',
  teamName = 'The One City Team',
}: SysadminEmailTemplateOptions) => {
  const content = `
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi there,</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">A new System Administrator account has been provisioned for you on the <strong>${appName}</strong>.</p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Please use the following Registration Key to securely complete your initial setup.</p>
    
    <div style="background-color: #f1f5f9; border-left: 4px solid #00466a; border-radius: 4px; padding: 20px; margin: 0 0 24px 0;">
      <p style="margin: 0; font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #0f172a; word-break: break-all;">
        ${registrationKey}
      </p>
    </div>
    
    <p style="font-size: 14px; color: #b91c1c; font-weight: 500; line-height: 1.5; margin: 0 0 32px 0; padding: 12px 16px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
      <strong style="color: #991b1b;">Security Warning:</strong> Do not share this key with anyone. Our team will never ask for your registration key.
    </p>

    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
      Best regards,<br />
      <span style="font-weight: 600; color: #0f172a;">${teamName}</span>
    </p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
