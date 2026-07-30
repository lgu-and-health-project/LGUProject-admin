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
    <p style="font-size:1.1em">Hi there,</p>
    <p>You have been invited to join the <strong>${appName}</strong> as an Administrator.</p>
    <p>Please click the button below to accept your invitation and set up your account. This link will expire in ${validityDays} days.</p>

    <div style="margin: 30px 0;">
      <a href="${inviteLink}" style="background: #00466a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
        Accept Invitation
      </a>
    </div>

    <p style="font-size: 0.9em; color: #666;">
      If the button above does not work, copy and paste this link into your browser: <br/>
      <a href="${inviteLink}" style="color: #00466a;">${inviteLink}</a>
    </p>

    <p style="font-size:0.9em;">Regards,<br />${teamName}</p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
