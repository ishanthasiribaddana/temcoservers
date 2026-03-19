-- V12: Registration OTP table + seed OTP email template
-- TemcoServers self-registration security

USE ijts_recovery_db;

-- 1. OTP storage table
CREATE TABLE IF NOT EXISTS ts_registration_otp (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nic         VARCHAR(20)  NOT NULL,
    email       VARCHAR(255) NOT NULL,
    otp_code    VARCHAR(6)   NOT NULL,
    attempts    INT          NOT NULL DEFAULT 0,
    verified    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME     NOT NULL,
    INDEX idx_otp_nic (nic),
    INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Seed transactional OTP email template
INSERT INTO email_template (name, subject, content)
SELECT 'TXN_REGISTRATION_OTP', 'TemcoServers — Your Verification Code', CONCAT(
    '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">',
    '<div style="text-align:center;margin-bottom:24px;">',
    '<img src="https://aihost.temcobank.com/images/temco-logo-sm.png" alt="TemcoServers" style="height:36px;" />',
    '</div>',
    '<h2 style="color:#111827;font-size:20px;font-weight:700;text-align:center;margin:0 0 8px;">Verify Your Identity</h2>',
    '<p style="color:#6b7280;font-size:14px;text-align:center;margin:0 0 24px;">Use the code below to continue your TemcoServers registration.</p>',
    '<div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">',
    '<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0336FF;">{{OTP_CODE}}</span>',
    '</div>',
    '<p style="color:#6b7280;font-size:13px;text-align:center;margin:0 0 4px;">This code expires in <strong>5 minutes</strong>.</p>',
    '<p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">If you did not request this, please ignore this email.</p>',
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />',
    '<p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;">TemcoServers — AI-Powered Server Management</p>',
    '</div>'
)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM email_template WHERE name = 'TXN_REGISTRATION_OTP');
