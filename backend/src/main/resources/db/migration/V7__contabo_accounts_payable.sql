-- V7: Add Accounts Payable for Contabo hosting expenses
-- Enables dual-entry bookkeeping when customer payment is verified:
--   DR: Server Hosting Cost (Expense)  CR: Accounts Payable - Contabo (Liability)
-- When TemcoServers actually pays Contabo:
--   DR: Accounts Payable - Contabo     CR: Bank (Asset)

-- 1. Chart of Account: Accounts Payable - Contabo (Liability under Current Liabilities)
INSERT INTO chart_of_account (coa_id, account_name, code, is_active, account_typea_id, main_chart_of_account_id)
VALUES (11, 'Accounts Payable - Contabo', 'L-2001', 1, 2, 3)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), code = VALUES(code);

-- 2. Sub-account for the payable
INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (19, 'Contabo Hosting Payable', 'active', 11)
ON DUPLICATE KEY UPDATE sub_account_name = 'Contabo Hosting Payable';

-- 3. Add contabo_cost_usd column to ts_subscription_plan for easy lookup
ALTER TABLE ts_subscription_plan ADD COLUMN IF NOT EXISTS contabo_cost_usd DECIMAL(10,2) DEFAULT NULL;

-- 4. Populate Contabo costs per plan
UPDATE ts_subscription_plan SET contabo_cost_usd = 3.96 WHERE contabo_product_id = 'V2';
UPDATE ts_subscription_plan SET contabo_cost_usd = 8.49 WHERE contabo_product_id = 'V7';
