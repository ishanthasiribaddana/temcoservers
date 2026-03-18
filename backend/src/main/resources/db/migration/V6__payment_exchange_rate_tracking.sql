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
INSERT INTO sub_chart_of_account (is_sca, description, status, chart_of_accountcoa_id)
SELECT 7, 'Customer Advance (Overpayment)', 'Active', coa_id
FROM chart_of_account WHERE description = 'Current Liabilities'
ON DUPLICATE KEY UPDATE description = 'Customer Advance (Overpayment)';

-- Accounts Receivable (asset — underpayments owed by customer)
INSERT INTO sub_chart_of_account (is_sca, description, status, chart_of_accountcoa_id)
SELECT 8, 'Accounts Receivable (Underpayment)', 'Active', coa_id
FROM chart_of_account WHERE description = 'Current Assets'
ON DUPLICATE KEY UPDATE description = 'Accounts Receivable (Underpayment)';
