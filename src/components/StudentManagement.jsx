import React, { useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Printer, Phone, School, QrCode, MessageCircle, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import PrintQRModal from './PrintQRModal';
import { QRCodeCanvas } from 'qrcode.react';

export default function StudentManagement({ students = [], onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');

  const downloadQRDirect = (studentId, studentName) => {
    const canvas = document.getElementById(`qr-download-${studentId}`);
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${studentName.replace(/\s+/g, '_')}_${studentId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };
  const [classFilter, setClassFilter] = useState('ALL');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    student_id: '',
    fullname: '',
    nickname: '',
    class_name: 'TK A',
    guardian_phone: ''
  });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [customAlert, setCustomAlert] = useState(null); // { type: 'success' | 'error', message: '...' }
  const [customConfirm, setCustomConfirm] = useState(null); // { message: '...', onConfirm: () => {} }

  // Extract unique class list
  const classList = Array.from(new Set(students.map(s => s.class_name))).sort();

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nickname && s.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.student_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === 'ALL' || s.class_name === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      student_id: String(Date.now()).slice(-6), // Default auto unique NISN
      fullname: '',
      nickname: '',
      class_name: classList[0] || 'TK A',
      guardian_phone: ''
    });
    setShowFormModal(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      student_id: student.student_id,
      fullname: student.fullname,
      nickname: student.nickname || '',
      class_name: student.class_name,
      guardian_phone: student.guardian_phone || ''
    });
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const url = editingStudent
        ? `/api/students/${editingStudent.student_id}`
        : '/api/students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setShowFormModal(false);
        onRefresh();
        setCustomAlert({ type: 'success', message: editingStudent ? 'Data murid berhasil diperbarui.' : 'Data murid berhasil ditambahkan.' });
      } else {
        setCustomAlert({ type: 'error', message: data.message || 'Gagal menyimpan data murid.' });
      }
    } catch (err) {
      setCustomAlert({ type: 'error', message: 'Terjadi kesalahan koneksi.' });
    }
  };

  const handleDelete = (studentId, fullname) => {
    setCustomConfirm({
      message: `Apakah Anda yakin ingin menghapus data murid "${fullname}"?`,
      onConfirm: async () => {
        setCustomConfirm(null);
        try {
          const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            onRefresh();
            setCustomAlert({ type: 'success', message: 'Data murid berhasil dihapus.' });
          } else {
            setCustomAlert({ type: 'error', message: data.message });
          }
        } catch (err) {
          setCustomAlert({ type: 'error', message: 'Gagal menghapus data murid.' });
        }
      }
    });
  };

  const formatPhoneForWA = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* HEADER & TOP ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', color: 'var(--text-dark)' }}>Data Murid</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Total {students.length} murid terdaftar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', width: 'auto' }}>
          <button className="btn btn-secondary" onClick={() => setShowPrintModal(true)} style={{ padding: '8px 12px' }}>
            <Printer size={15} />
            <span style={{ fontSize: '0.82rem' }}>Cetak Kartu</span>
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ padding: '8px 12px' }}>
            <Plus size={15} />
            <span style={{ fontSize: '0.82rem' }}>Tambah Murid</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="card" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', padding: '12px' }}>
        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px', fontSize: '0.88rem', padding: '8px 10px 8px 34px' }}
            placeholder="Cari nama / NISN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '130px' }}>
          <select
            className="form-select"
            style={{ padding: '8px 10px', fontSize: '0.88rem' }}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="ALL">Semua Kelas</option>
            {classList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. DESKTOP TABLE VIEW */}
      <div className="card desktop-table-view" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--sky-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>NISN / ID</th>
                <th style={{ padding: '12px 16px' }}>Nama Lengkap</th>
                <th style={{ padding: '12px 16px' }}>Panggilan</th>
                <th style={{ padding: '12px 16px' }}>Kelas</th>
                <th style={{ padding: '12px 16px' }}>HP Ortu</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Tidak ada data murid yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.student_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {s.student_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {s.fullname}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                      {s.nickname || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'var(--sky-light)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {s.class_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      {s.guardian_phone ? (
                        <a
                          href={`https://wa.me/${formatPhoneForWA(s.guardian_phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--status-hadir-text)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <Phone size={13} />
                          {s.guardian_phone}
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 8px', color: 'var(--primary)', borderColor: 'var(--sky-light)' }}
                          onClick={() => downloadQRDirect(s.student_id, s.fullname)}
                          title="Unduh QR Code"
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 8px' }}
                          onClick={() => handleOpenEditModal(s)}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '5px 8px' }}
                          onClick={() => handleDelete(s.student_id, s.fullname)}
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MOBILE TOUCH-FRIENDLY COMPACT CARDS */}
      <div className="mobile-cards-view">
        {filteredStudents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Tidak ada data murid yang ditemukan.
          </div>
        ) : (
          filteredStudents.map((s) => (
            <div key={s.student_id} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--sky-blue), var(--primary))',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0
                  }}>
                    {(s.nickname || s.fullname)[0].toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.fullname}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '1px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>ID: {s.student_id}</span>
                      <span>•</span>
                      <span style={{ background: 'var(--sky-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {s.class_name}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px 8px', color: 'var(--primary)', borderColor: 'var(--sky-light)' }}
                    onClick={() => downloadQRDirect(s.student_id, s.fullname)}
                    title="Unduh QR Code"
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px 8px' }}
                    onClick={() => handleOpenEditModal(s)}
                    title="Edit"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 8px' }}
                    onClick={() => handleDelete(s.student_id, s.fullname)}
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {s.guardian_phone && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--sky-bg)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Kontak Ortu:</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                      href={`tel:${s.guardian_phone}`}
                      style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <Phone size={12} /> {s.guardian_phone}
                    </a>
                    <a
                      href={`https://wa.me/${formatPhoneForWA(s.guardian_phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--status-hadir-text)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                    >
                      <MessageCircle size={12} /> WA
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* FORM MODAL ADD / EDIT STUDENT */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="card modal-content-mobile" style={{ maxWidth: '440px', width: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '14px' }}>
              {editingStudent ? 'Edit Data Murid' : 'Tambah Murid Baru'}
            </h3>

            <form onSubmit={handleSubmitForm}>
              <div className="form-group">
                <label className="form-label">NISN / ID Unik QR Code:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Masukkan NISN atau ID unik..."
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  disabled={!!editingStudent}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap Murid:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Muhammad Al-Fatih..."
                  value={formData.fullname}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nama Panggilan:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Fatih..."
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Kelas:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Kelas TK-A / 1-A SD..."
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">No. HP Orang Tua / WhatsApp:</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Contoh: 08123456789..."
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowFormModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Murid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT QR CODE MODAL */}
      {showPrintModal && (
        <PrintQRModal
          students={students}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* HIDDEN GENERATOR FOR DIRECT QR DOWNLOAD */}
      <div style={{ display: 'none' }}>
        {students.map((s) => (
          <QRCodeCanvas
            key={s.student_id}
            id={`qr-download-${s.student_id}`}
            value={s.student_id}
            size={256}
            level="H"
            includeMargin={true}
          />
        ))}
      </div>

      {/* CUSTOM ALERT MODAL */}
      {customAlert && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="card modal-content-mobile" style={{ maxWidth: '360px', width: '100%', textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{
              background: customAlert.type === 'success' ? 'var(--status-hadir-bg)' : 'var(--status-alfa-bg)',
              color: customAlert.type === 'success' ? 'var(--status-hadir-text)' : 'var(--status-alfa-text)',
              padding: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {customAlert.type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: 'var(--text-dark)' }}>
                {customAlert.type === 'success' ? 'Berhasil' : 'Pemberitahuan'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {customAlert.message}
              </p>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setCustomAlert(null)}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM MODAL */}
      {customConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="card modal-content-mobile" style={{ maxWidth: '380px', width: '100%', textAlign: 'center', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{
              background: 'var(--status-izin-bg)',
              color: 'var(--status-izin-text)',
              padding: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '8px', color: 'var(--text-dark)' }}>Konfirmasi Tindakan</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {customConfirm.message}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCustomConfirm(null)}>
                Batal
              </button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--status-alfa-text)', border: 'none' }} onClick={customConfirm.onConfirm}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
