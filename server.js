const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const { randomUUID } = require('crypto');
const db      = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── USER & ADMIN CONFIG (เก็บใน users.json) ────────────────────────────────
const USERS_FILE = path.join(__dirname, 'users.json');
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const init = {
      users: [{ username:'user1', password:'1234', name:'ผู้ใช้ทดสอบ' }],
      admins: [{ username:'admin', password:'admin1234' }]
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify(init, null, 2));
    console.log('✅ Created users.json  (admin: admin / admin1234)');
    return init;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// ── SIMPLE TOKEN STORE (in-memory) ────────────────────────────────────────────
const tokens = {}; // token → { username, name, role }

function createToken(payload) {
  const token = randomUUID();
  tokens[token] = payload;
  return token;
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-token'];
  if (!token || !tokens[token]) return res.status(401).json({ error: 'กรุณาล็อกอินก่อน' });
  req.user = tokens[token];
  next();
}

function adminMiddleware(req, res, next) {
  const token = req.headers['x-token'];
  if (!token || !tokens[token]) return res.status(401).json({ error: 'ไม่ได้รับอนุญาต' });
  if (tokens[token].role !== 'admin') return res.status(403).json({ error: 'เฉพาะ Admin เท่านั้น' });
  req.user = tokens[token];
  next();
}

// ── AUTH ROUTES ───────────────────────────────────────────────────────────────
// POST /api/login  (ผู้ใช้ทั่วไป)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const { users } = loadUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  const token = createToken({ username: user.username, name: user.name, role: 'user' });
  res.json({ token, name: user.name });
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const { admins } = loadUsers();
  const admin = admins.find(a => a.username === username && a.password === password);
  if (!admin) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  const token = createToken({ username: admin.username, name: 'Admin', role: 'admin' });
  res.json({ token });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  const token = req.headers['x-token'];
  if (token) delete tokens[token];
  res.json({ message: 'ออกจากระบบแล้ว' });
});

// GET /api/me
app.get('/api/me', authMiddleware, (req, res) => res.json(req.user));

// ── REPORT ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/reports', (req, res) => {
  try {
    const { status, province, limit, offset } = req.query;
    res.json(db.getReports({ status, province, limit: Number(limit)||50, offset: Number(offset)||0 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/reports/:id', (req, res) => {
  const r = db.getReport(req.params.id);
  if (!r) return res.status(404).json({ error: 'ไม่พบรายงาน' });
  res.json(r);
});

// POST ต้องล็อกอินก่อน
app.post('/api/reports', authMiddleware, (req, res) => {
  try {
    const { station, brand, status, fuel_types, province, lat, lng, comment } = req.body;
    if (!station)  return res.status(400).json({ error: 'กรุณากรอกชื่อปั๊ม' });
    if (!province) return res.status(400).json({ error: 'กรุณาเลือกจังหวัด' });
    if (!['มีน้ำมัน','ไม่มีน้ำมัน','คิวยาว'].includes(status))
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    const report = {
      id: randomUUID(), station, brand: brand||'อื่นๆ', status,
      fuel_types: fuel_types||[], province,
      lat: lat||null, lng: lng||null, comment: comment||'',
      upvotes: 0, reported_by: req.user.name,
      created_at: new Date().toISOString()
    };
    res.status(201).json(db.addReport(report));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/reports/:id/upvote', (req, res) => {
  const r = db.upvote(req.params.id);
  if (!r) return res.status(404).json({ error: 'ไม่พบรายงาน' });
  res.json(r);
});

// DELETE เฉพาะ Admin
app.delete('/api/reports/:id', adminMiddleware, (req, res) => {
  if (!db.deleteReport(req.params.id)) return res.status(404).json({ error: 'ไม่พบรายงาน' });
  res.json({ message: 'ลบสำเร็จ' });
});

app.get('/api/stats', (req, res) => {
  try { res.json(db.getStats()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/map', (req, res) => {
  try { res.json(db.getMapPoints()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: GET all reports (no filter)
app.get('/api/admin/reports', adminMiddleware, (req, res) => {
  try { res.json(db.getReports({ limit: 999 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  loadUsers(); // ensure users.json created
  console.log(`\n⛽  PumpRadar running at http://localhost:${PORT}`);
  console.log(`🔑  Admin panel: http://localhost:${PORT}/admin.html\n`);
});
