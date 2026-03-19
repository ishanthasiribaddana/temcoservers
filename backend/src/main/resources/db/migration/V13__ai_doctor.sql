-- V13: AI Doctor — self-service server troubleshooting assistant
-- TemcoServers enterprise feature

USE ijts_recovery_db;

-- 1. Doctor sessions (one per troubleshooting conversation)
CREATE TABLE IF NOT EXISTS ts_ai_doctor_session (
    session_id      INT AUTO_INCREMENT PRIMARY KEY,
    gup_id          INT          NOT NULL,
    instance_id     INT          NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'open',   -- open | resolved | escalated | closed
    title           VARCHAR(255) NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at       DATETIME     NULL,
    INDEX idx_doctor_session_gup (gup_id),
    INDEX idx_doctor_session_instance (instance_id),
    INDEX idx_doctor_session_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Doctor messages (chat + command execution log)
CREATE TABLE IF NOT EXISTS ts_ai_doctor_message (
    message_id       INT AUTO_INCREMENT PRIMARY KEY,
    session_id       INT          NOT NULL,
    role             VARCHAR(20)  NOT NULL,  -- user | assistant | system | command
    content          TEXT         NOT NULL,
    command_executed VARCHAR(500) NULL,
    command_output   MEDIUMTEXT   NULL,
    tokens_used      INT          NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doctor_msg_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Doctor daily quota per customer
CREATE TABLE IF NOT EXISTS ts_ai_doctor_quota (
    quota_id    INT AUTO_INCREMENT PRIMARY KEY,
    gup_id      INT          NOT NULL,
    quota_date  DATE         NOT NULL,
    requests_used INT        NOT NULL DEFAULT 0,
    daily_limit   INT        NOT NULL DEFAULT 50,
    UNIQUE KEY uq_doctor_quota (gup_id, quota_date),
    INDEX idx_doctor_quota_gup (gup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
