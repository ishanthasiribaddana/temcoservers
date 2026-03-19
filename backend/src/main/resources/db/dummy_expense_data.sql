-- ============================================================================
-- TemcoServers Expense Sub-Accounts & Dummy Expense Vouchers
-- Reseller model: TemcoServers pays Contabo for server hosting
-- ============================================================================

-- Add expense sub-accounts (linked to expense COAs 7,8,9,10)
INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (11, 'Contabo VPS V2 Hosting', 'active', 7)
ON DUPLICATE KEY UPDATE sub_account_name = 'Contabo VPS V2 Hosting';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (12, 'Contabo VPS V7 Hosting', 'active', 7)
ON DUPLICATE KEY UPDATE sub_account_name = 'Contabo VPS V7 Hosting';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (13, 'OpenAI API Usage', 'active', 8)
ON DUPLICATE KEY UPDATE sub_account_name = 'OpenAI API Usage';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (14, 'DeepSeek API Usage', 'active', 8)
ON DUPLICATE KEY UPDATE sub_account_name = 'DeepSeek API Usage';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (15, 'PayPal Transaction Fees', 'active', 9)
ON DUPLICATE KEY UPDATE sub_account_name = 'PayPal Transaction Fees';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (16, 'Bank Transfer Charges', 'active', 9)
ON DUPLICATE KEY UPDATE sub_account_name = 'Bank Transfer Charges';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (17, 'Domain & SSL Certificates', 'active', 10)
ON DUPLICATE KEY UPDATE sub_account_name = 'Domain & SSL Certificates';

INSERT INTO sub_chart_of_account (is_sca, sub_account_name, status, chart_of_accountcoa_id)
VALUES (18, 'Cloudflare Services', 'active', 10)
ON DUPLICATE KEY UPDATE sub_account_name = 'Cloudflare Services';

-- ============================================================================
-- EXPENSE VOUCHERS — Contabo Monthly Server Hosting
-- voucher_typevt_id=1, payment via NTB (payment_mode=1)
-- These are DR entries (cash going out) to expense accounts
-- ============================================================================

-- Jan 2026: Contabo hosting - 2x V2 ($3.96 each = $7.92) + 1x V7 ($8.49) = $16.41 ≈ LKR 5,000
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-CONTABO-2026-01', 'Contabo Server Hosting - January 2026', '2026-01-01', 5000, 147401, 1, 1, 41103, 1, 1, '2026-01-01', 5000, 1, 1, '00:00:00', '2026-01-01 00:00:00');

SET @ve1 = (SELECT vid FROM voucher WHERE id = 'EXP-CONTABO-2026-01');

-- Debit: Contabo V2 hosting expense
INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-CONTABO-2026-01-V2', 'Contabo VPS V2 x2 - Jan 2026', '2026-01-01', 1, 2400, @ve1, 1, 41103, 1, 11, 2, 1200, 2400, '2026-01-01 00:00:00');

-- Debit: Contabo V7 hosting expense
INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-CONTABO-2026-01-V7', 'Contabo VPS V7 x1 - Jan 2026', '2026-01-01', 1, 2600, @ve1, 1, 41103, 1, 12, 1, 2600, 2600, '2026-01-01 00:00:00');

-- Feb 2026: Contabo hosting - same config
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-CONTABO-2026-02', 'Contabo Server Hosting - February 2026', '2026-02-01', 5000, 147401, 1, 1, 41103, 1, 1, '2026-02-01', 5000, 1, 1, '00:00:00', '2026-02-01 00:00:00');

SET @ve2 = (SELECT vid FROM voucher WHERE id = 'EXP-CONTABO-2026-02');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-CONTABO-2026-02-V2', 'Contabo VPS V2 x2 - Feb 2026', '2026-02-01', 1, 2400, @ve2, 1, 41103, 1, 11, 2, 1200, 2400, '2026-02-01 00:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-CONTABO-2026-02-V7', 'Contabo VPS V7 x1 - Feb 2026', '2026-02-01', 1, 2600, @ve2, 1, 41103, 1, 12, 1, 2600, 2600, '2026-02-01 00:00:00');

-- Mar 2026: Contabo hosting - scaled up: 3x V2 + 2x V7
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-CONTABO-2026-03', 'Contabo Server Hosting - March 2026', '2026-03-01', 8800, 147401, 1, 1, 41103, 1, 1, '2026-03-01', 8800, 1, 1, '00:00:00', '2026-03-01 00:00:00');

SET @ve3 = (SELECT vid FROM voucher WHERE id = 'EXP-CONTABO-2026-03');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-CONTABO-2026-03-V2', 'Contabo VPS V2 x3 - Mar 2026', '2026-03-01', 1, 3600, @ve3, 1, 41103, 1, 11, 3, 1200, 3600, '2026-03-01 00:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-CONTABO-2026-03-V7', 'Contabo VPS V7 x2 - Mar 2026', '2026-03-01', 1, 5200, @ve3, 1, 41103, 1, 12, 2, 2600, 5200, '2026-03-01 00:00:00');

-- ============================================================================
-- EXPENSE VOUCHERS — AI API Costs
-- ============================================================================

-- Jan 2026: OpenAI API
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-AI-2026-01', 'AI API Costs - January 2026', '2026-01-31', 1200, 147401, 1, 1, 41103, 1, 1, '2026-01-31', 1200, 1, 1, '23:59:00', '2026-01-31 23:59:00');

SET @va1 = (SELECT vid FROM voucher WHERE id = 'EXP-AI-2026-01');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-AI-2026-01-OAI', 'OpenAI GPT-4o-mini API - Jan 2026', '2026-01-31', 1, 800, @va1, 1, 41103, 1, 13, 1, 800, 800, '2026-01-31 23:59:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-AI-2026-01-DS', 'DeepSeek API - Jan 2026', '2026-01-31', 1, 400, @va1, 1, 41103, 1, 14, 1, 400, 400, '2026-01-31 23:59:00');

-- Feb 2026: AI API costs
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-AI-2026-02', 'AI API Costs - February 2026', '2026-02-28', 1800, 147401, 1, 1, 41103, 1, 1, '2026-02-28', 1800, 1, 1, '23:59:00', '2026-02-28 23:59:00');

SET @va2 = (SELECT vid FROM voucher WHERE id = 'EXP-AI-2026-02');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-AI-2026-02-OAI', 'OpenAI GPT-4o-mini API - Feb 2026', '2026-02-28', 1, 1200, @va2, 1, 41103, 1, 13, 1, 1200, 1200, '2026-02-28 23:59:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-AI-2026-02-DS', 'DeepSeek API - Feb 2026', '2026-02-28', 1, 600, @va2, 1, 41103, 1, 14, 1, 600, 600, '2026-02-28 23:59:00');

-- Mar 2026: AI API costs (growing with more users)
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-AI-2026-03', 'AI API Costs - March 2026', '2026-03-15', 2500, 147401, 1, 1, 41103, 1, 1, '2026-03-15', 2500, 1, 1, '23:59:00', '2026-03-15 23:59:00');

SET @va3 = (SELECT vid FROM voucher WHERE id = 'EXP-AI-2026-03');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-AI-2026-03-OAI', 'OpenAI GPT-4o-mini API - Mar 2026', '2026-03-15', 1, 1700, @va3, 1, 41103, 1, 13, 1, 1700, 1700, '2026-03-15 23:59:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-AI-2026-03-DS', 'DeepSeek API - Mar 2026', '2026-03-15', 1, 800, @va3, 1, 41103, 1, 14, 1, 800, 800, '2026-03-15 23:59:00');

-- ============================================================================
-- EXPENSE VOUCHERS — Payment Gateway Fees
-- ============================================================================

-- Feb 2026: PayPal fees on PSP-147401-1005
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-FEE-2026-02', 'Payment Gateway Fees - February 2026', '2026-02-28', 350, 147401, 1, 1, 41103, 1, 1, '2026-02-28', 350, 1, 1, '23:59:00', '2026-02-28 23:59:00');

SET @vf1 = (SELECT vid FROM voucher WHERE id = 'EXP-FEE-2026-02');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-FEE-2026-02-PP', 'PayPal transaction fee (2.9% + $0.30)', '2026-02-28', 1, 250, @vf1, 1, 41103, 1, 15, 1, 250, 250, '2026-02-28 23:59:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-FEE-2026-02-BK', 'Bank transfer processing charges', '2026-02-28', 1, 100, @vf1, 1, 41103, 1, 16, 1, 100, 100, '2026-02-28 23:59:00');

-- Mar 2026: Gateway fees
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-FEE-2026-03', 'Payment Gateway Fees - March 2026', '2026-03-15', 450, 147401, 1, 1, 41103, 1, 1, '2026-03-15', 450, 1, 1, '23:59:00', '2026-03-15 23:59:00');

SET @vf2 = (SELECT vid FROM voucher WHERE id = 'EXP-FEE-2026-03');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-FEE-2026-03-PP', 'PayPal transaction fee (2.9% + $0.30)', '2026-03-15', 1, 300, @vf2, 1, 41103, 1, 15, 1, 300, 300, '2026-03-15 23:59:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-FEE-2026-03-BK', 'Bank transfer processing charges', '2026-03-15', 1, 150, @vf2, 1, 41103, 1, 16, 1, 150, 150, '2026-03-15 23:59:00');

-- ============================================================================
-- EXPENSE VOUCHERS — General Operating (Domain, Cloudflare)
-- ============================================================================

INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('EXP-OPS-2026-Q1', 'Operating Expenses - Q1 2026', '2026-01-15', 1500, 147401, 1, 1, 41103, 1, 1, '2026-01-15', 1500, 1, 1, '10:00:00', '2026-01-15 10:00:00');

SET @vo1 = (SELECT vid FROM voucher WHERE id = 'EXP-OPS-2026-Q1');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-OPS-2026-Q1-DOM', 'Domain renewal aihost.temcobank.com (annual)', '2026-01-15', 1, 900, @vo1, 1, 41103, 1, 17, 1, 900, 900, '2026-01-15 10:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('EXP-OPS-2026-Q1-CF', 'Cloudflare Pro plan (3 months)', '2026-01-15', 1, 600, @vo1, 1, 41103, 1, 18, 3, 200, 600, '2026-01-15 10:00:00');

-- Verify
SELECT 'EXPENSES DONE' AS status,
  COUNT(*) AS expense_vouchers,
  (SELECT SUM(vi.amount) FROM voucher_item vi JOIN voucher v ON vi.vouchervid=v.vid JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca=sca.is_sca JOIN chart_of_account coa ON sca.chart_of_accountcoa_id=coa.coa_id JOIN main_chart_of_account mca ON coa.main_chart_of_account_id=mca.id WHERE mca.account_type_a_id=5 AND v.is_completed=1 AND v.is_active=1 AND vi.is_active=1) AS total_expenses
FROM voucher WHERE id LIKE 'EXP-%';
