import axios from 'axios';

// The tenant API should be running on port 4001 locally, or whatever URL is configured
const API_BASE = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Extracts the actual data from a tRPC HTTP response.
 * tRPC v11 wraps mutation results as { result: { data: { json: <value> } } }
 * but some configurations return { result: { data: <value> } }.
 * This helper handles both.
 */
function extractTrpcData(axiosRes: any) {
  if (axiosRes.data?.error) {
    throw new Error(axiosRes.data.error.message || 'tRPC request failed');
  }

  const inner = axiosRes.data?.result?.data;
  // If tRPC wraps in {json: ...}, unwrap it; otherwise return as-is
  return inner?.json !== undefined ? inner.json : inner;
}

export const authApi = {
  status: () => apiClient.get('/trpc/auth.status').then(res => extractTrpcData(res)),
  pair: (pairingToken: string) =>
    apiClient
      .post('/trpc/auth.pair', { pairingToken })
      .then((res) => ({ ...res, _trpc: extractTrpcData(res) })),
  onboard: (data: any) => apiClient.post('/trpc/auth.onboard', data).then(res => ({ ...res, _trpc: extractTrpcData(res) })),
  login: (data: any) => apiClient.post('/trpc/auth.login', data).then(res => ({ ...res, _trpc: extractTrpcData(res) })),
  me: () => apiClient.get('/trpc/auth.me'),
};

export const misoApi = {
  getStaff: () => apiClient.get('/miso/staff'),
  verifyStaff: (id: string) => apiClient.post(`/miso/staff/${id}/verify`),
  suspendStaff: (id: string) => apiClient.post(`/miso/staff/${id}/suspend`),
  getRoles: () => apiClient.get('/miso/roles'),
  updateStaffRole: (id: string, roleId: string) => apiClient.put(`/miso/staff/${id}/role`, { roleId }),
  
  // Mock endpoints for the new dashboard features
  getAuditLogs: () => Promise.resolve({
    data: [
      { timestamp: new Date().toISOString(), action: 'LOGIN_SUCCESS', actorEmail: 'sysadmin@lgu.gov.ph', details: 'Dashboard login', ipAddress: '192.168.1.5' },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'UPDATE_LICENSE', actorEmail: 'sysadmin@lgu.gov.ph', details: 'Verified central license', ipAddress: '192.168.1.5' },
      { timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'SYSTEM_START', actorEmail: 'SYSTEM', details: 'Docker containers initialized', ipAddress: 'localhost' },
    ]
  }),
  getSyncStatus: () => Promise.resolve({
    data: {
      status: 'connected',
      latency: 24,
      pendingRecords: 142,
      lastSync: new Date(Date.now() - 300000).toISOString()
    }
  }),
};
