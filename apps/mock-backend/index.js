const express = require('express');
const cors = require('cors');
const dns = require('dns');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const trpcRes = (data) => ({ result: { data } });

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Prisma Backend is running!' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/trpc/auth.pair', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.onboard', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.login', (req, res) => res.json(trpcRes({ token: 'mock-jwt-token' })));
app.get('/trpc/auth.me', async (req, res) => {
  const me = await prisma.staff.findFirst();
  res.json(trpcRes(me));
});

// --- Directives ---
app.get('/directives/assigned', async (req, res) => {
  const dirs = await prisma.directive.findMany();
  res.json(dirs.map(d => ({
    id: d.id,
    title: d.title,
    description: d.description,
    issued_by: d.issued_by,
    issued_by_role: 'ADMIN',
    priority: d.priority,
    deadline: null,
    requires_ack: d.requires_ack,
    requires_proof: d.requires_proof
  })));
});
app.post('/directives/assigned', async (req, res) => {
  try {
    const d = await prisma.directive.create({ 
      data: {
        id: req.body.id || undefined,
        title: req.body.title || 'Untitled',
        description: req.body.description || '',
        issued_by: req.body.issued_by || 'Admin',
        priority: req.body.priority || 'NORMAL',
        requires_ack: Boolean(req.body.requires_ack),
        requires_proof: Boolean(req.body.requires_proof)
      }
    });
    res.json(d);
  } catch (e) { res.status(500).json({ error: e.message }) }
});
app.post('/directives/:id/acknowledge', (req, res) => res.json({ success: true }));
app.post('/directives/:id/proof', (req, res) => res.json({ success: true }));

// --- HRIS (Attendance, Leaves, Payroll) ---
app.post('/hris/attendance', async (req, res) => {
  try {
    const record = await prisma.attendance.create({
      data: { 
        staffId: req.body.employee_id || 'Unknown', 
        date: req.body.captured_at || new Date().toISOString(),
        status: req.body.type || 'IN',
        latitude: req.body.latitude || 0.0,
        longitude: req.body.longitude || 0.0
      }
    });
    res.json(record);
  } catch (e) { res.status(500).json({ error: e.message }) }
});
app.get('/hris/attendance/me', async (req, res) => res.json(await prisma.attendance.findMany({ where: { staffId: '1' } })));
app.get('/hris/attendance', async (req, res) => res.json(await prisma.attendance.findMany()));

app.post('/attendance', async (req, res) => {
  try {
    const record = await prisma.attendance.create({
      data: { 
        staffId: req.body.employee_id || 'Unknown', 
        date: req.body.captured_at || new Date().toISOString(),
        status: req.body.type || 'IN',
        latitude: req.body.latitude || 0.0,
        longitude: req.body.longitude || 0.0
      }
    });
    res.json(record);
  } catch (e) { res.status(500).json({ error: e.message }) }
});

app.post('/leave-requests', async (req, res) => {
  try {
    const reqData = await prisma.leaveRequest.create({
      data: { 
        staffId: req.body.employee_id || 'Unknown', 
        status: 'pending', 
        type: req.body.type || 'Leave',
        date: req.body.date_from || new Date().toISOString(),
        reason: req.body.reason || 'No reason'
      }
    });
    res.json(reqData);
  } catch (e) { res.status(500).json({ error: e.message }) }
});

app.post('/hris/leave-requests', async (req, res) => {
  try {
    const reqData = await prisma.leaveRequest.create({
      data: { 
        staffId: req.body.employee_id || 'Unknown', 
        status: 'pending', 
        type: req.body.type || 'Leave',
        date: req.body.date_from || new Date().toISOString(),
        reason: req.body.reason || 'No reason'
      }
    });
    res.json(reqData);
  } catch (e) { res.status(500).json({ error: e.message }) }
});
app.get('/hris/leave-requests/me', async (req, res) => res.json(await prisma.leaveRequest.findMany({ where: { staffId: '1' } })));
app.get('/hris/leave-requests', async (req, res) => res.json(await prisma.leaveRequest.findMany()));

app.get('/hris/payroll/me', async (req, res) => res.json(await prisma.payslip.findMany({ where: { staffId: '1' } })));
app.get('/hris/payroll', async (req, res) => res.json(await prisma.payslip.findMany()));

// --- MISO (Staff/Roles) ---
app.get('/miso/staff', async (req, res) => res.json(await prisma.staff.findMany()));
app.post('/miso/staff/:id/verify', async (req, res) => {
  try {
    const s = await prisma.staff.update({ where: { id: req.params.id }, data: { status: 'active' } });
    res.json({ success: true, staff: s });
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});
app.post('/miso/staff/:id/suspend', async (req, res) => {
  try {
    const s = await prisma.staff.update({ where: { id: req.params.id }, data: { status: 'suspended' } });
    res.json({ success: true, staff: s });
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});
app.get('/miso/roles', async (req, res) => res.json(await prisma.role.findMany()));
app.put('/miso/staff/:id/role', async (req, res) => {
  try {
    const s = await prisma.staff.update({ where: { id: req.params.id }, data: { role: req.body.role || req.body.roleId } });
    res.json({ success: true, staff: s });
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});

app.post('/miso/staff', async (req, res) => {
  try {
    const s = await prisma.staff.create({ data: { status: 'pending', ...req.body } });
    res.json(s);
  } catch(e) { res.status(500).json({ error: e.message }) }
});
app.put('/miso/staff/:id', async (req, res) => {
  try {
    const s = await prisma.staff.update({ where: { id: req.params.id }, data: req.body });
    res.json(s);
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});
app.delete('/miso/staff/:id', async (req, res) => {
  try {
    await prisma.staff.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});

// --- Messages (Basic CRUD) ---
app.get('/messages', async (req, res) => {
  try {
    const msgs = await prisma.message.findMany();
    res.json(msgs.map(m => ({
      id: m.id,
      from_employee_id: m.from,
      to_employee_id: m.to,
      body: m.body,
      created_at: m.date
    })));
  } catch (e) { res.status(500).json({ error: e.message }) }
});
app.get('/messages/:id', async (req, res) => res.json(await prisma.message.findUnique({ where: { id: req.params.id } })));
app.post('/messages', async (req, res) => {
  try {
    const msg = await prisma.message.create({ 
      data: { 
        id: req.body.id || undefined,
        from: (req.body.from_employee_id || req.body.from || 'Unknown').trim(),
        to: (req.body.to_employee_id || req.body.to || 'Unknown').trim(),
        subject: req.body.subject || 'No Subject',
        body: req.body.body || '',
        date: req.body.created_at || req.body.date || new Date().toISOString()
      } 
    });
    res.json(msg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
app.put('/messages/:id', async (req, res) => {
  try {
    const msg = await prisma.message.update({ where: { id: req.params.id }, data: req.body });
    res.json(msg);
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});
app.delete('/messages/:id', async (req, res) => {
  try {
    await prisma.message.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});

// --- Payslips (Basic CRUD) ---
app.get('/payslips', async (req, res) => res.json(await prisma.payslip.findMany()));
app.get('/payslips/:id', async (req, res) => res.json(await prisma.payslip.findUnique({ where: { id: req.params.id } })));
app.post('/payslips', async (req, res) => {
  try {
    const slip = await prisma.payslip.create({ data: req.body });
    res.json(slip);
  } catch (e) { res.status(500).json({ error: e.message }) }
});
app.put('/payslips/:id', async (req, res) => {
  try {
    const slip = await prisma.payslip.update({ where: { id: req.params.id }, data: req.body });
    res.json(slip);
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});
app.delete('/payslips/:id', async (req, res) => {
  try {
    await prisma.payslip.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(404).json({ error: 'Not found' }) }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Prisma backend running on http://0.0.0.0:${PORT}`);
});
