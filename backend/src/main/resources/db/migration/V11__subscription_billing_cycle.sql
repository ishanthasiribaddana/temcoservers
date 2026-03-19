-- =========================================================================
-- V11: Subscription Billing Cycle Support
-- Adds end_date management, grace period, and renewal tracking
-- =========================================================================

-- 1. Add grace_end_date column (end_date already exists but is never set on activation)
ALTER TABLE ts_subscription
    ADD COLUMN IF NOT EXISTS grace_end_date DATE NULL AFTER end_date;

-- 2. Add renewal tracking columns
ALTER TABLE ts_subscription
    ADD COLUMN IF NOT EXISTS renewal_count INT DEFAULT 0 AFTER grace_end_date;

ALTER TABLE ts_subscription
    ADD COLUMN IF NOT EXISTS last_reminder_sent DATE NULL AFTER renewal_count;

ALTER TABLE ts_subscription
    ADD COLUMN IF NOT EXISTS auto_renew TINYINT(1) DEFAULT 0 AFTER last_reminder_sent;

-- 3. Fix existing active subscriptions: set end_date = start_date + 30 days where end_date IS NULL
UPDATE ts_subscription
SET end_date = DATE_ADD(start_date, INTERVAL 30 DAY)
WHERE status = 'active' AND end_date IS NULL AND start_date IS NOT NULL;

-- 4. Add 'grace' and 'suspended' and 'expired' to the status vocabulary
-- (status is VARCHAR(20), these values just need to be used consistently in code)
-- Subscription status lifecycle:
--   pending_payment → active → grace → expired → suspended
--                                 ↑ (renewal resets to active)
--                   → rejected
--                   → cancelled
