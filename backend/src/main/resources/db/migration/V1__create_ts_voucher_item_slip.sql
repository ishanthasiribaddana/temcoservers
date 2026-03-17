-- V1: Create ts_voucher_item_slip table
-- 1:1 relationship with voucher_item for storing bank slip upload URLs
-- Keeps existing voucher_item table untouched to avoid sync conflicts

CREATE TABLE IF NOT EXISTS ts_voucher_item_slip (
    id INT(11) NOT NULL AUTO_INCREMENT,
    voucher_item_vi_id INT(11) NOT NULL,
    slip_url VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) DEFAULT NULL,
    file_size INT(11) DEFAULT NULL,
    uploaded_by_login_id INT(11) DEFAULT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    verified_by_login_id INT(11) DEFAULT NULL,
    verified_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_voucher_item_vi_id (voucher_item_vi_id),
    KEY idx_uploaded_by (uploaded_by_login_id),
    KEY idx_verification_status (verification_status),
    CONSTRAINT fk_tvis_voucher_item FOREIGN KEY (voucher_item_vi_id) REFERENCES voucher_item (vi_id),
    CONSTRAINT fk_tvis_uploaded_by FOREIGN KEY (uploaded_by_login_id) REFERENCES user_login (login_id),
    CONSTRAINT fk_tvis_verified_by FOREIGN KEY (verified_by_login_id) REFERENCES user_login (login_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
