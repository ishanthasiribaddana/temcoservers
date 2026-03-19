-- V10: Email scheduling and daily quota tracking

-- 1. Schedule table for recurring/one-time campaigns
CREATE TABLE IF NOT EXISTS ts_email_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    email_template_id INT NOT NULL,
    email_group_id INT NOT NULL,
    email_bulk_id INT NOT NULL,
    frequency ENUM('once','daily','weekly','monthly') DEFAULT 'once',
    scheduled_date DATETIME NOT NULL,
    last_run DATETIME NULL,
    is_active TINYINT(1) DEFAULT 1,
    batch_size INT DEFAULT 50,
    created_by INT NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_es_template FOREIGN KEY (email_template_id) REFERENCES email_template(id),
    CONSTRAINT fk_es_group FOREIGN KEY (email_group_id) REFERENCES email_group(id),
    CONSTRAINT fk_es_bulk FOREIGN KEY (email_bulk_id) REFERENCES email_bulk(id),
    CONSTRAINT fk_es_creator FOREIGN KEY (created_by) REFERENCES general_user_profile(gup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Daily quota tracker (per SMTP account)
CREATE TABLE IF NOT EXISTS ts_email_daily_quota (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quota_date DATE NOT NULL,
    emails_sent INT DEFAULT 0,
    daily_limit INT DEFAULT 500,
    UNIQUE KEY uq_quota_date (quota_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
