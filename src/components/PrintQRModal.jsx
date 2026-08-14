import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, School, Filter } from 'lucide-react';

export default function PrintQRModal({ students = [], onClose }) {
  const [selectedClass, setSelectedClass] = useState('ALL');

  // Filter unique classes
  const classList = Array.from(new Set(students.map(s => s.class_name))).sort();

  const filteredStudents = selectedClass === 'ALL'
    ? students
    : students.filter(s => s.class_name === selectedClass);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '20px', overflowY: 'auto' }}>
      <div className="card modal-content-mobile" style={{ maxWidth: '900px', width: '100%', marginBottom: '40px' }}>
        
        {/* MODAL HEADER (NO-PRINT) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Cetak Kartu QR Murid</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Format kartu ID presensi siap cetak.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="ALL">Semua Kelas ({students.length})</option>
                {classList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '7px 12px', fontSize: '0.82rem' }}>
              <Printer size={16} />
              <span>Cetak (Print)</span>
            </button>

            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE AREA (A4 GRID LAYOUT) */}
        <div className="print-area">
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '14px',
            padding: '6px'
          }}>
            {filteredStudents.map((s) => (
              <div key={s.student_id} style={{
                border: '2px solid var(--primary)',
                borderRadius: '14px',
                padding: '14px',
                background: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                breakInside: 'avoid',
                pageBreakInside: 'avoid'
              }}>
                {/* CARD HEADER / LOGO SEKOLAH */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderBottom: '2px solid var(--sky-light)',
                  paddingBottom: '6px',
                  width: '100%',
                  justifyContent: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <School size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.02em', lineHeight: 1.1 }}>
                      KARTU PRESENSI
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      CEPAT ABSEN QR
                    </div>
                  </div>
                </div>

                {/* QR CODE DISPLAY */}
                <div style={{
                  background: '#FFFFFF',
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'inline-flex',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                  marginBottom: '10px'
                }}>
                  <QRCodeSVG
                    value={s.student_id}
                    size={120}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* STUDENT DETAILS */}
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '2px' }}>
                    {s.fullname}
                  </div>
                  
                  {s.nickname && (
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                      ( {s.nickname} )
                    </div>
                  )}

                  <div style={{ display: 'inline-block', background: 'var(--sky-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                    {s.class_name}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
                    NISN: {s.student_id}
                  </div>
                </div>

                {/* FOOTER TIP */}
                <div style={{
                  marginTop: '10px',
                  paddingTop: '6px',
                  borderTop: '1px dashed var(--border-color)',
                  width: '100%',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)'
                }}>
                  Tunjukkan kartu ini ke kamera saat hadir
                </div>

              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Tidak ada data murid pada kelas ini.
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
