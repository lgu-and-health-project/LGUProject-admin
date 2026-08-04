const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- Mock Data ---
let staff = [
  { id: '1', name: 'Alice Smith', role: 'STAFF', status: 'active', email: 'alice@example.com', department: 'IT' },
  { id: '2', name: 'Bob Jones', role: 'HR', status: 'active', email: 'bob@example.com', department: 'HR' },
  { id: '3', name: 'Charlie Brown', role: 'SUPERVISOR', status: 'active', email: 'charlie@example.com', department: 'Finance' },
  { id: '4', name: 'Diana Prince', role: 'MAYOR', status: 'active', email: 'diana@example.com', department: 'Management' }
];

let roles = [
  { id: 'r1', name: 'MAYOR' },
  { id: 'r2', name: 'SUPERVISOR' },
  { id: 'r3', name: 'HR' },
  { id: 'r4', name: 'STAFF' }
];

let attendance = [
  { id: 'a1', staffId: '1', date: '2023-10-01', status: 'present', latitude: 10, longitude: 20 },
  { id: 'a2', staffId: '2', date: '2023-10-01', status: 'absent', latitude: 0, longitude: 0 },
  { id: 'a3', staffId: '1', date: '2023-10-02', status: 'present', latitude: 10.1, longitude: 20.1 }
];

let leaveRequests = [
  { id: 'l1', staffId: '1', type: 'Sick Leave', status: 'pending', date: '2023-10-15', reason: 'Fever' },
  { id: 'l2', staffId: '2', type: 'Vacation', status: 'approved', date: '2023-11-01', reason: 'Family trip' }
];

let messages = [
  { id: 'm1', from: 'System', to: '1', subject: 'Welcome', body: 'Welcome to the portal!', date: new Date().toISOString() },
  { id: 'm2', from: 'HR', to: '1', subject: 'Policy Update', body: 'Please review the new leave policy.', date: new Date().toISOString() },
  { id: 'm3', from: '1', to: 'HR', subject: 'Question', body: 'When is the next holiday?', date: new Date().toISOString() }
];

let payslips = [
  { id: 'p1', staffId: '1', month: 'October 2023', amount: 5000, deductions: 500, net: 4500, status: 'paid' },
  { id: 'p2', staffId: '1', month: 'September 2023', amount: 5000, deductions: 500, net: 4500, status: 'paid' },
  { id: 'p3', staffId: '2', month: 'October 2023', amount: 4000, deductions: 400, net: 3600, status: 'pending' }
];

// Helper to format tRPC response since some endpoints might expect it
const trpcRes = (data) => ({ result: { data } });

// --- Auth (tRPC mock & standard mock) ---
app.post('/trpc/auth.pair', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.onboard', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.login', (req, res) => res.json(trpcRes({ token: 'mock-jwt-token' })));
app.get('/trpc/auth.me', (req, res) => res.json(trpcRes(staff[0])));

// --- Directives ---
let directives = [
  { id: 'd1', title: 'Submit Weekly Report', description: 'Please submit your weekly tasks', issued_by: 'Supervisor', priority: 'NORMAL', requires_ack: true, requires_proof: false },
  { id: 'd2', title: 'Emergency Meeting', description: 'Gather at the town hall', issued_by: 'Mayor', priority: 'URGENT', requires_ack: true, requires_proof: true }
];
app.get('/directives/assigned', (req, res) => res.json(directives));
app.post('/directives/:id/acknowledge', (req, res) => res.json({ success: true }));
app.post('/directives/:id/proof', (req, res) => res.json({ success: true }));

// --- HRIS (Attendance, Leaves, Payroll) ---
// For the React/Vite dashboard
app.post('/hris/attendance', (req, res) => {
  const record = { id: Date.now().toString(), staffId: '1', date: new Date().toISOString(), ...req.body };
  attendance.push(record);
  res.json(record);
});
app.get('/hris/attendance/me', (req, res) => res.json(attendance.filter(a => a.staffId === '1')));
app.get('/hris/attendance', (req, res) => res.json(attendance));

// For the Expo App
app.post('/attendance', (req, res) => {
  const record = { id: Date.now().toString(), staffId: '1', date: new Date().toISOString(), ...req.body };
  attendance.push(record);
  res.json(record);
});
app.post('/leave-requests', (req, res) => {
  const reqData = { id: Date.now().toString(), staffId: '1', status: 'pending', ...req.body };
  leaveRequests.push(reqData);
  res.json(reqData);
});

app.post('/hris/leave-requests', (req, res) => {
  const reqData = { id: Date.now().toString(), staffId: '1', status: 'pending', ...req.body };
  leaveRequests.push(reqData);
  res.json(reqData);
});
app.get('/hris/leave-requests/me', (req, res) => res.json(leaveRequests.filter(l => l.staffId === '1')));
app.get('/hris/leave-requests', (req, res) => res.json(leaveRequests));

app.get('/hris/payroll/me', (req, res) => res.json(payslips.filter(p => p.staffId === '1')));
app.get('/hris/payroll', (req, res) => res.json(payslips));

// --- MISO (Staff/Roles) ---
app.get('/miso/staff', (req, res) => res.json(staff));
app.post('/miso/staff/:id/verify', (req, res) => {
  const s = staff.find(x => x.id === req.params.id);
  if (s) s.status = 'active';
  res.json({ success: true, staff: s });
});
app.post('/miso/staff/:id/suspend', (req, res) => {
  const s = staff.find(x => x.id === req.params.id);
  if (s) s.status = 'suspended';
  res.json({ success: true, staff: s });
});
app.get('/miso/roles', (req, res) => res.json(roles));
app.put('/miso/staff/:id/role', (req, res) => {
  const s = staff.find(x => x.id === req.params.id);
  if (s) s.roleId = req.body.roleId;
  res.json({ success: true, staff: s });
});

// Full Staff CRUD
app.post('/miso/staff', (req, res) => {
  const s = { id: Date.now().toString(), status: 'pending', ...req.body };
  staff.push(s);
  res.json(s);
});
app.put('/miso/staff/:id', (req, res) => {
  const index = staff.findIndex(s => s.id === req.params.id);
  if (index >= 0) {
    staff[index] = { ...staff[index], ...req.body };
    res.json(staff[index]);
  } else res.status(404).json({ error: 'Not found' });
});
app.delete('/miso/staff/:id', (req, res) => {
  staff = staff.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

// --- Messages (Basic CRUD) ---
app.get('/messages', (req, res) => res.json(messages));
app.get('/messages/:id', (req, res) => res.json(messages.find(m => m.id === req.params.id)));
app.post('/messages', (req, res) => {
  const msg = { id: Date.now().toString(), date: new Date().toISOString(), ...req.body };
  messages.push(msg);
  res.json(msg);
});
app.put('/messages/:id', (req, res) => {
  const index = messages.findIndex(m => m.id === req.params.id);
  if (index >= 0) {
    messages[index] = { ...messages[index], ...req.body };
    res.json(messages[index]);
  } else res.status(404).json({ error: 'Not found' });
});
app.delete('/messages/:id', (req, res) => {
  messages = messages.filter(m => m.id !== req.params.id);
  res.json({ success: true });
});

// --- Payslips (Basic CRUD) ---
app.get('/payslips', (req, res) => res.json(payslips));
app.get('/payslips/:id', (req, res) => res.json(payslips.find(p => p.id === req.params.id)));
app.post('/payslips', (req, res) => {
  const slip = { id: Date.now().toString(), ...req.body };
  payslips.push(slip);
  res.json(slip);
});
app.put('/payslips/:id', (req, res) => {
  const index = payslips.findIndex(p => p.id === req.params.id);
  if (index >= 0) {
    payslips[index] = { ...payslips[index], ...req.body };
    res.json(payslips[index]);
  } else res.status(404).json({ error: 'Not found' });
});
app.delete('/payslips/:id', (req, res) => {
  payslips = payslips.filter(p => p.id !== req.params.id);
  res.json({ success: true });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Mock backend running on port ${PORT}`);
});
