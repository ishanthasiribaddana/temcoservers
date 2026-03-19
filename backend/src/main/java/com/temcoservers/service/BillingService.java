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
                "s.end_date, s.status, sp.plan_name, sp.price_monthly, sp.ai_requests_limit, " +
                "s.grace_end_date, s.renewal_count " +
                "FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "WHERE s.general_user_profile_gup_id = :gupId AND s.status IN ('active','pending_payment','grace','suspended','expired') " +
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
        sub.put("graceEndDate", row[9] != null ? row[9].toString() : null);
        sub.put("renewalCount", row[10] != null ? ((Number) row[10]).intValue() : 0);
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

        // 3. Activate the user's pending subscription, set end_date = start_date + 30 days, link voucher
        em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'active', voucher_vid = :vid, " +
                "end_date = DATE_ADD(COALESCE(start_date, CURDATE()), INTERVAL 30 DAY), " +
                "approved_by_login_id = :adminId, approved_at = NOW(), updated_at = NOW() " +
                "WHERE general_user_profile_gup_id = :gupId AND status = 'pending_payment'")
                .setParameter("vid", voucherVid)
                .setParameter("adminId", adminLoginId)
                .setParameter("gupId", gupId)
                .executeUpdate();

        // 4. Auto-generate Contabo payable voucher (dual-entry: DR Expense, CR Liability)
        String revenueVoucherRefId = vRow[3] != null ? vRow[3].toString() : "VID-" + voucherVid;
        try {
            createContaboPayableVoucher(gupId, adminLoginId, revenueVoucherRefId);
        } catch (Exception e) {
            // Log but don't fail the approval if payable generation fails
            System.err.println("WARNING: Failed to create Contabo payable voucher for gupId=" + gupId + ": " + e.getMessage());
        }

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
    // Contabo Payable — Auto-generated dual-entry when customer payment verified
    // =========================================================================

    /**
     * Create a Contabo payable voucher with dual entries when a customer payment is verified.
     * DR: Server Hosting Cost (Expense, is_sca=11 for V2 or is_sca=12 for V7)
     * CR: Accounts Payable - Contabo (Liability, is_sca=19)
     *
     * @param gupId           customer's general_user_profile ID
     * @param loginId         admin login ID who approved (or system for PayPal)
     * @param revenueVoucherId the customer's revenue voucher ID (for cross-reference)
     */
    private void createContaboPayableVoucher(int gupId, int loginId, String revenueVoucherId) {
        // Look up the customer's active subscription to determine the plan and Contabo cost
        Query planQ = em.createNativeQuery(
                "SELECT sp.contabo_product_id, sp.contabo_cost_usd, sp.plan_name " +
                "FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "WHERE s.general_user_profile_gup_id = :gupId " +
                "AND s.status IN ('active', 'pending_payment') " +
                "ORDER BY s.created_at DESC");
        planQ.setParameter("gupId", gupId);
        planQ.setMaxResults(1);
        @SuppressWarnings("unchecked")
        List<Object[]> planRows = planQ.getResultList();
        if (planRows.isEmpty()) return; // no subscription found, skip

        Object[] planRow = planRows.get(0);
        String contaboProductId = (String) planRow[0];
        Double contaboCostUsd = planRow[1] != null ? ((Number) planRow[1]).doubleValue() : null;
        String planName = (String) planRow[2];

        if (contaboCostUsd == null || contaboCostUsd <= 0) return; // no cost defined

        // Determine exchange rate (use a sensible default; can be made configurable later)
        double exchangeRate = 306.00; // USD to LKR
        // Try to get the latest exchange rate from the slip if available
        try {
            Object rateObj = em.createNativeQuery(
                    "SELECT exchange_rate FROM ts_voucher_item_slip " +
                    "WHERE exchange_rate IS NOT NULL AND exchange_rate > 0 " +
                    "ORDER BY id DESC LIMIT 1")
                    .getSingleResult();
            if (rateObj != null) {
                exchangeRate = ((Number) rateObj).doubleValue();
            }
        } catch (Exception ignored) {}

        double contaboCostLkr = Math.round(contaboCostUsd * exchangeRate * 100.0) / 100.0;

        // Map Contabo product to expense sub-account
        int expenseScaId = "V7".equals(contaboProductId) ? 12 : 11; // V7=is_sca 12, V2=is_sca 11
        int payableScaId = 19; // Contabo Hosting Payable (liability)

        String payableVoucherId = "CPY-" + gupId + "-" + System.currentTimeMillis();

        // Create payable voucher (is_completed=1 — obligation is confirmed, not yet paid)
        em.createNativeQuery(
                "INSERT INTO voucher (id, description, date, voucher_total, " +
                "general_user_profilegup_id, voucher_typevt_id, login_sessionsession_id, " +
                "user_loginlogin_id, branch_bid, is_active, payment_date, total_paid, " +
                "is_completed, payment_mode_payment_mode_id, time, created_at) " +
                "VALUES (:vid, :desc, CURDATE(), :total, :gupId, 1, 1, :loginId, 1, 1, " +
                "NULL, 0, 1, 1, CURTIME(), NOW())")
                .setParameter("vid", payableVoucherId)
                .setParameter("desc", "Contabo Payable - " + planName + " (" + contaboProductId +
                        ") [Ref: " + revenueVoucherId + "] USD " +
                        String.format("%.2f", contaboCostUsd) + " @ " +
                        String.format("%.2f", exchangeRate))
                .setParameter("total", contaboCostLkr)
                .setParameter("gupId", gupId)
                .setParameter("loginId", loginId)
                .executeUpdate();

        // Get the payable voucher vid
        Object vidObj = em.createNativeQuery("SELECT vid FROM voucher WHERE id = :vid")
                .setParameter("vid", payableVoucherId)
                .getSingleResult();
        int vid = ((Number) vidObj).intValue();

        // DR: Server Hosting Cost (Expense)
        em.createNativeQuery(
                "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
                "vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, " +
                "sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at) " +
                "VALUES (:itemId, :desc, CURDATE(), 1, :amount, :vid, 1, :loginId, 1, " +
                ":scaId, 1, :amount, :amount, NOW())")
                .setParameter("itemId", payableVoucherId + "-DR")
                .setParameter("desc", "Contabo " + contaboProductId + " Hosting Cost - " + planName)
                .setParameter("amount", contaboCostLkr)
                .setParameter("vid", vid)
                .setParameter("loginId", loginId)
                .setParameter("scaId", expenseScaId)
                .executeUpdate();

        // CR: Accounts Payable - Contabo (Liability)
        em.createNativeQuery(
                "INSERT INTO voucher_item (id, description, date, is_active, amount, " +
                "vouchervid, voucher_typevt_id, user_loginlogin_id, login_sessionsession_id, " +
                "sub_chart_of_accountis_sca, qty, unit_price, to_be_paid_amount, created_at) " +
                "VALUES (:itemId, :desc, CURDATE(), 1, :amount, :vid, 1, :loginId, 1, " +
                ":scaId, 1, :amount, :amount, NOW())")
                .setParameter("itemId", payableVoucherId + "-CR")
                .setParameter("desc", "Contabo Hosting Payable - " + planName)
                .setParameter("amount", contaboCostLkr)
                .setParameter("vid", vid)
                .setParameter("loginId", loginId)
                .setParameter("scaId", payableScaId)
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

        // Auto-generate Contabo payable voucher (dual-entry: DR Expense, CR Liability)
        try {
            createContaboPayableVoucher(gupId, loginId, voucherId);
        } catch (Exception e) {
            System.err.println("WARNING: Failed to create Contabo payable for PayPal gupId=" + gupId + ": " + e.getMessage());
        }
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

        // Activate, set end_date, and link voucher
        String sql = "UPDATE ts_subscription SET status = 'active', " +
                "end_date = DATE_ADD(COALESCE(start_date, CURDATE()), INTERVAL 30 DAY), " +
                "approved_at = NOW(), updated_at = NOW()";
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

    // =========================================================================
    // Contabo Payable Balance
    // =========================================================================

    /**
     * Get the total outstanding Contabo payable balance.
     * This is the sum of all CPY- voucher CR items (liability, is_sca=19)
     * minus any settlement payments (SPY- voucher DR items against is_sca=19).
     * Also returns a breakdown of individual payable vouchers.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getContaboPayableBalance() {
        // Total payable: sum of CR items on is_sca=19 (Contabo Hosting Payable)
        Object totalPayableObj = em.createNativeQuery(
                "SELECT COALESCE(SUM(vi.amount), 0) FROM voucher_item vi " +
                "JOIN voucher v ON vi.vouchervid = v.vid " +
                "WHERE vi.sub_chart_of_accountis_sca = 19 " +
                "AND vi.id LIKE '%-CR' " +
                "AND v.is_active = 1 AND vi.is_active = 1")
                .getSingleResult();
        double totalPayable = ((Number) totalPayableObj).doubleValue();

        // Total settled: sum of DR items on is_sca=19 (settlement vouchers)
        Object totalSettledObj = em.createNativeQuery(
                "SELECT COALESCE(SUM(vi.amount), 0) FROM voucher_item vi " +
                "JOIN voucher v ON vi.vouchervid = v.vid " +
                "WHERE vi.sub_chart_of_accountis_sca = 19 " +
                "AND vi.id LIKE '%-DR' " +
                "AND v.is_active = 1 AND vi.is_active = 1")
                .getSingleResult();
        double totalSettled = ((Number) totalSettledObj).doubleValue();

        double outstandingBalance = totalPayable - totalSettled;

        // Count of unsettled payable vouchers (payment_date IS NULL = not yet paid to Contabo)
        Object countObj = em.createNativeQuery(
                "SELECT COUNT(DISTINCT v.vid) FROM voucher v " +
                "WHERE v.id LIKE 'CPY-%' AND v.is_active = 1 AND v.payment_date IS NULL")
                .getSingleResult();
        int unsettledCount = ((Number) countObj).intValue();

        // Recent payable vouchers (last 20)
        Query recentQ = em.createNativeQuery(
                "SELECT v.id, v.description, v.date, v.voucher_total, v.payment_date " +
                "FROM voucher v " +
                "WHERE v.id LIKE 'CPY-%' AND v.is_active = 1 " +
                "ORDER BY v.date DESC");
        recentQ.setMaxResults(20);
        List<Object[]> recentRows = recentQ.getResultList();

        List<Map<String, Object>> recentPayables = new ArrayList<>();
        for (Object[] row : recentRows) {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("voucherId", row[0]);
            p.put("description", row[1]);
            p.put("date", row[2] != null ? row[2].toString() : null);
            p.put("amount", row[3]);
            p.put("settled", row[4] != null); // payment_date set = settled
            recentPayables.add(p);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalPayable", totalPayable);
        result.put("totalSettled", totalSettled);
        result.put("outstandingBalance", outstandingBalance);
        result.put("unsettledCount", unsettledCount);
        result.put("recentPayables", recentPayables);
        return result;
    }

    // =========================================================================
    // Pricing Tier Analysis — Real AI costs + Contabo + Workflow add-on
    // =========================================================================

    /**
     * Get pricing tier analysis with real AI cost data from ts_ai_usage.
     * Returns plan details, Contabo cost, actual avg monthly AI cost per plan,
     * workflow add-on pricing, and calculated net margin.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPricingTierAnalysis() {
        // Get all plans with their pricing
        Query planQ = em.createNativeQuery(
                "SELECT plan_id, plan_name, price_monthly, contabo_product_id, contabo_cost_usd, " +
                "ai_requests_limit, workflow_addon_price, workflow_executions_limit " +
                "FROM ts_subscription_plan WHERE is_active = 1 ORDER BY plan_id");
        List<Object[]> plans = planQ.getResultList();

        // Get actual average monthly AI cost per plan (from ts_ai_usage joined with ts_subscription)
        // Groups by plan, calculates avg cost per active month per user
        Query aiCostQ = em.createNativeQuery(
                "SELECT sp.plan_id, " +
                "COALESCE(SUM(au.cost), 0) AS total_cost, " +
                "COUNT(DISTINCT au.gup_id) AS unique_users, " +
                "SUM(au.tokens_used) AS total_tokens, " +
                "COUNT(*) AS total_requests, " +
                "COUNT(DISTINCT DATE_FORMAT(au.created_at, '%Y-%m')) AS active_months " +
                "FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "JOIN ts_ai_usage au ON au.gup_id = s.general_user_profile_gup_id " +
                "WHERE s.status IN ('active', 'expired') " +
                "GROUP BY sp.plan_id");
        List<Object[]> aiCosts = aiCostQ.getResultList();

        // Build a map of plan_id -> ai cost stats
        Map<Integer, Object[]> aiCostMap = new java.util.HashMap<>();
        for (Object[] row : aiCosts) {
            aiCostMap.put(((Number) row[0]).intValue(), row);
        }

        // Get workflow AI costs separately (request_type = 'workflow_ai')
        Query wfCostQ = em.createNativeQuery(
                "SELECT sp.plan_id, " +
                "COALESCE(SUM(au.cost), 0) AS total_wf_cost, " +
                "SUM(au.tokens_used) AS total_wf_tokens, " +
                "COUNT(*) AS total_wf_requests " +
                "FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "JOIN ts_ai_usage au ON au.gup_id = s.general_user_profile_gup_id " +
                "WHERE s.status IN ('active', 'expired') " +
                "AND au.request_type = 'workflow_ai' " +
                "GROUP BY sp.plan_id");
        List<Object[]> wfCosts = wfCostQ.getResultList();

        Map<Integer, Object[]> wfCostMap = new java.util.HashMap<>();
        for (Object[] row : wfCosts) {
            wfCostMap.put(((Number) row[0]).intValue(), row);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] plan : plans) {
            int planId = ((Number) plan[0]).intValue();
            String planName = (String) plan[1];
            double priceMonthly = ((Number) plan[2]).doubleValue();
            String contaboProduct = (String) plan[3];
            double contaboCostUsd = plan[4] != null ? ((Number) plan[4]).doubleValue() : 0;
            int aiRequestsLimit = plan[5] != null ? ((Number) plan[5]).intValue() : 0;
            Double workflowAddonPrice = plan[6] != null ? ((Number) plan[6]).doubleValue() : null;
            Integer workflowExecLimit = plan[7] != null ? ((Number) plan[7]).intValue() : null;

            Map<String, Object> tier = new LinkedHashMap<>();
            tier.put("planId", planId);
            tier.put("planName", planName);
            tier.put("priceMonthly", priceMonthly);
            tier.put("contaboProduct", contaboProduct);
            tier.put("contaboCostUsd", contaboCostUsd);
            tier.put("aiRequestsLimit", aiRequestsLimit);
            tier.put("workflowAddonPrice", workflowAddonPrice);
            tier.put("workflowExecLimit", workflowExecLimit);

            // Full customer price = base + workflow addon (if applicable)
            double fullPrice = priceMonthly + (workflowAddonPrice != null ? workflowAddonPrice : 0);
            tier.put("fullPrice", fullPrice);

            // AI cost stats
            Object[] aiRow = aiCostMap.get(planId);
            double avgMonthlyCostPerUser = 0;
            int totalRequests = 0;
            int totalTokens = 0;
            int uniqueUsers = 0;
            if (aiRow != null) {
                double totalCost = ((Number) aiRow[1]).doubleValue();
                uniqueUsers = ((Number) aiRow[2]).intValue();
                totalTokens = aiRow[3] != null ? ((Number) aiRow[3]).intValue() : 0;
                totalRequests = ((Number) aiRow[4]).intValue();
                int activeMonths = ((Number) aiRow[5]).intValue();
                if (uniqueUsers > 0 && activeMonths > 0) {
                    avgMonthlyCostPerUser = totalCost / uniqueUsers / activeMonths;
                }
            }
            tier.put("aiCostAvgMonthly", Math.round(avgMonthlyCostPerUser * 1000000.0) / 1000000.0);
            tier.put("aiTotalRequests", totalRequests);
            tier.put("aiTotalTokens", totalTokens);
            tier.put("aiUniqueUsers", uniqueUsers);

            // Workflow AI cost stats
            Object[] wfRow = wfCostMap.get(planId);
            double wfCostAvg = 0;
            int wfRequests = 0;
            if (wfRow != null) {
                double wfTotalCost = ((Number) wfRow[1]).doubleValue();
                int wfTotalReq = ((Number) wfRow[3]).intValue();
                wfRequests = wfTotalReq;
                if (uniqueUsers > 0) {
                    wfCostAvg = wfTotalCost / uniqueUsers;
                }
            }
            tier.put("workflowAiCostAvg", Math.round(wfCostAvg * 1000000.0) / 1000000.0);
            tier.put("workflowAiRequests", wfRequests);

            // Total cost and margin
            double totalCostUsd = contaboCostUsd + avgMonthlyCostPerUser + wfCostAvg;
            double netMargin = fullPrice - totalCostUsd;
            double marginPct = fullPrice > 0 ? (netMargin / fullPrice) * 100 : 0;
            tier.put("totalCostUsd", Math.round(totalCostUsd * 100.0) / 100.0);
            tier.put("netMargin", Math.round(netMargin * 100.0) / 100.0);
            tier.put("marginPct", Math.round(marginPct * 10.0) / 10.0);

            result.add(tier);
        }
        return result;
    }

    // =========================================================================
    // Accounts & Finance — Profit & Loss Statement
    // =========================================================================

    /**
     * Generate a Profit & Loss statement by aggregating voucher_items
     * grouped by chart_of_account / sub_chart_of_account.
     * Only includes completed (is_completed=1) vouchers.
     * Accepts optional year/month filters.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getProfitAndLoss(Integer year, Integer month) {
        // Build date filter clause
        String dateFilter = "";
        if (year != null && month != null) {
            dateFilter = " AND YEAR(v.date) = " + year + " AND MONTH(v.date) = " + month;
        } else if (year != null) {
            dateFilter = " AND YEAR(v.date) = " + year;
        }

        // Revenue: voucher_items linked to revenue-type sub-accounts (account_type=4)
        Query revQ = em.createNativeQuery(
                "SELECT coa.coa_id, coa.account_name, coa.code, " +
                "sca.is_sca, sca.sub_account_name, sca.code AS sca_code, " +
                "COALESCE(SUM(vi.amount), 0) AS total " +
                "FROM voucher_item vi " +
                "JOIN voucher v ON vi.vouchervid = v.vid " +
                "JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca " +
                "JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id " +
                "JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id " +
                "WHERE mca.account_type_a_id = 4 " +
                "AND v.is_completed = 1 AND v.is_active = 1 AND vi.is_active = 1 " +
                "AND vi.id LIKE '%-CR' " +
                dateFilter +
                " GROUP BY coa.coa_id, coa.account_name, coa.code, sca.is_sca, sca.sub_account_name, sca.code " +
                "ORDER BY coa.code, sca.code");
        List<Object[]> revRows = revQ.getResultList();

        List<Map<String, Object>> revenueItems = new ArrayList<>();
        double totalRevenue = 0;
        for (Object[] row : revRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("coaId", row[0]);
            item.put("accountName", row[1]);
            item.put("accountCode", row[2]);
            item.put("scaId", row[3]);
            item.put("subAccountName", row[4]);
            item.put("subAccountCode", row[5]);
            double amount = ((Number) row[6]).doubleValue();
            item.put("amount", amount);
            totalRevenue += amount;
            revenueItems.add(item);
        }

        // Expenses: voucher_items linked to expense-type sub-accounts (account_type=5)
        // Note: expenses may not have sub-accounts yet, so also query by COA directly
        Query expQ = em.createNativeQuery(
                "SELECT coa.coa_id, coa.account_name, coa.code, " +
                "COALESCE(SUM(vi.amount), 0) AS total " +
                "FROM voucher_item vi " +
                "JOIN voucher v ON vi.vouchervid = v.vid " +
                "JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca " +
                "JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id " +
                "JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id " +
                "WHERE mca.account_type_a_id = 5 " +
                "AND v.is_completed = 1 AND v.is_active = 1 AND vi.is_active = 1 " +
                dateFilter +
                " GROUP BY coa.coa_id, coa.account_name, coa.code " +
                "ORDER BY coa.code");
        List<Object[]> expRows = expQ.getResultList();

        List<Map<String, Object>> expenseItems = new ArrayList<>();
        double totalExpenses = 0;
        for (Object[] row : expRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("coaId", row[0]);
            item.put("accountName", row[1]);
            item.put("accountCode", row[2]);
            double amount = ((Number) row[3]).doubleValue();
            item.put("amount", amount);
            totalExpenses += amount;
            expenseItems.add(item);
        }

        // Summary totals by month (last 12 months)
        Query monthlyQ = em.createNativeQuery(
                "SELECT YEAR(v.date) AS yr, MONTH(v.date) AS mo, " +
                "COALESCE(SUM(CASE WHEN mca.account_type_a_id = 4 AND vi.id LIKE '%-CR' THEN vi.amount ELSE 0 END), 0) AS revenue, " +
                "COALESCE(SUM(CASE WHEN mca.account_type_a_id = 5 THEN vi.amount ELSE 0 END), 0) AS expenses " +
                "FROM voucher_item vi " +
                "JOIN voucher v ON vi.vouchervid = v.vid " +
                "JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca " +
                "JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id " +
                "JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id " +
                "WHERE v.is_completed = 1 AND v.is_active = 1 AND vi.is_active = 1 " +
                "AND v.date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) " +
                "GROUP BY yr, mo ORDER BY yr DESC, mo DESC");
        List<Object[]> monthlyRows = monthlyQ.getResultList();

        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (Object[] row : monthlyRows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("year", ((Number) row[0]).intValue());
            m.put("month", ((Number) row[1]).intValue());
            m.put("revenue", ((Number) row[2]).doubleValue());
            m.put("expenses", ((Number) row[3]).doubleValue());
            m.put("netProfit", ((Number) row[2]).doubleValue() - ((Number) row[3]).doubleValue());
            monthlyTrend.add(m);
        }

        // Assets summary (bank balances from debit entries)
        Query assetsQ = em.createNativeQuery(
                "SELECT coa.coa_id, coa.account_name, coa.code, " +
                "COALESCE(SUM(vi.amount), 0) AS total " +
                "FROM voucher_item vi " +
                "JOIN voucher v ON vi.vouchervid = v.vid " +
                "JOIN sub_chart_of_account sca ON vi.sub_chart_of_accountis_sca = sca.is_sca " +
                "JOIN chart_of_account coa ON sca.chart_of_accountcoa_id = coa.coa_id " +
                "JOIN main_chart_of_account mca ON coa.main_chart_of_account_id = mca.id " +
                "WHERE mca.account_type_a_id = 1 " +
                "AND v.is_completed = 1 AND v.is_active = 1 AND vi.is_active = 1 " +
                "AND vi.id LIKE '%-DR' " +
                dateFilter +
                " GROUP BY coa.coa_id, coa.account_name, coa.code " +
                "ORDER BY coa.code");
        List<Object[]> assetRows = assetsQ.getResultList();

        List<Map<String, Object>> assetItems = new ArrayList<>();
        double totalAssets = 0;
        for (Object[] row : assetRows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("coaId", row[0]);
            item.put("accountName", row[1]);
            item.put("accountCode", row[2]);
            double amount = ((Number) row[3]).doubleValue();
            item.put("amount", amount);
            totalAssets += amount;
            assetItems.add(item);
        }

        // Voucher count and pending count (TemcoServers vouchers only — exclude legacy Java Institute data)
        String tsVoucherFilter = "(id LIKE 'SSP-%' OR id LIKE 'PSP-%' OR id LIKE 'SSR-%' OR id LIKE 'ACP-%')";
        Object totalVouchers = em.createNativeQuery(
                "SELECT COUNT(*) FROM voucher WHERE is_active = 1 AND " + tsVoucherFilter).getSingleResult();
        Object pendingVouchers = em.createNativeQuery(
                "SELECT COUNT(*) FROM voucher WHERE is_active = 1 AND is_completed = 0 AND " + tsVoucherFilter).getSingleResult();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("revenue", revenueItems);
        result.put("totalRevenue", totalRevenue);
        result.put("expenses", expenseItems);
        result.put("totalExpenses", totalExpenses);
        result.put("netProfit", totalRevenue - totalExpenses);
        result.put("assets", assetItems);
        result.put("totalAssets", totalAssets);
        result.put("monthlyTrend", monthlyTrend);
        result.put("totalVouchers", ((Number) totalVouchers).intValue());
        result.put("pendingVouchers", ((Number) pendingVouchers).intValue());
        result.put("filterYear", year);
        result.put("filterMonth", month);
        return result;
    }

    // =========================================================================
    // Subscription Billing Cycle — Renewal, Grace, Expiry, Suspension
    // =========================================================================

    /**
     * Renew an active/grace/expired subscription: extend end_date by 30 days from today,
     * reset status to 'active', increment renewal_count, clear grace_end_date.
     * Called after admin approves a renewal payment.
     */
    public Map<String, Object> renewSubscription(int gupId, int adminLoginId) {
        int updated = em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'active', " +
                "start_date = CURDATE(), " +
                "end_date = DATE_ADD(CURDATE(), INTERVAL 30 DAY), " +
                "grace_end_date = NULL, last_reminder_sent = NULL, " +
                "renewal_count = renewal_count + 1, " +
                "approved_by_login_id = :adminId, approved_at = NOW(), updated_at = NOW() " +
                "WHERE general_user_profile_gup_id = :gupId " +
                "AND status IN ('active', 'grace', 'expired', 'suspended')")
                .setParameter("adminId", adminLoginId)
                .setParameter("gupId", gupId)
                .executeUpdate();
        if (updated == 0) {
            throw new IllegalStateException("No renewable subscription found for this user");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Subscription renewed for 30 days");
        result.put("gupId", gupId);
        return result;
    }

    /**
     * Find subscriptions expiring within N days (for reminder emails).
     * Returns list of {gupId, email, firstName, planName, endDate, daysLeft}.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findSubscriptionsExpiringWithin(int days) {
        Query q = em.createNativeQuery(
                "SELECT s.subscription_id, s.general_user_profile_gup_id, " +
                "gup.email, gup.first_name, gup.last_name, " +
                "sp.plan_name, s.end_date, DATEDIFF(s.end_date, CURDATE()) AS days_left, " +
                "s.last_reminder_sent " +
                "FROM ts_subscription s " +
                "JOIN general_user_profile gup ON s.general_user_profile_gup_id = gup.gup_id " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "WHERE s.status = 'active' " +
                "AND s.end_date IS NOT NULL " +
                "AND DATEDIFF(s.end_date, CURDATE()) BETWEEN 0 AND :days " +
                "ORDER BY s.end_date ASC");
        q.setParameter("days", days);
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subscriptionId", row[0]);
            m.put("gupId", ((Number) row[1]).intValue());
            m.put("email", row[2]);
            m.put("firstName", row[3]);
            m.put("lastName", row[4]);
            m.put("planName", row[5]);
            m.put("endDate", row[6] != null ? row[6].toString() : null);
            m.put("daysLeft", ((Number) row[7]).intValue());
            m.put("lastReminderSent", row[8] != null ? row[8].toString() : null);
            result.add(m);
        }
        return result;
    }

    /**
     * Find subscriptions that have passed their end_date and are still 'active'.
     * These need to be moved to 'grace' status.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findExpiredActiveSubscriptions() {
        Query q = em.createNativeQuery(
                "SELECT s.subscription_id, s.general_user_profile_gup_id, " +
                "gup.email, gup.first_name, sp.plan_name, s.end_date " +
                "FROM ts_subscription s " +
                "JOIN general_user_profile gup ON s.general_user_profile_gup_id = gup.gup_id " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "WHERE s.status = 'active' " +
                "AND s.end_date IS NOT NULL AND s.end_date < CURDATE()");
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subscriptionId", ((Number) row[0]).intValue());
            m.put("gupId", ((Number) row[1]).intValue());
            m.put("email", row[2]);
            m.put("firstName", row[3]);
            m.put("planName", row[4]);
            m.put("endDate", row[5] != null ? row[5].toString() : null);
            result.add(m);
        }
        return result;
    }

    /**
     * Move subscription to 'grace' status with a 5-day grace window.
     */
    public void moveToGrace(int subscriptionId) {
        em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'grace', " +
                "grace_end_date = DATE_ADD(CURDATE(), INTERVAL 5 DAY), " +
                "updated_at = NOW() WHERE subscription_id = :sid")
                .setParameter("sid", subscriptionId)
                .executeUpdate();
    }

    /**
     * Find subscriptions in 'grace' status whose grace_end_date has passed.
     * These need to be moved to 'expired' and their servers suspended.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> findExpiredGraceSubscriptions() {
        Query q = em.createNativeQuery(
                "SELECT s.subscription_id, s.general_user_profile_gup_id, " +
                "gup.email, gup.first_name, sp.plan_name, s.grace_end_date, " +
                "si.contabo_instance_id, si.instance_id AS local_instance_id " +
                "FROM ts_subscription s " +
                "JOIN general_user_profile gup ON s.general_user_profile_gup_id = gup.gup_id " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id " +
                "LEFT JOIN ts_server_instance si ON s.server_instance_id = si.instance_id " +
                "WHERE s.status = 'grace' " +
                "AND s.grace_end_date IS NOT NULL AND s.grace_end_date < CURDATE()");
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("subscriptionId", ((Number) row[0]).intValue());
            m.put("gupId", ((Number) row[1]).intValue());
            m.put("email", row[2]);
            m.put("firstName", row[3]);
            m.put("planName", row[4]);
            m.put("graceEndDate", row[5] != null ? row[5].toString() : null);
            m.put("contaboInstanceId", row[6] != null ? ((Number) row[6]).longValue() : null);
            m.put("localInstanceId", row[7] != null ? ((Number) row[7]).intValue() : null);
            result.add(m);
        }
        return result;
    }

    /**
     * Mark subscription as 'suspended' (server stopped, awaiting renewal or cancellation).
     */
    public void suspendSubscription(int subscriptionId) {
        em.createNativeQuery(
                "UPDATE ts_subscription SET status = 'suspended', updated_at = NOW() " +
                "WHERE subscription_id = :sid")
                .setParameter("sid", subscriptionId)
                .executeUpdate();
    }

    /**
     * Get the Contabo instance ID for a user's server (for restart after renewal).
     * Returns 0 if no server found.
     */
    public long getContaboInstanceIdForUser(int gupId) {
        try {
            Object result = em.createNativeQuery(
                    "SELECT si.contabo_instance_id FROM ts_server_instance si " +
                    "JOIN ts_subscription s ON s.server_instance_id = si.instance_id " +
                    "WHERE s.general_user_profile_gup_id = :gupId " +
                    "ORDER BY si.created_at DESC")
                    .setParameter("gupId", gupId)
                    .setMaxResults(1)
                    .getSingleResult();
            return result != null ? ((Number) result).longValue() : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Mark the last reminder sent date to avoid duplicate reminders on the same day.
     */
    public void markReminderSent(int subscriptionId) {
        em.createNativeQuery(
                "UPDATE ts_subscription SET last_reminder_sent = CURDATE(), updated_at = NOW() " +
                "WHERE subscription_id = :sid")
                .setParameter("sid", subscriptionId)
                .executeUpdate();
    }
}
