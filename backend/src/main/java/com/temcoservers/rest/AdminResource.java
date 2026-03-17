package com.temcoservers.rest;

import com.temcoservers.service.AdminService;
import com.temcoservers.service.AuthService;
import com.temcoservers.service.ContaboService;
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
}
