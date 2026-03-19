package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import jakarta.ejb.EJB;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.Logger;

@Path("/doctor")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class DoctorResource {

    private static final Logger LOG = Logger.getLogger(DoctorResource.class.getName());

    private static final String AI_MODULE_URL = System.getenv("AI_MODULE_URL") != null
            ? System.getenv("AI_MODULE_URL")
            : "http://temcoservers-ai-module:8000";

    @EJB
    private AuthService authService;

    @PersistenceContext(unitName = "temcoserversPU")
    private EntityManager em;

    // ─── Auth helper ─────────────────────────────────────────────────────────

    private Map<String, Object> getUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            return authService.getUserFromToken(authHeader.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    private Object[] getServerForUser(int gupId, int instanceId) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "SELECT si.ip_address, si.default_user, si.initial_password, " +
                "si.display_name, si.status " +
                "FROM ts_server_instance si " +
                "WHERE si.instance_id = :id AND si.general_user_profile_gup_id = :gupId")
                .setParameter("id", instanceId)
                .setParameter("gupId", gupId)
                .getResultList();
        return rows.isEmpty() ? null : rows.get(0);
    }

    // ─── Create Session ──────────────────────────────────────────────────────

    @POST
    @Path("/sessions")
    public Response createSession(@HeaderParam("Authorization") String authHeader,
                                  Map<String, Object> data) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        int gupId = (int) user.get("gupId");
        int instanceId = ((Number) data.get("instanceId")).intValue();

        Object[] server = getServerForUser(gupId, instanceId);
        if (server == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Server not found or access denied"))
                    .build();
        }

        String ip = (String) server[0];
        String serverUser = server[1] != null ? (String) server[1] : "root";
        String password = (String) server[2];
        String displayName = (String) server[3];

        if (ip == null || password == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Server credentials not configured yet. Please wait for server setup to complete."))
                    .build();
        }

        String payload = String.format(
                "{\"gup_id\":%d,\"instance_id\":%d,\"server_ip\":\"%s\",\"server_user\":\"%s\",\"server_password\":\"%s\",\"display_name\":\"%s\"}",
                gupId, instanceId, ip, serverUser, password, displayName != null ? displayName : ip);

        return proxyPost("/ai/doctor/sessions", payload);
    }

    // ─── Send Message ────────────────────────────────────────────────────────

    @POST
    @Path("/sessions/{sessionId}/message")
    public Response sendMessage(@HeaderParam("Authorization") String authHeader,
                                @PathParam("sessionId") int sessionId,
                                Map<String, Object> data) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        int gupId = (int) user.get("gupId");
        int instanceId = ((Number) data.get("instanceId")).intValue();
        String message = (String) data.get("message");

        Object[] server = getServerForUser(gupId, instanceId);
        if (server == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Server not found or access denied"))
                    .build();
        }

        String ip = (String) server[0];
        String serverUser = server[1] != null ? (String) server[1] : "root";
        String password = (String) server[2];

        // Escape JSON strings
        String escapedMsg = message.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
        String escapedPwd = password.replace("\\", "\\\\").replace("\"", "\\\"");

        String payload = String.format(
                "{\"gup_id\":%d,\"message\":\"%s\",\"server_ip\":\"%s\",\"server_user\":\"%s\",\"server_password\":\"%s\"}",
                gupId, escapedMsg, ip, serverUser, escapedPwd);

        return proxyPost("/ai/doctor/sessions/" + sessionId + "/message", payload);
    }

    // ─── Confirm Fix ─────────────────────────────────────────────────────────

    @POST
    @Path("/sessions/{sessionId}/confirm-fix")
    public Response confirmFix(@HeaderParam("Authorization") String authHeader,
                               @PathParam("sessionId") int sessionId,
                               Map<String, Object> data) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();

        int gupId = (int) user.get("gupId");
        int instanceId = ((Number) data.get("instanceId")).intValue();
        String command = (String) data.get("command");

        Object[] server = getServerForUser(gupId, instanceId);
        if (server == null) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", "Server not found or access denied"))
                    .build();
        }

        String ip = (String) server[0];
        String serverUser = server[1] != null ? (String) server[1] : "root";
        String password = (String) server[2];

        String escapedCmd = command.replace("\\", "\\\\").replace("\"", "\\\"");
        String escapedPwd = password.replace("\\", "\\\\").replace("\"", "\\\"");

        String payload = String.format(
                "{\"gup_id\":%d,\"command\":\"%s\",\"server_ip\":\"%s\",\"server_user\":\"%s\",\"server_password\":\"%s\"}",
                gupId, escapedCmd, ip, serverUser, escapedPwd);

        return proxyPost("/ai/doctor/sessions/" + sessionId + "/confirm-fix", payload);
    }

    // ─── List Sessions ───────────────────────────────────────────────────────

    @GET
    @Path("/sessions")
    public Response listSessions(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        int gupId = (int) user.get("gupId");
        return proxyGet("/ai/doctor/sessions?gup_id=" + gupId);
    }

    // ─── Get Session Detail ──────────────────────────────────────────────────

    @GET
    @Path("/sessions/{sessionId}")
    public Response getSession(@HeaderParam("Authorization") String authHeader,
                               @PathParam("sessionId") int sessionId) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        int gupId = (int) user.get("gupId");
        return proxyGet("/ai/doctor/sessions/" + sessionId + "?gup_id=" + gupId);
    }

    // ─── Close Session ───────────────────────────────────────────────────────

    @POST
    @Path("/sessions/{sessionId}/close")
    public Response closeSession(@HeaderParam("Authorization") String authHeader,
                                 @PathParam("sessionId") int sessionId,
                                 Map<String, Object> data) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        int gupId = (int) user.get("gupId");
        String status = data.get("status") != null ? (String) data.get("status") : "closed";
        return proxyPost("/ai/doctor/sessions/" + sessionId + "/close?gup_id=" + gupId + "&status=" + status, "{}");
    }

    // ─── Quota ───────────────────────────────────────────────────────────────

    @GET
    @Path("/quota")
    public Response getQuota(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        int gupId = (int) user.get("gupId");
        return proxyGet("/ai/doctor/quota?gup_id=" + gupId);
    }

    // ─── Admin Endpoints ───────────────────────────────────────────────────────

    @GET
    @Path("/admin/sessions")
    public Response adminListSessions(@HeaderParam("Authorization") String authHeader,
                                      @QueryParam("status") String status) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        String role = (String) user.get("role");
        if (!"Super Admin".equals(role) && !"System Admin".equals(role)) {
            return Response.status(Response.Status.FORBIDDEN).entity(Map.of("error", "Admin access required")).build();
        }
        String query = status != null && !status.isEmpty() ? "?status=" + status : "";
        return proxyGet("/ai/doctor/admin/sessions" + query);
    }

    @GET
    @Path("/admin/sessions/{sessionId}")
    public Response adminGetSession(@HeaderParam("Authorization") String authHeader,
                                    @PathParam("sessionId") int sessionId) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        String role = (String) user.get("role");
        if (!"Super Admin".equals(role) && !"System Admin".equals(role)) {
            return Response.status(Response.Status.FORBIDDEN).entity(Map.of("error", "Admin access required")).build();
        }
        return proxyGet("/ai/doctor/admin/sessions/" + sessionId);
    }

    @DELETE
    @Path("/admin/sessions/stale")
    public Response adminCleanupStale(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        String role = (String) user.get("role");
        if (!"Super Admin".equals(role) && !"System Admin".equals(role)) {
            return Response.status(Response.Status.FORBIDDEN).entity(Map.of("error", "Admin access required")).build();
        }
        return proxyDelete("/ai/doctor/admin/sessions/stale");
    }

    @DELETE
    @Path("/admin/sessions/{sessionId}")
    public Response adminDeleteSession(@HeaderParam("Authorization") String authHeader,
                                       @PathParam("sessionId") int sessionId) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(Response.Status.UNAUTHORIZED).build();
        String role = (String) user.get("role");
        if (!"Super Admin".equals(role) && !"System Admin".equals(role)) {
            return Response.status(Response.Status.FORBIDDEN).entity(Map.of("error", "Admin access required")).build();
        }
        return proxyDelete("/ai/doctor/admin/sessions/" + sessionId);
    }

    // ─── HTTP Proxy helpers ──────────────────────────────────────────────────

    private Response proxyPost(String path, String jsonBody) {
        try {
            URL url = new URL(AI_MODULE_URL + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(120000); // 2 min — AI + SSH can be slow

            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            String body;
            try {
                body = new String(
                        (status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream())
                                .readAllBytes(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                body = "{\"error\":\"No response body\"}";
            }

            return Response.status(status)
                    .entity(body)
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            LOG.severe("AI Module proxy error: " + e.getMessage());
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "AI Doctor service unavailable: " + e.getMessage()))
                    .build();
        }
    }

    private Response proxyDelete(String path) {
        try {
            URL url = new URL(AI_MODULE_URL + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("DELETE");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(30000);

            int status = conn.getResponseCode();
            String body;
            try {
                body = new String(
                        (status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream())
                                .readAllBytes(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                body = "{\"error\":\"No response body\"}";
            }

            return Response.status(status)
                    .entity(body)
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            LOG.severe("AI Module proxy error: " + e.getMessage());
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "AI Doctor service unavailable: " + e.getMessage()))
                    .build();
        }
    }

    private Response proxyGet(String path) {
        try {
            URL url = new URL(AI_MODULE_URL + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(30000);

            int status = conn.getResponseCode();
            String body;
            try {
                body = new String(
                        (status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream())
                                .readAllBytes(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                body = "{\"error\":\"No response body\"}";
            }

            return Response.status(status)
                    .entity(body)
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        } catch (Exception e) {
            LOG.severe("AI Module proxy error: " + e.getMessage());
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity(Map.of("error", "AI Doctor service unavailable: " + e.getMessage()))
                    .build();
        }
    }
}
