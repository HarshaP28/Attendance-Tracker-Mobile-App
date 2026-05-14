// ─── ADD THESE ROUTES TO YOUR index.js (before the error handling section) ───
// Also add at the top of index.js:
// const nodemailer = require('nodemailer');

// ── Gmail SMTP Transporter ────────────────────────────────────────────────────
// IMPORTANT: Replace with your Gmail and App Password
// To get App Password: Google Account → Security → 2-Step Verification → App Passwords
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_gmail@gmail.com',      // ← Replace with your Gmail
        pass: 'your_app_password_here',    // ← Replace with Gmail App Password (NOT your real password)
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

        for (const student of students as any[]) {
            if (!student.email) { failCount++; continue; }

            const percentage = student.percentage ?? 0;
            const attended   = student.attended   ?? 0;
            const totalDays  = student.total_days ?? 0;

            const mailOptions = {
                from:    '"Attendance Pro" <your_gmail@gmail.com>',  // ← same Gmail as above
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

    } catch (err: any) {
        console.error('Email error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
