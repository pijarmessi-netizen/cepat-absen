import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to get today's date in YYYY-MM-DD (WIB / Asia/Jakarta)
const getTodayDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

// Helper function to get current time in HH:mm:ss (WIB / Asia/Jakarta)
const getCurrentTime = () => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
};

// ==========================================
// 1. STUDENTS API (CRUD)
// ==========================================

// Get list of students
app.get('/api/students', async (req, res) => {
  try {
    const { class_name, search } = req.query;
    const students = await db.getStudents({ class_name, search });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new student
app.post('/api/students', async (req, res) => {
  try {
    const { student_id, fullname, nickname, class_name, guardian_phone } = req.body;
    if (!student_id || !fullname || !class_name) {
      return res.status(400).json({ success: false, message: 'ID Murid, Nama Lengkap, dan Kelas wajib diisi.' });
    }

    const newStudent = await db.addStudent({ student_id, fullname, nickname, class_name, guardian_phone });
    res.status(201).json({ success: true, message: 'Data murid berhasil ditambahkan.', data: newStudent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update student
app.put('/api/students/:id', async (req, res) => {
  try {
    const student_id = req.params.id;
    const updated = await db.updateStudent(student_id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Murid tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data murid berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete student
app.delete('/api/students/:id', async (req, res) => {
  try {
    const student_id = req.params.id;
    const deleted = await db.deleteStudent(student_id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Murid tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data murid berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. ATTENDANCES API & SCANNER
// ==========================================

// Get Dashboard Live Data for Today
app.get('/api/attendances/today', async (req, res) => {
  try {
    const today = getTodayDate();
    const result = await db.getTodayData(today);
    res.json({
      success: true,
      date: today,
      stats: result.stats,
      attendances: result.attendances
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scan QR Code Endpoint
app.post('/api/attendances/scan', async (req, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'QR Code / Student ID tidak valid.' });
    }

    const today = getTodayDate();
    const currentTime = getCurrentTime();

    const scanResult = await db.recordScan(String(student_id).trim(), today, currentTime);
    res.json(scanResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update attendance status
app.put('/api/attendances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = await db.updateAttendance(id, status, notes);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Data presensi tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Status presensi berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual Insert Attendance (for Izin/Sakit/Alfa entry)
app.post('/api/attendances/manual', async (req, res) => {
  try {
    const { student_id, date, status, notes } = req.body;
    if (!student_id || !status) {
      return res.status(400).json({ success: false, message: 'Data murid dan status wajib diisi.' });
    }

    const attDate = date || getTodayDate();
    const timeNow = getCurrentTime();

    const saved = await db.saveManualAttendance(student_id, attDate, status, notes, timeNow);
    res.json({ success: true, message: 'Presensi manual berhasil disimpan.', data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Report Endpoint with Date Range & Class Filter
app.get('/api/attendances/report', async (req, res) => {
  try {
    const { start_date, end_date, class_name } = req.query;
    const reportData = await db.getReport({ start_date, end_date, class_name });
    res.json({ success: true, count: reportData.length, data: reportData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DIAGNOSTIC ENDPOINT FOR VERCEL KV
app.get('/api/test-db', async (req, res) => {
  let kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  let kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  let parsedFromRedisUrl = false;
  if ((!kvUrl || !kvToken) && process.env.REDIS_URL) {
    try {
      const rawUrl = process.env.REDIS_URL;
      const parts = rawUrl.split('@');
      if (parts.length === 2) {
        const credentials = parts[0].replace('rediss://', '').replace('redis://', '');
        const credParts = credentials.split(':');
        const token = credParts.length === 2 ? credParts[1] : credParts[0];
        const hostAndPort = parts[1].split(':');
        const host = hostAndPort[0];
        kvUrl = `https://${host}`;
        kvToken = token;
        parsedFromRedisUrl = true;
      }
    } catch (e) {}
  }

  if (!kvUrl || !kvToken) {
    return res.json({
      success: false,
      message: 'Vercel KV/Upstash environment variables (REDIS_URL, UPSTASH_REDIS_REST_URL) are not defined in this running container!',
      isVercel: process.env.VERCEL || false,
      hasRedisUrl: !!process.env.REDIS_URL,
      now: new Date().toISOString()
    });
  }

  try {
    // 1. Test write
    const testKey = 'cepat_absen_test_key';
    const testVal = { time: new Date().toISOString(), hello: 'world' };
    
    const writeRes = await fetch(`${kvUrl}/set/${testKey}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}` },
      body: JSON.stringify(testVal)
    });
    const writeData = await writeRes.json();

    // 2. Test read
    const readRes = await fetch(`${kvUrl}/get/${testKey}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const readData = await readRes.json();

    // 3. Load actual db
    const dbRes = await fetch(`${kvUrl}/get/cepat_absen_db`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const dbData = await dbRes.json();

    res.json({
      success: true,
      kvUrl: kvUrl.substring(0, 20) + '...',
      parsedFromRedisUrl,
      writeResult: writeData,
      readResult: readData,
      parsedVal: readData.result ? JSON.parse(readData.result) : null,
      dbRaw: dbData,
      dbParsed: dbData.result ? JSON.parse(dbData.result) : null,
      now: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      stack: err.stack,
      attemptedUrl: kvUrl ? (kvUrl.substring(0, 30) + '...') : null,
      attemptedTokenLength: kvToken ? kvToken.length : 0,
      parsedFromRedisUrl,
      redisUrlDefined: !!process.env.REDIS_URL,
      upstashUrlDefined: !!process.env.UPSTASH_REDIS_REST_URL,
      kvUrlDefined: !!process.env.KV_REST_API_URL,
      now: new Date().toISOString()
    });
  }
});

// ==========================================
// 3. SERVE FRONTEND STATIC FILES (SINGLE SERVER)
// ==========================================
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  CEPAT ABSEN - SISTEM PRESENSI QR CODE (TK/SD)`);
    console.log(`=======================================================`);
    console.log(`  Aplikasi berjalan di: http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

export default app;
