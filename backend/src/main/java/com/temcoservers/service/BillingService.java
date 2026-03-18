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
                "WHERE s.general_user_profile_gup_id = :gupId AND s.status IN ('active','pending_payment') " +
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
        // Check if user already has active or pending subscription
        Map<String, Object> existing = getUserSubscription(gupId);
        if (existing != null) {
            String existingStatus = (String) existing.get("status");
            if ("active".equals(existingStatus)) {
                throw new IllegalStateException("User already has an active subscription. Cancel first.");
            }
            if ("pending_payment".equals(existingStatus)) {
                throw new IllegalStateException("User already has a pending subscription. Please upload your bank slip.");
            }
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

        // Create subscription with pending_payment status (activated after admin approves slip)
        em.createNativeQuery(
                "INSERT INTO ts_subscription (general_user_profile_gup_id, plan_id, start_date, status) " +
                "VALUES (:gupId, :planId, CURDATE(), 'pending_payment')")
                .setParameter("gupId", gupId)
                .setParameter("planId", planId)
                .executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Subscription created. Please upload your bank slip to activate.");
        result.put("planName", planRow[1]);
        result.put("priceMonthly", price);
        result.put("status", "pending_payment");
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
                                           String slipUrl, String originalFilename, int fileSize,
                                           Double planPriceUsd, Double exchangeRate,
                                           Double expectedAmountLkr, Double differenceAmountLkr) {

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
                "file_size, uploaded_by_login_id, verification_status, created_at, " +
                "plan_price_usd, exchange_rate, expected_amount_lkr, paid_amount_lkr, difference_amount_lkr) " +
                "VALUES (:viId, :slipUrl, :filename, :fileSize, :loginId, 'pending', NOW(), " +
                ":planPriceUsd, :exchangeRate, :expectedAmountLkr, :paidAmountLkr, :differenceAmountLkr)")
                .setParameter("viId", debitViId)
                .setParameter("slipUrl", slipUrl)
                .setParameter("filename", originalFilename)
                .setParameter("fileSize", fileSize)
                .setParameter("loginId", loginId)
                .setParameter("planPriceUsd", planPriceUsd)
                .setParameter("exchangeRate", exchangeRate)
                .setParameter("expectedAmountLkr", expectedAmountLkr)
                .setParameter("paidAmountLkr", amount)
                .setParameter("differenceAmountLkr", differenceAmountLkr)
                .executeUpdate();

        // 5. If there is a payment difference, create additional journal entries
        if (differenceAmountLkr != null && differenceAmountLkr != 0) {
            double absDiff = Math.abs(differenceAmountLkr);
            if (differenceAmountLkr > 0) {
                // OVERPAYMENT: Debit Bank (already done above for full amount)
                // Credit Customer Advance (liability) for the excess
                String advanceItemId = voucherId + "-ADV";
                em.createNativeQuery(
                        "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
                        "vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, " +
                        "sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at) " +
                        "VALUES (:itemId, :desc, CURDATE(), 1, :amount, :vid, 1, :loginId, 1, " +
                        "7, 1, :amount, :amount, NOW())")
                        .setParameter("itemId", advanceItemId)
                        .setParameter("desc", "Customer Advance (Overpayment LKR " + String.format("%.0f", absDiff) + ")")
                        .setParameter("amount", absDiff)
                        .setParameter("vid", vid)
                        .setParameter("loginId", loginId)
                        .executeUpdate();
            } else {
                // UNDERPAYMENT: Credit Revenue already done for full expected amount
                // Debit Accounts Receivable for the shortfall
                String arItemId = voucherId + "-AR";
                em.createNativeQuery(
                        "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
                        "vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, " +
                        "sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at) " +
                        "VALUES (:itemId, :desc, CURDATE(), 1, :amount, :vid, 1, :loginId, 1, " +
                        "8, 1, :amount, :amount, NOW())")
                        .setParameter("itemId", arItemId)
                        .setParameter("desc", "Accounts Receivable (Underpayment LKR " + String.format("%.0f", absDiff) + ")")
                        .setParameter("amount", absDiff)
                        .setParameter("vid", vid)
                        .setParameter("loginId", loginId)
                        .executeUpdate();
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Payment slip uploaded successfully");
        result.put("voucherId", voucherId);
        result.put("referenceNo", referenceNo);
        result.put("amount", amount);
        result.put("product", planLabel);
        result.put("status", "pending");
        if (differenceAmountLkr != null && differenceAmountLkr != 0) {
            result.put("differenceAmountLkr", differenceAmountLkr);
            result.put("differenceType", differenceAmountLkr > 0 ? "overpayment" : "underpayment");
        }
        return result;
    }

    // =========================================================================
    // Admin Payment Review
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listPendingPayments() {
        Query q = em.createNativeQuery(
                "SELECT v.vid, v.id, v.description, v.date, v.voucher_total, v.payment_date, " +
                "v.general_user_profilegup_id, v.user_loginlogin_id, " +
                "gup.first_name, gup.last_name, " +
                "slip.slip_url, slip.original_filename, slip.verification_status, slip.id AS slip_id, " +
                "vi.bank_reference_no, " +
                "slip.plan_price_usd, slip.exchange_rate, slip.expected_amount_lkr, " +
                "slip.paid_amount_lkr, slip.difference_amount_lkr " +
                "FROM voucher v " +
                "JOIN general_user_profile gup ON v.general_user_profilegup_id = gup.gup_id " +
                "LEFT JOIN voucher_item vi ON vi.vouchervid = v.vid AND vi.id LIKE '%-DR' " +
                "LEFT JOIN ts_voucher_item_slip slip ON slip.voucher_item_vi_id = vi.vi_id " +
                "WHERE v.is_completed = 0 AND v.voucher_typevt_id = 1 AND v.is_active = 1 " +
                "ORDER BY v.date DESC");
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> payments = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("voucherVid", row[0]);
            p.put("voucherId", row[1]);
            p.put("description", row[2]);
            p.put("date", row[3] != null ? row[3].toString() : null);
            p.put("amount", row[4]);
            p.put("paymentDate", row[5] != null ? row[5].toString() : null);
            p.put("gupId", row[6]);
            p.put("loginId", row[7]);
            p.put("customerName", (row[8] != null ? row[8] : "") + " " + (row[9] != null ? row[9] : ""));
            p.put("slipUrl", row[10]);
            p.put("slipFilename", row[11]);
            p.put("slipStatus", row[12]);
            p.put("slipId", row[13]);
            p.put("bankReference", row[14]);
            p.put("planPriceUsd", row[15]);
            p.put("exchangeRate", row[16]);
            p.put("expectedAmountLkr", row[17]);
            p.put("paidAmountLkr", row[18]);
            p.put("differenceAmountLkr", row[19]);
            payments.add(p);
        }
        return payments;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listAllSubscriptions() {
        Query q = em.createNativeQuery(
                "SELECT s.subscription_id, s.general_user_profile_gup_id, s.plan_id, " +
                "s.server_instance_id, s.start_date, s.end_date, s.status, " +
                "s.approved_by_login_id, s.approved_at, s.reject_reason, " +
                "sp.plan_name, sp.price_monthly, " +
                "gup.first_name, gup.last_name, " +
                "si.ip_address, si.contabo_instance_id " +
                "FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "JOIN general_user_profile gup ON s.general_user_profile_gup_id = gup.gup_id " +
                "LEFT JOIN ts_server_instance si ON s.server_instance_id = si.instance_id " +
                "ORDER BY s.created_at DESC");
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> subs = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("subscriptionId", row[0]);
            s.put("gupId", row[1]);
            s.put("planId", row[2]);
            s.put("serverInstanceId", row[3]);
            s.put("startDate", row[4] != null ? row[4].toString() : null);
            s.put("endDate", row[5] != null ? row[5].toString() : null);
            s.put("status", row[6]);
            s.put("approvedByLoginId", row[7]);
            s.put("approvedAt", row[8] != null ? row[8].toString() : null);
            s.put("rejectReason", row[9]);
            s.put("planName", row[10]);
            s.put("priceMonthly", row[11]);
            s.put("customerName", (row[12] != null ? row[12] : "") + " " + (row[13] != null ? row[13] : ""));
            s.put("serverIp", row[14]);
            s.put("contaboInstanceId", row[15]);
            subs.add(s);
        }
        return subs;
    }

    /**
     * Admin approves a payment:
     * 1. Set voucher.is_completed = 1
     * 2. Set ts_voucher_item_slip.verification_status = 'approved'
     * 3. Activate the user's pending subscription
     * 4. Link voucher to subscription
     * Returns gupId so caller can provision server + send notification
     */
    public Map<String, Object> approvePayment(int voucherVid, int adminLoginId, String adminNotes) {
        // Get voucher details
        Query vq = em.createNativeQuery(
                "SELECT v.vid, v.general_user_profilegup_id, v.voucher_total, v.description " +
                "FROM voucher v WHERE v.vid = :vid AND v.is_completed = 0");
        vq.setParameter("vid", voucherVid);
        @SuppressWarnings("unchecked")
        List<Object[]> vRows = vq.getResultList();
        if (vRows.isEmpty()) {
            throw new IllegalArgumentException("Voucher not found or already completed");
        }
        Object[] vRow = vRows.get(0);
        int gupId = ((Number) vRow[1]).intValue();

        // 1. Mark voucher as completed
        em.createNativeQuery("UPDATE voucher SET is_completed = 1, updated_at = NOW() WHERE vid = :vid")
                .setParameter("vid", voucherVid)
                .executeUpdate();

        // 2. Mark slip as approved
        em.createNativeQuery(
                "UPDATE ts_voucher_item_slip s " +
                "JOIN voucher_item vi ON s.voucher_item_vi_id = vi.vi_id " +
                "SET s.verification_status = 'approved', s.verified_by_login_id = :adminId, " +
                "s.verified_at = NOW(), s.admin_notes = :notes " +
                "WHERE vi.vouchervid = :vid")
                .setParameter("adminId", adminLoginId)
                .setParameter("notes", adminNotes)
                .setParameter("vid", voucherVid)
                .executeUpdate();

        // 3. Activate the user's pending subscription and link voucher
        em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'active', voucher_vid = :vid, " +
                "approved_by_login_id = :adminId, approved_at = NOW(), updated_at = NOW() " +
                "WHERE general_user_profile_gup_id = :gupId AND status = 'pending_payment'")
                .setParameter("vid", voucherVid)
                .setParameter("adminId", adminLoginId)
                .setParameter("gupId", gupId)
                .executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Payment approved and subscription activated");
        result.put("gupId", gupId);
        result.put("voucherVid", voucherVid);
        return result;
    }

    /**
     * Admin rejects a payment:
     * 1. Set voucher.is_active = 0 (void it)
     * 2. Set ts_voucher_item_slip.verification_status = 'rejected'
     * 3. Cancel the user's pending subscription with reject reason
     */
    public Map<String, Object> rejectPayment(int voucherVid, int adminLoginId, String reason) {
        Query vq = em.createNativeQuery(
                "SELECT v.vid, v.general_user_profilegup_id FROM voucher v " +
                "WHERE v.vid = :vid AND v.is_completed = 0");
        vq.setParameter("vid", voucherVid);
        @SuppressWarnings("unchecked")
        List<Object[]> vRows = vq.getResultList();
        if (vRows.isEmpty()) {
            throw new IllegalArgumentException("Voucher not found or already completed");
        }
        int gupId = ((Number) vRows.get(0)[1]).intValue();

        // 1. Void the voucher
        em.createNativeQuery("UPDATE voucher SET is_active = 0, updated_at = NOW() WHERE vid = :vid")
                .setParameter("vid", voucherVid)
                .executeUpdate();

        // 2. Mark slip as rejected
        em.createNativeQuery(
                "UPDATE ts_voucher_item_slip s " +
                "JOIN voucher_item vi ON s.voucher_item_vi_id = vi.vi_id " +
                "SET s.verification_status = 'rejected', s.verified_by_login_id = :adminId, " +
                "s.verified_at = NOW(), s.admin_notes = :reason " +
                "WHERE vi.vouchervid = :vid")
                .setParameter("adminId", adminLoginId)
                .setParameter("reason", reason)
                .setParameter("vid", voucherVid)
                .executeUpdate();

        // 3. Reject the subscription
        em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'rejected', reject_reason = :reason, " +
                "approved_by_login_id = :adminId, approved_at = NOW(), end_date = CURDATE(), updated_at = NOW() " +
                "WHERE general_user_profile_gup_id = :gupId AND status = 'pending_payment'")
                .setParameter("reason", reason)
                .setParameter("adminId", adminLoginId)
                .setParameter("gupId", gupId)
                .executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Payment rejected");
        result.put("gupId", gupId);
        return result;
    }

    /**
     * Link a provisioned server instance to the user's active subscription.
     */
    public void linkServerToSubscription(int gupId, int serverInstanceId) {
        em.createNativeQuery(
                "UPDATE ts_subscription SET server_instance_id = :sid, updated_at = NOW() " +
                "WHERE general_user_profile_gup_id = :gupId AND status = 'active' " +
                "AND server_instance_id IS NULL")
                .setParameter("sid", serverInstanceId)
                .setParameter("gupId", gupId)
                .executeUpdate();
    }

    // =========================================================================
    // PayPal Payment Support
    // =========================================================================

    /**
     * Create a completed voucher for a PayPal payment.
     * PayPal payments are auto-verified so is_completed=1 immediately.
     * voucher_typevt_id=4 (PSP), payment_mode=5 (PayPal).
     */
    public void createPayPalVoucher(int gupId, int loginId, double amount,
                                     String planName, String captureId, String payerEmail) {
        String voucherId = "PSP-" + gupId + "-" + System.currentTimeMillis();
        String description = "PayPal Payment - " + planName + " (Capture: " + captureId + ")";

        // Create voucher (auto-completed)
        em.createNativeQuery(
                "INSERT INTO voucher (id, description, date, voucher_total, " +
                "general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, " +
                "user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, " +
                "is_completed, payment_mode_payment_mode_id, time) " +
                "VALUES (:vid, :desc, CURDATE(), :total, :gupId, 4, 1, :loginId, 1, 1, " +
                "CURDATE(), :total, 1, 5, CURTIME())")
                .setParameter("vid", voucherId)
                .setParameter("desc", description)
                .setParameter("total", amount)
                .setParameter("gupId", gupId)
                .setParameter("loginId", loginId)
                .executeUpdate();

        // Get the voucher vid
        Object vidObj = em.createNativeQuery(
                "SELECT vid FROM voucher WHERE id = :vid")
                .setParameter("vid", voucherId)
                .getSingleResult();
        int vid = ((Number) vidObj).intValue();

        // Create debit voucher_item (PayPal revenue sub-account is_sca=5)
        em.createNativeQuery(
                "INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, " +
                "voucher_typevt_id, login_sessionsession_id, sub_chart_of_accountis_sca, " +
                "bank_reference_no, payment_mode_payment_mode_id) " +
                "VALUES (:id, :desc, CURDATE(), 1, :amount, :vid, 4, 1, 5, :ref, 5)")
                .setParameter("id", voucherId + "-DR")
                .setParameter("desc", "PayPal Payment - " + payerEmail)
                .setParameter("amount", amount)
                .setParameter("vid", vid)
                .setParameter("ref", captureId)
                .executeUpdate();

        // Create credit voucher_item (plan revenue sub-account)
        int revenueScaId = getRevenueSubAccount(planName);
        em.createNativeQuery(
                "INSERT INTO voucher_item (id, description, date, is_active, amount, vouchervid, " +
                "voucher_typevt_id, login_sessionsession_id, sub_chart_of_accountis_sca) " +
                "VALUES (:id, :desc, CURDATE(), 1, :amount, :vid, 4, 1, :sca)")
                .setParameter("id", voucherId + "-CR")
                .setParameter("desc", planName + " Subscription Revenue")
                .setParameter("amount", amount)
                .setParameter("vid", vid)
                .setParameter("sca", revenueScaId)
                .executeUpdate();
    }

    /**
     * Auto-activate a user's pending_payment subscription (used for PayPal instant payments).
     * Also links the most recent voucher to the subscription.
     */
    public void autoActivateSubscription(int gupId) {
        // Find the latest voucher for this user (the one just created)
        Object vidObj = null;
        try {
            vidObj = em.createNativeQuery(
                    "SELECT vid FROM voucher WHERE general_user_profilegup_id = :gupId " +
                    "ORDER BY vid DESC LIMIT 1")
                    .setParameter("gupId", gupId)
                    .getSingleResult();
        } catch (Exception ignored) {}

        // Activate and link voucher
        String sql = "UPDATE ts_subscription SET status = 'active', approved_at = NOW(), updated_at = NOW()";
        if (vidObj != null) {
            sql += ", voucher_vid = :vid";
        }
        sql += " WHERE general_user_profile_gup_id = :gupId AND status = 'pending_payment'";

        var q = em.createNativeQuery(sql).setParameter("gupId", gupId);
        if (vidObj != null) {
            q.setParameter("vid", ((Number) vidObj).intValue());
        }
        q.executeUpdate();
    }

    /**
     * Map plan name to revenue sub-account id (sub_chart_of_account.is_sca).
     */
    private int getRevenueSubAccount(String planName) {
        if (planName == null) return 1;
        String lower = planName.toLowerCase();
        if (lower.contains("starter")) return 1;
        if (lower.contains("basic")) return 2;
        if (lower.contains("pro")) return 3;
        if (lower.contains("unlimited")) return 4;
        return 1; // default to Starter
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserPaymentHistory(int gupId) {
        Query q = em.createNativeQuery(
                "SELECT v.vid, v.id, v.description, v.date, v.voucher_total, v.payment_date, " +
                "v.total_paid, v.is_completed, vt.name " +
                "FROM voucher v " +
                "JOIN voucher_type vt ON v.voucher_typevt_id = vt.vt_id " +
                "WHERE v.general_user_profilegup_id = :gupId " +
                "AND (v.id LIKE 'SSP-%' OR v.id LIKE 'PSP-%' OR v.id LIKE 'SSR-%' OR v.id LIKE 'ACP-%') " +
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
