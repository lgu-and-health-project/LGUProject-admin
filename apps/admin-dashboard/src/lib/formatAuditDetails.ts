export function formatAuditDetails(action: string, metadata: any): string {
  const meta = metadata || {};

  switch (action) {
    case 'register_tenant':
      return `Registered ${meta.tenant_name || 'Organization'} with PSGC code ${meta.psgc_code || 'N/A'} and system administrator email ${meta.sysadmin_email || 'N/A'}`;

    case 'suspend_tenant':
      return `Suspended tenant ${meta.tenant_name || 'Organization'} (PSGC: ${meta.psgc_code || 'N/A'})`;

    case 'activate_tenant':
      return `Activated tenant ${meta.tenant_name || 'Organization'} (PSGC: ${meta.psgc_code || 'N/A'})`;

    case 'delete_tenant':
      return `Deleted tenant ${meta.tenant_name || 'Organization'} (PSGC: ${meta.psgc_code || 'N/A'})`;

    case 'invite_admin':
      if (meta.note === 'Resent invitation') {
        return `Resent invitation to admin ${meta.email || 'N/A'} as ${meta.role || 'Co-Admin'}`;
      }
      return `Invited admin ${meta.email || 'N/A'} as ${meta.role || 'Co-Admin'}`;

    case 'accept_invite':
      return `Accepted admin invitation for ${meta.email || 'N/A'}`;

    case 'delete_admin':
      return `Deleted admin ${meta.email || 'N/A'}`;

    case 'revoke_admin':
      return `Revoked admin ${meta.email || 'N/A'}`;

    case 'login':
      return `Successful login`;

    case 'login_failed':
      return `Failed login attempt (Reason: ${meta.reason || 'Unknown'})`;

    case 'reissue_license':
      return `Reissued license for tenant ${meta.tenant_id || 'N/A'}`;

    case 'revoke_license':
      return `Revoked license for tenant ${meta.tenant_id || 'N/A'} (Reason: ${meta.reason || 'N/A'})`;

    case 'sync_psgc':
      return `Synchronized PSGC geographic data`;

    default:
      if (metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0) {
        return Object.entries(metadata)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join(' | ');
      }
      if (metadata) {
        return String(metadata);
      }
      return 'No additional details provided.';
  }
}
