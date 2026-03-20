# ⛽ PumpRadar — ปั๊มไหนมีน้ำมัน?

เว็บรายงานสถานะน้ำมันตามปั๊มต่างๆ แบบ real-time

## โครงสร้างโปรเจกต์

```
pumpradar/
├── server.js        ← Express API server
├── database.js      ← SQLite setup + seed data
├── package.json
├── pumpradar.db     ← สร้างอัตโนมัติเมื่อรันครั้งแรก
└── public/
    └── index.html   ← Frontend (HTML + CSS + JS)
```

## วิธีติดตั้งและรัน

### 1. ติดตั้ง Node.js
ดาวน์โหลดที่ https://nodejs.org (แนะนำ v18 ขึ้นไป)

### 2. ติดตั้ง dependencies
```bash
cd pumpradar
npm install
```

### 3. รัน server
```bash
npm start
```

### 4. เปิดเว็บ
เปิดเบราว์เซอร์ไปที่ → **http://localhost:3000**

---

## API Endpoints

| Method | URL | คำอธิบาย |
|--------|-----|----------|
| GET | `/api/reports` | ดึงรายงานทั้งหมด |
| GET | `/api/reports?status=มีน้ำมัน` | กรองตามสถานะ |
| GET | `/api/reports?province=ชลบุรี` | กรองตามจังหวัด |
| GET | `/api/reports/:id` | ดูรายงานตาม ID |
| POST | `/api/reports` | เพิ่มรายงานใหม่ |
| PATCH | `/api/reports/:id/upvote` | โหวต +1 |
| DELETE | `/api/reports/:id` | ลบรายงาน |
| GET | `/api/stats` | สถิติ + แยกตามจังหวัด |
| GET | `/api/map` | ดึงเฉพาะปั๊มที่มีพิกัด GPS |

### ตัวอย่าง POST /api/reports
```json
{
  "station": "ปตท. พระรามเก้า",
  "brand": "ปตท.",
  "status": "มีน้ำมัน",
  "fuel_types": ["ดีเซล", "เบนซิน 95"],
  "province": "กรุงเทพมหานคร",
  "lat": 13.7563,
  "lng": 100.5668,
  "comment": "คิวไม่นาน"
}
```

## Database (SQLite)

ไฟล์ `pumpradar.db` สร้างขึ้นอัตโนมัติ ไม่ต้องติดตั้ง database แยก

### Schema ตาราง reports
```sql
id          TEXT PRIMARY KEY
station     TEXT NOT NULL
brand       TEXT NOT NULL
status      TEXT NOT NULL  -- 'มีน้ำมัน' | 'ไม่มีน้ำมัน' | 'คิวยาว'
fuel_types  TEXT           -- JSON array เช่น ["ดีเซล","เบนซิน 91"]
province    TEXT NOT NULL
lat         REAL           -- latitude (nullable)
lng         REAL           -- longitude (nullable)
comment     TEXT
upvotes     INTEGER DEFAULT 0
created_at  TEXT           -- ISO 8601 datetime
```

## Deploy ออก Production

แนะนำ **Railway** หรือ **Render** (ฟรี):
1. Push โค้ดขึ้น GitHub
2. เชื่อมกับ Railway/Render
3. ตั้ง environment variable: `PORT=3000`
4. Deploy!
