package com.temcoservers.service;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.*;

@Stateless
public class BillingService {

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPlans() {
        Query q = em.createNativeQuery(
                "SELECT plan_id, plan_name, price_monthly, contabo_product_id, " +
                "ai_requests_limit, description, ram_gb, vcpu, is_active " +
                "FROM ts_subscription_plan WHERE is_active = 1 ORDER BY price_monthly");
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> plans = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> plan = new LinkedHashMap<>();
            plan.put("planId", row[0]);
            plan.put("planName", row[1]);
            plan.put("priceMonthly", row[2]);
            plan.put("contaboProductId", row[3]);
            plan.put("aiRequestsLimit", row[4]);
            plan.put("description", row[5]);
            plan.put("ramGb", row[6]);
            plan.put("vcpu", row[7]);
            plan.put("isActive", row[8]);
            plans.add(plan);
        }
        return plans;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserSubscription(int gupId) {
        Query q = em.createNativeQuery(
                "SELECT s.subscription_id, s.plan_id, s.server_instance_id, s.start_date, " +
                "s.end_date, s.status, sp.plan_name, sp.price_monthly, sp.ai_requests_limit " +
                "FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "WHERE s.general_user_profile_gup_id = :gupId AND s.status = 'active' " +
                "ORDER BY s.start_date DESC");
        q.setParameter("gupId", gupId);
        q.setMaxResults(1);
        List<Object[]> rows = q.getResultList();
        if (rows.isEmpty()) return null;
        Object[] row = rows.get(0);
        Map<String, Object> sub = new LinkedHashMap<>();
        sub.put("subscriptionId", row[0]);
        sub.put("planId", row[1]);
        sub.put("serverInstanceId", row[2]);
        sub.put("startDate", row[3] != null ? row[3].toString() : null);
        sub.put("endDate", row[4] != null ? row[4].toString() : null);
        sub.put("status", row[5]);
        sub.put("planName", row[6]);
        sub.put("priceMonthly", row[7]);
        sub.put("aiRequestsLimit", row[8]);
        return sub;
    }

    public Map<String, Object> subscribe(int gupId, int loginId, int planId) {
        // Check if user already has active subscription
        Map<String, Object> existing = getUserSubscription(gupId);
        if (existing != null) {
            throw new IllegalStateException("User already has an active subscription. Cancel first.");
        }

        // Verify plan exists
        Query planQ = em.createNativeQuery("SELECT plan_id, plan_name, price_monthly FROM ts_subscription_plan WHERE plan_id = :pid AND is_active = 1");
        planQ.setParameter("pid", planId);
        @SuppressWarnings("unchecked")
        List<Object[]> planRows = planQ.getResultList();
        if (planRows.isEmpty()) {
            throw new IllegalArgumentException("Invalid plan ID");
        }
        Object[] planRow = planRows.get(0);
        double price = ((Number) planRow[2]).doubleValue();

        // Create subscription
        em.createNativeQuery(
                "INSERT INTO ts_subscription (general_user_profile_gup_id, plan_id, start_date, status) " +
                "VALUES (:gupId, :planId, CURDATE(), 'active')")
                .setParameter("gupId", gupId)
                .setParameter("planId", planId)
                .executeUpdate();

        // Create voucher record for the payment
        em.createNativeQuery(
                "INSERT INTO voucher (id, description, date, voucher_total, " +
                "general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, " +
                "user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, time) " +
                "VALUES (:vid, :desc, CURDATE(), :total, :gupId, 1, 1, :loginId, 1, 1, CURDATE(), :total, 1, CURTIME())")
                .setParameter("vid", "SSP-" + gupId + "-" + System.currentTimeMillis())
                .setParameter("desc", "Server Subscription Payment - " + planRow[1])
                .setParameter("total", price)
                .setParameter("gupId", gupId)
                .setParameter("loginId", loginId)
                .executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Subscription created successfully");
        result.put("planName", planRow[1]);
        result.put("priceMonthly", price);
        result.put("status", "active");
        return result;
    }

    public Map<String, Object> cancelSubscription(int gupId) {
        int updated = em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'cancelled', end_date = CURDATE(), " +
                "updated_at = NOW() WHERE general_user_profile_gup_id = :gupId AND status = 'active'")
                .setParameter("gupId", gupId)
                .executeUpdate();
        if (updated == 0) {
            throw new IllegalStateException("No active subscription found");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Subscription cancelled");
        return result;
    }

    /**
     * Process a bank slip upload:
     * 1. Create voucher (invoice header)
     * 2. Create voucher_item for debit (bank) entry
     * 3. Create voucher_item for credit (revenue) entry
     * 4. Create ts_voucher_item_slip record linking the receipt to the uploaded file
     */
    public Map<String, Object> uploadSlip(int gupId, int loginId, String purchaserName,
                                           String referenceNo, double amount, String product,
                                           String slipUrl, String originalFilename, int fileSize) {

        // Map product slug to sub_chart_of_account is_sca IDs (from V2 migration seed)
        int revenueScaId;
        String planLabel;
        switch (product) {
            case "starter":       revenueScaId = 1; planLabel = "Starter Plan"; break;
            case "ai-basic":      revenueScaId = 2; planLabel = "AI Basic Plan"; break;
            case "ai-pro":        revenueScaId = 3; planLabel = "AI Pro Plan"; break;
            case "ai-unlimited":  revenueScaId = 4; planLabel = "AI Unlimited Plan"; break;
            default: throw new IllegalArgumentException("Invalid product: " + product);
        }

        // Bank deposit sub-account (default: Nations Trust Bank = is_sca 6)
        int bankScaId = 6;

        String voucherId = "SSP-" + loginId + "-" + System.currentTimeMillis();

        // 1. Create voucher (invoice header) — is_completed=0 (pending verification)
        em.createNativeQuery(
                "INSERT INTO voucher (id, description, date, voucher_total, " +
                "general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, " +
                "user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, is_completed, " +
                "payment_mode_payment_mode_id, time, created_at) " +
                "VALUES (:vid, :desc, CURDATE(), :total, :gupId, 1, 1, :loginId, 1, 1, CURDATE(), :total, 0, 1, CURTIME(), NOW())")
                .setParameter("vid", voucherId)
                .setParameter("desc", planLabel + " - " + purchaserName + " (Ref: " + referenceNo + ")")
                .setParameter("total", amount)
                .setParameter("gupId", gupId)
                .setParameter("loginId", loginId)
                .executeUpdate();

        // Get the newly created voucher vid
        Object vidObj = em.createNativeQuery("SELECT vid FROM voucher WHERE id = :vid")
                .setParameter("vid", voucherId)
                .getSingleResult();
        int vid = ((Number) vidObj).intValue();

        // 2. Create voucher_item: DEBIT bank account
        String debitItemId = voucherId + "-DR";
        em.createNativeQuery(
                "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
                "vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, " +
                "sub_chart_of_accountis_sca, bank_reference_no, payment_mode_payment_mode_id, " +
                "qty, unit_price, to_be_paid_amount, created_at) " +
                "VALUES (:itemId, :desc, CURDATE(), 1, :amount, :vid, 1, :loginId, 1, " +
                ":scaId, :refNo, 1, 1, :amount, :amount, NOW())")
                .setParameter("itemId", debitItemId)
                .setParameter("desc", "Bank Transfer - " + planLabel)
                .setParameter("amount", amount)
                .setParameter("vid", vid)
                .setParameter("loginId", loginId)
                .setParameter("scaId", bankScaId)
                .setParameter("refNo", referenceNo)
                .executeUpdate();

        // Get the debit voucher_item vi_id (for linking the slip)
        Object debitViIdObj = em.createNativeQuery("SELECT vi_id FROM voucher_item WHERE id = :itemId")
                .setParameter("itemId", debitItemId)
                .getSingleResult();
        int debitViId = ((Number) debitViIdObj).intValue();

        // 3. Create voucher_item: CREDIT revenue account
        String creditItemId = voucherId + "-CR";
        em.createNativeQuery(
                "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
                "vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, " +
                "sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at) " +
                "VALUES (:itemId, :desc, CURDATE(), 1, :amount, :vid, 1, :loginId, 1, " +
                ":scaId, 1, :amount, :amount, NOW())")
                .setParameter("itemId", creditItemId)
                .setParameter("desc", planLabel + " Subscription Revenue")
                .setParameter("amount", amount)
                .setParameter("vid", vid)
                .setParameter("loginId", loginId)
                .setParameter("scaId", revenueScaId)
                .executeUpdate();

        // 4. Create ts_voucher_item_slip (link slip to debit voucher_item)
        em.createNativeQuery(
                "INSERT INTO ts_voucher_item_slip (voucher_item_vi_id, slip_url, original_filename, " +
                "file_size, uploaded_by_login_id, verification_status, created_at) " +
                "VALUES (:viId, :slipUrl, :filename, :fileSize, :loginId, 'pending', NOW())")
                .setParameter("viId", debitViId)
                .setParameter("slipUrl", slipUrl)
                .setParameter("filename", originalFilename)
                .setParameter("fileSize", fileSize)
                .setParameter("loginId", loginId)
                .executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Payment slip uploaded successfully");
        result.put("voucherId", voucherId);
        result.put("referenceNo", referenceNo);
        result.put("amount", amount);
        result.put("product", planLabel);
        result.put("status", "pending");
        return result;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserPaymentHistory(int gupId) {
        Query q = em.createNativeQuery(
                "SELECT v.vid, v.id, v.description, v.date, v.voucher_total, v.payment_date, " +
                "v.total_paid, v.is_completed, vt.name " +
                "FROM voucher v " +
                "JOIN voucher_type vt ON v.voucher_typevt_id = vt.vt_id " +
                "WHERE v.general_user_profilegup_id = :gupId " +
                "ORDER BY v.date DESC");
        q.setParameter("gupId", gupId);
        q.setMaxResults(50);
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> history = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("voucherId", row[0]);
            item.put("referenceId", row[1]);
            item.put("description", row[2]);
            item.put("date", row[3] != null ? row[3].toString() : null);
            item.put("total", row[4]);
            item.put("paymentDate", row[5] != null ? row[5].toString() : null);
            item.put("totalPaid", row[6]);
            item.put("isCompleted", row[7]);
            item.put("type", row[8]);
            history.add(item);
        }
        return history;
    }
}
