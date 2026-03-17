-- V2: Seed account_type, main_chart_of_account, chart_of_account,
--     sub_chart_of_account, scoa_type, and payment_mode
-- Uses idempotent INSERT ... ON DUPLICATE KEY UPDATE to avoid replication conflicts

-- ============================================================
-- 1. Account Types (5 fundamental types)
-- ============================================================
INSERT INTO account_type (a_id, type_name, code) VALUES
    (1, 'Assets', 'A'),
    (2, 'Liabilities', 'L'),
    (3, 'Equity', 'E'),
    (4, 'Revenue', 'R'),
    (5, 'Expenses', 'X')
ON DUPLICATE KEY UPDATE type_name = VALUES(type_name), code = VALUES(code);

-- ============================================================
-- 2. Main Chart of Account (top-level groupings)
-- ============================================================
INSERT INTO main_chart_of_account (id, name, account_type_a_id) VALUES
    (1, 'Current Assets', 1),
    (2, 'Fixed Assets', 1),
    (3, 'Current Liabilities', 2),
    (4, 'Owner Equity', 3),
    (5, 'Service Revenue', 4),
    (6, 'Operating Expenses', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name), account_type_a_id = VALUES(account_type_a_id);

-- ============================================================
-- 3. Chart of Account (individual accounts)
-- ============================================================
INSERT INTO chart_of_account (coa_id, account_name, code, is_active, account_typea_id, main_chart_of_account_id) VALUES
    -- Current Assets — Bank Accounts
    (1, 'Bank - Nations Trust Bank (Nawala)', 'A-1001', 1, 1, 1),
    (2, 'Bank - Sampath Bank (Gangodawila)', 'A-1002', 1, 1, 1),
    (3, 'Bank - Commercial Bank (Reid Avenue)', 'A-1003', 1, 1, 1),
    (4, 'Accounts Receivable', 'A-1100', 1, 1, 1),
    -- Revenue
    (5, 'Server Subscription Revenue', 'R-4001', 1, 4, 5),
    (6, 'AI Credit Revenue', 'R-4002', 1, 4, 5),
    -- Expenses
    (7, 'Server Hosting Cost (Contabo)', 'X-5001', 1, 5, 6),
    (8, 'AI API Cost (OpenAI/DeepSeek)', 'X-5002', 1, 5, 6),
    (9, 'Payment Gateway Fees', 'X-5003', 1, 5, 6),
    (10, 'General Operating Expenses', 'X-5999', 1, 5, 6)
ON DUPLICATE KEY UPDATE account_name = VALUES(account_name), code = VALUES(code), is_active = VALUES(is_active);

-- ============================================================
-- 4. SCOA Type (sub-chart of account classification)
-- ============================================================
INSERT INTO scoa_type (id_st, name) VALUES
    (1, 'Revenue Item'),
    (2, 'Expense Item'),
    (3, 'Bank Account')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================================
-- 5. Sub Chart of Account (plan-level sub-accounts, unary tree)
-- ============================================================
INSERT INTO sub_chart_of_account (is_sca, reference, code, sub_account_name, chart_of_accountcoa_id, status, scoa_type_id_st, sub_chart_of_account_is_sca) VALUES
    -- Revenue sub-accounts (under Server Subscription Revenue, coa_id=5)
    (1, 'SSR-STARTER', 'R-4001-01', 'Starter Plan Revenue', 5, 'active', 1, NULL),
    (2, 'SSR-AI-BASIC', 'R-4001-02', 'AI Basic Plan Revenue', 5, 'active', 1, NULL),
    (3, 'SSR-AI-PRO', 'R-4001-03', 'AI Pro Plan Revenue', 5, 'active', 1, NULL),
    (4, 'SSR-AI-UNLIMITED', 'R-4001-04', 'AI Unlimited Plan Revenue', 5, 'active', 1, NULL),
    -- Revenue sub-accounts (under AI Credit Revenue, coa_id=6)
    (5, 'ACR-CREDITS', 'R-4002-01', 'AI Credit Pack Revenue', 6, 'active', 1, NULL),
    -- Bank sub-accounts (for debit entries)
    (6, 'BANK-NTB', 'A-1001-01', 'Nations Trust Bank Deposits', 1, 'active', 3, NULL),
    (7, 'BANK-SAMPATH', 'A-1002-01', 'Sampath Bank Deposits', 2, 'active', 3, NULL),
    (8, 'BANK-COMMERCIAL', 'A-1003-01', 'Commercial Bank Deposits', 3, 'active', 3, NULL)
ON DUPLICATE KEY UPDATE sub_account_name = VALUES(sub_account_name), code = VALUES(code), status = VALUES(status);

-- ============================================================
-- 6. Payment Modes
-- ============================================================
INSERT INTO payment_mode (payment_mode_id, payment_type) VALUES
    (1, 'Bank Transfer'),
    (2, 'Cash'),
    (3, 'Online Payment'),
    (4, 'Cheque')
ON DUPLICATE KEY UPDATE payment_type = VALUES(payment_type);
