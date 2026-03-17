-- V3: Register TemcoServers-specific pages in system_interface
-- and create an interface_menu entry for the TemcoServers module

-- 1. Create TemcoServers menu group
INSERT IGNORE INTO interface_menu (if_id, menu_name) VALUES (63, 'TemcoServers');

-- 2. Register TemcoServers pages (si_id 501+)
INSERT IGNORE INTO system_interface (si_id, interface_name, display_name, url, icon, interface_menu_if_id)
VALUES
  (501, 'TSDashboard',      'Dashboard',       '/dashboard',       'layout-dashboard', 63),
  (502, 'TSBilling',        'Billing',         '/billing',         'credit-card',      63),
  (503, 'TSNotifications',  'Notifications',   '/notifications',   'bell',             63),
  (504, 'TSAiAssistant',    'AI Assistant',    '/ai-assistant',    'bot',              63),
  (505, 'TSAdminPanel',     'Admin Panel',     '/admin',           'shield',           63),
  (506, 'TSPayment',        'Payment',         '/payment',         'banknote',         63);

-- 3. Create TemcoServers module
INSERT IGNORE INTO use_case (uc_id, case_name) VALUES (157, 'TemcoServers Platform');

-- 4. Map pages to module
INSERT IGNORE INTO use_case_has_system_interface (system_interface_si_id, use_case_uc_id)
VALUES
  (501, 157), (502, 157), (503, 157), (504, 157), (505, 157), (506, 157);

-- 5. Map module to roles (Super Admin, System Admin, Server Customer)
INSERT IGNORE INTO use_case_has_user_role (use_case_uc_id, user_role_ur_id)
VALUES
  (157, 51), (157, 52), (157, 57);

-- 6. Map pages to roles
-- Super Admin + System Admin get all pages
INSERT IGNORE INTO user_role_has_system_interface (system_interface_si_id, user_role_ur_id)
VALUES
  (501, 51), (502, 51), (503, 51), (504, 51), (505, 51), (506, 51),
  (501, 52), (502, 52), (503, 52), (504, 52), (505, 52), (506, 52);

-- Server Customer gets Dashboard, Billing, Notifications, AI Assistant, Payment (no Admin)
INSERT IGNORE INTO user_role_has_system_interface (system_interface_si_id, user_role_ur_id)
VALUES
  (501, 57), (502, 57), (503, 57), (504, 57), (506, 57);
