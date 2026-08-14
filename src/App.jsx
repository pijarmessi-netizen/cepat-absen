import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardScanner from './components/DashboardScanner';
import StudentManagement from './components/StudentManagement';
import AttendanceReport from './components/AttendanceReport';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="app-container" style={{ flex: 1 }}>
        {activeTab === 'scanner' && (
          <DashboardScanner students={students} />
        )}

        {activeTab === 'students' && (
          <StudentManagement students={students} onRefresh={fetchStudents} />
        )}

        {activeTab === 'report' && (
          <AttendanceReport students={students} />
        )}
      </main>

      <footer className="app-footer" style={{
        background: '#FFFFFF',
        borderTop: '1px solid var(--border-color)',
        padding: '14px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        marginTop: 'auto'
      }}>
        <div><strong>Cepat Absen</strong> &copy; {new Date().getFullYear()} - Sistem Presensi QR Code Sekolah</div>
      </footer>
    </div>
  );
}
