import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { soundFx } from '../utils/audio';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Camera,
  RefreshCw,
  Edit3,
  Search,
  PlusCircle,
  Sparkles,
  School,
  X
} from 'lucide-react';

export default function DashboardScanner({ students = [] }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alfa: 0,
    belumAbsen: 0
  });
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(true);

  // Manual Scan Input for quick testing / barcode reader
  const [manualIdInput, setManualIdInput] = useState('');
  const [scanMessage, setScanMessage] = useState(null);

  // Active Popup Modal for successful scan
  const [popupProfile, setPopupProfile] = useState(null);

  // Manual Attendance Modal (For Izin/Sakit/Alfa)
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    student_id: '',
    status: 'Izin',
    notes: ''
  });

  // Edit status state
  const [editingAttendance, setEditingAttendance] = useState(null);

  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  // Fetch Today's Attendance & Stats
  const fetchTodayData = async () => {
    try {
      const res = await fetch('/api/attendances/today');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setAttendances(data.attendances);
      }
    } catch (err) {
      console.error('Failed to fetch today data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  // Process Scan Submission
  const processScan = async (studentId) => {
    if (!studentId) return;

    try {
      const res = await fetch('/api/attendances/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId })
      });
      const data = await res.json();

      if (data.success) {
        // Success New Scan
        soundFx.playSuccess();
        setPopupProfile({
          fullname: data.student.fullname,
          nickname: data.student.nickname || data.student.fullname,
          class_name: data.student.class_name,
          time: data.attendance.check_in_time,
          student_id: data.student.student_id,
          status: 'Hadir'
        });

        setScanMessage({ type: 'success', text: data.message });

        // Auto close profile modal after 3 seconds
        setTimeout(() => {
          setPopupProfile(null);
        }, 3200);

        fetchTodayData();
      } else {
        // Warning / Error
        if (data.type === 'ALREADY_ATTENDED' || data.alreadyScanned) {
          soundFx.playWarning();
          setScanMessage({ type: 'warning', text: data.message });
        } else {
          soundFx.playError();
          setScanMessage({ type: 'error', text: data.message });
        }
      }
    } catch (err) {
      soundFx.playError();
      setScanMessage({ type: 'error', text: 'Gagal memproses QR Code.' });
    }
  };

  // Initialize QR Code Scanner
  useEffect(() => {
    if (!isScanning) {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(err => console.error("Error clearing scanner", err));
        html5QrcodeScannerRef.current = null;
      }
      return;
    }

    let isMounted = true;
    let isHandlingScan = false;

    const timer = setTimeout(() => {
      if (!isMounted) return;

      try {
        const config = {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.75;
            const finalSize = Math.max(160, Math.min(260, Math.floor(size)));
            return { width: finalSize, height: finalSize };
          },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        const scanner = new Html5QrcodeScanner('qr-reader', config, false);
        html5QrcodeScannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            if (isHandlingScan) return;
            isHandlingScan = true;

            processScan(decodedText.trim());

            setTimeout(() => {
              isHandlingScan = false;
            }, 2500);
          },
          (error) => {
            // Scanner frame scan tick
          }
        );
      } catch (err) {
        console.error("Camera Init Error:", err);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(e => console.error(e));
        html5QrcodeScannerRef.current = null;
      }
    };
  }, [isScanning]);

  const handleManualScanSubmit = (e) => {
    e.preventDefault();
    if (manualIdInput.trim()) {
      processScan(manualIdInput.trim());
      setManualIdInput('');
    }
  };

  const handleSaveManualAttendance = async (e) => {
    e.preventDefault();
    if (!manualForm.student_id) return;

    try {
      const res = await fetch('/api/attendances/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowManualModal(false);
        setManualForm({ student_id: '', status: 'Izin', notes: '' });
        fetchTodayData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Gagal menyimpan presensi manual.');
    }
  };

  const handleUpdateStatus = async (id, status, notes) => {
    try {
      const res = await fetch(`/api/attendances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      const data = await res.json();
      if (data.success) {
        setEditingAttendance(null);
        fetchTodayData();
      }
    } catch (err) {
      alert('Gagal mengedit status.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* HEADER SECTION - COMPACT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', color: 'var(--text-dark)' }}>Presensi Hari Ini</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => fetchTodayData()} style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} />
            <span style={{ fontSize: '0.82rem' }}>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowManualModal(true)} style={{ padding: '8px 12px' }}>
            <PlusCircle size={15} />
            <span style={{ fontSize: '0.82rem' }}>Izin / Sakit</span>
          </button>
        </div>
      </div>

      {/* STATS CARDS - COMPACT 2X2 ON MOBILE */}
      <div className="stats-grid">
        {/* TOTAL HADIR */}
        <div className="card card-soft stat-card-compact" style={{ borderLeft: '4px solid var(--status-hadir-text)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'var(--status-hadir-bg)', color: 'var(--status-hadir-text)' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hadir</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.1 }}>
              {stats.hadir} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {stats.totalStudents}</span>
            </div>
          </div>
        </div>

        {/* IZIN */}
        <div className="card card-soft stat-card-compact" style={{ borderLeft: '4px solid var(--status-izin-text)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'var(--status-izin-bg)', color: 'var(--status-izin-text)' }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Izin</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.1 }}>
              {stats.izin}
            </div>
          </div>
        </div>

        {/* SAKIT */}
        <div className="card card-soft stat-card-compact" style={{ borderLeft: '4px solid var(--status-sakit-text)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'var(--status-sakit-bg)', color: 'var(--status-sakit-text)' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sakit</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.1 }}>
              {stats.sakit}
            </div>
          </div>
        </div>

        {/* ALFA / BELUM ABSEN */}
        <div className="card card-soft stat-card-compact" style={{ borderLeft: '4px solid var(--status-alfa-text)' }}>
          <div className="stat-icon-wrapper" style={{ background: 'var(--status-alfa-bg)', color: 'var(--status-alfa-text)' }}>
            <XCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Belum Absen</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.1 }}>
              {stats.belumAbsen}
            </div>
          </div>
        </div>
      </div>

      {/* SCANNER & ATTENDANCE CONTAINER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', alignItems: 'start' }}>
        
        {/* QR CODE SCANNER CARD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'var(--sky-light)', color: 'var(--primary)', padding: '6px', borderRadius: '8px' }}>
                <Camera size={18} />
              </div>
              <h3 style={{ fontSize: '1rem' }}>Kamera Scanner</h3>
            </div>
            <button
              className="btn btn-outline"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => setIsScanning(!isScanning)}
            >
              {isScanning ? 'Matikan Kamera' : 'Nyalakan Kamera'}
            </button>
          </div>

          {/* SCANNER AREA */}
          {isScanning ? (
            <div style={{ border: '2px dashed var(--sky-blue)', borderRadius: '12px', overflow: 'hidden', padding: '6px', background: 'var(--sky-bg)' }}>
              <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }}></div>
            </div>
          ) : (
            <div style={{ height: '180px', background: 'var(--sky-bg)', border: '2px dashed var(--sky-light)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '8px' }}>
              <Camera size={32} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>Kamera sedang dinonaktifkan.</p>
            </div>
          )}

          {/* QUICK INPUT SCANNER FOR TESTING / BARCODE GUN */}
          <form onSubmit={handleManualScanSubmit}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Input / Scan Manual ID:</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="ID Murid (misal: 2026001)..."
                  value={manualIdInput}
                  onChange={(e) => setManualIdInput(e.target.value)}
                  style={{ padding: '8px 10px', fontSize: '0.9rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>Scan</button>
              </div>
            </div>
          </form>

          {/* ALERT NOTIFICATION BAR */}
          {scanMessage && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: scanMessage.type === 'success' ? 'var(--status-hadir-bg)' : scanMessage.type === 'warning' ? 'var(--status-izin-bg)' : 'var(--status-alfa-bg)',
              color: scanMessage.type === 'success' ? 'var(--status-hadir-text)' : scanMessage.type === 'warning' ? 'var(--status-izin-text)' : 'var(--status-alfa-text)',
              border: `1px solid ${scanMessage.type === 'success' ? 'var(--status-hadir-border)' : scanMessage.type === 'warning' ? 'var(--status-izin-border)' : 'var(--status-alfa-border)'}`
            }}>
              <span>{scanMessage.text}</span>
              <button onClick={() => setScanMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/* LIVE LIST PRESENSI HARI INI */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={18} color="var(--primary)" />
              Presensi Terbaru
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{attendances.length} Murid</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Memuat data presensi...</div>
          ) : attendances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)', background: 'var(--sky-bg)', borderRadius: '10px' }}>
              <School size={30} style={{ opacity: 0.4, marginBottom: '6px' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Belum ada presensi hari ini.</p>
              <p style={{ fontSize: '0.78rem' }}>Scan QR Code murid untuk mulai presensi.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '2px' }}>
              {attendances.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  gap: '8px'
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.fullname}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '1px' }}>
                      <span style={{ fontWeight: 600 }}>{item.class_name}</span>
                      <span>•</span>
                      <span>{item.check_in_time}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span className={`badge badge-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>

                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                      onClick={() => setEditingAttendance(item)}
                      title="Edit Presensi"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SUCCESS POPUP MODAL (REAL-TIME SCAN CONFIRMATION) */}
      {popupProfile && (
        <div className="modal-overlay">
          <div className="scan-profile-modal">
            <div className="scan-avatar">
              {popupProfile.nickname ? popupProfile.nickname[0].toUpperCase() : '★'}
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--status-hadir-bg)', color: 'var(--status-hadir-text)', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
              <Sparkles size={16} /> Presensi Berhasil Dicatat!
            </div>

            <h2 style={{ fontSize: '1.3rem', color: 'var(--text-dark)', marginBottom: '4px' }}>
              {popupProfile.fullname}
            </h2>
            <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '12px' }}>
              {popupProfile.class_name}
            </p>

            <div style={{ background: 'var(--sky-bg)', padding: '10px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Waktu Presensi: <strong style={{ color: 'var(--text-dark)' }}>{popupProfile.time} WIB</strong>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setPopupProfile(null)}
            >
              OK, Lanjut Scan
            </button>
          </div>
        </div>
      )}

      {/* MANUAL ATTENDANCE MODAL (IZIN / SAKIT / ALFA) */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="card modal-content-mobile" style={{ maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Input Presensi Manual</h3>
              <button onClick={() => setShowManualModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveManualAttendance}>
              <div className="form-group">
                <label className="form-label">Pilih Murid:</label>
                <select
                  className="form-select"
                  value={manualForm.student_id}
                  onChange={(e) => setManualForm({ ...manualForm, student_id: e.target.value })}
                  required
                >
                  <option value="">-- Pilih Nama Murid --</option>
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.fullname} ({s.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status Presensi:</label>
                <select
                  className="form-select"
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                >
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alfa">Alfa</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan / Alasan (Opsional):</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Misal: Surat dokter / ada acara keluarga..."
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowManualModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Presensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE STATUS MODAL */}
      {editingAttendance && (
        <div className="modal-overlay">
          <div className="card modal-content-mobile" style={{ maxWidth: '400px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem' }}>Ubah Status Presensi</h3>
              <button onClick={() => setEditingAttendance(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Murid: <strong>{editingAttendance.fullname}</strong> ({editingAttendance.class_name})
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateStatus(editingAttendance.id, editingAttendance.status, editingAttendance.notes);
            }}>
              <div className="form-group">
                <label className="form-label">Status Presensi:</label>
                <select
                  className="form-select"
                  value={editingAttendance.status}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, status: e.target.value })}
                >
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alfa">Alfa</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan:</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingAttendance.notes || ''}
                  onChange={(e) => setEditingAttendance({ ...editingAttendance, notes: e.target.value })}
                  placeholder="Catatan..."
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingAttendance(null)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
