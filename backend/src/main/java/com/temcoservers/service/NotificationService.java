package com.temcoservers.service;

import jakarta.ejb.EJB;
import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.*;
import java.util.logging.Logger;

@Stateless
public class NotificationService {

    private static final Logger LOG = Logger.getLogger(NotificationService.class.getName());

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    @EJB
    private EmailService emailService;

    // Communication type IDs
    private static final int TYPE_EMAIL = 1;
    private static final int TYPE_SMS = 2;

    // Communication purpose IDs
    private static final int PURPOSE_PAYMENT_REMINDER = 1;
    private static final int PURPOSE_SERVER_PROVISIONED = 6;
    private static final int PURPOSE_SUBSCRIPTION_RENEWAL = 7;
    private static final int PURPOSE_AI_USAGE_ALERT = 8;
    private static final int PURPOSE_WELCOME = 10;

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

        // Send actual email if SMTP is configured and this is an email-type notification
        if (typeId == TYPE_EMAIL && emailService.isConfigured()) {
            try {
                String recipientEmail = getEmailForGupId(sentToGupId);
                if (recipientEmail != null && !recipientEmail.isBlank()) {
                    String subject = getSubjectForPurpose(purposeId);
                    emailService.sendEmailAsync(recipientEmail, subject, content);
                }
            } catch (Exception e) {
                LOG.warning("Failed to send email for gupId=" + sentToGupId + ": " + e.getMessage());
            }
        }
    }

    private String getEmailForGupId(int gupId) {
        try {
            Object result = em.createNativeQuery(
                    "SELECT email FROM general_user_profile WHERE gup_id = :gupId")
                    .setParameter("gupId", gupId)
                    .getSingleResult();
            return result != null ? result.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String getSubjectForPurpose(int purposeId) {
        switch (purposeId) {
            case PURPOSE_PAYMENT_REMINDER: return "TemcoServers - Payment Update";
            case PURPOSE_SERVER_PROVISIONED: return "TemcoServers - Your Server is Ready!";
            case PURPOSE_SUBSCRIPTION_RENEWAL: return "TemcoServers - Subscription Update";
            case PURPOSE_AI_USAGE_ALERT: return "TemcoServers - AI Usage Alert";
            case PURPOSE_WELCOME: return "Welcome to TemcoServers!";
            default: return "TemcoServers - Notification";
        }
    }

    public void notifyWelcome(int gupId, String firstName) {
        String content = String.format(
                "Welcome to TemcoServers, %s! Your account has been created successfully. " +
                "To get started, browse our server plans and subscribe to one that fits your needs. " +
                "Once you subscribe and upload your bank slip, our team will verify the payment " +
                "and provision your dedicated server. Thank you for choosing TemcoServers!",
                firstName);
        sendNotification(gupId, gupId, TYPE_EMAIL, PURPOSE_WELCOME, content);
    }

    public void notifySubscriptionCreated(int adminGupId, int userGupId, String planName) {
        String content = String.format(
                "Your TemcoServers subscription to the '%s' plan has been created and is awaiting payment. " +
                "Please upload your bank slip to complete the payment process. " +
                "Your server will be provisioned once the payment is verified by our team.",
                planName);
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_PAYMENT_REMINDER, content);
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

    public void notifyPaymentApproved(int adminGupId, int userGupId) {
        notifyPaymentApproved(adminGupId, userGupId, null, null, null);
    }

    public void notifyPaymentApproved(int adminGupId, int userGupId,
                                       String serverIp, String planName, String defaultUser) {
        StringBuilder sb = new StringBuilder();
        sb.append("Your payment has been verified and approved. Your TemcoServers subscription is now active.");

        if (serverIp != null && !serverIp.isBlank()) {
            sb.append("\n\n--- Your Server Details ---");
            if (planName != null) sb.append("\nPlan: ").append(planName);
            sb.append("\nServer IP: ").append(serverIp);
            sb.append("\nSSH User: ").append(defaultUser != null ? defaultUser : "root");
            sb.append("\nSSH Command: ssh ").append(defaultUser != null ? defaultUser : "root")
                    .append("@").append(serverIp);
            sb.append("\n\nIMPORTANT: Your initial root password was sent to the administrator. ");
            sb.append("Please contact support to receive your SSH credentials, then change your password immediately.");
            sb.append("\n--- End Server Details ---");
        }

        sb.append("\n\nYou can view your server from the dashboard. Thank you for choosing TemcoServers!");
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_SERVER_PROVISIONED, sb.toString());
    }

    public void notifyPaymentRejected(int adminGupId, int userGupId, String reason) {
        String content = String.format(
                "Your payment could not be verified. Reason: %s. " +
                "Please contact support or submit a new payment slip if you believe this is an error.",
                reason);
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_PAYMENT_REMINDER, content);
    }

    public void notifyAiUsageAlert(int adminGupId, int userGupId, int usedRequests, int limit) {
        String content = String.format(
                "You have used %d out of %d AI requests this month. " +
                "Consider upgrading your plan for more AI code generation capacity.",
                usedRequests, limit);
        sendNotification(adminGupId, userGupId, TYPE_EMAIL, PURPOSE_AI_USAGE_ALERT, content);
    }

    public void notifyRenewalReminder(int userGupId, String firstName, String planName,
                                       String endDate, int daysLeft) {
        String content = String.format(
                "Hi %s,\n\nYour TemcoServers '%s' subscription expires on %s (%d day%s remaining).\n\n" +
                "To continue using your server without interruption, please renew your subscription " +
                "by uploading a bank transfer slip from your Billing page.\n\n" +
                "If your subscription expires, you will have a 5-day grace period before your server is suspended.\n\n" +
                "Thank you for choosing TemcoServers!",
                firstName != null ? firstName : "Customer", planName, endDate,
                daysLeft, daysLeft == 1 ? "" : "s");
        sendNotification(userGupId, userGupId, TYPE_EMAIL, PURPOSE_SUBSCRIPTION_RENEWAL, content);
    }

    public void notifyGracePeriod(int userGupId, String firstName, String planName, String graceEndDate) {
        String content = String.format(
                "Hi %s,\n\nYour TemcoServers '%s' subscription has expired and entered a 5-day grace period.\n\n" +
                "Your server is still running, but it will be SUSPENDED on %s if payment is not received.\n\n" +
                "Please renew immediately from your Billing page to avoid service interruption.\n\n" +
                "If you have already submitted payment, please allow up to 24 hours for verification.",
                firstName != null ? firstName : "Customer", planName, graceEndDate);
        sendNotification(userGupId, userGupId, TYPE_EMAIL, PURPOSE_SUBSCRIPTION_RENEWAL, content);
    }

    public void notifyServerSuspended(int userGupId, String firstName, String planName) {
        String content = String.format(
                "Hi %s,\n\nYour TemcoServers '%s' subscription grace period has ended.\n\n" +
                "Your server has been SUSPENDED. Your data is preserved, but the server is stopped " +
                "and cannot be accessed until you renew your subscription.\n\n" +
                "To restore your server, please submit a renewal payment from your Billing page. " +
                "Your server will be restarted automatically once payment is verified.\n\n" +
                "If you no longer need the server, no further action is required.",
                firstName != null ? firstName : "Customer", planName);
        sendNotification(userGupId, userGupId, TYPE_EMAIL, PURPOSE_SUBSCRIPTION_RENEWAL, content);
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
