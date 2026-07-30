import { getBaseEmailTemplate } from '../base.template';

export interface SysadminEmailTemplateOptions {
  registrationKey: string;
  setupLink: string;
  organizationName: string;
  appName?: string;
  companyName?: string;
  teamName?: string;
}

export const getSysadminEmailTemplate = ({
  registrationKey,
  setupLink,
  organizationName,
  appName = 'One City LGU Platform',
  companyName = 'Infinite Motion Xpress Inc.',
  teamName = 'The One City Team',
}: SysadminEmailTemplateOptions) => {
  const content = `
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi there,</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">A new System Administrator account has been provisioned for you on the <strong>${appName}</strong>.</p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">You have been assigned to manage: <br/><strong style="color: #0f172a;">${organizationName}</strong></p>
    
    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${setupLink}" style="display: inline-block; background-color: #00466a; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 70, 106, 0.2);">
        Complete Account Setup
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 24px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px;">
      If the button above doesn't work, you can manually set up your account by going to our platform and using this registration key: <br/>
      <strong style="color: #0f172a; font-family: monospace; letter-spacing: 1px;">${registrationKey}</strong>
    </p>
    
    <p style="font-size: 14px; color: #b91c1c; font-weight: 500; line-height: 1.5; margin: 0 0 32px 0; padding: 12px 16px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
      <strong style="color: #991b1b;">Security Warning:</strong> Do not share your link or key with anyone. Our team will never ask for them.
    </p>

    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
      Best regards,<br />
      <span style="font-weight: 600; color: #0f172a;">${teamName}</span>
    </p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
