-- ─── Run this in your MySQL (attendance_system database) ───────────────────

CREATE TABLE IF NOT EXISTS admins (
    admin_id   INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100)  NOT NULL,
    email      VARCHAR(100)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Default admin account (change password after first login!)
INSERT INTO admins (name, email, password) 
VALUES ('Super Admin', 'admin@attendance.com', 'Admin@1234');
