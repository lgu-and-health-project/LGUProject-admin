export function formatAuditDetails(action: string, metadata: any): string {
  if (!metadata) return 'No additional details provided.';

  switch (action) {
    case 'register_tenant':
      return `Registered ${metadata.tenant_name || 'Organization'} with PSGC code ${metadata.psgc_code || 'N/A'} and system administrator email ${metadata.sysadmin_email || 'N/A'}`;

    case 'suspend_tenant':
      return `Suspended tenant ${metadata.tenant_name || 'Organization'} (PSGC: ${metadata.psgc_code || 'N/A'})`;

    case 'activate_tenant':
      return `Activated tenant ${metadata.tenant_name || 'Organization'} (PSGC: ${metadata.psgc_code || 'N/A'})`;

    case 'delete_tenant':
      return `Deleted tenant ${metadata.tenant_name || 'Organization'} (PSGC: ${metadata.psgc_code || 'N/A'})`;

    case 'invite_admin':
      if (metadata.note === 'Resent invitation') {
        return `Resent invitation to admin ${metadata.email || 'N/A'} as ${metadata.role || 'Co-Admin'}`;
      }
      return `Invited admin ${metadata.email || 'N/A'} as ${metadata.role || 'Co-Admin'}`;

    case 'accept_invite':
      return `Accepted admin invitation for ${metadata.email || 'N/A'}`;

    case 'delete_admin':
      return `Deleted admin ${metadata.email || 'N/A'}`;

    case 'revoke_admin':
      return `Revoked admin ${metadata.email || 'N/A'}`;

    case 'login':
      return `Successful login`;

    case 'login_failed':
      return `Failed login attempt (Reason: ${metadata.reason || 'N/A'})`;

    case 'reissue_license':
      return `Reissued license for tenant ${metadata.tenant_id || 'N/A'}`;

    case 'revoke_license':
      return `Revoked license for tenant ${metadata.tenant_id || 'N/A'} (Reason: ${metadata.reason || 'N/A'})`;

    default:
      if (typeof metadata === 'object') {
        return Object.entries(metadata)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join(' | ');
      }
      return String(metadata);
  }
}
