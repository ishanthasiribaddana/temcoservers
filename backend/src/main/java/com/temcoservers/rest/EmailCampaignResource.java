package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import com.temcoservers.service.BulkEmailService;
import com.temcoservers.service.EmailCampaignService;
import jakarta.ejb.EJB;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;
import java.util.logging.Logger;

@Path("/admin/email")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class EmailCampaignResource {

    private static final Logger LOG = Logger.getLogger(EmailCampaignResource.class.getName());
    private static final String SUPER_ADMIN = "Super Admin";
    private static final String SYSTEM_ADMIN = "System Admin";

    @EJB
    private EmailCampaignService campaignService;

    @EJB
    private BulkEmailService bulkEmailService;

    @EJB
    private AuthService authService;

    private Map<String, Object> validateAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            Map<String, Object> user = authService.getUserFromToken(authHeader.substring(7));
            String role = (String) user.get("role");
            if (SUPER_ADMIN.equals(role) || SYSTEM_ADMIN.equals(role)) return user;
        } catch (Exception ignored) {}
        return null;
    }

    // ─── Dashboard Stats ─────────────────────────────────────────────

    @GET
    @Path("/stats")
    public Response getStats(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.getDashboardStats()).build();
    }

    @GET
    @Path("/quota")
    public Response getQuota(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.getDailyQuota()).build();
    }

    // ─── Campaigns ───────────────────────────────────────────────────

    @GET
    @Path("/campaigns")
    public Response listCampaigns(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.listCampaigns()).build();
    }

    @GET
    @Path("/campaigns/{id}/logs")
    public Response getCampaignLogs(@HeaderParam("Authorization") String auth,
                                     @PathParam("id") int id) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.getCampaignLogs(id)).build();
    }

    @POST
    @Path("/campaigns/send")
    public Response sendCampaign(@HeaderParam("Authorization") String auth, Map<String, Object> body) {
        Map<String, Object> admin = validateAdmin(auth);
        if (admin == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            int templateId = ((Number) body.get("templateId")).intValue();
            int bulkId = ((Number) body.get("bulkId")).intValue();
            int groupId = ((Number) body.get("groupId")).intValue();
            String ccEmail = body.get("ccEmail") != null ? (String) body.get("ccEmail") : null;
            int senderGupId = (int) admin.get("gupId");

            Map<String, Object> result = bulkEmailService.executeCampaign(
                    templateId, bulkId, groupId, senderGupId, ccEmail);
            return Response.ok(result).build();
        } catch (IllegalStateException e) {
            return Response.status(429).entity(Map.of("error", e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            LOG.warning("Campaign send failed: " + e.getMessage());
            return Response.status(500).entity(Map.of("error", "Campaign failed: " + e.getMessage())).build();
        }
    }

    // ─── Templates ───────────────────────────────────────────────────

    @GET
    @Path("/templates")
    public Response listTemplates(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.listTemplates()).build();
    }

    @GET
    @Path("/templates/{id}")
    public Response getTemplate(@HeaderParam("Authorization") String auth, @PathParam("id") int id) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        Map<String, Object> tpl = campaignService.getTemplate(id);
        if (tpl == null) return Response.status(404).entity(Map.of("error", "Template not found")).build();
        return Response.ok(tpl).build();
    }

    @POST
    @Path("/templates")
    public Response createTemplate(@HeaderParam("Authorization") String auth, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String name = (String) body.get("name");
            String subject = (String) body.get("subject");
            String content = (String) body.get("content");
            int id = campaignService.createTemplate(name, subject, content);
            return Response.ok(Map.of("id", id, "message", "Template created")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/templates/{id}")
    public Response updateTemplate(@HeaderParam("Authorization") String auth,
                                    @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String name = (String) body.get("name");
            String subject = (String) body.get("subject");
            String content = (String) body.get("content");
            campaignService.updateTemplate(id, name, subject, content);
            return Response.ok(Map.of("message", "Template updated")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/templates/{id}")
    public Response deleteTemplate(@HeaderParam("Authorization") String auth, @PathParam("id") int id) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        campaignService.deleteTemplate(id);
        return Response.ok(Map.of("message", "Template deleted")).build();
    }

    // ─── Groups ──────────────────────────────────────────────────────

    @GET
    @Path("/groups")
    public Response listGroups(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.listGroups()).build();
    }

    @POST
    @Path("/groups")
    public Response createGroup(@HeaderParam("Authorization") String auth, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String name = (String) body.get("name");
            int id = campaignService.createGroup(name);
            return Response.ok(Map.of("id", id, "message", "Group created")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/groups/{id}")
    public Response deleteGroup(@HeaderParam("Authorization") String auth, @PathParam("id") int id) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        campaignService.deleteGroup(id);
        return Response.ok(Map.of("message", "Group deleted")).build();
    }

    @GET
    @Path("/groups/{id}/members")
    public Response getGroupMembers(@HeaderParam("Authorization") String auth, @PathParam("id") int id) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.getGroupMembers(id)).build();
    }

    @POST
    @Path("/groups/{id}/members")
    public Response addMember(@HeaderParam("Authorization") String auth,
                               @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            int gupId = ((Number) body.get("gupId")).intValue();
            campaignService.addMemberToGroup(id, gupId);
            return Response.ok(Map.of("message", "Member added")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/groups/{id}/members/{gupId}")
    public Response removeMember(@HeaderParam("Authorization") String auth,
                                  @PathParam("id") int id, @PathParam("gupId") int gupId) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        campaignService.removeMemberFromGroup(id, gupId);
        return Response.ok(Map.of("message", "Member removed")).build();
    }

    @POST
    @Path("/groups/{id}/auto-populate")
    public Response autoPopulateGroup(@HeaderParam("Authorization") String auth,
                                       @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String filter = (String) body.get("filter");
            int added = campaignService.autoPopulateGroup(id, filter);
            return Response.ok(Map.of("added", added, "message", added + " members added")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // ─── Bulk Definitions ────────────────────────────────────────────

    @GET
    @Path("/bulk-definitions")
    public Response listBulkDefinitions(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.listBulkDefinitions()).build();
    }

    @POST
    @Path("/bulk-definitions")
    public Response createBulkDefinition(@HeaderParam("Authorization") String auth, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String name = (String) body.get("name");
            int id = campaignService.createBulkDefinition(name);
            return Response.ok(Map.of("id", id, "message", "Campaign definition created")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    // ─── Schedules ───────────────────────────────────────────────────

    @GET
    @Path("/schedules")
    public Response listSchedules(@HeaderParam("Authorization") String auth) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        return Response.ok(campaignService.listSchedules()).build();
    }

    @POST
    @Path("/schedules")
    public Response createSchedule(@HeaderParam("Authorization") String auth, Map<String, Object> body) {
        Map<String, Object> admin = validateAdmin(auth);
        if (admin == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        try {
            String name = (String) body.get("campaignName");
            int templateId = ((Number) body.get("templateId")).intValue();
            int groupId = ((Number) body.get("groupId")).intValue();
            int bulkId = ((Number) body.get("bulkId")).intValue();
            String frequency = (String) body.get("frequency");
            String scheduledDate = (String) body.get("scheduledDate");
            int batchSize = body.get("batchSize") != null ? ((Number) body.get("batchSize")).intValue() : 50;
            int createdBy = (int) admin.get("gupId");

            int id = campaignService.createSchedule(name, templateId, groupId, bulkId,
                    frequency, scheduledDate, batchSize, createdBy);
            return Response.ok(Map.of("id", id, "message", "Schedule created")).build();
        } catch (Exception e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/schedules/{id}/toggle")
    public Response toggleSchedule(@HeaderParam("Authorization") String auth,
                                    @PathParam("id") int id, Map<String, Object> body) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        boolean active = Boolean.TRUE.equals(body.get("active"));
        campaignService.toggleSchedule(id, active);
        return Response.ok(Map.of("message", active ? "Schedule activated" : "Schedule paused")).build();
    }

    @DELETE
    @Path("/schedules/{id}")
    public Response deleteSchedule(@HeaderParam("Authorization") String auth, @PathParam("id") int id) {
        if (validateAdmin(auth) == null)
            return Response.status(403).entity(Map.of("error", "Admin access required")).build();
        campaignService.deleteSchedule(id);
        return Response.ok(Map.of("message", "Schedule deleted")).build();
    }
}
