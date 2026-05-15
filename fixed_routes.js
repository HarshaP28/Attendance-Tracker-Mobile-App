// ─── REPLACE these two routes in your index.js ───────────────────────────────

// ✅ FIX 1: attendance-stats
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

// ✅ FIX 2: attendance-report — defaults to current month if no dates given
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
