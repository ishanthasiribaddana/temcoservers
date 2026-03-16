package com.temcoservers.rest;

import com.temcoservers.service.AdminService;
import com.temcoservers.service.AuthService;
import com.temcoservers.service.ContaboService;
import jakarta.ejb.EJB;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
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

    private static final String SUPER_ADMIN = "Super Admin";
    private static final String SYSTEM_ADMIN = "System Admin";

    private String validateAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        try {
            Map<String, Object> user = authService.getUserFromToken(authHeader.substring(7));
            String role = (String) user.get("role");
            if (SUPER_ADMIN.equals(role) || SYSTEM_ADMIN.equals(role)) {
                return role;
            }
        } catch (Exception ignored) {}
        return null;
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
}
