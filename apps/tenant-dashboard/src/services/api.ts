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

export const hrisApi = {
  clockIn: (lat: number, lng: number) => apiClient.post('/hris/attendance', { latitude: lat, longitude: lng }),
  getMyAttendance: () => apiClient.get('/hris/attendance/me'),
  getAllAttendance: () => apiClient.get('/hris/attendance'),
  getMyLeaveRequests: () => apiClient.get('/hris/leave-requests/me'),
  createLeaveRequest: (data: any) => apiClient.post('/hris/leave-requests', data),
  getMyPayroll: () => apiClient.get('/hris/payroll/me'),
};

export const misoApi = {
  getStaff: () => apiClient.get('/miso/staff'),
  verifyStaff: (id: string) => apiClient.post(`/miso/staff/${id}/verify`),
  suspendStaff: (id: string) => apiClient.post(`/miso/staff/${id}/suspend`),
  getRoles: () => apiClient.get('/miso/roles'),
  updateStaffRole: (id: string, roleId: string) => apiClient.put(`/miso/staff/${id}/role`, { roleId }),
};
