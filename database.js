const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

const SEED = [
  { id:'s1', station:'ปตท. อรัญประเทศ (ถ.สุวรรณศร)', brand:'ปตท.', status:'มีน้ำมัน', fuel_types:['ดีเซล','เบนซิน 91','เบนซิน 95','E20'], province:'สระแก้ว', lat:13.7063, lng:102.5042, comment:'เปิดปกติ คิวไม่นาน', upvotes:8, created_at: new Date(Date.now()-12*60000).toISOString() },
  { id:'s2', station:'บางจาก วังน้ำเย็น', brand:'บางจาก', status:'ไม่มีน้ำมัน', fuel_types:['ดีเซล','เบนซิน 91'], province:'สระแก้ว', lat:13.4608, lng:102.1658, comment:'น้ำมันหมดทุกชนิด รอรถเติมพรุ่งนี้', upvotes:14, created_at: new Date(Date.now()-28*60000).toISOString() },
  { id:'s3', station:'ปตท. เมืองสระแก้ว (ถ.สุวรรณศร)', brand:'ปตท.', status:'คิวยาว', fuel_types:['ดีเซล B7','เบนซิน 95'], province:'สระแก้ว', lat:13.8200, lng:102.0650, comment:'คิวยาวประมาณ 40 นาที รถบรรทุกเยอะ', upvotes:6, created_at: new Date(Date.now()-55*60000).toISOString() },
  { id:'s4', station:'เชลล์ อรัญประเทศ', brand:'เชลล์', status:'มีน้ำมัน', fuel_types:['ดีเซล','เบนซิน 91','LPG'], province:'สระแก้ว', lat:13.6980, lng:102.5110, comment:'เปิดปกติ มีทุกชนิด', upvotes:3, created_at: new Date(Date.now()-90*60000).toISOString() },
  { id:'s5', station:'ซัสโก้ คลองหาด', brand:'ซัสโก้', status:'มีน้ำมัน', fuel_types:['ดีเซล','เบนซิน 91'], province:'สระแก้ว', lat:13.6248, lng:102.2430, comment:'', upvotes:2, created_at: new Date(Date.now()-2*3600000).toISOString() },
  { id:'s6', station:'คาลเท็กซ์ วัฒนานคร', brand:'คาลเท็กซ์', status:'ไม่มีน้ำมัน', fuel_types:['ดีเซล'], province:'สระแก้ว', lat:13.7842, lng:102.3012, comment:'ดีเซลหมดตั้งแต่เช้า ยังไม่ทราบว่าจะมีเมื่อไร', upvotes:11, created_at: new Date(Date.now()-3*3600000).toISOString() },
  { id:'s7', station:'ปตท. ตาพระยา', brand:'ปตท.', status:'มีน้ำมัน', fuel_types:['ดีเซล','เบนซิน 91','E20'], province:'สระแก้ว', lat:14.1077, lng:102.7892, comment:'เปิดปกติ ไม่มีปัญหา', upvotes:5, created_at: new Date(Date.now()-4*3600000).toISOString() },
];

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { reports: SEED };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    console.log('Created db.json with', SEED.length, 'sample reports');
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const db = {
  getReports({ status, province, limit = 50, offset = 0 } = {}) {
    let { reports } = readDB();
    if (status)   reports = reports.filter(r => r.status === status);
    if (province) reports = reports.filter(r => r.province === province);
    reports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = reports.length;
    return { reports: reports.slice(offset, offset + limit), total };
  },
  getReport(id) { return readDB().reports.find(r => r.id === id) || null; },
  addReport(report) { const data = readDB(); data.reports.unshift(report); writeDB(data); return report; },
  upvote(id) {
    const data = readDB();
    const r = data.reports.find(r => r.id === id);
    if (!r) return null;
    r.upvotes = (r.upvotes || 0) + 1;
    writeDB(data);
    return r;
  },
  deleteReport(id) {
    const data = readDB();
    const idx = data.reports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    data.reports.splice(idx, 1);
    writeDB(data);
    return true;
  },
  getStats() {
    const { reports } = readDB();
    const byProvince = {};
    reports.forEach(r => {
      if (!byProvince[r.province]) byProvince[r.province] = { province: r.province, total:0, avail:0, unavail:0, queue:0 };
      byProvince[r.province].total++;
      if (r.status === 'มีน้ำมัน')    byProvince[r.province].avail++;
      if (r.status === 'ไม่มีน้ำมัน') byProvince[r.province].unavail++;
      if (r.status === 'คิวยาว')      byProvince[r.province].queue++;
    });
    const byBrand = {};
    reports.forEach(r => { byBrand[r.brand] = (byBrand[r.brand] || 0) + 1; });
    return {
      total:   reports.length,
      avail:   reports.filter(r => r.status === 'มีน้ำมัน').length,
      unavail: reports.filter(r => r.status === 'ไม่มีน้ำมัน').length,
      queue:   reports.filter(r => r.status === 'คิวยาว').length,
      byProvince: Object.values(byProvince).sort((a,b) => b.total - a.total),
      byBrand: Object.entries(byBrand).map(([brand,total]) => ({brand,total})).sort((a,b) => b.total - a.total),
    };
  },
  getMapPoints() { return readDB().reports.filter(r => r.lat && r.lng); },
};

module.exports = db;
