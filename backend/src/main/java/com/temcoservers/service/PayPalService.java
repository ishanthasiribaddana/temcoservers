package com.temcoservers.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import jakarta.ejb.Stateless;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.logging.Logger;

@Stateless
public class PayPalService {

    private static final Logger LOG = Logger.getLogger(PayPalService.class.getName());

    private String clientId;
    private String clientSecret;
    private String mode; // "sandbox" or "live"

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        clientId = System.getenv("PAYPAL_CLIENT_ID");
        clientSecret = System.getenv("PAYPAL_CLIENT_SECRET");
        mode = System.getenv("PAYPAL_MODE");
        if (mode == null || mode.isBlank()) mode = "sandbox";
    }

    private String getBaseUrl() {
        return "live".equals(mode)
                ? "https://api-m.paypal.com"
                : "https://api-m.sandbox.paypal.com";
    }

    /**
     * Get PayPal access token using client credentials (OAuth 2.0).
     */
    private String getAccessToken() throws Exception {
        String credentials = Base64.getEncoder().encodeToString(
                (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(getBaseUrl() + "/v1/oauth2/token"))
                .header("Authorization", "Basic " + credentials)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("PayPal auth failed: " + response.body());
        }

        JsonNode json = objectMapper.readTree(response.body());
        return json.get("access_token").asText();
    }

    /**
     * Create a PayPal order for the given plan.
     * Returns orderId and approveUrl for the frontend to redirect the user to.
     */
    public Map<String, Object> createOrder(String planName, double amount, String returnUrl, String cancelUrl) throws Exception {
        if (clientId == null || clientSecret == null) {
            throw new IllegalStateException("PayPal credentials not configured");
        }

        String token = getAccessToken();

        // Build order JSON
        ObjectNode orderBody = objectMapper.createObjectNode();
        orderBody.put("intent", "CAPTURE");

        // Purchase unit
        ArrayNode purchaseUnits = orderBody.putArray("purchase_units");
        ObjectNode unit = purchaseUnits.addObject();
        unit.put("description", "TemcoServers - " + planName);
        unit.put("custom_id", planName); // We'll use this to identify the plan on capture

        ObjectNode amountNode = unit.putObject("amount");
        amountNode.put("currency_code", "USD");
        amountNode.put("value", String.format("%.2f", amount));

        // Application context (return/cancel URLs)
        ObjectNode appContext = orderBody.putObject("application_context");
        appContext.put("return_url", returnUrl);
        appContext.put("cancel_url", cancelUrl);
        appContext.put("brand_name", "TemcoServers");
        appContext.put("user_action", "PAY_NOW");

        String bodyJson = objectMapper.writeValueAsString(orderBody);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(getBaseUrl() + "/v2/checkout/orders"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 201) {
            LOG.warning("PayPal create order failed: " + response.body());
            throw new RuntimeException("PayPal create order failed: " + response.statusCode());
        }

        JsonNode json = objectMapper.readTree(response.body());
        String orderId = json.get("id").asText();

        // Find the approve URL
        String approveUrl = null;
        for (JsonNode link : json.get("links")) {
            if ("approve".equals(link.get("rel").asText())) {
                approveUrl = link.get("href").asText();
                break;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("orderId", orderId);
        result.put("approveUrl", approveUrl);
        return result;
    }

    /**
     * Capture a PayPal order after the user approves payment.
     * Returns payment details: captureId, payerEmail, amount, status.
     */
    public Map<String, Object> captureOrder(String orderId) throws Exception {
        if (clientId == null || clientSecret == null) {
            throw new IllegalStateException("PayPal credentials not configured");
        }

        String token = getAccessToken();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(getBaseUrl() + "/v2/checkout/orders/" + orderId + "/capture"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(""))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 201) {
            LOG.warning("PayPal capture failed: " + response.body());
            throw new RuntimeException("PayPal capture failed: " + response.statusCode());
        }

        JsonNode json = objectMapper.readTree(response.body());
        String status = json.get("status").asText();

        if (!"COMPLETED".equals(status)) {
            throw new RuntimeException("PayPal payment not completed, status: " + status);
        }

        // Extract capture details
        JsonNode capture = json.get("purchase_units").get(0)
                .get("payments").get("captures").get(0);
        String captureId = capture.get("id").asText();
        String amountValue = capture.get("amount").get("value").asText();
        String currency = capture.get("amount").get("currency_code").asText();

        // Payer email
        String payerEmail = "";
        if (json.has("payer") && json.get("payer").has("email_address")) {
            payerEmail = json.get("payer").get("email_address").asText();
        }

        // Custom ID (plan name)
        String customId = "";
        if (json.get("purchase_units").get(0).has("payments")) {
            JsonNode captureNode = json.get("purchase_units").get(0).get("payments").get("captures").get(0);
            if (captureNode.has("custom_id")) {
                customId = captureNode.get("custom_id").asText();
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("orderId", orderId);
        result.put("captureId", captureId);
        result.put("status", status);
        result.put("amount", amountValue);
        result.put("currency", currency);
        result.put("payerEmail", payerEmail);
        result.put("customId", customId);
        return result;
    }

    /**
     * Check if PayPal is configured (credentials set).
     */
    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank();
    }

    /**
     * Return public client ID for frontend SDK initialization.
     */
    public String getClientId() {
        return clientId;
    }
}
