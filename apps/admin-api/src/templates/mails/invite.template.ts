import { getBaseEmailTemplate } from '../base.template';

export interface InviteEmailTemplateOptions {
  inviteLink: string;
  appName?: string;
  companyName?: string;
  teamName?: string;
  validityDays: number;
}

export const getInviteEmailTemplate = ({
  inviteLink,
  appName = 'One City LGU Platform',
  companyName = 'Infinite Motion Xpress Inc.',
  teamName = 'The One City Team',
  validityDays,
}: InviteEmailTemplateOptions) => {
  const content = `
    <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi there,</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">You have been invited to join the <strong>${appName}</strong> as an Administrator.</p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">Please click the button below to accept your invitation and set up your account. This link will expire in <strong>${validityDays} days</strong>.</p>

    <div style="text-align: center; margin: 0 0 32px 0;">
      <a href="${inviteLink}" style="display: inline-block; background-color: #00466a; color: #ffffff; font-weight: 600; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0, 70, 106, 0.2);">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0 0 32px 0; padding: 16px; background-color: #f8fafc; border-radius: 6px;">
      If the button above doesn't work, copy and paste this link into your browser: <br/>
      <a href="${inviteLink}" style="color: #00466a; word-break: break-all;">${inviteLink}</a>
    </p>

    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0;">
      Best regards,<br />
      <span style="font-weight: 600; color: #0f172a;">${teamName}</span>
    </p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};

