import React from 'react';
import { QrCode, Users, FileText, School } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <>
      {/* TOP HEADER */}
      <header className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-icon">
              <School size={22} />
            </div>
            <div>
              <div className="brand-title">Cepat Absen</div>
              <div className="brand-subtitle">Presensi QR Sekolah</div>
            </div>
          </div>

          {/* DESKTOP NAV LINKS */}
          <nav className="nav-links-desktop">
            <button
              className={`nav-item-desktop ${activeTab === 'scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('scanner')}
            >
              <QrCode size={18} />
              <span>Dashboard Scan</span>
            </button>

            <button
              className={`nav-item-desktop ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <Users size={18} />
              <span>Data Murid & Kartu</span>
            </button>

            <button
              className={`nav-item-desktop ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
            >
              <FileText size={18} />
              <span>Laporan Presensi</span>
            </button>
          </nav>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="bottom-nav">
        <button
          className={`bottom-nav-item ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <div className="nav-icon-wrapper">
            <QrCode size={20} />
          </div>
          <span>Scan QR</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <div className="nav-icon-wrapper">
            <Users size={20} />
          </div>
          <span>Data Murid</span>
        </button>

        <button
          className={`bottom-nav-item ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <div className="nav-icon-wrapper">
            <FileText size={20} />
          </div>
          <span>Laporan</span>
        </button>
      </nav>
    </>
  );
}
