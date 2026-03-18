-- V5: PayPal payment support
-- Add PayPal voucher type and ensure Online Payment mode exists

-- PayPal subscription payment voucher type
INSERT INTO voucher_type (vt_id, name, id_abbreviation)
SELECT 4, 'PayPal Subscription Payment', 'PSP'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM voucher_type WHERE vt_id = 4);

-- Online Payment mode already exists as id=3, but ensure it's there
INSERT INTO payment_mode (payment_mode_id, payment_type)
SELECT 5, 'PayPal'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM payment_mode WHERE payment_type = 'PayPal');

-- PayPal revenue sub-account under Server Subscription Revenue (chart_of_account coa_id=4)
INSERT INTO sub_chart_of_account (is_sca, sub_account_name, code, chart_of_accountcoa_id, sub_chart_of_account_is_sca, status)
SELECT 5, 'PayPal Revenue', 'R-4001-05', 4, NULL, 'Active'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM sub_chart_of_account WHERE is_sca = 5);
