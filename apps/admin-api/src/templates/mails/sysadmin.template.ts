import { getBaseEmailTemplate } from '../base.template';

export interface SysadminEmailTemplateOptions {
  pairingToken: string;
  organizationName: string;
  appName?: string;
  companyName?: string;
  teamName?: string;
}

export const getSysadminEmailTemplate = ({
  pairingToken,
  organizationName,
  appName = 'One City LGU Platform',
  companyName = 'Infinite Motion Xpress Inc.',
  teamName = 'The One City Team',
}: SysadminEmailTemplateOptions) => {
  const content = `
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi there,</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Your Local Government Unit has been officially registered on the <strong>${appName}</strong>.</p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">You have been assigned as the System Administrator for: <br/><strong style="color: #0f172a;">${organizationName}</strong></p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #00466a; padding: 16px; margin: 0 0 32px 0;">
      <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px;">Next Steps for Deployment:</h3>
      <ol style="margin: 0; padding-left: 20px; color: #475569; line-height: 1.6;">
        <li>Plug in and turn on the Node Server hardware packaged for your LGU.</li>
        <li>Connect it to your municipal hall's local network (via Ethernet or Wi-Fi).</li>
        <li>Open a web browser on any computer in the same network and navigate to the server's local IP address or launch the packaged Desktop Application.</li>
        <li>When prompted for your <strong>Pairing Token</strong>, enter the code below to initialize your local database and sync with our central platform.</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 0 0 32px 0; padding: 24px; background-color: #f1f5f9; border-radius: 8px;">
      <span style="display: block; font-size: 14px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Your Pairing Token</span>
      <strong style="color: #0f172a; font-size: 24px; font-family: monospace; letter-spacing: 2px;">${pairingToken}</strong>
    </div>
    
    <p style="font-size: 14px; color: #b91c1c; font-weight: 500; line-height: 1.5; margin: 0 0 32px 0; padding: 12px 16px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
      <strong style="color: #991b1b;">Time Sensitive:</strong> This pairing token expires in 15 minutes. It is a single-use token meant only for the initial hardware setup.
    </p>

    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
      Best regards,<br />
      <span style="font-weight: 600; color: #0f172a;">${teamName}</span>
    </p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
