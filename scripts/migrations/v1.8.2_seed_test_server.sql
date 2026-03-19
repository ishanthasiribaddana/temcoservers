-- v1.8.1: Seed a test server instance for admin users to demo AI Doctor
-- This uses dynamic gup_id lookup so it works across environments
USE ijts_recovery_db;

-- Insert test server for 'ishantha' (Super Admin) if not already present
INSERT INTO ts_server_instance (general_user_profile_gup_id, contabo_instance_id, subscription_plan_id, ip_address, region, status, display_name, default_user, initial_password, created_at)
SELECT ul.general_user_profilegup_id, 0, 1, '194.163.130.223', 'EU', 'running', 'TemcoServers Production', 'deploy', '', NOW()
FROM user_login ul
WHERE ul.username = 'ishantha' AND ul.is_active = 1
AND NOT EXISTS (
    SELECT 1 FROM ts_server_instance si
    WHERE si.general_user_profile_gup_id = ul.general_user_profilegup_id
    AND si.ip_address = '194.163.130.223'
)
LIMIT 1;

-- Insert test server for 'teststudent' (Server Customer) if not already present
INSERT INTO ts_server_instance (general_user_profile_gup_id, contabo_instance_id, subscription_plan_id, ip_address, region, status, display_name, default_user, initial_password, created_at)
SELECT ul.general_user_profilegup_id, 0, 1, '194.163.130.223', 'EU', 'running', 'Test VPS Server', 'deploy', '', NOW()
FROM user_login ul
WHERE ul.username = 'teststudent' AND ul.is_active = 1
AND NOT EXISTS (
    SELECT 1 FROM ts_server_instance si
    WHERE si.general_user_profile_gup_id = ul.general_user_profilegup_id
    AND si.ip_address = '194.163.130.223'
)
LIMIT 1;
