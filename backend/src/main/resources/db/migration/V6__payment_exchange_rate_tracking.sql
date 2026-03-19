-- V6: Track exchange rate and payment differences for bank transfer payments
-- Adds columns to ts_voucher_item_slip for LKR exchange rate tracking
-- Adds sub_chart_of_account entries for Customer Advance (overpayment) and Accounts Receivable (underpayment)

-- 1. Add exchange rate tracking columns to ts_voucher_item_slip
ALTER TABLE ts_voucher_item_slip ADD COLUMN IF NOT EXISTS plan_price_usd DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE ts_voucher_item_slip ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE ts_voucher_item_slip ADD COLUMN IF NOT EXISTS expected_amount_lkr DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE ts_voucher_item_slip ADD COLUMN IF NOT EXISTS paid_amount_lkr DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE ts_voucher_item_slip ADD COLUMN IF NOT EXISTS difference_amount_lkr DECIMAL(10,2) DEFAULT NULL;

-- 2. Add sub_chart_of_account entries for difference handling
-- Customer Advance (liability — overpayments held as credit)
-- Link to Accounts Receivable COA (coa_id=4) under Current Assets
INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (9, 'Customer Advance (Overpayment)', 'active', 4)
ON DUPLICATE KEY UPDATE sub_account_name = 'Customer Advance (Overpayment)';

-- Accounts Receivable for underpayments
INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (10, 'Accounts Receivable (Underpayment)', 'active', 4)
ON DUPLICATE KEY UPDATE sub_account_name = 'Accounts Receivable (Underpayment)';
