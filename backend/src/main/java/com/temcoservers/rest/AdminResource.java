package com.temcoservers.rest;

import com.temcoservers.service.AdminService;
import com.temcoservers.service.AuthService;
import com.temcoservers.service.BillingService;
import com.temcoservers.service.ContaboService;
import com.temcoservers.service.NotificationService;
import jakarta.ejb.EJB;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;

@Path("/admin")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AdminResource {

    @EJB
    private AdminService adminService;

    @EJB
    private AuthService authService;

    @EJB
    private ContaboService contaboService;

    @EJB
    private BillingService billingService;

    @EJB
    private NotificationService notificationService;


    private static final String SUPER_ADMIN = "Super Admin";
    private static final String SYSTEM_ADMIN = "System Admin";
    private static final java.util.logging.Logger LOG = java.util.logging.Logger.getLogger(AdminResource.class.getName());

    private Map<String, Object> validateAdminUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        try {
            Map<String, Object> user = authService.getUserFromToken(authHeader.substring(7));
            String role = (String) user.get("role");
            if (SUPER_ADMIN.equals(role) || SYSTEM_ADMIN.equals(role)) {
                return user;
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String validateAdmin(String authHeader) {
        Map<String, Object> user = validateAdminUser(authHeader);
        return user != null ? (String) user.get("role") : null;
    }

    @GET
    @Path("/stats")
    public Response getStats(@HeaderParam("Authorization") String authHeader) {
        String role = validateAdmin(authHeader);
        if (role == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Admin access required")).build();
        }
        try {
            Map<String, Object> stats = adminService.getDashboardStats();
            return Response.ok(stats).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/customers")
    public Response listCustomers(
            @HeaderParam("Authorization") String authHeader,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size,
            @QueryParam("search") String search) {
        String role = validateAdmin(authHeader);
        if (role == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Admin access required")).build();
        }
        try {
            var customers = adminService.listServerCustomers(page, size, search);
            long total = adminService.countServerCustomers(search);
            return Response.ok(Map.of("data", customers, "total", total, "page", page, "size", size)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/users")
    public Response listUsers(
            @HeaderParam("Authorization") String authHeader,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size,
            @QueryParam("search") String search) {
        String role = validateAdmin(authHeader);
        if (role == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Admin access required")).build();
        }
        try {
            var users = adminService.listAllUsers(page, size, search);
            return Response.ok(Map.of("data", users, "page", page, "size", size)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/servers")
    public Response listAllServers(@HeaderParam("Authorization") String authHeader) {
        String role = validateAdmin(authHeader);
        if (role == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Admin access required")).build();
        }
        try {
            return Response.ok(contaboService.listInstances()).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    // =========================================================================
    // RBAC — Users
    // =========================================================================

    @GET
    @Path("/rbac/users")
    public Response getRbacUsers(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.getUsers()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/rbac/users/{id}")
    public Response getRbacUser(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            var user = adminService.getUserById(id);
            if (user == null) return Response.status(404).entity(Map.of("error", "User not found")).build();
            return Response.ok(user).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/rbac/users")
    public Response createRbacUser(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.createUser(body)).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/rbac/users/{id}")
    public Response updateRbacUser(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.updateUser(id, body)).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/rbac/users/{id}")
    public Response deleteRbacUser(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.deleteUser(id);
            return Response.ok(Map.of("message", "User deactivated")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/rbac/users/{id}/reset-attempts")
    public Response resetAttempts(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.resetLoginAttempts(id);
            return Response.ok(Map.of("message", "Login attempts reset")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // =========================================================================
    // RBAC — Roles
    // =========================================================================

    @GET
    @Path("/rbac/roles")
    public Response getRoles(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.getRoles()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/rbac/roles")
    public Response createRole(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.createRole(body);
            return Response.ok(Map.of("message", "Role created")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/rbac/roles/{id}")
    public Response updateRole(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.updateRole(id, body);
            return Response.ok(Map.of("message", "Role updated")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/rbac/roles/{id}/pages")
    @SuppressWarnings("unchecked")
    public Response setRolePages(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            List<Integer> pageIds = ((List<Number>) body.get("pageIds")).stream().map(Number::intValue).toList();
            adminService.setRolePages(id, pageIds);
            return Response.ok(Map.of("message", "Role pages updated")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/rbac/roles/{id}/modules")
    @SuppressWarnings("unchecked")
    public Response setRoleModules(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            List<Integer> modIds = ((List<Number>) body.get("moduleIds")).stream().map(Number::intValue).toList();
            adminService.setRoleModules(id, modIds);
            return Response.ok(Map.of("message", "Role modules updated")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // =========================================================================
    // RBAC — Modules
    // =========================================================================

    @GET
    @Path("/rbac/modules")
    public Response getModules(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.getModules()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/rbac/modules")
    public Response createModule(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.createModule(body);
            return Response.ok(Map.of("message", "Module created")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/rbac/modules/{id}")
    public Response updateModule(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.updateModule(id, body);
            return Response.ok(Map.of("message", "Module updated")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/rbac/modules/{id}/pages")
    @SuppressWarnings("unchecked")
    public Response setModulePages(@HeaderParam("Authorization") String authHeader, @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            List<Integer> pageIds = ((List<Number>) body.get("pageIds")).stream().map(Number::intValue).toList();
            adminService.setModulePages(id, pageIds);
            return Response.ok(Map.of("message", "Module pages updated")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // =========================================================================
    // RBAC — Pages & Privileges & GUP Search
    // =========================================================================

    @GET
    @Path("/rbac/pages")
    public Response getPages(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.getSystemInterfaces()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/rbac/pages")
    public Response createPage(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            adminService.createSystemInterface(body);
            return Response.ok(Map.of("message", "Page registered")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/rbac/privileges")
    public Response getPrivileges(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(adminService.getPrivileges()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/rbac/gup-search")
    public Response searchGup(@HeaderParam("Authorization") String authHeader, @QueryParam("q") String q) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        if (q == null || q.trim().length() < 2)
            return Response.ok(List.of()).build();
        try {
            return Response.ok(adminService.searchGup(q)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // =========================================================================
    // Payments & Subscriptions
    // =========================================================================

    @GET
    @Path("/payments/pending")
    public Response listPendingPayments(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(billingService.listPendingPayments()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/payments/{voucherVid}/approve")
    public Response approvePayment(
            @HeaderParam("Authorization") String authHeader,
            @PathParam("voucherVid") int voucherVid,
            Map<String, Object> body) {
        Map<String, Object> adminUser = validateAdminUser(authHeader);
        if (adminUser == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            int adminLoginId = (int) adminUser.get("loginId");
            int adminGupId = (int) adminUser.get("gupId");
            String notes = body != null ? (String) body.get("notes") : null;
            boolean provisionServer = body != null && Boolean.TRUE.equals(body.get("provisionServer"));

            // 1. Approve the payment (activates subscription)
            Map<String, Object> result = billingService.approvePayment(voucherVid, adminLoginId, notes);
            int gupId = (int) result.get("gupId");

            // 2. Optionally provision a Contabo server
            if (provisionServer) {
                try {
                    // Get the user's subscription to find the plan's Contabo product ID
                    Map<String, Object> sub = billingService.getUserSubscription(gupId);
                    if (sub != null) {
                        int planId = ((Number) sub.get("planId")).intValue();
                        var plans = billingService.getPlans();
                        Map<String, Object> plan = plans.stream()
                                .filter(p -> ((Number) p.get("planId")).intValue() == planId)
                                .findFirst().orElse(null);

                        if (plan != null && plan.get("contaboProductId") != null) {
                            String productId = (String) plan.get("contaboProductId");
                            String displayName = "ts-" + gupId + "-" + System.currentTimeMillis() % 10000;

                            // Ubuntu 22.04 image ID
                            String imageId = "afecbb85-e2fc-46f0-9684-b46b1faf00bb";
                            Map<String, Object> instance = contaboService.createInstance(
                                    productId, "EU", imageId, displayName, 1);

                            // Store in ts_server_instance
                            long contaboId = instance.get("instanceId") != null
                                    ? ((Number) instance.get("instanceId")).longValue() : 0;
                            String ip = (String) instance.get("ipv4");

                            em_insertServerInstance(gupId, planId, contaboId, ip, displayName);

                            result.put("serverProvisioned", true);
                            result.put("contaboInstanceId", contaboId);
                            result.put("serverIp", ip);
                        }
                    }
                } catch (Exception e) {
                    LOG.warning("Server provisioning failed (non-fatal): " + e.getMessage());
                    result.put("serverProvisioned", false);
                    result.put("provisionError", e.getMessage());
                }
            }

            // 3. Send notification to customer with server details
            try {
                String serverIp = (String) result.get("serverIp");
                String notifyPlan = null;
                try {
                    Map<String, Object> sub = billingService.getUserSubscription(gupId);
                    if (sub != null) notifyPlan = (String) sub.get("planName");
                } catch (Exception ignored2) {}
                notificationService.notifyPaymentApproved(adminGupId, gupId, serverIp, notifyPlan, "root");
            } catch (Exception ignored) {}

            return Response.ok(result).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/payments/{voucherVid}/reject")
    public Response rejectPayment(
            @HeaderParam("Authorization") String authHeader,
            @PathParam("voucherVid") int voucherVid,
            Map<String, Object> body) {
        Map<String, Object> adminUser = validateAdminUser(authHeader);
        if (adminUser == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            int adminLoginId = (int) adminUser.get("loginId");
            int adminGupId = (int) adminUser.get("gupId");
            String reason = body != null ? (String) body.get("reason") : "Payment rejected by admin";

            Map<String, Object> result = billingService.rejectPayment(voucherVid, adminLoginId, reason);
            int gupId = (int) result.get("gupId");

            // Send notification
            try {
                notificationService.notifyPaymentRejected(adminGupId, gupId, reason);
            } catch (Exception ignored) {}

            return Response.ok(result).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/subscriptions/{gupId}/renew")
    public Response renewSubscription(
            @HeaderParam("Authorization") String authHeader,
            @PathParam("gupId") int gupId,
            Map<String, Object> body) {
        Map<String, Object> adminUser = validateAdminUser(authHeader);
        if (adminUser == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            int adminLoginId = (int) adminUser.get("loginId");
            Map<String, Object> result = billingService.renewSubscription(gupId, adminLoginId);

            // Restart server if it was suspended
            try {
                long contaboId = billingService.getContaboInstanceIdForUser(gupId);
                if (contaboId > 0 && contaboService.isConfigured()) {
                    contaboService.performAction(contaboId, "start");
                    result.put("serverRestarted", true);
                }
            } catch (Exception e) {
                LOG.warning("Server restart after renewal failed (non-fatal): " + e.getMessage());
                result.put("serverRestarted", false);
            }

            // Send renewal confirmation
            try {
                int adminGupId = (int) adminUser.get("gupId");
                String planName = null;
                Map<String, Object> sub = billingService.getUserSubscription(gupId);
                if (sub != null) planName = (String) sub.get("planName");
                String serverIp = null;
                notificationService.notifyPaymentApproved(adminGupId, gupId, serverIp, planName, "root");
            } catch (Exception ignored) {}

            return Response.ok(result).build();
        } catch (IllegalStateException e) {
            return Response.status(409).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/accounts/profit-loss")
    public Response getProfitAndLoss(
            @HeaderParam("Authorization") String authHeader,
            @QueryParam("year") Integer year,
            @QueryParam("month") Integer month) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(billingService.getProfitAndLoss(year, month)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/accounts/pricing-tiers")
    public Response getPricingTierAnalysis(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(billingService.getPricingTierAnalysis()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/accounts/contabo-payable")
    public Response getContaboPayableBalance(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(billingService.getContaboPayableBalance()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/subscriptions")
    public Response listSubscriptions(@HeaderParam("Authorization") String authHeader) {
        if (validateAdmin(authHeader) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            return Response.ok(billingService.listAllSubscriptions()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/servers/{instanceId}/set-credentials")
    public Response setServerCredentials(
            @HeaderParam("Authorization") String authHeader,
            @PathParam("instanceId") int instanceId,
            Map<String, Object> body) {
        Map<String, Object> adminUser = validateAdminUser(authHeader);
        if (adminUser == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String password = body != null ? (String) body.get("password") : null;
            boolean notify = body != null && Boolean.TRUE.equals(body.get("notifyStudent"));

            if (password == null || password.isBlank()) {
                return Response.status(400).entity(Map.of("error", "Password is required")).build();
            }

            // Update the initial_password (transactional via AdminService)
            int updated = adminService.setServerCredentials(instanceId, password);

            if (updated == 0) {
                return Response.status(404).entity(Map.of("error", "Server instance not found")).build();
            }

            // Optionally send credentials to the student via notification + email
            if (notify) {
                try {
                    Object[] serverInfo = adminService.getServerInfo(instanceId);
                    if (serverInfo == null) throw new RuntimeException("Server info not found");

                    int studentGupId = ((Number) serverInfo[0]).intValue();
                    String ip = (String) serverInfo[1];
                    String defaultUser = serverInfo[2] != null ? (String) serverInfo[2] : "root";
                    String planName = serverInfo[3] != null ? (String) serverInfo[3] : "Server";

                    int adminGupId = (int) adminUser.get("gupId");

                    String content = String.format(
                            "Your server credentials are ready!\n\n" +
                            "--- Server Access Details ---\n" +
                            "Plan: %s\n" +
                            "Server IP: %s\n" +
                            "SSH User: %s\n" +
                            "Password: %s\n" +
                            "SSH Command: ssh %s@%s\n\n" +
                            "IMPORTANT: Please change your password immediately after first login.\n" +
                            "Run: passwd\n" +
                            "--- End Server Details ---\n\n" +
                            "Access your server from the TemcoServers dashboard. Thank you!",
                            planName, ip, defaultUser, password, defaultUser, ip);

                    notificationService.sendNotification(adminGupId, studentGupId, 1, 6, content);
                } catch (Exception e) {
                    LOG.warning("Failed to notify student of credentials: " + e.getMessage());
                }
            }

            return Response.ok(Map.of("message", "Credentials set successfully", "notified", notify)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // Helper: insert into ts_server_instance and link to subscription
    private void em_insertServerInstance(int gupId, int planId, long contaboId, String ip, String displayName) {
        jakarta.persistence.EntityManager em = adminService.getEntityManager();
        em.createNativeQuery(
                "INSERT INTO ts_server_instance (contabo_instance_id, general_user_profile_gup_id, " +
                "subscription_plan_id, ip_address, region, status, display_name, default_user) " +
                "VALUES (:cid, :gupId, :planId, :ip, 'EU', 'provisioning', :name, 'root')")
                .setParameter("cid", contaboId)
                .setParameter("gupId", gupId)
                .setParameter("planId", planId)
                .setParameter("ip", ip)
                .setParameter("name", displayName)
                .executeUpdate();

        // Get the instance_id we just inserted
        Object idObj = em.createNativeQuery(
                "SELECT instance_id FROM ts_server_instance WHERE contabo_instance_id = :cid")
                .setParameter("cid", contaboId)
                .getSingleResult();
        int instanceId = ((Number) idObj).intValue();

        // Link to subscription
        billingService.linkServerToSubscription(gupId, instanceId);
    }
}
