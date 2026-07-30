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
    <p style="font-size:1.1em">Hi there,</p>
    <p>A new System Administrator account has been provisioned for you on the <strong>${appName}</strong>.</p>
    <p>Please use the following Registration Key to securely complete your initial setup.</p>
    
    <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #00466a; background-color: #f9f9f9;">
      <p style="margin: 0; font-family: monospace; font-size: 1.2em; font-weight: bold; letter-spacing: 2px;">
        ${registrationKey}
      </p>
    </div>
    
    <p style="font-size: 0.9em; color: #666;">
      <strong>Security Warning:</strong> Do not share this key with anyone. Our team will never ask for your registration key.
    </p>

    <p style="font-size:0.9em;">Regards,<br />${teamName}</p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
