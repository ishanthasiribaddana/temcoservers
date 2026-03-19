-- V8: Add initial_password column to ts_server_instance for credentials management
-- The admin sets this after receiving the root password from Contabo's provisioning email.
-- The student can then retrieve it via the dashboard.

ALTER TABLE ts_server_instance
    ADD COLUMN initial_password VARCHAR(255) NULL AFTER default_user;
