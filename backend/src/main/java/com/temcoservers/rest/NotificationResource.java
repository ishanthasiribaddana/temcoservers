package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import com.temcoservers.service.NotificationService;
import jakarta.ejb.EJB;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

@Path("/notifications")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class NotificationResource {

    @EJB
    private NotificationService notificationService;

    @EJB
    private AuthService authService;

    private Map<String, Object> getUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;
        try {
            return authService.getUserFromToken(authHeader.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    @GET
    public Response getNotifications(
            @HeaderParam("Authorization") String authHeader,
            @QueryParam("page") @DefaultValue("0") int page,
            @QueryParam("size") @DefaultValue("20") int size) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            int gupId = (int) user.get("gupId");
            var notifications = notificationService.getUserNotifications(gupId, page, size);
            long total = notificationService.getUserNotificationCount(gupId);
            return Response.ok(Map.of("data", notifications, "total", total, "page", page)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }
}
