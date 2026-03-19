-- ============================================================================
-- TemcoServers Dummy Accounting Data
-- Safe to run on shared JIAT DB — uses SSP/PSP prefixed IDs and high vid range
-- Uses existing user logins: 41101 (teststudent), 41103 (ishantha), 41104 (tharaka)
-- Uses existing gup_ids: 11476, 147401, 258017
-- ============================================================================

-- ============================================================================
-- REVENUE VOUCHERS (Bank Transfer — completed, is_completed=1)
-- voucher_typevt_id=1 (Server Subscription Payment), payment_mode=1 (Bank Transfer)
-- ============================================================================

-- Jan 2026: teststudent pays Starter Plan via NTB
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41101-1001', 'Starter Plan - Test Student (Ref: NTB-2026-001)', CURDATE(), 1224, 11476, 1, 1, 41101, 1, 1, '2026-01-05', 1224, 1, 1, '10:30:00', '2026-01-05 10:30:00');

SET @v1 = (SELECT vid FROM voucher WHERE id = 'SSP-41101-1001');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41101-1001-DR', 'Bank Transfer - Starter Plan', CURDATE(), 1, 1224, @v1, 1, 41101, 1, 6, 'NTB-2026-001', 1, 1, 1224, 1224, '2026-01-05 10:30:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41101-1001-CR', 'Starter Plan Subscription Revenue', CURDATE(), 1, 1224, @v1, 1, 41101, 1, 1, 1, 1224, 1224, '2026-01-05 10:30:00');

-- Jan 2026: ishantha pays AI Pro via Sampath
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41103-1002', 'AI Pro Plan - Ishantha (Ref: SAM-2026-001)', CURDATE(), 4590, 147401, 1, 1, 41103, 1, 1, '2026-01-10', 4590, 1, 1, '14:15:00', '2026-01-10 14:15:00');

SET @v2 = (SELECT vid FROM voucher WHERE id = 'SSP-41103-1002');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41103-1002-DR', 'Bank Transfer - AI Pro Plan', CURDATE(), 1, 4590, @v2, 1, 41103, 1, 7, 'SAM-2026-001', 1, 1, 4590, 4590, '2026-01-10 14:15:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41103-1002-CR', 'AI Pro Plan Subscription Revenue', CURDATE(), 1, 4590, @v2, 1, 41103, 1, 3, 1, 4590, 4590, '2026-01-10 14:15:00');

-- Feb 2026: tharaka pays AI Basic via Commercial Bank
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41104-1003', 'AI Basic Plan - Tharaka (Ref: COM-2026-001)', CURDATE(), 2448, 258017, 1, 1, 41104, 1, 1, '2026-02-01', 2448, 1, 1, '09:00:00', '2026-02-01 09:00:00');

SET @v3 = (SELECT vid FROM voucher WHERE id = 'SSP-41104-1003');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41104-1003-DR', 'Bank Transfer - AI Basic Plan', CURDATE(), 1, 2448, @v3, 1, 41104, 1, 8, 'COM-2026-001', 1, 1, 2448, 2448, '2026-02-01 09:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41104-1003-CR', 'AI Basic Plan Subscription Revenue', CURDATE(), 1, 2448, @v3, 1, 41104, 1, 2, 1, 2448, 2448, '2026-02-01 09:00:00');

-- Feb 2026: teststudent renews Starter via NTB
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41101-1004', 'Starter Plan Renewal - Test Student (Ref: NTB-2026-002)', CURDATE(), 1224, 11476, 1, 1, 41101, 1, 1, '2026-02-05', 1224, 1, 1, '11:00:00', '2026-02-05 11:00:00');

SET @v4 = (SELECT vid FROM voucher WHERE id = 'SSP-41101-1004');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41101-1004-DR', 'Bank Transfer - Starter Plan', CURDATE(), 1, 1224, @v4, 1, 41101, 1, 6, 'NTB-2026-002', 1, 1, 1224, 1224, '2026-02-05 11:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41101-1004-CR', 'Starter Plan Subscription Revenue', CURDATE(), 1, 1224, @v4, 1, 41101, 1, 1, 1, 1224, 1224, '2026-02-05 11:00:00');

-- ============================================================================
-- PAYPAL VOUCHERS (auto-completed, voucher_typevt_id=4, payment_mode=5)
-- ============================================================================

-- Feb 2026: ishantha pays AI Unlimited via PayPal
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('PSP-147401-1005', 'PayPal Payment - AI Unlimited Plan (Capture: 5AB12345CD)', CURDATE(), 7650, 147401, 4, 1, 41103, 1, 1, '2026-02-15', 7650, 1, 5, '16:30:00', '2026-02-15 16:30:00');

SET @v5 = (SELECT vid FROM voucher WHERE id = 'PSP-147401-1005');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, created_at)
VALUES ('PSP-147401-1005-DR', 'PayPal Payment - ishantha@temcobank.com', CURDATE(), 1, 7650, @v5, 4, 1, 5, '5AB12345CD', 5, '2026-02-15 16:30:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, login_sessionsession_id, sub_chart_of_accountis_sca, created_at)
VALUES ('PSP-147401-1005-CR', 'AI Unlimited Plan Subscription Revenue', CURDATE(), 1, 7650, @v5, 4, 1, 4, '2026-02-15 16:30:00');

-- ============================================================================
-- MARCH 2026 — Multiple payments
-- ============================================================================

-- Mar 2026: tharaka upgrades to AI Pro via Sampath
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41104-1006', 'AI Pro Plan - Tharaka (Ref: SAM-2026-002)', CURDATE(), 4590, 258017, 1, 1, 41104, 1, 1, '2026-03-01', 4590, 1, 1, '10:00:00', '2026-03-01 10:00:00');

SET @v6 = (SELECT vid FROM voucher WHERE id = 'SSP-41104-1006');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41104-1006-DR', 'Bank Transfer - AI Pro Plan', CURDATE(), 1, 4590, @v6, 1, 41104, 1, 7, 'SAM-2026-002', 1, 1, 4590, 4590, '2026-03-01 10:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41104-1006-CR', 'AI Pro Plan Subscription Revenue', CURDATE(), 1, 4590, @v6, 1, 41104, 1, 3, 1, 4590, 4590, '2026-03-01 10:00:00');

-- Mar 2026: teststudent upgrades to AI Basic via NTB
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41101-1007', 'AI Basic Plan - Test Student (Ref: NTB-2026-003)', CURDATE(), 2448, 11476, 1, 1, 41101, 1, 1, '2026-03-10', 2448, 1, 1, '13:45:00', '2026-03-10 13:45:00');

SET @v7 = (SELECT vid FROM voucher WHERE id = 'SSP-41101-1007');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41101-1007-DR', 'Bank Transfer - AI Basic Plan', CURDATE(), 1, 2448, @v7, 1, 41101, 1, 6, 'NTB-2026-003', 1, 1, 2448, 2448, '2026-03-10 13:45:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41101-1007-CR', 'AI Basic Plan Subscription Revenue', CURDATE(), 1, 2448, @v7, 1, 41101, 1, 2, 1, 2448, 2448, '2026-03-10 13:45:00');

-- Mar 2026: ishantha renews AI Unlimited via PayPal
INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('PSP-147401-1008', 'PayPal Payment - AI Unlimited Plan (Capture: 7XY98765EF)', CURDATE(), 7650, 147401, 4, 1, 41103, 1, 1, '2026-03-15', 7650, 1, 5, '09:20:00', '2026-03-15 09:20:00');

SET @v8 = (SELECT vid FROM voucher WHERE id = 'PSP-147401-1008');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, created_at)
VALUES ('PSP-147401-1008-DR', 'PayPal Payment - ishantha@temcobank.com', CURDATE(), 1, 7650, @v8, 4, 1, 5, '7XY98765EF', 5, '2026-03-15 09:20:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, login_sessionsession_id, sub_chart_of_accountis_sca, created_at)
VALUES ('PSP-147401-1008-CR', 'AI Unlimited Plan Subscription Revenue', CURDATE(), 1, 7650, @v8, 4, 1, 4, '2026-03-15 09:20:00');

-- ============================================================================
-- PENDING VOUCHER (not yet approved — is_completed=0)
-- ============================================================================

INSERT INTO voucher (id, description, date, voucher_total, general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, payment_mode_payment_mode_id, time, created_at)
VALUES ('SSP-41104-1009', 'AI Unlimited Plan - Tharaka (Ref: COM-2026-002) [PENDING]', CURDATE(), 7650, 258017, 1, 1, 41104, 1, 1, '2026-03-18', 7650, 0, 1, '15:00:00', '2026-03-18 15:00:00');

SET @v9 = (SELECT vid FROM voucher WHERE id = 'SSP-41104-1009');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41104-1009-DR', 'Bank Transfer - AI Unlimited Plan', CURDATE(), 1, 7650, @v9, 1, 41104, 1, 8, 'COM-2026-002', 1, 1, 7650, 7650, '2026-03-18 15:00:00');

INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at)
VALUES ('SSP-41104-1009-CR', 'AI Unlimited Plan Subscription Revenue', CURDATE(), 1, 7650, @v9, 1, 41104, 1, 4, 1, 7650, 7650, '2026-03-18 15:00:00');

-- ============================================================================
-- Now update voucher dates to actual dates (the CURDATE() above was placeholder)
-- ============================================================================
UPDATE voucher SET date = '2026-01-05' WHERE id = 'SSP-41101-1001';
UPDATE voucher SET date = '2026-01-10' WHERE id = 'SSP-41103-1002';
UPDATE voucher SET date = '2026-02-01' WHERE id = 'SSP-41104-1003';
UPDATE voucher SET date = '2026-02-05' WHERE id = 'SSP-41101-1004';
UPDATE voucher SET date = '2026-02-15' WHERE id = 'PSP-147401-1005';
UPDATE voucher SET date = '2026-03-01' WHERE id = 'SSP-41104-1006';
UPDATE voucher SET date = '2026-03-10' WHERE id = 'SSP-41101-1007';
UPDATE voucher SET date = '2026-03-15' WHERE id = 'PSP-147401-1008';
UPDATE voucher SET date = '2026-03-18' WHERE id = 'SSP-41104-1009';

UPDATE voucher_item SET date = '2026-01-05' WHERE id LIKE 'SSP-41101-1001%';
UPDATE voucher_item SET date = '2026-01-10' WHERE id LIKE 'SSP-41103-1002%';
UPDATE voucher_item SET date = '2026-02-01' WHERE id LIKE 'SSP-41104-1003%';
UPDATE voucher_item SET date = '2026-02-05' WHERE id LIKE 'SSP-41101-1004%';
UPDATE voucher_item SET date = '2026-02-15' WHERE id LIKE 'PSP-147401-1005%';
UPDATE voucher_item SET date = '2026-03-01' WHERE id LIKE 'SSP-41104-1006%';
UPDATE voucher_item SET date = '2026-03-10' WHERE id LIKE 'SSP-41101-1007%';
UPDATE voucher_item SET date = '2026-03-15' WHERE id LIKE 'PSP-147401-1008%';
UPDATE voucher_item SET date = '2026-03-18' WHERE id LIKE 'SSP-41104-1009%';

-- Verify
SELECT 'DONE' AS status, COUNT(*) AS temco_vouchers FROM voucher WHERE id LIKE 'SSP-%' OR id LIKE 'PSP-%';
