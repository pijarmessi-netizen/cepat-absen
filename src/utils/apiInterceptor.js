const DB_KEY = 'cepat_absen_db';

const initialStudents = [
  { student_id: '2026001', fullname: 'Ananda Putra Wijaya', nickname: 'Nanda', class_name: 'Kelas TK-A', guardian_phone: '081234567890', created_at: new Date().toISOString() },
  { student_id: '2026002', fullname: 'Bening Safira', nickname: 'Bening', class_name: 'Kelas TK-A', guardian_phone: '081298765432', created_at: new Date().toISOString() },
  { student_id: '2026003', fullname: 'Candra Kirana', nickname: 'Candra', class_name: 'Kelas TK-B', guardian_phone: '085712345678', created_at: new Date().toISOString() },
  { student_id: '2026004', fullname: 'Davin Arisanto', nickname: 'Davin', class_name: 'Kelas 1-A', guardian_phone: '087811223344', created_at: new Date().toISOString() },
  { student_id: '2026005', fullname: 'Elvira Maharani', nickname: 'Vira', class_name: 'Kelas 1-A', guardian_phone: '081399887766', created_at: new Date().toISOString() },
  { student_id: '2026006', fullname: 'Farel Al-Ghazali', nickname: 'Farel', class_name: 'Kelas 2-B', guardian_phone: '085244556677', created_at: new Date().toISOString() }
];

class LocalStoreDatabase {
  constructor() {
    this.data = {
      students: [],
      attendances: [],
      nextAttendanceId: 1
    };
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      } else {
        this.data.students = [...initialStudents];
        this.save();
      }
    } catch (e) {
      console.error('Error loading DB from localStorage:', e);
    }
  }

  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving DB to localStorage:', e);
    }
  }

  getStudents({ class_name, search } = {}) {
    let list = [...this.data.students];

    if (class_name && class_name !== 'ALL') {
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
    if (class_name && class_name !== 'ALL') list = list.filter(a => a.class_name === class_name);

    list.sort((a, b) => b.date.localeCompare(a.date) || a.class_name.localeCompare(b.class_name) || a.fullname.localeCompare(b.fullname));
    return list;
  }
}

const clientDb = new LocalStoreDatabase();

// Time helpers matching server
const getTodayDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

const getCurrentTime = () => {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
};

const originalFetch = window.fetch;

window.fetch = async (input, init) => {
  const urlString = typeof input === 'string' ? input : input.url;
  
  if (urlString.startsWith('/api/')) {
    const url = new URL(urlString, window.location.origin);
    const path = url.pathname;
    const method = (init && init.method || 'GET').toUpperCase();
    
    let body = null;
    if (init && init.body) {
      try {
        body = JSON.parse(init.body);
      } catch(e) {}
    }

    try {
      let responseData = null;

      // 1. GET /api/students
      if (path === '/api/students' && method === 'GET') {
        const class_name = url.searchParams.get('class_name');
        const search = url.searchParams.get('search');
        const students = clientDb.getStudents({ class_name, search });
        responseData = { success: true, data: students };
      }
      // 2. POST /api/students
      else if (path === '/api/students' && method === 'POST') {
        const newStudent = clientDb.addStudent(body);
        responseData = { success: true, message: 'Data murid berhasil ditambahkan.', data: newStudent };
      }
      // 3. PUT /api/students/:id
      else if (path.startsWith('/api/students/') && method === 'PUT') {
        const id = path.substring('/api/students/'.length);
        const updated = clientDb.updateStudent(id, body);
        if (!updated) {
          return new Response(JSON.stringify({ success: false, message: 'Murid tidak ditemukan.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        responseData = { success: true, message: 'Data murid berhasil diperbarui.', data: updated };
      }
      // 4. DELETE /api/students/:id
      else if (path.startsWith('/api/students/') && method === 'DELETE') {
        const id = path.substring('/api/students/'.length);
        const deleted = clientDb.deleteStudent(id);
        if (!deleted) {
          return new Response(JSON.stringify({ success: false, message: 'Murid tidak ditemukan.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        responseData = { success: true, message: 'Data murid berhasil dihapus.' };
      }
      // 5. GET /api/attendances/today
      else if (path === '/api/attendances/today' && method === 'GET') {
        const today = getTodayDate();
        const result = clientDb.getTodayData(today);
        responseData = {
          success: true,
          date: today,
          stats: result.stats,
          attendances: result.attendances
        };
      }
      // 6. POST /api/attendances/scan
      else if (path === '/api/attendances/scan' && method === 'POST') {
        const { student_id } = body;
        if (!student_id) {
          return new Response(JSON.stringify({ success: false, message: 'QR Code / Student ID tidak valid.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        const today = getTodayDate();
        const currentTime = getCurrentTime();
        const scanResult = clientDb.recordScan(String(student_id).trim(), today, currentTime);
        responseData = scanResult;
      }
      // 7. PUT /api/attendances/:id
      else if (path.startsWith('/api/attendances/') && method === 'PUT') {
        const id = path.substring('/api/attendances/'.length);
        const { status, notes } = body;
        const updated = clientDb.updateAttendance(id, status, notes);
        if (!updated) {
          return new Response(JSON.stringify({ success: false, message: 'Data presensi tidak ditemukan.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        responseData = { success: true, message: 'Status presensi berhasil diperbarui.', data: updated };
      }
      // 8. POST /api/attendances/manual
      else if (path === '/api/attendances/manual' && method === 'POST') {
        const { student_id, date, status, notes } = body;
        const attDate = date || getTodayDate();
        const timeNow = getCurrentTime();
        const saved = clientDb.saveManualAttendance(student_id, attDate, status, notes, timeNow);
        responseData = { success: true, message: 'Presensi manual berhasil disimpan.', data: saved };
      }
      // 9. GET /api/attendances/report
      else if (path === '/api/attendances/report' && method === 'GET') {
        const start_date = url.searchParams.get('start_date');
        const end_date = url.searchParams.get('end_date');
        const class_name = url.searchParams.get('class_name');
        const reportData = clientDb.getReport({ start_date, end_date, class_name });
        responseData = { success: true, count: reportData.length, data: reportData };
      }

      if (responseData !== null) {
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.error('Local API interceptor error:', err);
      return new Response(JSON.stringify({ success: false, message: err.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return originalFetch(input, init);
};
