-- V9: Email campaign tables (3NF normalized) + seed data for test campaign
-- New tables: ts_email_group_member, ts_email_campaign, ts_email_campaign_log

-- 1. Group membership: links gup_id directly to email_group (replaces broken email_group_manager chain)
CREATE TABLE IF NOT EXISTS ts_email_group_member (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_group_id INT NOT NULL,
    gup_id INT NOT NULL,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_group_member (email_group_id, gup_id),
    CONSTRAINT fk_egm_group FOREIGN KEY (email_group_id) REFERENCES email_group(id),
    CONSTRAINT fk_egm_gup FOREIGN KEY (gup_id) REFERENCES general_user_profile(gup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Campaign execution: tracks each bulk send run
CREATE TABLE IF NOT EXISTS ts_email_campaign (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_bulk_id INT NOT NULL,
    email_template_id INT NOT NULL,
    email_group_id INT NULL,
    sent_by INT NOT NULL,
    sent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_recipients INT DEFAULT 0,
    total_sent INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    CONSTRAINT fk_ec_bulk FOREIGN KEY (email_bulk_id) REFERENCES email_bulk(id),
    CONSTRAINT fk_ec_template FOREIGN KEY (email_template_id) REFERENCES email_template(id),
    CONSTRAINT fk_ec_group FOREIGN KEY (email_group_id) REFERENCES email_group(id),
    CONSTRAINT fk_ec_sentby FOREIGN KEY (sent_by) REFERENCES general_user_profile(gup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Per-recipient delivery log
CREATE TABLE IF NOT EXISTS ts_email_campaign_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    gup_id INT NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at DATETIME NULL,
    error_message TEXT NULL,
    CONSTRAINT fk_ecl_campaign FOREIGN KEY (campaign_id) REFERENCES ts_email_campaign(id),
    CONSTRAINT fk_ecl_gup FOREIGN KEY (gup_id) REFERENCES general_user_profile(gup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Seed: Add GUP entry for tharaka@jrirc.org if not exists
INSERT INTO general_user_profile (first_name, last_name, email)
SELECT 'Tharaka', 'JRIRC', 'tharaka@jrirc.org'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM general_user_profile WHERE email = 'tharaka@jrirc.org');

-- 5. Seed: Email group for test
INSERT INTO email_group (id, name) VALUES (1, 'All Customers')
ON DUPLICATE KEY UPDATE name = 'All Customers';
INSERT INTO email_group (id, name) VALUES (2, 'Test Recipients')
ON DUPLICATE KEY UPDATE name = 'Test Recipients';

-- 6. Seed: Add tharaka + ishantha to "Test Recipients" group
INSERT IGNORE INTO ts_email_group_member (email_group_id, gup_id)
SELECT 2, gup_id FROM general_user_profile WHERE email = 'tharaka@jrirc.org';
INSERT IGNORE INTO ts_email_group_member (email_group_id, gup_id)
SELECT 2, gup_id FROM general_user_profile WHERE email = 'ishantha@gmail.com';

-- 7. Seed: Email bulk campaign definition
INSERT INTO email_bulk (id, name) VALUES (1, 'Welcome to TemcoServers')
ON DUPLICATE KEY UPDATE name = 'Welcome to TemcoServers';

-- 8. Seed: HTML email template for Welcome
INSERT INTO email_template (id, name, subject, content, header_settings)
VALUES (
    100,
    'TemcoServers Welcome',
    'Welcome to TemcoServers — {{customerName}}!',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">'
    '<div style="background: linear-gradient(135deg, #0336FF 0%, #1a4fff 100%); padding: 30px; text-align: center;">'
    '  <h1 style="color: #FFDE03; margin: 0; font-size: 28px;">TemcoServers</h1>'
    '  <p style="color: #ffffff; margin: 5px 0 0; font-size: 14px;">AI-Powered Cloud Hosting for Students</p>'
    '</div>'
    '<div style="padding: 30px;">'
    '  <h2 style="color: #0336FF; margin-top: 0;">Welcome, {{customerName}}!</h2>'
    '  <p style="color: #333; line-height: 1.6;">Thank you for joining <strong>TemcoServers</strong> — the smart cloud hosting platform built for students at Java Institute.</p>'
    '  <p style="color: #333; line-height: 1.6;">With your subscription, you get:</p>'
    '  <ul style="color: #333; line-height: 1.8;">'
    '    <li>Dedicated cloud server with full root access</li>'
    '    <li>Pre-installed development tools</li>'
    '    <li>AI-powered coding assistant</li>'
    '    <li>24/7 server monitoring</li>'
    '  </ul>'
    '  <div style="text-align: center; margin: 25px 0;">'
    '    <a href="https://aihost.temcobank.com/dashboard" style="background: #0336FF; color: #FFDE03; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>'
    '  </div>'
    '  <p style="color: #333; line-height: 1.6;">If you have any questions, reach out to our support team.</p>'
    '  <p style="color: #333; line-height: 1.6;">Happy coding!<br/><strong>The TemcoServers Team</strong></p>'
    '</div>'
    '<div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888;">'
    '  <p style="margin: 0;">TemcoServers — A partnership of JRIRC &amp; TEMCO Bank</p>'
    '  <p style="margin: 5px 0 0;">Java Institute for Advanced Technology</p>'
    '</div>'
    '</div>',
    NULL
)
ON DUPLICATE KEY UPDATE name = 'TemcoServers Welcome';

-- 9. Seed: Add new communication purpose for campaign emails
INSERT INTO communication_purpose (id, name) VALUES (9, 'Bulk Campaign')
ON DUPLICATE KEY UPDATE name = 'Bulk Campaign';
