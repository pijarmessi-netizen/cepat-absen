-- =======================================================
-- SKEMA DATABASE CEPAT ABSEN (MySQL / PostgreSQL)
-- Sistem Presensi QR Code Sekolah (TK/SD)
-- =======================================================

-- 1. Tabel students (Data Murid)
CREATE TABLE IF NOT EXISTS `students` (
  `student_id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `fullname` VARCHAR(255) NOT NULL,
  `nickname` VARCHAR(50),
  `class_name` VARCHAR(50) NOT NULL,
  `guardian_phone` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel attendances (Presensi Harian)
CREATE TABLE IF NOT EXISTS `attendances` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `date` DATE NOT NULL,
  `check_in_time` TIME NOT NULL,
  `status` ENUM('Hadir', 'Izin', 'Sakit', 'Alfa') DEFAULT 'Hadir',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `daily_attendance` (`student_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DATA INITIAL SAMPLE (Contoh Data Murid TK & SD)
INSERT INTO `students` (`student_id`, `fullname`, `nickname`, `class_name`, `guardian_phone`) VALUES
('2026001', 'Ananda Putra Wijaya', 'Nanda', 'Kelas TK-A', '081234567890'),
('2026002', 'Bening Safira', 'Bening', 'Kelas TK-A', '081298765432'),
('2026003', 'Candra Kirana', 'Candra', 'Kelas TK-B', '085712345678'),
('2026004', 'Davin Arisanto', 'Davin', 'Kelas 1-A', '087811223344'),
('2026005', 'Elvira Maharani', 'Vira', 'Kelas 1-A', '081399887766'),
('2026006', 'Farel Al-Ghazali', 'Farel', 'Kelas 2-B', '085244556677')
ON DUPLICATE KEY UPDATE `fullname` = VALUES(`fullname`);
