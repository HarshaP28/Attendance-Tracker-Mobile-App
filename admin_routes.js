// ─── ADD THESE ROUTES TO YOUR index.js ───────────────────────────────────────

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    db.query(
        "SELECT * FROM admins WHERE email = ? AND password = ?",
        [email, password],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (results.length > 0) {
                const admin = results[0];
                delete admin.password;
                res.status(200).json({ message: 'Login successful', user: admin });
            } else {
                res.status(401).json({ error: 'Invalid email or password' });
            }
        }
    );
});

// Get all lecturers
app.get('/api/admin/lecturers', (req, res) => {
    db.query(
        "SELECT lecturer_id, name, email, phone, department, subject_specialization FROM lecturers",
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// Delete a student
app.delete('/api/admin/students/:id', (req, res) => {
    db.query("DELETE FROM students WHERE student_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Student deleted' });
    });
});

// Delete a lecturer
app.delete('/api/admin/lecturers/:id', (req, res) => {
    db.query("DELETE FROM lecturers WHERE lecturer_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Lecturer deleted' });
    });
});

// Admin summary stats
app.get('/api/admin/summary', (req, res) => {
    const queries = {
        total_students:  "SELECT COUNT(*) AS count FROM students",
        total_lecturers: "SELECT COUNT(*) AS count FROM lecturers",
        total_attendance:"SELECT COUNT(*) AS count FROM attendance_records",
        pending_leaves:  "SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'Pending'",
        today_present:   "SELECT COUNT(*) AS count FROM attendance_records WHERE DATE(date) = CURDATE() AND status = 'Present'",
    };

    const results: any = {};
    const keys = Object.keys(queries);
    let done = 0;

    keys.forEach(key => {
        db.query((queries as any)[key], (err: any, rows: any) => {
            results[key] = err ? 0 : rows[0].count;
            done++;
            if (done === keys.length) res.json(results);
        });
    });
});

// Delete an attendance record
app.delete('/api/admin/attendance/:id', (req, res) => {
    db.query("DELETE FROM attendance_records WHERE record_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Record deleted' });
    });
});

// Get all attendance records with student & subject names
app.get('/api/admin/attendance', (req, res) => {
    const query = `
        SELECT 
            a.record_id, s.name, s.roll_no,
            COALESCE(sub.subject_name, 'General') AS subject_name,
            a.status, DATE_FORMAT(a.date, '%Y-%m-%d') AS date
        FROM attendance_records a
        JOIN students s ON a.student_id = s.student_id
        LEFT JOIN subjects sub ON a.subject_id = sub.subject_id
        ORDER BY a.date DESC
        LIMIT 100
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
