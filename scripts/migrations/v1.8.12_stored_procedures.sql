-- v1.8.12: Create missing stored procedures on production
-- These exist on dev but were not migrated to production DB
USE ijts_recovery_db;

DELIMITER //

DROP PROCEDURE IF EXISTS update_single_voucher_total_paid//
CREATE PROCEDURE update_single_voucher_total_paid(IN p_vouchervid INT)
BEGIN
    UPDATE voucher
    SET total_paid = (
        SELECT COALESCE(SUM(amount), 0)
        FROM voucher_item
        WHERE vouchervid = p_vouchervid AND is_active IN (1, 2)
    )
    WHERE vid = p_vouchervid;
END//

DELIMITER ;
