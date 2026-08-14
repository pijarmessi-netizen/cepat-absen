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

// Helper function to get today's date in YYYY-MM-DD (local time)
const getTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get current time in HH:mm:ss
const getCurrentTime = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// ==========================================
// 1. STUDENTS API (CRUD)
// ==========================================

// Get list of students
app.get('/api/students', (req, res) => {
  try {
    const { class_name, search } = req.query;
    const students = db.getStudents({ class_name, search });
    res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new student
app.post('/api/students', (req, res) => {
  try {
    const { student_id, fullname, nickname, class_name, guardian_phone } = req.body;
    if (!student_id || !fullname || !class_name) {
      return res.status(400).json({ success: false, message: 'ID Murid, Nama Lengkap, dan Kelas wajib diisi.' });
    }

    const newStudent = db.addStudent({ student_id, fullname, nickname, class_name, guardian_phone });
    res.status(201).json({ success: true, message: 'Data murid berhasil ditambahkan.', data: newStudent });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update student
app.put('/api/students/:id', (req, res) => {
  try {
    const student_id = req.params.id;
    const updated = db.updateStudent(student_id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Murid tidak ditemukan.' });
    }
    res.json({ success: true, message: 'Data murid berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
  try {
    const student_id = req.params.id;
    const deleted = db.deleteStudent(student_id);
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
app.get('/api/attendances/today', (req, res) => {
  try {
    const today = getTodayDate();
    const result = db.getTodayData(today);
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
app.post('/api/attendances/scan', (req, res) => {
  try {
    const { student_id } = req.body;
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'QR Code / Student ID tidak valid.' });
    }

    const today = getTodayDate();
    const currentTime = getCurrentTime();

    const scanResult = db.recordScan(String(student_id).trim(), today, currentTime);
    res.json(scanResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update attendance status
app.put('/api/attendances/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updated = db.updateAttendance(id, status, notes);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Data presensi tidak ditemukan.' });
    }

    res.json({ success: true, message: 'Status presensi berhasil diperbarui.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual Insert Attendance (for Izin/Sakit/Alfa entry)
app.post('/api/attendances/manual', (req, res) => {
  try {
    const { student_id, date, status, notes } = req.body;
    if (!student_id || !status) {
      return res.status(400).json({ success: false, message: 'Data murid dan status wajib diisi.' });
    }

    const attDate = date || getTodayDate();
    const timeNow = getCurrentTime();

    const saved = db.saveManualAttendance(student_id, attDate, status, notes, timeNow);
    res.json({ success: true, message: 'Presensi manual berhasil disimpan.', data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Report Endpoint with Date Range & Class Filter
app.get('/api/attendances/report', (req, res) => {
  try {
    const { start_date, end_date, class_name } = req.query;
    const reportData = db.getReport({ start_date, end_date, class_name });
    res.json({ success: true, count: reportData.length, data: reportData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
