const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();

// ─── 1. MIDDLEWARE ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ─── 2. DATABASE ──────────────────────────────────────────────────────────────
const db = mysql.createConnection({
    host:     'localhost',
    user:     'root',
    password: 'Puranik@1974',
    database: 'attendance_system'
});

db.connect(err => {
    if (err) { console.error('❌ DB Connection Error:', err); return; }
    console.log('✅ Connected to MySQL Database!');
});

// ─── 3. MULTER STORAGE ────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename:    (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'capture-' + unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── 4. AUTH ──────────────────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
    const { name, roll_no, email, phone, password, role, department, subject, face_encoding } = req.body;
    let query, params;

    if (role === 'Lecturer') {
        query  = `INSERT INTO lecturers (name, email, phone, password, department, subject_specialization, face_encoding) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        params = [name, email, phone, password, department, subject, face_encoding || null];
    } else {
        query  = `INSERT INTO students (name, roll_no, email, phone, password, face_encoding) VALUES (?, ?, ?, ?, ?, ?)`;
        params = [name, roll_no, email, phone, password, face_encoding || null];
    }

    db.query(query, params, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Registration Successful' });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    let query  = role === 'Student'
        ? `SELECT * FROM students  WHERE (email = ? OR roll_no = ?) AND password = ?`
        : `SELECT * FROM lecturers WHERE email = ? AND password = ?`;
    let params = role === 'Student' ? [email, email, password] : [email, password];

    db.query(query, params, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length > 0) {
            const user = results[0];
            delete user.password;
            res.status(200).json({ message: 'Login successful', user });
        } else {
            res.status(401).json({ error: 'Invalid ID/Email or Password' });
        }
    });
});

// ─── 5. LEAVE APIs ────────────────────────────────────────────────────────────
app.post('/api/submit-leave', (req, res) => {
    const { roll_no, name, leave_date, reason, subject_name } = req.body;
    db.query(
        `INSERT INTO leave_requests (student_roll_no, student_name, leave_date, reason, subject_name, status) VALUES (?, ?, ?, ?, ?, 'Pending')`,
        [roll_no, name, leave_date, reason, subject_name],
        (err, result) => {
            if (err) return res.status(500).json({ error: "Failed to save leave." });
            res.status(200).json({ message: "Submitted!", id: result.insertId });
        }
    );
});

app.get('/api/leave-history/:roll_no', (req, res) => {
    db.query(
        `SELECT id, student_roll_no, student_name, leave_date, reason, status, created_at
         FROM leave_requests WHERE student_roll_no = ? ORDER BY leave_date DESC`,
        [req.params.roll_no],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

app.get('/api/leave-requests', (req, res) => {
    db.query("SELECT * FROM leave_requests ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Fetch failed" });
        res.json(results);
    });
});

app.put('/api/leave-requests/:id', (req, res) => {
    db.query("UPDATE leave_requests SET status = ? WHERE id = ?", [req.body.status, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "Update failed" });
        res.json({ message: "Status updated!" });
    });
});

// ─── 6. ATTENDANCE APIs ───────────────────────────────────────────────────────

// ✅ FIX: Returns ALL students with their Present/Absent status for today
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
            WHERE DATE(date) = CURDATE()
              AND status = 'Present'
        ) att ON s.student_id = att.student_id
        ORDER BY s.name ASC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ✅ FIX: Face recognition → mark attendance for SPECIFIC subject
//    Frontend must send subjectId in the multipart form (or defaults to 1)
app.post('/api/upload-attendance', upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded.' });

    const imagePath      = path.resolve(req.file.path);
    const subjectId      = req.body.subjectId || 1;               // lecturer selects subject
    const pythonProcess  = spawn('python', [path.join(__dirname, 'recognize.py'), imagePath]);

    let pythonData = "";
    pythonProcess.stdout.on('data', d => { pythonData += d.toString(); });
    pythonProcess.stderr.on('data', d => { console.error('Python STDERR:', d.toString()); });

    pythonProcess.on('close', () => {
        // Clean up the temp upload file after recognition
        fs.unlink(imagePath, () => {});

        try {
            const result = JSON.parse(pythonData.trim());

            if (!result.success) {
                return res.json({ success: false, message: result.message || "Face not recognized" });
            }

            const rollNo = result.roll_no;
            const today  = new Date().toISOString().split('T')[0];

            db.query(
                "SELECT student_id FROM students WHERE roll_no = ?",
                [rollNo],
                (err, students) => {
                    if (err || students.length === 0)
                        return res.json({ success: false, message: "Roll number not found in DB" });

                    const studentId = students[0].student_id;

                    // Prevent double-marking for the same subject on same day
                    db.query(
                        `SELECT record_id FROM attendance_records WHERE student_id = ? AND subject_id = ? AND DATE(date) = ?`,
                        [studentId, subjectId, today],
                        (checkErr, existing) => {
                            if (existing && existing.length > 0)
                                return res.json({ success: false, message: `${rollNo} already marked today for this subject.` });

                            db.query(
                                `INSERT INTO attendance_records (student_id, subject_id, date, status) VALUES (?, ?, ?, 'Present')`,
                                [studentId, subjectId, today],
                                (insErr) => {
                                    if (insErr) return res.json({ success: false, message: "DB insert failed: " + insErr.message });
                                    res.json({ success: true, message: `✅ Attendance marked for ${rollNo}` });
                                }
                            );
                        }
                    );
                }
            );
        } catch (e) {
            console.error("JSON parse error:", e, "| Raw output:", pythonData);
            res.status(500).json({ success: false, message: "Recognition script returned invalid data" });
        }
    });
});

// ─── 7. STUDENT & TIMETABLE APIs ─────────────────────────────────────────────
app.get('/api/students', (req, res) => {
    db.query("SELECT student_id, name, roll_no, email, phone FROM students", (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(results);
    });
});

app.get('/api/timetable', (req, res) => {
    db.query(
        "SELECT * FROM timetable ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday')",
        (err, results) => {
            if (err) return res.status(500).json({ error: "Database error" });
            res.json(results);
        }
    );
});

// ─── 8. PROFILE APIs ─────────────────────────────────────────────────────────
app.get('/api/student-details/:usn', (req, res) => {
    db.query(
        "SELECT name, roll_no, email, phone, face_encoding FROM students WHERE roll_no = ?",
        [req.params.usn],
        (err, results) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (!results.length) return res.status(404).json({ error: "Student not found" });
            res.json(results[0]);
        }
    );
});

app.post('/api/update-profile', (req, res) => {
    const { usn, name, email, phone, face_encoding } = req.body;
    db.query(
        `UPDATE students SET name=?, email=?, phone=?, face_encoding=? WHERE roll_no=?`,
        [name, email, phone, face_encoding, usn],
        (err) => {
            if (err) return res.status(500).json({ error: "Failed to update profile" });
            res.status(200).json({ message: "Saved Successfully" });
        }
    );
});

// ─── 9. REPORTS & ANALYTICS ───────────────────────────────────────────────────

// ✅ FIX: Single stats endpoint (was duplicated before, causing silent overwrite)
app.get('/api/attendance-stats', (req, res) => {
    const query = `
        SELECT status, COUNT(*) AS count
        FROM attendance_records
        WHERE MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())
        GROUP BY status
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: "Database error" });
        let stats = { present: 0, absent: 0, late: 0 };
        results.forEach(row => {
            if (row.status === 'Present') stats.present = row.count;
            if (row.status === 'Absent')  stats.absent  = row.count;
            if (row.status === 'Late')    stats.late    = row.count;
        });
        res.json(stats);
    });
});

// ✅ FIX: attendance-report now works without mandatory date params
app.get('/api/attendance-report', (req, res) => {
    const { startDate, endDate } = req.query;

    // If no dates given, default to current month
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    .toISOString().split('T')[0];
    const end   = endDate   || new Date().toISOString().split('T')[0];

    const query = `
        SELECT 
            s.roll_no,
            s.name,
            COALESCE(sub.subject_name, 'General') AS subject_name,
            a.status,
            DATE_FORMAT(a.date, '%Y-%m-%d') AS date
        FROM attendance_records a
        JOIN students s ON a.student_id = s.student_id
        LEFT JOIN subjects sub ON a.subject_id = sub.subject_id
        WHERE a.date BETWEEN ? AND ?
        ORDER BY a.date DESC, s.roll_no ASC
    `;
    db.query(query, [start, end], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
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
                NULLIF((SELECT COUNT(DISTINCT date) FROM attendance_records), 0)) * 100, 2
            ) AS percentage
        FROM students s
        LEFT JOIN attendance_records a ON s.student_id = a.student_id
        GROUP BY s.student_id, s.roll_no, s.name
        HAVING percentage < 75 OR percentage IS NULL
        ORDER BY percentage ASC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ─── 10. ERROR HANDLING ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route not found: " + req.path }));
app.use((err, req, res, next) => {
    console.error("🔴 SERVER ERROR:", err.stack);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://192.168.1.2:${PORT}`);
});
