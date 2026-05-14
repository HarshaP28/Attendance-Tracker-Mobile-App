CREATE DATABASE attendance_system;
USE attendance_system;

-- 1. Student Info
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    roll_no VARCHAR(20) UNIQUE,
    face_encoding LONGTEXT  -- Store the 128-d face vector as a string/JSON
);

-- 2. Subjects Info
CREATE TABLE subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    subject_name VARCHAR(50) -- e.g., 'Maths', 'Physics'
);

-- 3. The actual attendance logs
CREATE TABLE attendance_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    subject_id INT,
    date DATE,
    status ENUM('Present', 'Absent', 'Late'),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);

-- Seed some subjects
INSERT INTO subjects (subject_name) VALUES ('Fundamentals Of AI'), ('Probability Theory'), ('Agile Software Engineering'), ('Universal Human Values'), ('Mobile Application Development');

-- forgot to add student's password
ALTER TABLE students ADD COLUMN password VARCHAR(255) AFTER roll_no;

USE attendance_system;

-- Add missing contact details to students
ALTER TABLE students 
ADD COLUMN email VARCHAR(100) UNIQUE AFTER roll_no,
ADD COLUMN phone VARCHAR(20) AFTER email;

-- Create Lecturers Table
CREATE TABLE lecturers (
    lecturer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    department VARCHAR(50)
);

USE attendance_system;

ALTER TABLE lecturers 
ADD COLUMN face_encoding LONGTEXT AFTER password;

select * from students;

select * from lecturers;

ALTER TABLE lecturers 
ADD COLUMN subject_specialization VARCHAR(100) AFTER department;

delete from lecturers where lecturer_id=1;

select * from lecturers;

CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_roll_no VARCHAR(50),
    student_name VARCHAR(100),
    leave_date DATE,
    reason TEXT,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

select * from leave_requests;

ALTER TABLE leave_requests ADD COLUMN subject_name VARCHAR(100);

USE attendance_system;
CREATE TABLE IF NOT EXISTS leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_roll_no VARCHAR(50),
    student_name VARCHAR(100),
    leave_date DATE,
    reason TEXT,
    subject_name VARCHAR(100),
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

select * from leave_requests;

CREATE TABLE timetable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day VARCHAR(20),      -- e.g., 'Monday'
    subject VARCHAR(100), -- e.g., 'Mathematics'
    start_time VARCHAR(10), -- e.g., '09:00 AM'
    end_time VARCHAR(10),   -- e.g., '10:00 AM'
    room VARCHAR(20)      -- e.g., 'LH-01'
);

-- Monday Schedule
INSERT INTO timetable (day, subject, start_time, end_time, room) VALUES 
('Monday', 'Mobile App Dev Lab (MD, SH)', '09:10 AM', '11:10 AM', 'C 504'),
('Monday', 'Probability Theory (SK)', '11:10 AM', '12:10 PM', 'C 404'),
('Monday', 'Fundamentals of AI (KS)', '12:10 PM', '01:10 PM', 'C 404'),
('Monday', 'Mobile App Dev (MD)', '03:50 PM', '04:50 PM', 'C 404');

-- Tuesday Schedule
INSERT INTO timetable (day, subject, start_time, end_time, room) VALUES 
('Tuesday', 'Agile Software Eng Lab (MK, SH)', '09:10 AM', '11:10 AM', 'C 404'),
('Tuesday', 'Fundamentals of AI Lab (KS, SH)', '12:10 PM', '01:10 PM', 'C 504');

-- Wednesday Schedule
INSERT INTO timetable (day, subject, start_time, end_time, room) VALUES 
('Wednesday', 'Agile Software Eng (MK)', '09:10 AM', '10:10 AM', 'C 405'),
('Wednesday', 'Universal Human Values (SH)', '12:10 PM', '01:10 PM', 'C 404');

-- Thursday Schedule
INSERT INTO timetable (day, subject, start_time, end_time, room) VALUES 
('Thursday', 'Mobile App Dev (MD)', '09:10 AM', '10:10 AM', 'C 404'),
('Thursday', 'Probability Theory (SK)', '10:10 AM', '11:10 AM', 'C 405');

-- Friday Schedule
INSERT INTO timetable (day, subject, start_time, end_time, room) VALUES 
('Friday', 'Fundamentals of AI (KS)', '09:10 AM', '10:10 AM', 'C 405'),
('Friday', 'Agile Software Eng (MK)', '10:10 AM', '11:10 AM', 'C 405'),
('Friday', 'Universal Human Values (SH)', '12:10 PM', '01:10 PM', 'C 404'),
('Friday', 'Mentor Session', '01:50 PM', '02:50 PM', 'C 404');