-- V4: Admin payment review support
-- Adds voucher link to subscription so we can track which payment activated which subscription
-- Adds admin_notes to slip table for approve/reject reasoning

-- Link subscription to the voucher (payment) that activated it
ALTER TABLE ts_subscription
    ADD COLUMN voucher_vid INT NULL AFTER server_instance_id,
    ADD COLUMN approved_by_login_id INT NULL AFTER voucher_vid,
    ADD COLUMN approved_at DATETIME NULL AFTER approved_by_login_id,
    ADD COLUMN reject_reason VARCHAR(500) NULL AFTER approved_at;

-- Admin notes on slip verification
ALTER TABLE ts_voucher_item_slip
    ADD COLUMN admin_notes VARCHAR(500) NULL AFTER verified_at;

-- Index for fast pending-payment lookups
CREATE INDEX idx_ts_sub_status ON ts_subscription(status);
CREATE INDEX idx_voucher_is_completed ON voucher(is_completed);
