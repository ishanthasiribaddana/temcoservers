package com.temcoservers.service;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.*;
import java.util.logging.Logger;

@Stateless
public class EmailCampaignService {

    private static final Logger LOG = Logger.getLogger(EmailCampaignService.class.getName());

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    // ─── Dashboard Stats ─────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        Number totalCampaigns = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM ts_email_campaign").getSingleResult();
        stats.put("totalCampaigns", totalCampaigns.intValue());

        Number totalSent = (Number) em.createNativeQuery(
                "SELECT COALESCE(SUM(total_sent), 0) FROM ts_email_campaign").getSingleResult();
        stats.put("totalEmailsSent", totalSent.intValue());

        Number totalFailed = (Number) em.createNativeQuery(
                "SELECT COALESCE(SUM(total_failed), 0) FROM ts_email_campaign").getSingleResult();
        stats.put("totalFailed", totalFailed.intValue());

        Number sentThisMonth = (Number) em.createNativeQuery(
                "SELECT COALESCE(SUM(total_sent), 0) FROM ts_email_campaign " +
                "WHERE sent_date >= DATE_FORMAT(NOW(), '%Y-%m-01')").getSingleResult();
        stats.put("sentThisMonth", sentThisMonth.intValue());

        Number activeSchedules = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM ts_email_schedule WHERE is_active = 1").getSingleResult();
        stats.put("activeSchedules", activeSchedules.intValue());

        int totalEmail = totalSent.intValue() + totalFailed.intValue();
        double successRate = totalEmail > 0 ? (totalSent.doubleValue() / totalEmail) * 100 : 0;
        stats.put("successRate", Math.round(successRate * 10) / 10.0);

        // Today's quota
        stats.put("quota", getDailyQuota());

        return stats;
    }

    // ─── Daily Quota ─────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> getDailyQuota() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT emails_sent, daily_limit FROM ts_email_daily_quota WHERE quota_date = CURDATE()")
                .getResultList();
        Map<String, Object> quota = new LinkedHashMap<>();
        if (rows.isEmpty()) {
            quota.put("sent", 0);
            quota.put("limit", 500);
            quota.put("remaining", 500);
        } else {
            int sent = ((Number) rows.get(0)[0]).intValue();
            int limit = ((Number) rows.get(0)[1]).intValue();
            quota.put("sent", sent);
            quota.put("limit", limit);
            quota.put("remaining", Math.max(0, limit - sent));
        }
        return quota;
    }

    public void incrementQuota(int count) {
        em.createNativeQuery(
                "INSERT INTO ts_email_daily_quota (quota_date, emails_sent, daily_limit) " +
                "VALUES (CURDATE(), :cnt, 500) " +
                "ON DUPLICATE KEY UPDATE emails_sent = emails_sent + :cnt2")
                .setParameter("cnt", count)
                .setParameter("cnt2", count)
                .executeUpdate();
    }

    public int getRemainingQuota() {
        Map<String, Object> q = getDailyQuota();
        return ((Number) q.get("remaining")).intValue();
    }

    // ─── Campaign CRUD ───────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listCampaigns() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT c.id, b.name AS campaign_name, t.name AS template_name, g.name AS group_name, " +
                "c.total_recipients, c.total_sent, c.total_failed, c.status, c.sent_date, " +
                "CONCAT(gup.first_name, ' ', gup.last_name) AS sent_by_name " +
                "FROM ts_email_campaign c " +
                "JOIN email_bulk b ON c.email_bulk_id = b.id " +
                "JOIN email_template t ON c.email_template_id = t.id " +
                "JOIN email_group g ON c.email_group_id = g.id " +
                "JOIN general_user_profile gup ON c.sent_by = gup.gup_id " +
                "ORDER BY c.sent_date DESC")
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("campaignName", r[1]);
            m.put("templateName", r[2]);
            m.put("groupName", r[3]);
            m.put("totalRecipients", ((Number) r[4]).intValue());
            m.put("totalSent", ((Number) r[5]).intValue());
            m.put("totalFailed", ((Number) r[6]).intValue());
            m.put("status", r[7]);
            m.put("sentDate", r[8] != null ? r[8].toString() : null);
            m.put("sentByName", r[9]);
            result.add(m);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getCampaignLogs(int campaignId) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT cl.id, cl.gup_id, cl.email_address, cl.status, cl.sent_at, cl.error_message, " +
                "CONCAT(gup.first_name, ' ', gup.last_name) AS recipient_name " +
                "FROM ts_email_campaign_log cl " +
                "JOIN general_user_profile gup ON cl.gup_id = gup.gup_id " +
                "WHERE cl.campaign_id = :cid ORDER BY cl.id")
                .setParameter("cid", campaignId)
                .getResultList();

        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("gupId", ((Number) r[1]).intValue());
            m.put("email", r[2]);
            m.put("status", r[3]);
            m.put("sentAt", r[4] != null ? r[4].toString() : null);
            m.put("error", r[5]);
            m.put("recipientName", r[6]);
            result.add(m);
        }
        return result;
    }

    // ─── Template CRUD ───────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listTemplates() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, name, subject FROM email_template ORDER BY id")
                .getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("name", r[1]);
            m.put("subject", r[2]);
            result.add(m);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getTemplate(int id) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, name, subject, content, header_settings FROM email_template WHERE id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return null;
        Object[] r = rows.get(0);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", ((Number) r[0]).intValue());
        m.put("name", r[1]);
        m.put("subject", r[2]);
        m.put("content", r[3]);
        m.put("headerSettings", r[4]);
        return m;
    }

    public int createTemplate(String name, String subject, String content) {
        em.createNativeQuery(
                "INSERT INTO email_template (name, subject, content) VALUES (:name, :subject, :content)")
                .setParameter("name", name)
                .setParameter("subject", subject)
                .setParameter("content", content)
                .executeUpdate();
        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).intValue();
    }

    public void updateTemplate(int id, String name, String subject, String content) {
        em.createNativeQuery(
                "UPDATE email_template SET name = :name, subject = :subject, content = :content WHERE id = :id")
                .setParameter("name", name)
                .setParameter("subject", subject)
                .setParameter("content", content)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void deleteTemplate(int id) {
        em.createNativeQuery("DELETE FROM email_template WHERE id = :id")
                .setParameter("id", id).executeUpdate();
    }

    // ─── Group CRUD ──────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listGroups() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT g.id, g.name, " +
                "(SELECT COUNT(*) FROM ts_email_group_member gm WHERE gm.email_group_id = g.id) AS member_count " +
                "FROM email_group g ORDER BY g.id")
                .getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("name", r[1]);
            m.put("memberCount", ((Number) r[2]).intValue());
            result.add(m);
        }
        return result;
    }

    public int createGroup(String name) {
        em.createNativeQuery("INSERT INTO email_group (name) VALUES (:name)")
                .setParameter("name", name).executeUpdate();
        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).intValue();
    }

    public void deleteGroup(int id) {
        em.createNativeQuery("DELETE FROM ts_email_group_member WHERE email_group_id = :id")
                .setParameter("id", id).executeUpdate();
        em.createNativeQuery("DELETE FROM email_group WHERE id = :id")
                .setParameter("id", id).executeUpdate();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getGroupMembers(int groupId) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT gm.id, gm.gup_id, gup.first_name, gup.last_name, gup.email, gm.added_date " +
                "FROM ts_email_group_member gm " +
                "JOIN general_user_profile gup ON gm.gup_id = gup.gup_id " +
                "WHERE gm.email_group_id = :gid ORDER BY gm.id")
                .setParameter("gid", groupId).getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("gupId", ((Number) r[1]).intValue());
            m.put("firstName", r[2]);
            m.put("lastName", r[3]);
            m.put("email", r[4]);
            m.put("addedDate", r[5] != null ? r[5].toString() : null);
            result.add(m);
        }
        return result;
    }

    public void addMemberToGroup(int groupId, int gupId) {
        em.createNativeQuery(
                "INSERT IGNORE INTO ts_email_group_member (email_group_id, gup_id) VALUES (:gid, :gup)")
                .setParameter("gid", groupId)
                .setParameter("gup", gupId)
                .executeUpdate();
    }

    public void removeMemberFromGroup(int groupId, int gupId) {
        em.createNativeQuery(
                "DELETE FROM ts_email_group_member WHERE email_group_id = :gid AND gup_id = :gup")
                .setParameter("gid", groupId)
                .setParameter("gup", gupId)
                .executeUpdate();
    }

    /**
     * Auto-populate a group with all students who have a non-null email.
     * Returns the number of members added.
     */
    public int autoPopulateGroup(int groupId, String filter) {
        String sql;
        if ("all_students".equals(filter)) {
            sql = "INSERT IGNORE INTO ts_email_group_member (email_group_id, gup_id) " +
                  "SELECT :gid, gup.gup_id FROM general_user_profile gup " +
                  "JOIN user_login ul ON ul.general_user_profilegup_id = gup.gup_id " +
                  "WHERE gup.email IS NOT NULL AND gup.email != '' AND ul.is_active = 1";
        } else if ("temcoservers_customers".equals(filter)) {
            sql = "INSERT IGNORE INTO ts_email_group_member (email_group_id, gup_id) " +
                  "SELECT :gid, si.general_user_profile_gup_id FROM ts_server_instance si " +
                  "JOIN general_user_profile gup ON si.general_user_profile_gup_id = gup.gup_id " +
                  "WHERE gup.email IS NOT NULL AND gup.email != ''";
        } else {
            return 0;
        }
        return em.createNativeQuery(sql).setParameter("gid", groupId).executeUpdate();
    }

    // ─── Bulk Campaign Definition CRUD ───────────────────────────────

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listBulkDefinitions() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, name FROM email_bulk ORDER BY id").getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("name", r[1]);
            result.add(m);
        }
        return result;
    }

    public int createBulkDefinition(String name) {
        em.createNativeQuery("INSERT INTO email_bulk (name) VALUES (:name)")
                .setParameter("name", name).executeUpdate();
        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).intValue();
    }

    // ─── Schedule CRUD ───────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listSchedules() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT s.id, s.campaign_name, t.name AS template_name, g.name AS group_name, " +
                "s.frequency, s.scheduled_date, s.last_run, s.is_active, s.batch_size " +
                "FROM ts_email_schedule s " +
                "JOIN email_template t ON s.email_template_id = t.id " +
                "JOIN email_group g ON s.email_group_id = g.id " +
                "ORDER BY s.scheduled_date")
                .getResultList();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", ((Number) r[0]).intValue());
            m.put("campaignName", r[1]);
            m.put("templateName", r[2]);
            m.put("groupName", r[3]);
            m.put("frequency", r[4]);
            m.put("scheduledDate", r[5] != null ? r[5].toString() : null);
            m.put("lastRun", r[6] != null ? r[6].toString() : null);
            m.put("isActive", ((Number) r[7]).intValue() == 1);
            m.put("batchSize", ((Number) r[8]).intValue());
            result.add(m);
        }
        return result;
    }

    public int createSchedule(String name, int templateId, int groupId, int bulkId,
                               String frequency, String scheduledDate, int batchSize, int createdBy) {
        em.createNativeQuery(
                "INSERT INTO ts_email_schedule (campaign_name, email_template_id, email_group_id, " +
                "email_bulk_id, frequency, scheduled_date, batch_size, created_by) " +
                "VALUES (:name, :tpl, :grp, :bulk, :freq, :date, :batch, :creator)")
                .setParameter("name", name)
                .setParameter("tpl", templateId)
                .setParameter("grp", groupId)
                .setParameter("bulk", bulkId)
                .setParameter("freq", frequency)
                .setParameter("date", scheduledDate)
                .setParameter("batch", batchSize)
                .setParameter("creator", createdBy)
                .executeUpdate();
        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).intValue();
    }

    public void toggleSchedule(int id, boolean active) {
        em.createNativeQuery("UPDATE ts_email_schedule SET is_active = :active WHERE id = :id")
                .setParameter("active", active ? 1 : 0)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void deleteSchedule(int id) {
        em.createNativeQuery("DELETE FROM ts_email_schedule WHERE id = :id")
                .setParameter("id", id).executeUpdate();
    }

    public void markScheduleRun(int id) {
        em.createNativeQuery("UPDATE ts_email_schedule SET last_run = NOW() WHERE id = :id")
                .setParameter("id", id).executeUpdate();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSchedule(int id) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id, campaign_name, email_template_id, email_group_id, email_bulk_id, " +
                "frequency, scheduled_date, batch_size, is_active FROM ts_email_schedule WHERE id = :id")
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return null;
        Object[] r = rows.get(0);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", ((Number) r[0]).intValue());
        m.put("campaignName", r[1]);
        m.put("templateId", ((Number) r[2]).intValue());
        m.put("groupId", ((Number) r[3]).intValue());
        m.put("bulkId", ((Number) r[4]).intValue());
        m.put("frequency", r[5]);
        m.put("scheduledDate", r[6] != null ? r[6].toString() : null);
        m.put("batchSize", ((Number) r[7]).intValue());
        m.put("isActive", ((Number) r[8]).intValue() == 1);
        return m;
    }
}
