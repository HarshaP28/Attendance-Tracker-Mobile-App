const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const nodemailer = require('nodemailer');
const app = express();

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Serve the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- 2. DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'Puranik@1974', 
    database: 'attendance_system'
});

db.connect(err => {
    if (err) {
        console.error('❌ DB Connection Error:', err);
        return;
    }
    console.log('✅ Connected to MySQL Database!');
});

// --- 3. STORAGE CONFIGURATION (MULTER) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'capture-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } 
});

// --- 4. AUTHENTICATION & LEAVE APIs ---

app.post('/api/register', (req, res) => {
    const { name, roll_no, email, phone, password, role, department, subject } = req.body;
    let query, params;

    if (role === 'Lecturer') {
        query = `INSERT INTO lecturers (name, email, phone, password, department, subject_specialization) VALUES (?, ?, ?, ?, ?, ?)`;
        params = [name, email, phone, password, department, subject];
    } else {
        query = `INSERT INTO students (name, roll_no, email, phone, password) VALUES (?, ?, ?, ?, ?)`;
        params = [name, roll_no, email, phone, password];
    }

    db.query(query, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Registration Successful' });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body; 
    let query, params;

    if (role === 'Student') {
        query = `SELECT * FROM students WHERE (email = ? OR roll_no = ?) AND password = ?`;
        params = [email, email, password];
    } else if (role === 'Lecturer') {
        query = `SELECT * FROM lecturers WHERE email = ? AND password = ?`;
        params = [email, password];
    } else if (role === 'Admin') {
        query = `SELECT * FROM admins WHERE email = ? AND password = ?`;
        params = [email, password];
    }

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length > 0) {
            const user = results[0];
            delete user.password; // Don't send password back to frontend
            res.status(200).json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ error: 'Invalid ID/Email or Password' });
        }
    });
});

app.post('/api/submit-leave', (req, res) => {
    const { roll_no, name, leave_date, reason, subject_name } = req.body;
    const query = `INSERT INTO leave_requests (student_roll_no, student_name, leave_date, reason, subject_name, status) VALUES (?, ?, ?, ?, ?, 'Pending')`;
    db.query(query, [roll_no, name, leave_date, reason, subject_name], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to save leave." });
        res.status(200).json({ message: "Submitted!", id: result.insertId });
    });
});

// GET LEAVE HISTORY
app.get('/api/leave-history/:roll_no', (req, res) => {
    const rollNo = req.params.roll_no;
    const query = `
        SELECT 
            id, 
            student_roll_no, 
            student_name, 
            leave_date, 
            reason, 
            status, 
            created_at 
        FROM leave_requests 
        WHERE student_roll_no = ? 
        ORDER BY leave_date DESC
    `;

    db.query(query, [rollNo], (err, results) => {
        if (err) {
            console.error("❌ SQL Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json(results);
    });
});

app.get('/api/leave-requests', (req, res) => {
    db.query("SELECT * FROM leave_requests ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Fetch failed" });
        res.json(results);
    });
});

app.put('/api/leave-requests/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 
    db.query("UPDATE leave_requests SET status = ? WHERE id = ?", [status, id], (err) => {
        if (err) return res.status(500).json({ error: "Update failed" });
        res.json({ message: "Status updated!" });
    });
});

// --- 5. ATTENDANCE APIs ---

app.get('/api/attendance-today', (req, res) => {
    const query = `
        SELECT 
            s.roll_no, 
            s.name, 
            CASE 
                WHEN att.student_id IS NOT NULL THEN 'Present' 
                ELSE 'Absent' 
            END AS attendance_status
        FROM students s
        LEFT JOIN (
            SELECT DISTINCT student_id 
            FROM attendance_records 
            WHERE date = CURDATE()
        ) att ON s.student_id = att.student_id
        ORDER BY s.name ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ SQL Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/upload-attendance', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded.' });

    const imagePath = path.resolve(req.file.path);
    const pythonScriptPath = path.join(__dirname, 'recognize.py');
    const pythonProcess = spawn('python', [pythonScriptPath, imagePath]);

    let pythonData = "";
    pythonProcess.stdout.on('data', (data) => { pythonData += data.toString(); });

    pythonProcess.on('close', (code) => {
        try {
            const result = JSON.parse(pythonData.trim());
            if (result.success) {
                const rollNo = result.roll_no;
                const today = new Date().toISOString().split('T')[0];

                db.query("SELECT student_id FROM students WHERE roll_no = ?", [rollNo], (err, students) => {
                    if (err || students.length === 0) return res.json({ success: false, message: "Roll not found in DB" });

                    const studentId = students[0].student_id;
                    const insertSql = `INSERT INTO attendance_records (student_id, subject_id, date, status) VALUES (?, 1, ?, 'Present')`;
                    db.query(insertSql, [studentId, today], (insErr) => {
                        if (insErr) return res.json({ success: false, message: "Already marked today." });
                        res.json({ success: true, message: `Attendance marked: ${rollNo}` });
                    });
                });
            } else {
                res.json({ success: false, message: result.message || "Face not recognized" });
            }
        } catch (e) {
            res.status(500).json({ success: false, message: "Recognition script error" });
        }
    });
});

app.get('/api/students', (req, res) => {
    db.query("SELECT * FROM students", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

app.get('/api/timetable', (req, res) => {
    const query = "SELECT * FROM timetable ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

app.get('/api/attendance-shortage', (req, res) => {
    const query = `
        SELECT 
            s.roll_no, 
            s.name, 
            COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) AS attended_sessions,
            (SELECT COUNT(DISTINCT date) FROM attendance_records) AS total_working_days,
            ROUND(
                (COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) / 
                (SELECT COUNT(DISTINCT date) FROM attendance_records)) * 100, 2
            ) AS percentage
        FROM students s
        LEFT JOIN attendance_records a ON s.student_id = a.student_id
        GROUP BY s.student_id, s.roll_no, s.name
        HAVING percentage < 75 OR percentage IS NULL
        ORDER BY percentage ASC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("❌ SQL Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json(results);
    });
});


// --- 1. Fetch current Student details (Including Photo) ---
app.get('/api/student-details/:usn', (req, res) => {
    const { usn } = req.params;
    // We select name, email, phone, and the photo column (face_encoding) [cite: 1, 6]
    const query = "SELECT name, roll_no, email, phone, face_encoding FROM students WHERE roll_no = ?";
    
    db.query(query, [usn], (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (results.length === 0) return res.status(404).json({ error: "Student not found" });
        res.json(results[0]);
    });
});

// --- 2. Update Student Profile (Now including image update) ---
app.post('/api/update-profile', (req, res) => {
    const { usn, name, email, phone, face_encoding } = req.body;
    const query = `
        UPDATE students 
        SET name = ?, email = ?, phone = ?, face_encoding = ? 
        WHERE roll_no = ?`; 
    db.query(query, [name, email, phone, face_encoding, usn], (err, result) => {
        if (err) return res.status(500).json({ error: "Failed to update profile" });
        res.status(200).json({ message: "Saved Successfully" });
    });
});

// Counts Present records from attendance_records,
// and calculates absent as (total_students × working_days) - present
app.get('/api/attendance-stats', (req, res) => {
    const query = `
        SELECT
            (SELECT COUNT(*) FROM attendance_records 
             WHERE status = 'Present'
               AND MONTH(date) = MONTH(CURRENT_DATE())
               AND YEAR(date)  = YEAR(CURRENT_DATE())
            ) AS present,
 
            (
                (SELECT COUNT(*) FROM students) *
                (SELECT COUNT(DISTINCT date) FROM attendance_records
                 WHERE MONTH(date) = MONTH(CURRENT_DATE())
                   AND YEAR(date)  = YEAR(CURRENT_DATE()))
            ) - 
            (SELECT COUNT(*) FROM attendance_records
             WHERE status = 'Present'
               AND MONTH(date) = MONTH(CURRENT_DATE())
               AND YEAR(date)  = YEAR(CURRENT_DATE())
            ) AS absent,
 
            (SELECT COUNT(*) FROM students) AS total_students,
 
            (SELECT COUNT(DISTINCT date) FROM attendance_records
             WHERE MONTH(date) = MONTH(CURRENT_DATE())
               AND YEAR(date)  = YEAR(CURRENT_DATE())
            ) AS total_days
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const row = results[0];
        res.json({
            present:        row.present        || 0,
            absent:         row.absent         || 0,
            total_students: row.total_students || 0,
            total_days:     row.total_days     || 0,
        });
    });
});
 
// attendance-report — defaults to current month if no dates given
app.get('/api/attendance-report', (req, res) => {
    const { startDate, endDate } = req.query;
 
    const now   = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end   = endDate   || now.toISOString().split('T')[0];
 
    const query = `
        SELECT 
            s.roll_no,
            s.name,
            COALESCE(sub.subject_name, 'General') AS subject_name,
            a.status,
            DATE_FORMAT(a.date, '%Y-%m-%d') AS date
        FROM attendance_records a
        JOIN  students s   ON a.student_id  = s.student_id
        LEFT JOIN subjects sub ON a.subject_id = sub.subject_id
        WHERE a.date BETWEEN ? AND ?
        ORDER BY a.date DESC, s.roll_no ASC
    `;
    db.query(query, [start, end], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ============================================================================
// --- 6. ADMIN APIs ---
// ============================================================================

// 1. Get System Summary
app.get('/api/admin/summary', (req, res) => {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM students) as total_students,
            (SELECT COUNT(*) FROM lecturers) as total_lecturers,
            (SELECT COUNT(*) FROM attendance_records) as total_attendance,
            (SELECT COUNT(*) FROM leave_requests WHERE status = 'Pending') as pending_leaves,
            (SELECT COUNT(DISTINCT student_id) FROM attendance_records WHERE date = CURDATE() AND status = 'Present') as today_present
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// 2. Get All Lecturers
app.get('/api/admin/lecturers', (req, res) => {
    db.query("SELECT * FROM lecturers", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. Get All Attendance Records (Last 100)
app.get('/api/admin/attendance', (req, res) => {
    const query = `
        SELECT 
            a.record_id, 
            s.name, 
            s.roll_no, 
            COALESCE(sub.subject_name, 'General') as subject_name, 
            a.status, 
            DATE_FORMAT(a.date, '%Y-%m-%d') as date
        FROM attendance_records a
        JOIN students s ON a.student_id = s.student_id
        LEFT JOIN subjects sub ON a.subject_id = sub.subject_id
        ORDER BY a.date DESC, a.record_id DESC
        LIMIT 100
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 4. Delete a Student
app.delete('/api/admin/students/:id', (req, res) => {
    // Note: Because of foreign keys, you may need ON DELETE CASCADE in your DB, 
    // or you must delete related attendance/leaves first. Assuming CASCADE here.
    db.query("DELETE FROM students WHERE student_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Student deleted" });
    });
});

// 5. Delete a Lecturer
app.delete('/api/admin/lecturers/:id', (req, res) => {
    db.query("DELETE FROM lecturers WHERE lecturer_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Lecturer deleted" });
    });
});

// 6. Delete an Attendance Record
app.delete('/api/admin/attendance/:id', (req, res) => {
    db.query("DELETE FROM attendance_records WHERE record_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Record deleted" });
    });
});


// ─── ADD THESE ROUTES TO YOUR index.js (before the error handling section) ───
// Also add at the top of index.js:
// const nodemailer = require('nodemailer');

// ── Gmail SMTP Transporter ────────────────────────────────────────────────────
// IMPORTANT: Replace with your Gmail and App Password
// To get App Password: Google Account → Security → 2-Step Verification → App Passwords


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'harshapuranik79@gmail.com',      // ← Replace with your Gmail
        pass: 'knqgauwphcyjvhlh',    // ← Replace with Gmail App Password (NOT your real password)
    }
});

// ── 1. Overall Class Attendance Report ───────────────────────────────────────
// Returns attendance % for every student (used in Admin Reports tab)
app.get('/api/admin/class-report', (req, res) => {
    const query = `
        SELECT 
            s.student_id,
            s.name,
            s.roll_no,
            s.email,
            COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) AS attended,
            (SELECT COUNT(DISTINCT date) FROM attendance_records) AS total_days,
            ROUND(
                COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) /
                NULLIF((SELECT COUNT(DISTINCT date) FROM attendance_records), 0) * 100, 1
            ) AS percentage
        FROM students s
        LEFT JOIN attendance_records a ON s.student_id = a.student_id
        GROUP BY s.student_id, s.name, s.roll_no, s.email
        ORDER BY percentage ASC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ── 2. Single Student Attendance Report ──────────────────────────────────────
app.get('/api/admin/student-report/:roll_no', (req, res) => {
    const { roll_no } = req.params;
    const query = `
        SELECT 
            s.name,
            s.roll_no,
            s.email,
            COALESCE(sub.subject_name, 'General') AS subject_name,
            COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) AS attended,
            COUNT(DISTINCT a.date) AS total_classes,
            ROUND(
                COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) /
                NULLIF(COUNT(DISTINCT a.date), 0) * 100, 1
            ) AS percentage
        FROM students s
        LEFT JOIN attendance_records a ON s.student_id = a.student_id
        LEFT JOIN subjects sub ON a.subject_id = sub.subject_id
        WHERE s.roll_no = ?
        GROUP BY s.student_id, s.name, s.roll_no, s.email, sub.subject_name
        ORDER BY percentage ASC
    `;
    db.query(query, [roll_no], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ── 3. Student's own attendance % (called on StudentDashboard load) ──────────
app.get('/api/student-attendance/:roll_no', (req, res) => {
    const { roll_no } = req.params;
    const query = `
        SELECT 
            s.name,
            s.roll_no,
            COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) AS attended,
            (SELECT COUNT(DISTINCT date) FROM attendance_records) AS total_days,
            ROUND(
                COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) /
                NULLIF((SELECT COUNT(DISTINCT date) FROM attendance_records), 0) * 100, 1
            ) AS percentage,
            COALESCE(
                (SELECT GROUP_CONCAT(sub2.subject_name SEPARATOR ', ')
                 FROM attendance_records a2
                 LEFT JOIN subjects sub2 ON a2.subject_id = sub2.subject_id
                 WHERE a2.student_id = s.student_id
                 GROUP BY a2.student_id
                 HAVING ROUND(
                     COUNT(DISTINCT CASE WHEN a2.status = 'Present' THEN a2.date END) /
                     NULLIF(COUNT(DISTINCT a2.date), 0) * 100, 1
                 ) < 75
                ), ''
            ) AS shortage_subjects
        FROM students s
        LEFT JOIN attendance_records a ON s.student_id = a.student_id
        WHERE s.roll_no = ?
        GROUP BY s.student_id, s.name, s.roll_no
    `;
    db.query(query, [roll_no], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || { attended: 0, total_days: 0, percentage: 0 });
    });
});

// ── 4. Send Email Notifications to students below 75% ────────────────────────
app.post('/api/admin/send-shortage-notifications', async (req, res) => {
    try {
        // Get all students below 75%
        const [students] = await db.promise().query(`
            SELECT 
                s.name, s.email, s.roll_no,
                ROUND(
                    COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) /
                    NULLIF((SELECT COUNT(DISTINCT date) FROM attendance_records), 0) * 100, 1
                ) AS percentage,
                COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.date END) AS attended,
                (SELECT COUNT(DISTINCT date) FROM attendance_records) AS total_days
            FROM students s
            LEFT JOIN attendance_records a ON s.student_id = a.student_id
            GROUP BY s.student_id, s.name, s.email, s.roll_no
            HAVING percentage < 75 OR percentage IS NULL
            ORDER BY percentage ASC
        `);

        if (students.length === 0) {
            return res.json({ success: true, message: 'No students below 75%. No emails sent.' });
        }

        let sentCount = 0;
        let failCount = 0;

        for (const student of students)  {
            if (!student.email) { failCount++; continue; }

            const percentage = student.percentage ?? 0;
            const attended   = student.attended   ?? 0;
            const totalDays  = student.total_days ?? 0;

            const mailOptions = {
                from:    '"AttendancePro" <harshapuranik79@gmail.com>',  // ← same Gmail as above
                to:      student.email,
                subject: `⚠️ Attendance Shortage Warning — ${student.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 12px;">
                        <div style="background: #d32f2f; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0;">⚠️ Attendance Warning</h1>
                        </div>
                        <div style="padding: 25px;">
                            <p style="font-size: 16px;">Dear <strong>${student.name}</strong>,</p>
                            <p>This is an official notification that your attendance has fallen below the required <strong>75%</strong> threshold.</p>
                            
                            <div style="background: #fff3e0; border-left: 4px solid #ff6f00; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #d32f2f;">
                                    Your Attendance: ${percentage}%
                                </p>
                                <p style="margin: 5px 0 0 0; color: #666;">
                                    Present: ${attended} / ${totalDays} days
                                </p>
                            </div>

                            <p>You need to attend more classes to avoid detention. Please meet your class coordinator immediately.</p>
                            
                            <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 15px 0;">
                                <p style="margin: 0; color: #555;"><strong>Roll No:</strong> ${student.roll_no}</p>
                                <p style="margin: 5px 0 0 0; color: #555;"><strong>Required:</strong> 75% attendance</p>
                                <p style="margin: 5px 0 0 0; color: #d32f2f;"><strong>Current:</strong> ${percentage}%</p>
                            </div>

                            <p style="color: #888; font-size: 13px; margin-top: 25px;">
                                This is an automated message from Attendance Pro.<br/>
                                Please do not reply to this email.
                            </p>
                        </div>
                    </div>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                sentCount++;
            } catch (mailErr) {
                console.error(`Failed to send to ${student.email}:`, mailErr);
                failCount++;
            }
        }

        res.json({
            success: true,
            message: `Notifications sent to ${sentCount} student(s). ${failCount > 0 ? `${failCount} failed.` : ''}`,
            total: students.length,
            sent: sentCount,
            failed: failCount
        });

    } catch (err) {
        console.error('Email error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// ─── ADD THESE ROUTES TO index.js (before error handling) ────────────────────

// Temporary OTP store (in memory — good enough for local app)
const otpStore = {};

// ── 1. Send OTP ───────────────────────────────────────────────────────────────
app.post('/api/forgot-password/send-otp', (req, res) => {
    const { email, role } = req.body;
    const table = role === 'Lecturer' ? 'lecturers' : 'students';

    db.query(`SELECT * FROM ${table} WHERE email = ?`, [email], async (err, results) => {
        if (err)               return res.status(500).json({ error: 'Database error' });
        if (!results.length)   return res.status(404).json({ error: 'Email not found. Check your role selection.' });

        // Generate 6-digit OTP
        const otp     = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP
        otpStore[email] = { otp, expires };

        // Send email
        const mailOptions = {
            from:    '"Attendance Pro" <harshapuranik79@gmail.com>',
            to:      email,
            subject: '🔐 Your Password Reset OTP — Attendance Pro',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 12px;">
                    <div style="background: #0f7a4a; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                        <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
                    </div>
                    <div style="padding: 25px; text-align: center;">
                        <p style="font-size: 16px; color: #333;">Your OTP for password reset is:</p>
                        <div style="background: #f0fff8; border: 2px dashed #0f7a4a; border-radius: 12px; padding: 20px; margin: 20px 0;">
                            <h1 style="font-size: 42px; letter-spacing: 12px; color: #0f7a4a; margin: 0;">${otp}</h1>
                        </div>
                        <p style="color: #888; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>.</p>
                        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ success: true, message: 'OTP sent successfully' });
        } catch (mailErr) {
            console.error('OTP email error:', mailErr.message);
            res.status(500).json({ error: 'Failed to send OTP email. Check your Gmail config.' });
        }
    });
});

// ── 2. Verify OTP ─────────────────────────────────────────────────────────────
app.post('/api/forgot-password/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore[email];

    if (!record)                    return res.status(400).json({ error: 'No OTP requested for this email.' });
    if (Date.now() > record.expires) return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    if (record.otp !== otp)         return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });

    // OTP is valid — mark as verified
    otpStore[email].verified = true;
    res.json({ success: true, message: 'OTP verified successfully' });
});

// ── 3. Reset Password ─────────────────────────────────────────────────────────
app.post('/api/forgot-password/reset', (req, res) => {
    const { email, newPassword, role } = req.body;
    const record = otpStore[email];

    if (!record || !record.verified)
        return res.status(400).json({ error: 'Please verify OTP first.' });

    const table = role === 'Lecturer' ? 'lecturers' : 'students';

    db.query(`UPDATE ${table} SET password = ? WHERE email = ?`, [newPassword, email], (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to update password.' });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Email not found.' });

        // Clear OTP after successful reset
        delete otpStore[email];
        res.json({ success: true, message: 'Password reset successfully!' });
    });
});

// --- 7. ERROR HANDLING ---

app.use((req, res) => {
    res.status(404).json({ success: false, message: "API Route not found. Check your URL path." });
});

app.use((err, req, res, next) => {
    console.error("🔴 SERVER ERROR:", err.stack);
    res.status(500).json({ 
        success: false, 
        message: "Internal Server Error", 
        error: err.message 
    });
});


const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://192.168.1.:${PORT}`);
});



