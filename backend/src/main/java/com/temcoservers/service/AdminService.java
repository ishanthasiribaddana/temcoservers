package com.temcoservers.service;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.util.*;

@Stateless
public class AdminService {

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();

        // Total active users
        Query totalUsers = em.createNativeQuery("SELECT COUNT(*) FROM user_login WHERE is_active = 1");
        stats.put("totalUsers", ((Number) totalUsers.getSingleResult()).intValue());

        // Total students in system
        Query totalStudents = em.createNativeQuery("SELECT COUNT(*) FROM student");
        stats.put("totalStudents", ((Number) totalStudents.getSingleResult()).intValue());

        // Server customers (users with role "Server Customer")
        Query serverCustomers = em.createNativeQuery(
                "SELECT COUNT(*) FROM user_login ul JOIN user_role ur ON ul.user_role_ur_id = ur.ur_id " +
                "WHERE ur.role_name = 'Server Customer' AND ul.is_active = 1");
        stats.put("serverCustomers", ((Number) serverCustomers.getSingleResult()).intValue());

        // Active subscriptions
        Query activeSubs = em.createNativeQuery(
                "SELECT COUNT(*) FROM ts_subscription WHERE status = 'active'");
        stats.put("activeSubscriptions", ((Number) activeSubs.getSingleResult()).intValue());

        // Total subscription plans
        Query plans = em.createNativeQuery("SELECT COUNT(*) FROM ts_subscription_plan WHERE is_active = 1");
        stats.put("activePlans", ((Number) plans.getSingleResult()).intValue());

        // Revenue (sum of plan prices for active subscriptions)
        Query revenue = em.createNativeQuery(
                "SELECT COALESCE(SUM(sp.price_monthly), 0) FROM ts_subscription s " +
                "JOIN ts_subscription_plan sp ON s.plan_id = sp.plan_id WHERE s.status = 'active'");
        stats.put("monthlyRevenue", ((Number) revenue.getSingleResult()).doubleValue());

        return stats;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listServerCustomers(int page, int size, String search) {
        String sql = "SELECT ul.login_id, ul.username, ul.is_active, " +
                "gup.gup_id, gup.first_name, gup.last_name, gup.email, gup.mobile_phone, " +
                "ur.role_name " +
                "FROM user_login ul " +
                "JOIN general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id " +
                "JOIN user_role ur ON ul.user_role_ur_id = ur.ur_id " +
                "WHERE ur.role_name = 'Server Customer'";

        if (search != null && !search.trim().isEmpty()) {
            sql += " AND (gup.first_name LIKE :search OR gup.last_name LIKE :search " +
                   "OR ul.username LIKE :search OR gup.email LIKE :search)";
        }
        sql += " ORDER BY ul.login_id DESC";

        Query query = em.createNativeQuery(sql);
        if (search != null && !search.trim().isEmpty()) {
            query.setParameter("search", "%" + search.trim() + "%");
        }
        query.setFirstResult(page * size);
        query.setMaxResults(size);

        List<Object[]> rows = query.getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("loginId", row[0]);
            user.put("username", row[1]);
            user.put("isActive", row[2]);
            user.put("gupId", row[3]);
            user.put("firstName", row[4]);
            user.put("lastName", row[5]);
            user.put("email", row[6]);
            user.put("mobile", row[7]);
            user.put("role", row[8]);
            results.add(user);
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listAllUsers(int page, int size, String search) {
        String sql = "SELECT ul.login_id, ul.username, ul.is_active, " +
                "gup.gup_id, gup.first_name, gup.last_name, gup.email, gup.mobile_phone, " +
                "ur.role_name, ur.ur_id " +
                "FROM user_login ul " +
                "JOIN general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id " +
                "JOIN user_role ur ON ul.user_role_ur_id = ur.ur_id " +
                "WHERE ul.is_active = 1";

        if (search != null && !search.trim().isEmpty()) {
            sql += " AND (gup.first_name LIKE :search OR gup.last_name LIKE :search " +
                   "OR ul.username LIKE :search OR gup.email LIKE :search)";
        }
        sql += " ORDER BY ul.login_id DESC";

        Query query = em.createNativeQuery(sql);
        if (search != null && !search.trim().isEmpty()) {
            query.setParameter("search", "%" + search.trim() + "%");
        }
        query.setFirstResult(page * size);
        query.setMaxResults(size);

        List<Object[]> rows = query.getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("loginId", row[0]);
            user.put("username", row[1]);
            user.put("isActive", row[2]);
            user.put("gupId", row[3]);
            user.put("firstName", row[4]);
            user.put("lastName", row[5]);
            user.put("email", row[6]);
            user.put("mobile", row[7]);
            user.put("role", row[8]);
            user.put("roleId", row[9]);
            results.add(user);
        }
        return results;
    }

    public long countServerCustomers(String search) {
        String sql = "SELECT COUNT(*) FROM user_login ul " +
                "JOIN general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id " +
                "JOIN user_role ur ON ul.user_role_ur_id = ur.ur_id " +
                "WHERE ur.role_name = 'Server Customer'";
        if (search != null && !search.trim().isEmpty()) {
            sql += " AND (gup.first_name LIKE :search OR gup.last_name LIKE :search " +
                   "OR ul.username LIKE :search OR gup.email LIKE :search)";
        }
        Query query = em.createNativeQuery(sql);
        if (search != null && !search.trim().isEmpty()) {
            query.setParameter("search", "%" + search.trim() + "%");
        }
        return ((Number) query.getSingleResult()).longValue();
    }
}
