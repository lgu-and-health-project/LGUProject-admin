export interface BaseEmailTemplateOptions {
  appName?: string;
  companyName?: string;
  location?: string;
  content: string;
}

export const getBaseEmailTemplate = ({
  content,
  appName = 'One City LGU Platform',
  companyName = 'Infinite Motion Xpress Inc.',
  location = 'Philippines',
}: BaseEmailTemplateOptions) => {
  return `
    <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">${appName}</a>
        </div>

        ${content}

        <hr style="border:none;border-top:1px solid #eee;margin-top:20px;" />
        <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
          <p>&copy; ${new Date().getFullYear()} ${companyName}</p>
          <p>${location}</p>
        </div>
      </div>
    </div>
  `;
};
