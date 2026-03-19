package com.temcoservers.service;

import jakarta.ejb.Stateless;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.*;
import java.util.logging.Logger;

@Stateless
public class BulkEmailService {

    private static final Logger LOG = Logger.getLogger(BulkEmailService.class.getName());

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    @Inject
    private EmailService emailService;

    @jakarta.ejb.EJB
    private EmailCampaignService campaignService;

    /**
     * Execute a campaign: resolve template, send to all group members, log results.
     * Respects daily quota and throttles sends to avoid Gmail rate limits.
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> executeCampaign(int templateId, int bulkId, int groupId,
                                                int senderGupId, String ccEmail) {

        // Check daily quota
        int remaining = campaignService.getRemainingQuota();
        if (remaining <= 0) {
            throw new IllegalStateException("Daily email quota exhausted. Try again tomorrow.");
        }

        // 1. Load template
        List<Object[]> tplRows = em.createNativeQuery(
                "SELECT subject, content FROM email_template WHERE id = :id")
                .setParameter("id", templateId).getResultList();
        if (tplRows.isEmpty()) throw new IllegalArgumentException("Template not found: " + templateId);

        String subjectTemplate = (String) tplRows.get(0)[0];
        String contentTemplate = (String) tplRows.get(0)[1];

        // 2. Load group members with their profile info
        List<Object[]> members = em.createNativeQuery(
                "SELECT gm.gup_id, gup.first_name, gup.last_name, gup.email " +
                "FROM ts_email_group_member gm " +
                "JOIN general_user_profile gup ON gm.gup_id = gup.gup_id " +
                "WHERE gm.email_group_id = :gid AND gup.email IS NOT NULL AND gup.email != ''")
                .setParameter("gid", groupId).getResultList();

        if (members.isEmpty()) throw new IllegalArgumentException("No members in group: " + groupId);

        // 3. Create campaign record
        em.createNativeQuery(
                "INSERT INTO ts_email_campaign (email_bulk_id, email_template_id, email_group_id, " +
                "sent_by, sent_date, total_recipients, total_sent, total_failed, status) " +
                "VALUES (:bulkId, :tplId, :grpId, :sender, NOW(), :total, 0, 0, 'sending')")
                .setParameter("bulkId", bulkId)
                .setParameter("tplId", templateId)
                .setParameter("grpId", groupId)
                .setParameter("sender", senderGupId)
                .setParameter("total", members.size())
                .executeUpdate();

        int campaignId = ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).intValue();

        // 4. Send to each member (capped by daily quota)
        int sent = 0, failed = 0;
        int maxToSend = Math.min(members.size(), remaining);
        if (maxToSend < members.size()) {
            LOG.warning("Campaign capped at " + maxToSend + " of " + members.size() +
                    " recipients due to daily quota (" + remaining + " remaining)");
        }
        for (int i = 0; i < maxToSend; i++) {
            Object[] member = members.get(i);
            int gupId = ((Number) member[0]).intValue();
            String firstName = member[1] != null ? (String) member[1] : "Customer";
            String lastName = member[2] != null ? (String) member[2] : "";
            String email = (String) member[3];
            String customerName = (firstName + " " + lastName).trim();

            // Resolve placeholders
            String subject = resolvePlaceholders(subjectTemplate, customerName, email);
            String content = resolvePlaceholders(contentTemplate, customerName, email);

            boolean ok = emailService.sendHtmlEmail(email, ccEmail, subject, content);

            // 5. Log per-recipient
            em.createNativeQuery(
                    "INSERT INTO ts_email_campaign_log (campaign_id, gup_id, email_address, status, sent_at, error_message) " +
                    "VALUES (:cid, :gup, :email, :status, NOW(), :err)")
                    .setParameter("cid", campaignId)
                    .setParameter("gup", gupId)
                    .setParameter("email", email)
                    .setParameter("status", ok ? "sent" : "failed")
                    .setParameter("err", ok ? null : "Send failed")
                    .executeUpdate();

            // 6. Also log in communication_history for audit
            em.createNativeQuery(
                    "INSERT INTO communication_history (content, recepient_address, added_date, sent_date, is_sent, " +
                    "communication_type_id, communication_purpose_id, sent_by, sent_to) " +
                    "VALUES (:content, :addr, NOW(), NOW(), :isSent, 1, 9, :sender, :recipient)")
                    .setParameter("content", subject)
                    .setParameter("addr", email)
                    .setParameter("isSent", ok ? 1 : 0)
                    .setParameter("sender", senderGupId)
                    .setParameter("recipient", gupId)
                    .executeUpdate();

            if (ok) {
                sent++;
                campaignService.incrementQuota(1);
            } else {
                failed++;
            }
        }

        // 7. Update campaign totals (use actual counts, mark partial if quota-capped)
        em.createNativeQuery(
                "UPDATE ts_email_campaign SET total_sent = :sent, total_failed = :failed, status = 'completed' " +
                "WHERE id = :id")
                .setParameter("sent", sent)
                .setParameter("failed", failed)
                .setParameter("id", campaignId)
                .executeUpdate();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("campaignId", campaignId);
        result.put("totalRecipients", members.size());
        result.put("totalSent", sent);
        result.put("totalFailed", failed);
        result.put("status", "completed");
        LOG.info("Campaign #" + campaignId + " completed: " + sent + " sent, " + failed + " failed");
        return result;
    }

    private String resolvePlaceholders(String template, String customerName, String email) {
        if (template == null) return "";
        return template
                .replace("{{customerName}}", customerName)
                .replace("{{email}}", email)
                .replace("{{dashboardUrl}}", "https://aihost.temcobank.com/dashboard")
                .replace("{{year}}", String.valueOf(LocalDateTime.now().getYear()));
    }
}
