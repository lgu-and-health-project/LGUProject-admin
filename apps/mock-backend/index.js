const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// --- Mock Data Defaults ---
const defaultData = {
  staff: [
    { id: '1', name: 'Alice Smith', role: 'STAFF', status: 'active', email: 'alice@example.com', department: 'IT' },
    { id: '2', name: 'Bob Jones', role: 'HR', status: 'active', email: 'bob@example.com', department: 'HR' },
    { id: '3', name: 'Charlie Brown', role: 'SUPERVISOR', status: 'active', email: 'charlie@example.com', department: 'Finance' },
    { id: '4', name: 'Diana Prince', role: 'MAYOR', status: 'active', email: 'diana@example.com', department: 'Management' }
  ],
  roles: [
    { id: 'r1', name: 'MAYOR' },
    { id: 'r2', name: 'SUPERVISOR' },
    { id: 'r3', name: 'HR' },
    { id: 'r4', name: 'STAFF' }
  ],
  attendance: [
    { id: 'a1', staffId: '1', date: '2023-10-01', status: 'present', latitude: 10, longitude: 20 },
    { id: 'a2', staffId: '2', date: '2023-10-01', status: 'absent', latitude: 0, longitude: 0 },
    { id: 'a3', staffId: '1', date: '2023-10-02', status: 'present', latitude: 10.1, longitude: 20.1 }
  ],
  leaveRequests: [
    { id: 'l1', staffId: '1', type: 'Sick Leave', status: 'pending', date: '2023-10-15', reason: 'Fever' },
    { id: 'l2', staffId: '2', type: 'Vacation', status: 'approved', date: '2023-11-01', reason: 'Family trip' }
  ],
  messages: [
    { id: 'm1', from: 'System', to: '1', subject: 'Welcome', body: 'Welcome to the portal!', date: new Date().toISOString() },
    { id: 'm2', from: 'HR', to: '1', subject: 'Policy Update', body: 'Please review the new leave policy.', date: new Date().toISOString() },
    { id: 'm3', from: '1', to: 'HR', subject: 'Question', body: 'When is the next holiday?', date: new Date().toISOString() }
  ],
  payslips: [
    { id: 'p1', staffId: '1', month: 'October 2023', amount: 5000, deductions: 500, net: 4500, status: 'paid' },
    { id: 'p2', staffId: '1', month: 'September 2023', amount: 5000, deductions: 500, net: 4500, status: 'paid' },
    { id: 'p3', staffId: '2', month: 'October 2023', amount: 4000, deductions: 400, net: 3600, status: 'pending' }
  ],
  directives: [
    { id: 'd1', title: 'Submit Weekly Report', description: 'Please submit your weekly tasks', issued_by: 'Supervisor', priority: 'NORMAL', requires_ack: true, requires_proof: false },
    { id: 'd2', title: 'Emergency Meeting', description: 'Gather at the town hall', issued_by: 'Mayor', priority: 'URGENT', requires_ack: true, requires_proof: true }
  ]
};

let db = {};

// Load DB
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error("Failed to parse db.json, resetting to defaults", e);
    db = JSON.parse(JSON.stringify(defaultData));
  }
} else {
  db = JSON.parse(JSON.stringify(defaultData));
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Save DB helper
const saveDb = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

// Helper to format tRPC response since some endpoints might expect it
const trpcRes = (data) => ({ result: { data } });

// --- Health Check ---
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Mock Backend is running!' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Auth (tRPC mock & standard mock) ---
app.post('/trpc/auth.pair', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.onboard', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.login', (req, res) => res.json(trpcRes({ token: 'mock-jwt-token' })));
app.get('/trpc/auth.me', (req, res) => res.json(trpcRes(db.staff[0])));

// --- Directives ---
app.get('/directives/assigned', (req, res) => res.json(db.directives));
app.post('/directives/:id/acknowledge', (req, res) => res.json({ success: true }));
app.post('/directives/:id/proof', (req, res) => res.json({ success: true }));

// --- HRIS (Attendance, Leaves, Payroll) ---
// For the React/Vite dashboard
app.post('/hris/attendance', (req, res) => {
  const record = { id: Date.now().toString(), staffId: '1', date: new Date().toISOString(), ...req.body };
  db.attendance.push(record);
  saveDb();
  res.json(record);
});
app.get('/hris/attendance/me', (req, res) => res.json(db.attendance.filter(a => a.staffId === '1')));
app.get('/hris/attendance', (req, res) => res.json(db.attendance));

// For the Expo App
app.post('/attendance', (req, res) => {
  const record = { id: Date.now().toString(), staffId: '1', date: new Date().toISOString(), ...req.body };
  db.attendance.push(record);
  saveDb();
  res.json(record);
});
app.post('/leave-requests', (req, res) => {
  const reqData = { id: Date.now().toString(), staffId: '1', status: 'pending', ...req.body };
  db.leaveRequests.push(reqData);
  saveDb();
  res.json(reqData);
});

app.post('/hris/leave-requests', (req, res) => {
  const reqData = { id: Date.now().toString(), staffId: '1', status: 'pending', ...req.body };
  db.leaveRequests.push(reqData);
  saveDb();
  res.json(reqData);
});
app.get('/hris/leave-requests/me', (req, res) => res.json(db.leaveRequests.filter(l => l.staffId === '1')));
app.get('/hris/leave-requests', (req, res) => res.json(db.leaveRequests));

app.get('/hris/payroll/me', (req, res) => res.json(db.payslips.filter(p => p.staffId === '1')));
app.get('/hris/payroll', (req, res) => res.json(db.payslips));

// --- MISO (Staff/Roles) ---
app.get('/miso/staff', (req, res) => res.json(db.staff));
app.post('/miso/staff/:id/verify', (req, res) => {
  const s = db.staff.find(x => x.id === req.params.id);
  if (s) {
    s.status = 'active';
    saveDb();
  }
  res.json({ success: true, staff: s });
});
app.post('/miso/staff/:id/suspend', (req, res) => {
  const s = db.staff.find(x => x.id === req.params.id);
  if (s) {
    s.status = 'suspended';
    saveDb();
  }
  res.json({ success: true, staff: s });
});
app.get('/miso/roles', (req, res) => res.json(db.roles));
app.put('/miso/staff/:id/role', (req, res) => {
  const s = db.staff.find(x => x.id === req.params.id);
  if (s) {
    s.role = req.body.role || req.body.roleId;
    saveDb();
  }
  res.json({ success: true, staff: s });
});

// Full Staff CRUD
app.post('/miso/staff', (req, res) => {
  const s = { id: Date.now().toString(), status: 'pending', ...req.body };
  db.staff.push(s);
  saveDb();
  res.json(s);
});
app.put('/miso/staff/:id', (req, res) => {
  const index = db.staff.findIndex(s => s.id === req.params.id);
  if (index >= 0) {
    db.staff[index] = { ...db.staff[index], ...req.body };
    saveDb();
    res.json(db.staff[index]);
  } else res.status(404).json({ error: 'Not found' });
});
app.delete('/miso/staff/:id', (req, res) => {
  db.staff = db.staff.filter(s => s.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

// --- Messages (Basic CRUD) ---
app.get('/messages', (req, res) => res.json(db.messages));
app.get('/messages/:id', (req, res) => res.json(db.messages.find(m => m.id === req.params.id)));
app.post('/messages', (req, res) => {
  const msg = { id: Date.now().toString(), date: new Date().toISOString(), ...req.body };
  db.messages.push(msg);
  saveDb();
  res.json(msg);
});
app.put('/messages/:id', (req, res) => {
  const index = db.messages.findIndex(m => m.id === req.params.id);
  if (index >= 0) {
    db.messages[index] = { ...db.messages[index], ...req.body };
    saveDb();
    res.json(db.messages[index]);
  } else res.status(404).json({ error: 'Not found' });
});
app.delete('/messages/:id', (req, res) => {
  db.messages = db.messages.filter(m => m.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

// --- Payslips (Basic CRUD) ---
app.get('/payslips', (req, res) => res.json(db.payslips));
app.get('/payslips/:id', (req, res) => res.json(db.payslips.find(p => p.id === req.params.id)));
app.post('/payslips', (req, res) => {
  const slip = { id: Date.now().toString(), ...req.body };
  db.payslips.push(slip);
  saveDb();
  res.json(slip);
});
app.put('/payslips/:id', (req, res) => {
  const index = db.payslips.findIndex(p => p.id === req.params.id);
  if (index >= 0) {
    db.payslips[index] = { ...db.payslips[index], ...req.body };
    saveDb();
    res.json(db.payslips[index]);
  } else res.status(404).json({ error: 'Not found' });
});
app.delete('/payslips/:id', (req, res) => {
  db.payslips = db.payslips.filter(p => p.id !== req.params.id);
  saveDb();
  res.json({ success: true });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Mock backend running on port ${PORT}`);
});
