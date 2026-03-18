package com.temcoservers.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.ejb.Stateless;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Stateless
public class ContaboService {

    private static final String AUTH_URL = "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token";
    private static final String API_BASE = "https://api.contabo.com/v1";

    private String clientId;
    private String clientSecret;
    private String apiUser;
    private String apiPassword;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        clientId = System.getenv("CONTABO_CLIENT_ID");
        clientSecret = System.getenv("CONTABO_CLIENT_SECRET");
        apiUser = System.getenv("CONTABO_API_USER");
        apiPassword = System.getenv("CONTABO_API_PASSWORD");
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank()
                && clientSecret != null && !clientSecret.isBlank()
                && apiUser != null && !apiUser.isBlank()
                && apiPassword != null && !apiPassword.isBlank();
    }

    public List<Map<String, Object>> listInstances() throws Exception {
        if (!isConfigured()) return new ArrayList<>();
        String token = getAccessToken();
        String requestId = UUID.randomUUID().toString();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + "/compute/instances"))
                .header("Authorization", "Bearer " + token)
                .header("x-request-id", requestId)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Contabo API error: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode data = root.get("data");

        List<Map<String, Object>> instances = new ArrayList<>();
        if (data != null && data.isArray()) {
            for (JsonNode node : data) {
                Map<String, Object> instance = new LinkedHashMap<>();
                instance.put("instanceId", node.get("instanceId").asLong());
                instance.put("name", node.has("name") ? node.get("name").asText() : "");
                instance.put("displayName", node.has("displayName") ? node.get("displayName").asText() : "");
                instance.put("status", node.has("status") ? node.get("status").asText() : "");
                instance.put("imageId", node.has("imageId") ? node.get("imageId").asText() : "");
                instance.put("region", node.has("region") ? node.get("region").asText() : "");
                instance.put("productId", node.has("productId") ? node.get("productId").asText() : "");
                instance.put("defaultUser", node.has("defaultUser") ? node.get("defaultUser").asText() : "");

                if (node.has("ipConfig") && node.get("ipConfig").has("v4")) {
                    JsonNode v4 = node.get("ipConfig").get("v4");
                    if (v4.has("ip")) {
                        instance.put("ipv4", v4.get("ip").asText());
                    }
                }
                instances.add(instance);
            }
        }
        return instances;
    }

    public Map<String, Object> getInstance(long instanceId) throws Exception {
        String token = getAccessToken();
        String requestId = UUID.randomUUID().toString();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + "/compute/instances/" + instanceId))
                .header("Authorization", "Bearer " + token)
                .header("x-request-id", requestId)
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Contabo API error: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode data = root.get("data");
        if (data != null && data.isArray() && data.size() > 0) {
            return objectMapper.convertValue(data.get(0), Map.class);
        }
        throw new RuntimeException("Instance not found: " + instanceId);
    }

    public void performAction(long instanceId, String action) throws Exception {
        String token = getAccessToken();
        String requestId = UUID.randomUUID().toString();

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + "/compute/instances/" + instanceId + "/actions/" + action))
                .header("Authorization", "Bearer " + token)
                .header("x-request-id", requestId)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200 && response.statusCode() != 201) {
            throw new RuntimeException("Contabo API error (" + action + "): " + response.body());
        }
    }

    public Map<String, Object> createInstance(String productId, String region, String imageId,
                                               String displayName, int period) throws Exception {
        String token = getAccessToken();
        String requestId = UUID.randomUUID().toString();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("imageId", imageId);
        body.put("productId", productId);
        body.put("region", region);
        body.put("displayName", displayName);
        body.put("period", period);

        String jsonBody = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE + "/compute/instances"))
                .header("Authorization", "Bearer " + token)
                .header("x-request-id", requestId)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 201) {
            throw new RuntimeException("Failed to create instance: " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode data = root.get("data");
        if (data != null && data.isArray() && data.size() > 0) {
            return objectMapper.convertValue(data.get(0), Map.class);
        }
        return Map.of("status", "created");
    }

    private String getAccessToken() throws Exception {
        String formBody = "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
                + "&username=" + URLEncoder.encode(apiUser, StandardCharsets.UTF_8)
                + "&password=" + URLEncoder.encode(apiPassword, StandardCharsets.UTF_8)
                + "&grant_type=password";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(AUTH_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to authenticate with Contabo: " + response.body());
        }

        JsonNode json = objectMapper.readTree(response.body());
        return json.get("access_token").asText();
    }
}
