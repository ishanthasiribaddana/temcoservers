package com.temcoservers.rest;

import com.temcoservers.service.AuthService;
import com.temcoservers.service.BillingService;
import com.temcoservers.service.InvoicePdfGenerator;
import com.temcoservers.service.NotificationService;
import com.temcoservers.service.PayPalService;
import jakarta.ejb.EJB;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

@Path("/billing")
@Produces(MediaType.APPLICATION_JSON)
public class BillingResource {

    private static final Logger LOG = Logger.getLogger(BillingResource.class.getName());
    private static final String UPLOAD_DIR = "/opt/temcoservers/uploads/slips";
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    @EJB
    private BillingService billingService;

    @EJB
    private NotificationService notificationService;

    @EJB
    private InvoicePdfGenerator invoicePdfGenerator;

    @EJB
    private AuthService authService;

    @EJB
    private PayPalService payPalService;

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
    @Consumes(MediaType.APPLICATION_JSON)
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
                notificationService.notifyPaymentReceived(gupId, gupId, price, planName, null);
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
    @Consumes(MediaType.APPLICATION_JSON)
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
    @Consumes(MediaType.APPLICATION_JSON)
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

    // =========================================================================
    // PayPal Payments
    // =========================================================================

    @GET
    @Path("/paypal/client-id")
    public Response getPayPalClientId() {
        try {
            if (!payPalService.isConfigured()) {
                return Response.ok(Map.of("configured", false)).build();
            }
            return Response.ok(Map.of("configured", true, "clientId", payPalService.getClientId())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("error", e.getMessage())).build();
        }
    }

    @POST
    @Path("/paypal/create-order")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response createPayPalOrder(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            int planId = ((Number) body.get("planId")).intValue();
            String returnUrl = (String) body.get("returnUrl");
            String cancelUrl = (String) body.get("cancelUrl");

            // Get plan details
            var plans = billingService.getPlans();
            Map<String, Object> plan = plans.stream()
                    .filter(p -> ((Number) p.get("planId")).intValue() == planId)
                    .findFirst().orElse(null);
            if (plan == null) {
                return Response.status(400).entity(Map.of("error", "Invalid plan ID")).build();
            }

            String planName = (String) plan.get("planName");
            double price = ((Number) plan.get("priceMonthly")).doubleValue();

            Map<String, Object> result = payPalService.createOrder(planName, price, returnUrl, cancelUrl);
            result.put("planId", planId);
            result.put("planName", planName);
            result.put("amount", price);
            return Response.ok(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "PayPal create order failed", e);
            return Response.status(500).entity(Map.of("error", "PayPal order creation failed: " + e.getMessage())).build();
        }
    }

    @POST
    @Path("/paypal/capture")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response capturePayPalOrder(@HeaderParam("Authorization") String authHeader, Map<String, Object> body) {
        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();
        try {
            String orderId = (String) body.get("orderId");
            int planId = ((Number) body.get("planId")).intValue();
            int gupId = (int) user.get("gupId");
            int loginId = (int) user.get("loginId");

            // 1. Capture the PayPal payment
            Map<String, Object> capture = payPalService.captureOrder(orderId);
            String captureId = (String) capture.get("captureId");
            String amountStr = (String) capture.get("amount");
            double amount = Double.parseDouble(amountStr);
            String payerEmail = (String) capture.get("payerEmail");

            // 2. Subscribe user (creates pending_payment subscription)
            Map<String, Object> subResult;
            try {
                subResult = billingService.subscribe(gupId, loginId, planId);
            } catch (IllegalStateException e) {
                // User may already have pending subscription from selecting plan
                subResult = Map.of("planName", capture.getOrDefault("customId", "Plan"));
            }

            String planName = (String) subResult.getOrDefault("planName", "Plan");

            // 3. Create voucher record (PayPal type=4, payment_mode=5, auto-completed)
            billingService.createPayPalVoucher(gupId, loginId, amount, planName, captureId, payerEmail);

            // 4. Auto-approve: activate subscription immediately
            billingService.autoActivateSubscription(gupId);

            // 5. Generate receipt PDF
            String purchaserName = user.get("firstName") + " " + user.get("lastName");
            String voucherId = "PSP-" + gupId + "-" + System.currentTimeMillis();
            String receiptUrl = null;
            try {
                receiptUrl = invoicePdfGenerator.generatePayPalReceipt(
                        voucherId, purchaserName, amount, "USD", planName,
                        orderId, captureId, payerEmail);
            } catch (Exception ignored) {}

            // 6. Send notification
            try {
                notificationService.notifyPaymentApproved(gupId, gupId);
            } catch (Exception ignored) {}

            Map<String, Object> result = new java.util.LinkedHashMap<>();
            result.put("message", "Payment successful! Your subscription is now active.");
            result.put("orderId", orderId);
            result.put("captureId", captureId);
            result.put("amount", amount);
            result.put("payerEmail", payerEmail);
            result.put("status", "active");
            if (receiptUrl != null) result.put("receiptUrl", receiptUrl);
            return Response.ok(result).build();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, "PayPal capture failed", e);
            return Response.status(500).entity(Map.of("error", "PayPal capture failed: " + e.getMessage())).build();
        }
    }

    @POST
    @Path("/upload-slip")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public Response uploadSlip(
            @HeaderParam("Authorization") String authHeader,
            @FormParam("purchaserName") String purchaserName,
            @FormParam("referenceNo") String referenceNo,
            @FormParam("amount") String amountStr,
            @FormParam("product") String product,
            @FormParam("slip") InputStream slipInputStream,
            @HeaderParam("Content-Disposition") String contentDisposition) {

        Map<String, Object> user = getUser(authHeader);
        if (user == null) return Response.status(401).entity(Map.of("error", "Unauthorized")).build();

        try {
            // Validate required fields
            if (purchaserName == null || referenceNo == null || amountStr == null || product == null) {
                return Response.status(400).entity(Map.of("error", "All fields are required")).build();
            }

            double amount;
            try {
                amount = Double.parseDouble(amountStr);
            } catch (NumberFormatException e) {
                return Response.status(400).entity(Map.of("error", "Invalid amount")).build();
            }

            if (amount <= 0) {
                return Response.status(400).entity(Map.of("error", "Amount must be positive")).build();
            }

            int gupId = (int) user.get("gupId");
            int loginId = (int) user.get("loginId");

            // Create upload directory if it doesn't exist
            java.nio.file.Path uploadDir = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            // Generate unique filename
            String timestamp = String.valueOf(System.currentTimeMillis());
            String originalFilename = "slip_" + loginId + "_" + timestamp;
            String savedFilename = originalFilename + ".jpg"; // default extension

            // Save file to disk
            java.nio.file.Path filePath = uploadDir.resolve(savedFilename);
            int fileSize = 0;
            if (slipInputStream != null) {
                try (OutputStream os = Files.newOutputStream(filePath)) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = slipInputStream.read(buffer)) != -1) {
                        if (fileSize + bytesRead > MAX_FILE_SIZE) {
                            Files.deleteIfExists(filePath);
                            return Response.status(400).entity(Map.of("error", "File size exceeds 5MB limit")).build();
                        }
                        os.write(buffer, 0, bytesRead);
                        fileSize += bytesRead;
                    }
                }
            } else {
                return Response.status(400).entity(Map.of("error", "Bank slip file is required")).build();
            }

            // Relative URL for serving via Nginx
            String slipUrl = "/uploads/slips/" + savedFilename;

            // Call BillingService to create voucher + voucher_item + slip record
            Map<String, Object> result = billingService.uploadSlip(
                    gupId, loginId, purchaserName, referenceNo, amount, product,
                    slipUrl, savedFilename, fileSize);

            // Generate invoice PDF
            String invoiceUrl = null;
            try {
                invoiceUrl = invoicePdfGenerator.generateInvoice(
                        (String) result.get("voucherId"), purchaserName, referenceNo,
                        amount, (String) result.get("product"), slipUrl);
                if (invoiceUrl != null) {
                    result.put("invoiceUrl", invoiceUrl);
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Invoice PDF generation failed (non-fatal)", e);
            }

            // Send notification
            try {
                notificationService.notifyPaymentReceived(gupId, gupId, amount,
                        (String) result.get("product"), invoiceUrl);
            } catch (Exception ignored) {}

            LOG.info("Slip uploaded: " + slipUrl + " by loginId=" + loginId + " amount=" + amount);
            return Response.ok(result).build();

        } catch (IllegalArgumentException e) {
            return Response.status(400).entity(Map.of("error", e.getMessage())).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Slip upload failed", e);
            return Response.status(500).entity(Map.of("error", "Failed to process payment slip: " + e.getMessage())).build();
        }
    }
}
