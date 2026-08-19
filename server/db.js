import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const dbFilePath = isVercel 
  ? path.join(os.tmpdir(), 'cepat_absen_data.json')
  : path.join(__dirname, 'cepat_absen_data.json');

const initialStudents = [
  { student_id: '2026001', fullname: 'Ananda Putra Wijaya', nickname: 'Nanda', class_name: 'Kelas TK-A', guardian_phone: '081234567890', created_at: new Date().toISOString() },
  { student_id: '2026002', fullname: 'Bening Safira', nickname: 'Bening', class_name: 'Kelas TK-A', guardian_phone: '081298765432', created_at: new Date().toISOString() },
  { student_id: '2026003', fullname: 'Candra Kirana', nickname: 'Candra', class_name: 'Kelas TK-B', guardian_phone: '085712345678', created_at: new Date().toISOString() },
  { student_id: '2026004', fullname: 'Davin Arisanto', nickname: 'Davin', class_name: 'Kelas 1-A', guardian_phone: '087811223344', created_at: new Date().toISOString() },
  { student_id: '2026005', fullname: 'Elvira Maharani', nickname: 'Vira', class_name: 'Kelas 1-A', guardian_phone: '081399887766', created_at: new Date().toISOString() },
  { student_id: '2026006', fullname: 'Farel Al-Ghazali', nickname: 'Farel', class_name: 'Kelas 2-B', guardian_phone: '085244556677', created_at: new Date().toISOString() }
];

// Empty initial database state (Clean slate for real-time user input)
const cleanData = {
  students: initialStudents,
  attendances: [],
  nextAttendanceId: 1
};

class LocalJSONDatabase {
  constructor() {
    this.data = cleanData;
    this.load();
  }

  // Force reset data to clean state
  resetDatabase() {
    this.data = {
      students: [...initialStudents],
      attendances: [],
      nextAttendanceId: 1
    };
    this.save();
    console.log('Database reset: Semua data murid dan presensi telah dibersihkan.');
  }

  load() {
    try {
      if (fs.existsSync(dbFilePath)) {
        const fileContent = fs.readFileSync(dbFilePath, 'utf8');
        this.data = JSON.parse(fileContent);
      } else {
        const localPath = path.join(__dirname, 'cepat_absen_data.json');
        if (isVercel && fs.existsSync(localPath)) {
          const fileContent = fs.readFileSync(localPath, 'utf8');
          this.data = JSON.parse(fileContent);
          this.save();
        } else {
          this.save();
        }
      }
    } catch (e) {
      console.error('Error loading JSON DB:', e);
      this.resetDatabase();
    }
  }

  save() {
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving JSON DB:', e);
    }
  }

  // Student Methods
  getStudents({ class_name, search } = {}) {
    let list = [...this.data.students];

    if (class_name) {
      list = list.filter(s => s.class_name === class_name);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.fullname.toLowerCase().includes(q) ||
        (s.nickname && s.nickname.toLowerCase().includes(q)) ||
        s.student_id.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => a.class_name.localeCompare(b.class_name) || a.fullname.localeCompare(b.fullname));
    return list;
  }

  getStudentById(student_id) {
    return this.data.students.find(s => s.student_id === String(student_id).trim());
  }

  addStudent(student) {
    const existing = this.getStudentById(student.student_id);
    if (existing) {
      throw new Error(`ID/NISN ${student.student_id} sudah terdaftar.`);
    }

    const newStudent = {
      student_id: String(student.student_id).trim(),
      fullname: student.fullname.trim(),
      nickname: (student.nickname || student.fullname.split(' ')[0]).trim(),
      class_name: student.class_name.trim(),
      guardian_phone: (student.guardian_phone || '').trim(),
      created_at: new Date().toISOString()
    };

    this.data.students.push(newStudent);
    this.save();
    return newStudent;
  }

  updateStudent(student_id, updateData) {
    const index = this.data.students.findIndex(s => s.student_id === student_id);
    if (index === -1) return null;

    this.data.students[index] = {
      ...this.data.students[index],
      fullname: updateData.fullname || this.data.students[index].fullname,
      nickname: updateData.nickname || this.data.students[index].nickname,
      class_name: updateData.class_name || this.data.students[index].class_name,
      guardian_phone: updateData.guardian_phone !== undefined ? updateData.guardian_phone : this.data.students[index].guardian_phone
    };

    this.save();
    return this.data.students[index];
  }

  deleteStudent(student_id) {
    const initialLen = this.data.students.length;
    this.data.students = this.data.students.filter(s => s.student_id !== student_id);
    this.data.attendances = this.data.attendances.filter(a => a.student_id !== student_id);

    const changed = this.data.students.length !== initialLen;
    if (changed) this.save();
    return changed;
  }

  // Attendance Methods
  getTodayData(todayDate) {
    const totalStudents = this.data.students.length;
    const todayAttendances = this.data.attendances
      .filter(a => a.date === todayDate)
      .map(a => {
        const s = this.getStudentById(a.student_id) || {};
        return {
          ...a,
          fullname: s.fullname || 'Murid Tidak Dikenal',
          nickname: s.nickname || '',
          class_name: s.class_name || '-',
          guardian_phone: s.guardian_phone || ''
        };
      })
      .sort((a, b) => b.id - a.id);

    const stats = {
      totalStudents,
      hadir: todayAttendances.filter(a => a.status === 'Hadir').length,
      izin: todayAttendances.filter(a => a.status === 'Izin').length,
      sakit: todayAttendances.filter(a => a.status === 'Sakit').length,
      alfa: todayAttendances.filter(a => a.status === 'Alfa').length,
      belumAbsen: Math.max(0, totalStudents - todayAttendances.length)
    };

    return { stats, attendances: todayAttendances };
  }

  findAttendance(student_id, date) {
    return this.data.attendances.find(a => a.student_id === student_id && a.date === date);
  }

  recordScan(student_id, todayDate, currentTime) {
    const student = this.getStudentById(student_id);
    if (!student) {
      return { success: false, error: 'NOT_FOUND', message: `Murid dengan ID "${student_id}" tidak terdaftar.` };
    }

    const existing = this.findAttendance(student_id, todayDate);
    if (existing) {
      return {
        success: false,
        alreadyScanned: true,
        message: `${student.fullname} sudah melakukan presensi hari ini pada jam ${existing.check_in_time} (Status: ${existing.status}).`,
        student,
        attendance: existing
      };
    }

    const newAttendance = {
      id: this.data.nextAttendanceId++,
      student_id,
      date: todayDate,
      check_in_time: currentTime,
      status: 'Hadir',
      notes: '',
      created_at: new Date().toISOString()
    };

    this.data.attendances.push(newAttendance);
    this.save();

    return {
      success: true,
      message: `Presensi berhasil! Selamat datang, ${student.nickname || student.fullname}!`,
      student,
      attendance: {
        ...newAttendance,
        fullname: student.fullname,
        nickname: student.nickname,
        class_name: student.class_name,
        guardian_phone: student.guardian_phone
      }
    };
  }

  updateAttendance(id, status, notes) {
    const index = this.data.attendances.findIndex(a => a.id === Number(id));
    if (index === -1) return null;

    this.data.attendances[index].status = status;
    if (notes !== undefined) this.data.attendances[index].notes = notes;

    this.save();
    const student = this.getStudentById(this.data.attendances[index].student_id) || {};
    return {
      ...this.data.attendances[index],
      fullname: student.fullname,
      nickname: student.nickname,
      class_name: student.class_name
    };
  }

  saveManualAttendance(student_id, date, status, notes, currentTime) {
    const existing = this.findAttendance(student_id, date);
    if (existing) {
      return this.updateAttendance(existing.id, status, notes);
    }

    const newAtt = {
      id: this.data.nextAttendanceId++,
      student_id,
      date,
      check_in_time: currentTime,
      status,
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    this.data.attendances.push(newAtt);
    this.save();
    return newAtt;
  }

  getReport({ start_date, end_date, class_name } = {}) {
    let list = this.data.attendances.map(a => {
      const s = this.getStudentById(a.student_id) || {};
      return {
        ...a,
        fullname: s.fullname || 'Murid Hapus',
        nickname: s.nickname || '',
        class_name: s.class_name || '-',
        guardian_phone: s.guardian_phone || ''
      };
    });

    if (start_date) list = list.filter(a => a.date >= start_date);
    if (end_date) list = list.filter(a => a.date <= end_date);
    if (class_name) list = list.filter(a => a.class_name === class_name);

    list.sort((a, b) => b.date.localeCompare(a.date) || a.class_name.localeCompare(b.class_name) || a.fullname.localeCompare(b.fullname));
    return list;
  }
}

const db = new LocalJSONDatabase();
export default db;
