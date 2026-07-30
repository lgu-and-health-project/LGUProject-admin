import { getBaseEmailTemplate } from '../base.template';

export interface OtpEmailTemplateOptions {
  code: string;
  appName?: string;
  companyName?: string;
  validityMinutes?: number;
}

export const getOtpEmailTemplate = ({
  code,
  appName = 'One City LGU Platform',
  companyName = 'The One City Team',
  validityMinutes = 5,
}: OtpEmailTemplateOptions) => {
  const content = `
    <p style="font-size:1.1em">Hi there,</p>
    <p>Thank you for registering. Use the following OTP to complete your Sign Up procedures. OTP is valid for ${validityMinutes} minutes.</p>
    <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">
      ${code}
    </h2>
    <p style="font-size:0.9em;">Regards,<br />${companyName}</p>
  `;

  return getBaseEmailTemplate({ content, appName, companyName });
};
