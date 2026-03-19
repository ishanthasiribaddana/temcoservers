package com.temcoservers.service;

import jakarta.ejb.EJB;
import jakarta.ejb.Schedule;
import jakarta.ejb.Singleton;
import jakarta.ejb.Startup;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Singleton EJB that runs daily to manage the subscription billing cycle:
 *
 * 1. Send renewal reminders at 7 days and 3 days before expiry
 * 2. Move expired 'active' subscriptions to 'grace' (5-day window)
 * 3. Suspend servers when grace period ends
 *
 * Subscription status lifecycle:
 *   pending_payment → active → grace (5 days) → suspended
 *                               ↑ renewal resets to active
 */
@Singleton
@Startup
public class SubscriptionScheduler {

    private static final Logger LOG = Logger.getLogger(SubscriptionScheduler.class.getName());

    @EJB
    private BillingService billingService;

    @EJB
    private NotificationService notificationService;

    @EJB
    private ContaboService contaboService;

    /**
     * Runs every day at 06:00 AM server time.
     * Processes all three lifecycle stages in order.
     */
    @Schedule(hour = "6", minute = "0", second = "0", persistent = false)
    public void dailySubscriptionCheck() {
        LOG.info("=== Subscription Billing Cycle — Daily Check Started ===");
        try {
            int reminders = sendRenewalReminders();
            int graced = processExpiredSubscriptions();
            int suspended = processExpiredGraceSubscriptions();
            LOG.info(String.format(
                    "=== Daily Check Complete: %d reminders sent, %d moved to grace, %d suspended ===",
                    reminders, graced, suspended));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Subscription daily check failed", e);
        }
    }

    /**
     * Stage 1: Send renewal reminder emails to subscriptions expiring within 7 days.
     * Only sends one reminder per day per subscription (tracked by last_reminder_sent).
     */
    private int sendRenewalReminders() {
        int count = 0;
        try {
            List<Map<String, Object>> expiring = billingService.findSubscriptionsExpiringWithin(7);
            for (Map<String, Object> sub : expiring) {
                try {
                    int daysLeft = (int) sub.get("daysLeft");
                    String lastSent = (String) sub.get("lastReminderSent");

                    // Send reminders at 7 days and 3 days; skip if already sent today
                    if (lastSent != null && lastSent.equals(java.time.LocalDate.now().toString())) {
                        continue;
                    }

                    // Only send at 7-day and 3-day marks (or 1-day for urgency)
                    if (daysLeft != 7 && daysLeft != 3 && daysLeft != 1) {
                        continue;
                    }

                    int gupId = (int) sub.get("gupId");
                    String firstName = (String) sub.get("firstName");
                    String planName = (String) sub.get("planName");
                    String endDate = (String) sub.get("endDate");

                    notificationService.notifyRenewalReminder(gupId, firstName, planName, endDate, daysLeft);
                    billingService.markReminderSent(((Number) sub.get("subscriptionId")).intValue());
                    count++;
                    LOG.info("Renewal reminder sent to gupId=" + gupId + " (" + daysLeft + " days left)");
                } catch (Exception e) {
                    LOG.warning("Failed to send reminder for sub " + sub.get("subscriptionId") + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to process renewal reminders", e);
        }
        return count;
    }

    /**
     * Stage 2: Move expired 'active' subscriptions to 'grace' status.
     * Sets grace_end_date = today + 5 days.
     * Sends grace period notification email.
     */
    private int processExpiredSubscriptions() {
        int count = 0;
        try {
            List<Map<String, Object>> expired = billingService.findExpiredActiveSubscriptions();
            for (Map<String, Object> sub : expired) {
                try {
                    int subId = (int) sub.get("subscriptionId");
                    int gupId = (int) sub.get("gupId");
                    String firstName = (String) sub.get("firstName");
                    String planName = (String) sub.get("planName");

                    billingService.moveToGrace(subId);

                    // Calculate grace end date (5 days from now)
                    String graceEndDate = java.time.LocalDate.now().plusDays(5).toString();
                    notificationService.notifyGracePeriod(gupId, firstName, planName, graceEndDate);

                    count++;
                    LOG.info("Subscription " + subId + " (gupId=" + gupId + ") moved to GRACE period until " + graceEndDate);
                } catch (Exception e) {
                    LOG.warning("Failed to process expired sub " + sub.get("subscriptionId") + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to process expired subscriptions", e);
        }
        return count;
    }

    /**
     * Stage 3: Suspend subscriptions whose grace period has ended.
     * Stops the Contabo server via API and marks subscription as 'suspended'.
     * Sends server-suspended notification email.
     */
    private int processExpiredGraceSubscriptions() {
        int count = 0;
        try {
            List<Map<String, Object>> graceExpired = billingService.findExpiredGraceSubscriptions();
            for (Map<String, Object> sub : graceExpired) {
                try {
                    int subId = (int) sub.get("subscriptionId");
                    int gupId = (int) sub.get("gupId");
                    String firstName = (String) sub.get("firstName");
                    String planName = (String) sub.get("planName");
                    Long contaboInstanceId = (Long) sub.get("contaboInstanceId");

                    // Stop the Contabo server if it exists
                    if (contaboInstanceId != null && contaboInstanceId > 0 && contaboService.isConfigured()) {
                        try {
                            contaboService.performAction(contaboInstanceId, "stop");
                            LOG.info("Contabo instance " + contaboInstanceId + " STOPPED for suspended gupId=" + gupId);
                        } catch (Exception e) {
                            LOG.warning("Failed to stop Contabo instance " + contaboInstanceId + ": " + e.getMessage());
                        }
                    }

                    // Mark subscription as suspended
                    billingService.suspendSubscription(subId);

                    // Send suspension notification
                    notificationService.notifyServerSuspended(gupId, firstName, planName);

                    count++;
                    LOG.info("Subscription " + subId + " (gupId=" + gupId + ") SUSPENDED — grace period ended");
                } catch (Exception e) {
                    LOG.warning("Failed to suspend sub " + sub.get("subscriptionId") + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to process grace-expired subscriptions", e);
        }
        return count;
    }
}
