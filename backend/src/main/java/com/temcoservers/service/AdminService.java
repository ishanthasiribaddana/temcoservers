package com.temcoservers.service;

import jakarta.ejb.Stateless;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.mindrot.jbcrypt.BCrypt;
import java.util.*;

@Stateless
public class AdminService {

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

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

    // =========================================================================
    // RBAC — Users
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUsers() {
        String sql = "SELECT ul.login_id, ul.username, ul.is_active, " +
                "gup.gup_id, gup.first_name, gup.last_name, gup.email, gup.mobile_phone, " +
                "ur.role_name, ur.ur_id, ul.max_login_attempt, ul.count_attempt, ul.is_first_time " +
                "FROM user_login ul " +
                "JOIN general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id " +
                "JOIN user_role ur ON ul.user_role_ur_id = ur.ur_id " +
                "ORDER BY ul.login_id DESC";
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> u = new LinkedHashMap<>();
            int loginId = ((Number) r[0]).intValue();
            u.put("loginId", loginId);
            u.put("username", r[1]);
            u.put("isActive", r[2]);
            u.put("gupId", r[3]);
            u.put("firstName", r[4]);
            u.put("lastName", r[5]);
            u.put("email", r[6]);
            u.put("mobile", r[7]);
            u.put("role", r[8]);
            u.put("roleId", r[9]);
            u.put("maxLoginAttempt", r[10]);
            u.put("countAttempt", r[11]);
            u.put("isFirstTime", r[12]);
            u.put("privileges", getUserPrivileges(loginId));
            u.put("modules", getUserModules(loginId));
            results.add(u);
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserById(int loginId) {
        String sql = "SELECT ul.login_id, ul.username, ul.is_active, " +
                "gup.gup_id, gup.first_name, gup.last_name, gup.email, gup.mobile_phone, " +
                "ur.role_name, ur.ur_id " +
                "FROM user_login ul " +
                "JOIN general_user_profile gup ON ul.general_user_profilegup_id = gup.gup_id " +
                "JOIN user_role ur ON ul.user_role_ur_id = ur.ur_id " +
                "WHERE ul.login_id = :id";
        List<Object[]> rows = em.createNativeQuery(sql).setParameter("id", loginId).getResultList();
        if (rows.isEmpty()) return null;
        Object[] r = rows.get(0);
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("loginId", r[0]); u.put("username", r[1]); u.put("isActive", r[2]);
        u.put("gupId", r[3]); u.put("firstName", r[4]); u.put("lastName", r[5]);
        u.put("email", r[6]); u.put("mobile", r[7]); u.put("role", r[8]); u.put("roleId", r[9]);
        u.put("privileges", getUserPrivileges(loginId));
        u.put("modules", getUserModules(loginId));
        return u;
    }

    public Map<String, Object> createUser(Map<String, Object> data) {
        String username = (String) data.get("username");
        String password = (String) data.get("password");
        int gupId = ((Number) data.get("gupId")).intValue();
        int roleId = ((Number) data.get("roleId")).intValue();

        // Check username uniqueness
        Number exists = (Number) em.createNativeQuery(
                "SELECT COUNT(*) FROM user_login WHERE username = :u")
                .setParameter("u", username).getSingleResult();
        if (exists.intValue() > 0) {
            throw new IllegalArgumentException("Username already exists");
        }

        String hashed = BCrypt.hashpw(password, BCrypt.gensalt(12));
        em.createNativeQuery(
                "INSERT INTO user_login (username, password, is_active, general_user_profilegup_id, " +
                "user_role_ur_id, system_interface_si_id, max_login_attempt, count_attempt, is_first_time) " +
                "VALUES (:u, :p, 1, :gup, :role, 505, 5, 0, 1)")
                .setParameter("u", username)
                .setParameter("p", hashed)
                .setParameter("gup", gupId)
                .setParameter("role", roleId)
                .executeUpdate();

        // Get newly created login_id
        Number newId = (Number) em.createNativeQuery(
                "SELECT login_id FROM user_login WHERE username = :u")
                .setParameter("u", username).getSingleResult();
        int loginId = newId.intValue();

        // Auto-assign privileges (View by default)
        em.createNativeQuery(
                "INSERT INTO user_login_has_privileges (privileges_id, user_login_login_id) VALUES (44, :lid)")
                .setParameter("lid", loginId).executeUpdate();

        // Auto-assign modules from role
        assignUserModulesFromRole(loginId, roleId);

        // Set user privileges if provided
        if (data.containsKey("privileges")) {
            @SuppressWarnings("unchecked")
            List<Number> privIds = (List<Number>) data.get("privileges");
            setUserPrivileges(loginId, privIds);
        }

        return getUserById(loginId);
    }

    public Map<String, Object> updateUser(int loginId, Map<String, Object> data) {
        StringBuilder sql = new StringBuilder("UPDATE user_login SET ");
        List<String> sets = new ArrayList<>();
        Map<String, Object> params = new LinkedHashMap<>();

        if (data.containsKey("username")) {
            sets.add("username = :username");
            params.put("username", data.get("username"));
        }
        if (data.containsKey("password")) {
            String pwd = (String) data.get("password");
            if (pwd != null && !pwd.isBlank()) {
                sets.add("password = :password");
                params.put("password", BCrypt.hashpw(pwd, BCrypt.gensalt(12)));
            }
        }
        if (data.containsKey("roleId")) {
            sets.add("user_role_ur_id = :roleId");
            params.put("roleId", ((Number) data.get("roleId")).intValue());
        }
        if (data.containsKey("isActive")) {
            sets.add("is_active = :isActive");
            params.put("isActive", ((Number) data.get("isActive")).intValue());
        }

        if (!sets.isEmpty()) {
            sql.append(String.join(", ", sets));
            sql.append(" WHERE login_id = :loginId");
            Query q = em.createNativeQuery(sql.toString());
            params.forEach(q::setParameter);
            q.setParameter("loginId", loginId);
            q.executeUpdate();
        }

        if (data.containsKey("privileges")) {
            @SuppressWarnings("unchecked")
            List<Number> privIds = (List<Number>) data.get("privileges");
            setUserPrivileges(loginId, privIds);
        }

        return getUserById(loginId);
    }

    public void deleteUser(int loginId) {
        em.createNativeQuery("UPDATE user_login SET is_active = 0 WHERE login_id = :id")
                .setParameter("id", loginId).executeUpdate();
    }

    public void resetLoginAttempts(int loginId) {
        em.createNativeQuery("UPDATE user_login SET count_attempt = 0 WHERE login_id = :id")
                .setParameter("id", loginId).executeUpdate();
    }

    // =========================================================================
    // RBAC — Roles
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRoles() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT ur_id, role_name, role_order FROM user_role ORDER BY role_order, ur_id")
                .getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            int roleId = ((Number) r[0]).intValue();
            Map<String, Object> role = new LinkedHashMap<>();
            role.put("id", roleId);
            role.put("roleName", r[1]);
            role.put("roleOrder", r[2]);
            role.put("pages", getRolePages(roleId));
            role.put("modules", getRoleModules(roleId));
            results.add(role);
        }
        return results;
    }

    public void createRole(Map<String, Object> data) {
        em.createNativeQuery("INSERT INTO user_role (role_name, role_order) VALUES (:name, :ord)")
                .setParameter("name", data.get("roleName"))
                .setParameter("ord", ((Number) data.getOrDefault("roleOrder", 99)).intValue())
                .executeUpdate();
    }

    public void updateRole(int roleId, Map<String, Object> data) {
        if (data.containsKey("roleName")) {
            em.createNativeQuery("UPDATE user_role SET role_name = :name WHERE ur_id = :id")
                    .setParameter("name", data.get("roleName"))
                    .setParameter("id", roleId).executeUpdate();
        }
        if (data.containsKey("roleOrder")) {
            em.createNativeQuery("UPDATE user_role SET role_order = :ord WHERE ur_id = :id")
                    .setParameter("ord", ((Number) data.get("roleOrder")).intValue())
                    .setParameter("id", roleId).executeUpdate();
        }
    }

    public void setRolePages(int roleId, List<Integer> pageIds) {
        em.createNativeQuery("DELETE FROM user_role_has_system_interface WHERE user_role_ur_id = :rid")
                .setParameter("rid", roleId).executeUpdate();
        for (int pageId : pageIds) {
            em.createNativeQuery("INSERT INTO user_role_has_system_interface (system_interface_si_id, user_role_ur_id) VALUES (:sid, :rid)")
                    .setParameter("sid", pageId).setParameter("rid", roleId).executeUpdate();
        }
    }

    public void setRoleModules(int roleId, List<Integer> moduleIds) {
        em.createNativeQuery("DELETE FROM use_case_has_user_role WHERE user_role_ur_id = :rid")
                .setParameter("rid", roleId).executeUpdate();
        for (int modId : moduleIds) {
            em.createNativeQuery("INSERT INTO use_case_has_user_role (use_case_uc_id, user_role_ur_id) VALUES (:mid, :rid)")
                    .setParameter("mid", modId).setParameter("rid", roleId).executeUpdate();
        }
    }

    // =========================================================================
    // RBAC — Modules
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getModules() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT uc_id, case_name FROM use_case ORDER BY uc_id").getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            int modId = ((Number) r[0]).intValue();
            Map<String, Object> mod = new LinkedHashMap<>();
            mod.put("id", modId);
            mod.put("caseName", r[1]);
            mod.put("pages", getModulePages(modId));
            results.add(mod);
        }
        return results;
    }

    public void createModule(Map<String, Object> data) {
        em.createNativeQuery("INSERT INTO use_case (case_name) VALUES (:name)")
                .setParameter("name", data.get("caseName")).executeUpdate();
    }

    public void updateModule(int moduleId, Map<String, Object> data) {
        em.createNativeQuery("UPDATE use_case SET case_name = :name WHERE uc_id = :id")
                .setParameter("name", data.get("caseName"))
                .setParameter("id", moduleId).executeUpdate();
    }

    public void setModulePages(int moduleId, List<Integer> pageIds) {
        em.createNativeQuery("DELETE FROM use_case_has_system_interface WHERE use_case_uc_id = :mid")
                .setParameter("mid", moduleId).executeUpdate();
        for (int pageId : pageIds) {
            em.createNativeQuery("INSERT INTO use_case_has_system_interface (system_interface_si_id, use_case_uc_id) VALUES (:sid, :mid)")
                    .setParameter("sid", pageId).setParameter("mid", moduleId).executeUpdate();
        }
    }

    // =========================================================================
    // RBAC — Pages (system_interface)
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getSystemInterfaces() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT si_id, interface_name, display_name, url, icon FROM system_interface ORDER BY si_id")
                .getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("id", r[0]); p.put("interfaceName", r[1]); p.put("displayName", r[2]);
            p.put("url", r[3]); p.put("icon", r[4]);
            results.add(p);
        }
        return results;
    }

    public void createSystemInterface(Map<String, Object> data) {
        em.createNativeQuery(
                "INSERT INTO system_interface (interface_name, display_name, url, icon, interface_menu_if_id) " +
                "VALUES (:name, :display, :url, :icon, :menuId)")
                .setParameter("name", data.get("interfaceName"))
                .setParameter("display", data.get("displayName"))
                .setParameter("url", data.get("url"))
                .setParameter("icon", data.getOrDefault("icon", "circle"))
                .setParameter("menuId", ((Number) data.getOrDefault("menuId", 63)).intValue())
                .executeUpdate();
    }

    // =========================================================================
    // RBAC — Privileges
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPrivileges() {
        List<Object[]> rows = em.createNativeQuery("SELECT id, name FROM privileges ORDER BY id").getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            results.add(Map.of("id", r[0], "name", r[1]));
        }
        return results;
    }

    // =========================================================================
    // RBAC — GUP Search
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> searchGup(String q) {
        String sql = "SELECT gup_id, first_name, last_name, nic, email, mobile_phone " +
                "FROM general_user_profile " +
                "WHERE first_name LIKE :q OR last_name LIKE :q OR nic LIKE :q OR email LIKE :q " +
                "ORDER BY gup_id DESC LIMIT 20";
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("q", "%" + q.trim() + "%").getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            Map<String, Object> g = new LinkedHashMap<>();
            g.put("gupId", r[0]); g.put("firstName", r[1]); g.put("lastName", r[2]);
            g.put("nic", r[3]); g.put("email", r[4]); g.put("mobile", r[5]);
            results.add(g);
        }
        return results;
    }

    // =========================================================================
    // RBAC — Helper / Junction Methods
    // =========================================================================

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserPrivileges(int loginId) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT p.id, p.name FROM privileges p " +
                "JOIN user_login_has_privileges ulhp ON p.id = ulhp.privileges_id " +
                "WHERE ulhp.user_login_login_id = :lid ORDER BY p.id")
                .setParameter("lid", loginId).getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            results.add(Map.of("id", r[0], "name", r[1]));
        }
        return results;
    }

    public void setUserPrivileges(int loginId, List<Number> privilegeIds) {
        em.createNativeQuery("DELETE FROM user_login_has_privileges WHERE user_login_login_id = :lid")
                .setParameter("lid", loginId).executeUpdate();
        for (Number pid : privilegeIds) {
            em.createNativeQuery("INSERT INTO user_login_has_privileges (privileges_id, user_login_login_id) VALUES (:pid, :lid)")
                    .setParameter("pid", pid.intValue()).setParameter("lid", loginId).executeUpdate();
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getUserModules(int loginId) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT uc.uc_id, uc.case_name FROM use_case uc " +
                "JOIN user_login_has_usecase ulhu ON uc.uc_id = ulhu.use_case_uc_id " +
                "WHERE ulhu.user_login_login_id = :lid ORDER BY uc.uc_id")
                .setParameter("lid", loginId).getResultList();
        List<Map<String, Object>> results = new ArrayList<>();
        for (Object[] r : rows) {
            results.add(Map.of("id", r[0], "name", r[1]));
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    public List<Integer> getRolePages(int roleId) {
        List<Number> rows = em.createNativeQuery(
                "SELECT system_interface_si_id FROM user_role_has_system_interface WHERE user_role_ur_id = :rid")
                .setParameter("rid", roleId).getResultList();
        List<Integer> ids = new ArrayList<>();
        for (Number n : rows) ids.add(n.intValue());
        return ids;
    }

    @SuppressWarnings("unchecked")
    public List<Integer> getRoleModules(int roleId) {
        List<Number> rows = em.createNativeQuery(
                "SELECT use_case_uc_id FROM use_case_has_user_role WHERE user_role_ur_id = :rid")
                .setParameter("rid", roleId).getResultList();
        List<Integer> ids = new ArrayList<>();
        for (Number n : rows) ids.add(n.intValue());
        return ids;
    }

    @SuppressWarnings("unchecked")
    public List<Integer> getModulePages(int moduleId) {
        List<Number> rows = em.createNativeQuery(
                "SELECT system_interface_si_id FROM use_case_has_system_interface WHERE use_case_uc_id = :mid")
                .setParameter("mid", moduleId).getResultList();
        List<Integer> ids = new ArrayList<>();
        for (Number n : rows) ids.add(n.intValue());
        return ids;
    }

    public void assignUserModulesFromRole(int loginId, int roleId) {
        em.createNativeQuery("DELETE FROM user_login_has_usecase WHERE user_login_login_id = :lid")
                .setParameter("lid", loginId).executeUpdate();
        List<Integer> moduleIds = getRoleModules(roleId);
        for (int modId : moduleIds) {
            em.createNativeQuery("INSERT INTO user_login_has_usecase (use_case_uc_id, user_login_login_id) VALUES (:mid, :lid)")
                    .setParameter("mid", modId).setParameter("lid", loginId).executeUpdate();
        }
    }

    public int setServerCredentials(int instanceId, String password) {
        return em.createNativeQuery(
                "UPDATE ts_server_instance SET initial_password = :pwd, status = 'running' " +
                "WHERE instance_id = :id")
                .setParameter("pwd", password)
                .setParameter("id", instanceId)
                .executeUpdate();
    }

    @SuppressWarnings("unchecked")
    public Object[] getServerInfo(int instanceId) {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT si.general_user_profile_gup_id, si.ip_address, si.default_user, " +
                "sp.plan_name FROM ts_server_instance si " +
                "LEFT JOIN ts_subscription_plan sp ON si.subscription_plan_id = sp.plan_id " +
                "WHERE si.instance_id = :id")
                .setParameter("id", instanceId)
                .getResultList();
        return rows.isEmpty() ? null : rows.get(0);
    }
}
