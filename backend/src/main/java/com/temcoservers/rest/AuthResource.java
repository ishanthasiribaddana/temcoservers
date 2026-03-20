package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import com.temcoservers.service.NotificationService;
import jakarta.ejb.EJB;
import jakarta.ejb.EJBException;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Map;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @EJB
    private AuthService authService;

    @EJB
    private NotificationService notificationService;

    @POST
    @Path("/login")
    public Response login(Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Username and password are required"))
                    .build();
        }

        try {
            Map<String, Object> result = authService.authenticate(username, password);
            return Response.ok(result).build();
        } catch (EJBException e) {
            String msg = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", msg != null ? msg : "Authentication failed"))
                    .build();
        } catch (SecurityException e) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/nic-lookup/{nic}")
    public Response nicLookup(@PathParam("nic") String nic) {
        if (nic == null || nic.trim().length() < 5) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Invalid NIC number"))
                    .build();
        }
        try {
            Map<String, Object> result = authService.lookupByNic(nic);
            if (result == null) {
                return Response.ok(Map.of("found", false)).build();
            }
            result.put("found", true);
            return Response.ok(result).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/send-otp")
    public Response sendOtp(Map<String, String> data) {
        String nic = data.get("nic");
        String email = data.get("email");
        if (nic == null || nic.trim().isEmpty() || email == null || email.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "NIC and email are required"))
                    .build();
        }
        try {
            Map<String, Object> result = authService.sendOtp(nic.trim(), email.trim());
            return Response.ok(result).build();
        } catch (IllegalStateException e) {
            return Response.status(429).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/verify-otp")
    public Response verifyOtp(Map<String, String> data) {
        String nic = data.get("nic");
        String otpCode = data.get("otpCode");
        if (nic == null || nic.trim().isEmpty() || otpCode == null || otpCode.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "NIC and OTP code are required"))
                    .build();
        }
        try {
            Map<String, Object> result = authService.verifyOtp(nic.trim(), otpCode.trim());
            return Response.ok(result).build();
        } catch (SecurityException e) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @POST
    @Path("/register")
    public Response register(Map<String, Object> data) {
        String username = (String) data.get("username");
        String password = (String) data.get("password");
        String firstName = (String) data.get("firstName");
        String lastName = (String) data.get("lastName");

        if (username == null || password == null || firstName == null || lastName == null
                || username.trim().isEmpty() || password.length() < 6 || firstName.trim().isEmpty() || lastName.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", "Username, password (min 6 chars), first name and last name are required"))
                    .build();
        }

        try {
            Map<String, Object> result = authService.registerUser(data);

            // Send welcome notification
            try {
                int gupId = ((Number) result.get("gupId")).intValue();
                notificationService.notifyWelcome(gupId, firstName != null ? firstName.trim() : "Customer");
            } catch (Exception ignored) {}

            return Response.status(Response.Status.CREATED).entity(result).build();
        } catch (SecurityException e) {
            return Response.status(Response.Status.FORBIDDEN)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(Map.of("error", e.getMessage()))
                    .build();
        }
    }

    @GET
    @Path("/me")
    public Response getCurrentUser(@HeaderParam("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "Missing or invalid authorization header"))
                    .build();
        }

        String token = authHeader.substring(7);
        try {
            Map<String, Object> user = authService.getUserFromToken(token);
            return Response.ok(user).build();
        } catch (Exception e) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity(Map.of("error", "Invalid token"))
                    .build();
        }
    }
}
