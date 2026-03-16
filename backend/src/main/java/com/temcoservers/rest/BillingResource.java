package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import com.temcoservers.service.BillingService;
import com.temcoservers.service.NotificationService;
import jakarta.ejb.EJB;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

@Path("/billing")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BillingResource {

    @EJB
    private BillingService billingService;

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
    @Path("/plans")
    public Response getPlans() {
        try {
            return Response.ok(billingService.getPlans()).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/subscription")
    public Response getMySubscription(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            int gupId = (int) user.get("gupId");
            Map<String, Object> sub = billingService.getUserSubscription(gupId);
            Map<String, Object> resp = new java.util.LinkedHashMap<>();
            resp.put("subscription", sub);
            resp.put("active", sub != null);
            return Response.ok(resp).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/subscribe")
    public Response subscribe(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            int planId = ((Number) body.get("planId")).intValue();
            int gupId = (int) user.get("gupId");
            int loginId = (int) user.get("loginId");
            Map<String, Object> result = billingService.subscribe(gupId, loginId, planId);

            // Send notification
            try {
                String planName = (String) result.get("planName");
                double price = (double) result.get("priceMonthly");
                notificationService.notifySubscriptionCreated(gupId, gupId, planName);
                notificationService.notifyPaymentReceived(gupId, gupId, price, planName);
            } catch (Exception ignored) {}

            return Response.ok(result).build();
        } catch (IllegalStateException e) {
            return Response.status(409).entity(Map.of("error", e.getMessage())).build();
        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/cancel")
    public Response cancel(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            int gupId = (int) user.get("gupId");
            Map<String, Object> result = billingService.cancelSubscription(gupId);

            try {
                notificationService.notifySubscriptionCancelled(gupId, gupId);
            } catch (Exception ignored) {}

            return Response.ok(result).build();
        } catch (IllegalStateException e) {
            return Response.status(409).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @GET
    @Path("/history")
    public Response getPaymentHistory(@HeaderParam("Authorization") String authHeader) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            int gupId = (int) user.get("gupId");
            return Response.ok(billingService.getUserPaymentHistory(gupId)).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }
}
