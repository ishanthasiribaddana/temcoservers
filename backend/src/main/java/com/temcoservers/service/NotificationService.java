package com.temcoservers.service;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.*;

@Stateless
public class NotificationService {

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    // Communication type IDs
    private static final int TYPE_EMAIL = 1;
    private static final int TYPE_SMS = 2;

    // Communication purpose IDs
    private static final int PURPOSE_PAYMENT_REMINDER = 1;
    private static final int PURPOSE_SERVER_PROVISIONED = 6;
    private static final int PURPOSE_SUBSCRIPTION_RENEWAL = 7;
    private static final int PURPOSE_AI_USAGE_ALERT = 8;

    public void sendNotification(int sentByGupId, int sentToGupId, int typeId, int purposeId, String content) {
        em.createNativeQuery(
                "INSERT INTO communication_history (content, added_date, is_sent, sent_date, " +
                "communication_type_id, communication_purpose_id, sent_by, sent_to) " +
                "VALUES (:content, NOW(), 1, NOW(), :typeId, :purposeId, :sentBy, :sentTo)")
                .setParameter("content", content)
                .setParameter("typeId", typeId)
                .setParameter("purposeId", purposeId)
                .setParameter("sentBy", sentByGupId)
                .setParameter("sentTo", sentToGupId)
                .executeUpdate();
    }

    public void notifySubscriptionCreated(int adminGupId, int userGupId, String planName) {
        String content = String.format(
                "Your TemcoServers subscription to the '%s' plan has been activated. " +
                "You can now access your server from the dashboard. Thank you for choosing TemcoServers!",
                planName);
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_SERVER_PROVISIONED, content);
    }

    public void notifySubscriptionCancelled(int adminGupId, int userGupId) {
        String content = "Your TemcoServers subscription has been cancelled. " +
                "Your server will remain accessible until the end of the current billing period.";
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_SUBSCRIPTION_RENEWAL, content);
    }

    public void notifyPaymentReceived(int adminGupId, int userGupId, double amount,
                                      String planName, String invoiceUrl) {
        String invoiceLink = (invoiceUrl != null)
                ? String.format(" Download your payment acknowledgement: %s", invoiceUrl)
                : "";
        String content = String.format(
                "Payment of LKR %.2f has been submitted for your '%s' subscription. " +
                "Verification is pending and may take up to 24 hours as we reconcile with bank statements. " +
                "You will be notified once your payment is confirmed.%s Thank you!",
                amount, planName, invoiceLink);
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_PAYMENT_REMINDER, content);
    }

    public void notifyAiUsageAlert(int adminGupId, int userGupId, int usedRequests, int limit) {
        String content = String.format(
                "You have used %d out of %d AI requests this month. " +
                "Consider upgrading your plan for more AI code generation capacity.",
                usedRequests, limit);
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_AI_USAGE_ALERT, content);
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserNotifications(int gupId, int page, int size) {
        Query q = em.createNativeQuery(
                "SELECT ch.id, ch.content, ch.added_date, ch.sent_date, ch.is_sent, " +
                "ct.name AS type_name, cp.name AS purpose_name, " +
                "gup.first_name AS sender_first, gup.last_name AS sender_last " +
                "FROM communication_history ch " +
                "JOIN communication_type ct ON ch.communication_type_id = ct.id " +
                "JOIN communication_purpose cp ON ch.communication_purpose_id = cp.id " +
                "LEFT JOIN general_user_profile gup ON ch.sent_by = gup.gup_id " +
                "WHERE ch.sent_to = :gupId " +
                "ORDER BY ch.added_date DESC");
        q.setParameter("gupId", gupId);
        q.setFirstResult(page * size);
        q.setMaxResults(size);
        List<Object[]> rows = q.getResultList();
        List<Map<String, Object>> notifications = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> n = new LinkedHashMap<>();
            n.put("id", row[0]);
            n.put("content", row[1]);
            n.put("addedDate", row[2] != null ? row[2].toString() : null);
            n.put("sentDate", row[3] != null ? row[3].toString() : null);
            n.put("isSent", row[4]);
            n.put("type", row[5]);
            n.put("purpose", row[6]);
            n.put("senderName", row[7] != null ? row[7] + " " + row[8] : "System");
            notifications.add(n);
        }
        return notifications;
    }

    public long getUserNotificationCount(int gupId) {
        Query q = em.createNativeQuery("SELECT COUNT(*) FROM communication_history WHERE sent_to = :gupId");
        q.setParameter("gupId", gupId);
        return ((Number) q.getSingleResult()).longValue();
    }
}
