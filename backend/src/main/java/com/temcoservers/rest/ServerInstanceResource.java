package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import com.temcoservers.service.ContaboService;
import jakarta.ejb.EJB;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.*;
import java.util.logging.Logger;

@Path("/servers")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ServerInstanceResource {

    private static final Logger LOG = Logger.getLogger(ServerInstanceResource.class.getName());

    @EJB
    private ContaboService contaboService;

    @EJB
    private AuthService authService;

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    private Map<String, Object> getUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            return authService.getUserFromToken(authHeader.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * List only the servers belonging to the logged-in user.
     * Queries ts_server_instance by gup_id, then enriches with live Contabo status.
     */
    @GET
    public Response listInstances(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            int gupId = (int) user.get("gupId");

            @SuppressWarnings("unchecked")
            List<Object[]> rows = em.createNativeQuery(
                    "SELECT si.instance_id, si.contabo_instance_id, si.ip_address, " +
                    "si.region, si.status, si.display_name, si.default_user, " +
                    "si.created_at, sp.plan_name, sp.contabo_product_id, " +
                    "si.initial_password " +
                    "FROM ts_server_instance si " +
                    "LEFT JOIN ts_subscription_plan sp ON si.subscription_plan_id = sp.plan_id " +
                    "WHERE si.general_user_profile_gup_id = :gupId " +
                    "ORDER BY si.created_at DESC")
                    .setParameter("gupId", gupId)
                    .getResultList();

            // Build a map of contabo_instance_id -> live status from Contabo API
            Map<Long, String> liveStatuses = new HashMap<>();
            try {
                if (contaboService.isConfigured()) {
                    List<Map<String, Object>> allContabo = contaboService.listInstances();
                    for (Map<String, Object> ci : allContabo) {
                        long cid = ((Number) ci.get("instanceId")).longValue();
                        liveStatuses.put(cid, (String) ci.get("status"));
                    }
                }
            } catch (Exception e) {
                LOG.warning("Could not fetch live Contabo statuses: " + e.getMessage());
            }

            List<Map<String, Object>> servers = new ArrayList<>();
            for (Object[] row : rows) {
                Map<String, Object> srv = new LinkedHashMap<>();
                int localId = ((Number) row[0]).intValue();
                long contaboId = row[1] != null ? ((Number) row[1]).longValue() : 0;
                String dbStatus = row[4] != null ? (String) row[4] : "unknown";

                srv.put("instanceId", contaboId);
                srv.put("localInstanceId", localId);
                srv.put("ipv4", row[2]);
                srv.put("region", row[3]);
                // Prefer live status from Contabo, fall back to DB status
                srv.put("status", liveStatuses.getOrDefault(contaboId, dbStatus));
                srv.put("displayName", row[5]);
                srv.put("name", row[5]);
                srv.put("defaultUser", row[6]);
                srv.put("createdAt", row[7] != null ? row[7].toString() : null);
                srv.put("planName", row[8]);
                srv.put("productId", row[9]);
                srv.put("hasCredentials", row[10] != null);
                if (row[10] != null) srv.put("initialPassword", row[10]);
                servers.add(srv);
            }

            return Response.ok(servers).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    /**
     * Get a single server instance — only if it belongs to the logged-in user.
     */
    @GET
    @Path("/{instanceId}")
    public Response getInstance(@PathParam("instanceId") long instanceId,
                                @HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            int gupId = (int) user.get("gupId");
            if (!userOwnsInstance(gupId, instanceId)) {
                return Response.status(403).entity(Map.of("error", "Access denied")).build();
            }
            return Response.ok(contaboService.getInstance(instanceId)).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/{instanceId}/start")
    public Response startInstance(@PathParam("instanceId") long instanceId,
                                  @HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            int gupId = (int) user.get("gupId");
            if (!userOwnsInstance(gupId, instanceId)) {
                return Response.status(403).entity(Map.of("error", "Access denied")).build();
            }
            contaboService.performAction(instanceId, "start");
            return Response.ok(Map.of("message", "Instance start initiated")).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/{instanceId}/stop")
    public Response stopInstance(@PathParam("instanceId") long instanceId,
                                 @HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            int gupId = (int) user.get("gupId");
            if (!userOwnsInstance(gupId, instanceId)) {
                return Response.status(403).entity(Map.of("error", "Access denied")).build();
            }
            contaboService.performAction(instanceId, "stop");
            return Response.ok(Map.of("message", "Instance stop initiated")).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/{instanceId}/restart")
    public Response restartInstance(@PathParam("instanceId") long instanceId,
                                    @HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        try {
            int gupId = (int) user.get("gupId");
            if (!userOwnsInstance(gupId, instanceId)) {
                return Response.status(403).entity(Map.of("error", "Access denied")).build();
            }
            contaboService.performAction(instanceId, "restart");
            return Response.ok(Map.of("message", "Instance restart initiated")).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage())).build();
        }
    }

    /**
     * Check if the logged-in user owns the Contabo instance.
     * Prevents Student A from controlling Student B's server.
     */
    private boolean userOwnsInstance(int gupId, long contaboInstanceId) {
        Object count = em.createNativeQuery(
                "SELECT COUNT(*) FROM ts_server_instance " +
                "WHERE general_user_profile_gup_id = :gupId " +
                "AND contabo_instance_id = :cid")
                .setParameter("gupId", gupId)
                .setParameter("cid", contaboInstanceId)
                .getSingleResult();
        return ((Number) count).intValue() > 0;
    }
}
