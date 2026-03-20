-- v1.8.13: Add 'Welcome' communication purpose for registration notifications
USE ijts_recovery_db;

INSERT INTO communication_purpose (id, name) VALUES (10, 'Welcome')
ON DUPLICATE KEY UPDATE name = 'Welcome';
