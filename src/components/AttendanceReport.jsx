import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, School, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export default function AttendanceReport({ students = [] }) {
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedClass, setSelectedClass] = useState('ALL');

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Class list
  const classList = Array.from(new Set(students.map(s => s.class_name))).sort();

  const fetchReport = async () => {
    setLoading(true);
    try {
      let query = `/api/attendances/report?start_date=${selectedDate}&end_date=${selectedDate}`;
      if (selectedClass !== 'ALL') {
        query += `&class_name=${encodeURIComponent(selectedClass)}`;
      }

      const res = await fetch(query);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate, selectedClass]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    // CSV Headers
    const headers = ['No', 'Tanggal', 'Jam Scan', 'NISN / ID Murid', 'Nama Lengkap', 'Panggilan', 'Kelas', 'Status Presensi', 'No HP Ortu', 'Catatan'];
    
    // CSV Rows
    const rows = reportData.map((row, idx) => [
      idx + 1,
      row.date,
      row.check_in_time,
      `="${row.student_id}"`, // Prevent Excel stripping leading zeros
      `"${row.fullname.replace(/"/g, '""')}"`,
      `"${(row.nickname || '').replace(/"/g, '""')}"`,
      `"${row.class_name}"`,
      row.status,
      `="${row.guardian_phone || ''}"`,
      `"${(row.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Presensi_CepatAbsen_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Summary Counters
  const totalHadir = reportData.filter(r => r.status === 'Hadir').length;
  const totalIzin = reportData.filter(r => r.status === 'Izin').length;
  const totalSakit = reportData.filter(r => r.status === 'Sakit').length;
  const totalAlfa = reportData.filter(r => r.status === 'Alfa').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* HEADER & EXPORT ACTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', color: 'var(--text-dark)' }}>Laporan Presensi</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            Rekap kehadiran & ekspor ke CSV / Excel.
          </p>
        </div>

        <button className="btn btn-primary" onClick={exportToCSV} style={{ padding: '8px 14px' }}>
          <Download size={16} />
          <span style={{ fontSize: '0.85rem' }}>Export Excel/CSV</span>
        </button>
      </div>

      {/* FILTER BAR - COMPACT */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end', padding: '12px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Pilih Tanggal:</label>
          <input
            type="date"
            className="form-input"
            style={{ padding: '8px 10px', fontSize: '0.88rem' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Kelas:</label>
          <select
            className="form-select"
            style={{ padding: '8px 10px', fontSize: '0.88rem' }}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="ALL">Semua Kelas</option>
            {classList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SUMMARY PILLS (COMPACT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
        <div className="card card-soft" style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '3px solid var(--status-hadir-text)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hadir</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-hadir-text)' }}>{totalHadir}</div>
        </div>

        <div className="card card-soft" style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '3px solid var(--status-izin-text)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Izin</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-izin-text)' }}>{totalIzin}</div>
        </div>

        <div className="card card-soft" style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '3px solid var(--status-sakit-text)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sakit</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-sakit-text)' }}>{totalSakit}</div>
        </div>

        <div className="card card-soft" style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '3px solid var(--status-alfa-text)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Alfa</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-alfa-text)' }}>{totalAlfa}</div>
        </div>
      </div>

      {/* 1. DESKTOP REPORT TABLE */}
      <div className="card desktop-table-view" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--sky-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Tanggal</th>
                <th style={{ padding: '12px 16px' }}>Jam</th>
                <th style={{ padding: '12px 16px' }}>NISN / ID</th>
                <th style={{ padding: '12px 16px' }}>Nama Murid</th>
                <th style={{ padding: '12px 16px' }}>Kelas</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Memuat data rekapan...
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Tidak ada rekapan presensi pada tanggal & kelas yang dipilih.
                  </td>
                </tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 600 }}>
                      {row.date}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                      {row.check_in_time}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                      {row.student_id}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {row.fullname}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'var(--sky-light)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {row.class_name}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge badge-${row.status.toLowerCase()}`}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {row.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. MOBILE REPORT CARDS */}
      <div className="mobile-cards-view">
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            Memuat data laporan...
          </div>
        ) : reportData.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            Tidak ada rekapan presensi pada periode ini.
          </div>
        ) : (
          reportData.map((row, idx) => (
            <div key={idx} className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-dark)' }}>
                    {row.fullname}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '1px' }}>
                    <span style={{ fontWeight: 600 }}>{row.class_name}</span>
                    <span>•</span>
                    <span>ID: {row.student_id}</span>
                  </div>
                </div>

                <span className={`badge badge-${row.status.toLowerCase()}`}>
                  {row.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sky-bg)', padding: '5px 8px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Tanggal: <strong>{row.date}</strong></span>
                <span>Waktu: <strong>{row.check_in_time}</strong></span>
              </div>

              {row.notes && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dark)', fontStyle: 'italic', background: '#FFFBEB', padding: '4px 8px', borderRadius: '6px' }}>
                  Catatan: {row.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
