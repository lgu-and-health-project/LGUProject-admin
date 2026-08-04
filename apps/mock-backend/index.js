const express = require('express');
const cors = require('cors');
const dns = require('dns');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// Force IPv4 DNS resolution for Supabase on Render to prevent ENETUNREACH IPv6 errors
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to format tRPC response
const trpcRes = (data) => ({ result: { data } });

// --- Health Check ---
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Prisma Backend is running!' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- Auth (tRPC mock) ---
app.post('/trpc/auth.pair', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.onboard', (req, res) => res.json(trpcRes({ success: true })));
app.post('/trpc/auth.login', (req, res) => res.json(trpcRes({ token: 'mock-jwt-token' })));
app.get('/trpc/auth.me', async (req, res) => {
  const me = await prisma.staff.findFirst();
  res.json(trpcRes(me));
});

// --- Directives ---
app.get('/directives/assigned', async (req, res) => res.json(await prisma.directive.findMany()));
app.post('/directives/:id/acknowledge', (req, res) => res.json({ success: true }));
app.post('/directives/:id/proof', (req, res) => res.json({ success: true }));

// --- HRIS (Attendance, Leaves, Payroll) ---
app.post('/hris/attendance', async (req, res) => {
  const record = await prisma.attendance.create({
    data: { staffId: '1', date: new Date().toISOString(), ...req.body }
  });
  res.json(record);
});
app.get('/hris/attendance/me', async (req, res) => res.json(await prisma.attendance.findMany({ where: { staffId: '1' } })));
app.get('/hris/attendance', async (req, res) => res.json(await prisma.attendance.findMany()));

app.post('/attendance', async (req, res) => {
  const record = await prisma.attendance.create({
    data: { staffId: '1', date: new Date().toISOString(), ...req.body }
  });
  res.json(record);
});
app.post('/leave-requests', async (req, res) => {
  const reqData = await prisma.leaveRequest.create({
    data: { staffId: '1', status: 'pending', ...req.body }
  });
  res.json(reqData);
});
app.post('/hris/leave-requests', async (req, res) => {
  const reqData = await prisma.leaveRequest.create({
    data: { staffId: '1', status: 'pending', ...req.body }
  });
  res.json(reqData);
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
  const s = await prisma.staff.create({ data: { status: 'pending', ...req.body } });
  res.json(s);
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
app.get('/messages', async (req, res) => res.json(await prisma.message.findMany()));
app.get('/messages/:id', async (req, res) => res.json(await prisma.message.findUnique({ where: { id: req.params.id } })));
app.post('/messages', async (req, res) => {
  const msg = await prisma.message.create({ data: { date: new Date().toISOString(), ...req.body } });
  res.json(msg);
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
  const slip = await prisma.payslip.create({ data: req.body });
  res.json(slip);
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
