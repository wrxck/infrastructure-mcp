package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * REST client for the Cloudflare v4 API.
 */
public class CloudflareClient {

    private static final String BASE_URL = "https://api.cloudflare.com/client/v4";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final String apiToken;
    private final String accountId;
    private final RateLimiter rateLimiter;
    private final HttpClient httpClient;

    CloudflareClient(String apiToken, String accountId, RateLimiter rateLimiter) {
        this.apiToken = apiToken;
        this.accountId = accountId;
        this.rateLimiter = rateLimiter;
        this.httpClient = HttpClient.newHttpClient();
    }

    // -------------------------------------------------------------------------
    // Public API methods
    // -------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    List<Map<String, Object>> listZones() {
        List<Map<String, Object>> all = new ArrayList<>();
        int page = 1;
        while (true) {
            String json = get("/zones?per_page=50&page=" + page);
            checkSuccess(json);
            try {
                Map<String, Object> root = MAPPER.readValue(json, Map.class);
                List<Map<String, Object>> result = (List<Map<String, Object>>) root.get("result");
                if (result == null || result.isEmpty()) break;
                for (Map<String, Object> zone : result) {
                    all.add(normaliseZone(zone));
                }
                Map<String, Object> info = (Map<String, Object>) root.get("result_info");
                int totalPages = info != null ? ((Number) info.getOrDefault("total_pages", 1)).intValue() : 1;
                if (page >= totalPages) break;
                page++;
            } catch (CloudflareApiException e) {
                throw e;
            } catch (Exception e) {
                throw new CloudflareApiException("Failed to parse zone list page: " + e.getMessage());
            }
        }
        return all;
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> getZoneByName(String domain) {
        String json = get("/zones?name=" + domain);
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            List<Map<String, Object>> result = (List<Map<String, Object>>) root.get("result");
            if (result == null || result.isEmpty()) return null;
            return normaliseZone(result.get(0));
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse zone by name: " + e.getMessage());
        }
    }

    Map<String, Object> createZone(String domain) {
        String body = "{\"name\":\"" + domain + "\",\"account\":{\"id\":\"" + accountId + "\"},\"jump_start\":false,\"type\":\"full\"}";
        String json = post("/zones", body);
        return parseZoneResponse(json);
    }

    List<Map<String, Object>> listDnsRecords(String zoneId) {
        List<Map<String, Object>> all = new ArrayList<>();
        int page = 1;
        while (true) {
            String json = get("/zones/" + zoneId + "/dns_records?per_page=100&page=" + page);
            all.addAll(parseDnsRecordListResponse(json));
            // Check if there are more pages
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> root = MAPPER.readValue(json, Map.class);
                @SuppressWarnings("unchecked")
                Map<String, Object> info = (Map<String, Object>) root.get("result_info");
                int totalPages = info != null ? ((Number) info.getOrDefault("total_pages", 1)).intValue() : 1;
                if (page >= totalPages) break;
                page++;
            } catch (Exception e) {
                break;
            }
        }
        return all;
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> createDnsRecord(String zoneId, String type, String name, String content,
                                         boolean proxied, int ttl, Integer priority) {
        Map<String, Object> bodyMap = new HashMap<>();
        bodyMap.put("type", type);
        bodyMap.put("name", name);
        bodyMap.put("content", content);
        bodyMap.put("proxied", proxied);
        bodyMap.put("ttl", ttl);
        if (priority != null) {
            bodyMap.put("priority", priority);
        }
        String body = toJson(bodyMap);
        String json = post("/zones/" + zoneId + "/dns_records", body);
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            return normaliseDnsRecord((Map<String, Object>) root.get("result"));
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse DNS record response: " + e.getMessage());
        }
    }

    Map<String, Object> getSetting(String zoneId, String settingId) {
        String json = get("/zones/" + zoneId + "/settings/" + settingId);
        return parseSettingResponse(json);
    }

    Map<String, Object> updateSetting(String zoneId, String settingId, Object value) {
        String body = toJson(Map.of("value", value));
        String json = patch("/zones/" + zoneId + "/settings/" + settingId, body);
        return parseSettingResponse(json);
    }

    @SuppressWarnings("unchecked")
    Map<String, Object> enableDnssec(String zoneId) {
        String json = patch("/zones/" + zoneId + "/dnssec", "{\"status\":\"active\"}");
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            Map<String, Object> result = (Map<String, Object>) root.get("result");
            return result != null ? result : new HashMap<>();
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse DNSSEC response: " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Generic HTTP methods
    // -------------------------------------------------------------------------

    String get(String path) {
        rateLimiter.acquire();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .header("Authorization", "Bearer " + apiToken)
                .header("Content-Type", "application/json")
                .GET()
                .build();
        return send(request);
    }

    String post(String path, String body) {
        rateLimiter.acquire();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .header("Authorization", "Bearer " + apiToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return send(request);
    }

    String patch(String path, String body) {
        rateLimiter.acquire();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .header("Authorization", "Bearer " + apiToken)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(body))
                .build();
        return send(request);
    }

    String put(String path, String body) {
        rateLimiter.acquire();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BASE_URL + path))
                .header("Authorization", "Bearer " + apiToken)
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return send(request);
    }

    // -------------------------------------------------------------------------
    // Private HTTP helper
    // -------------------------------------------------------------------------

    private String send(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (IOException e) {
            throw new CloudflareApiException("HTTP request failed: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CloudflareApiException("HTTP request interrupted: " + e.getMessage());
        }
    }

    private static String toJson(Object obj) {
        try {
            return MAPPER.writeValueAsString(obj);
        } catch (IOException e) {
            throw new CloudflareApiException("Failed to serialize JSON: " + e.getMessage());
        }
    }

    static final class CloudflareApiException extends RuntimeException {
        CloudflareApiException(String message) {
            super(message);
        }
    }

    /**
     * Throw a {@link CloudflareApiException} if the JSON response indicates failure.
     */
    @SuppressWarnings("unchecked")
    public static void checkSuccess(String json) {
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            Boolean success = (Boolean) root.get("success");
            if (Boolean.FALSE.equals(success)) {
                List<Map<String, Object>> errors = (List<Map<String, Object>>) root.get("errors");
                if (errors != null && !errors.isEmpty()) {
                    Map<String, Object> first = errors.get(0);
                    Object code = first.get("code");
                    Object message = first.get("message");
                    throw new CloudflareApiException("Cloudflare API error " + code + ": " + message);
                }
                throw new CloudflareApiException("Cloudflare API returned success=false");
            }
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse Cloudflare response: " + e.getMessage());
        }
    }

    /**
     * Parse a zone list response and return a list of zone maps.
     * Each zone map includes id, name, status, and nameServers (camelCase).
     */
    @SuppressWarnings("unchecked")
    public static List<Map<String, Object>> parseZoneListResponse(String json) {
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            List<Map<String, Object>> result = (List<Map<String, Object>>) root.get("result");
            List<Map<String, Object>> zones = new ArrayList<>();
            for (Map<String, Object> zone : result) {
                zones.add(normaliseZone(zone));
            }
            return zones;
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse zone list: " + e.getMessage());
        }
    }

    /**
     * Parse a single zone response and return a zone map.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseZoneResponse(String json) {
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            Map<String, Object> result = (Map<String, Object>) root.get("result");
            return normaliseZone(result);
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse zone response: " + e.getMessage());
        }
    }

    /**
     * Parse a DNS record list response.
     */
    @SuppressWarnings("unchecked")
    public static List<Map<String, Object>> parseDnsRecordListResponse(String json) {
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            List<Map<String, Object>> result = (List<Map<String, Object>>) root.get("result");
            List<Map<String, Object>> records = new ArrayList<>();
            for (Map<String, Object> record : result) {
                records.add(normaliseDnsRecord(record));
            }
            return records;
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse DNS record list: " + e.getMessage());
        }
    }

    /**
     * Parse a single setting response.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> parseSettingResponse(String json) {
        checkSuccess(json);
        try {
            Map<String, Object> root = MAPPER.readValue(json, Map.class);
            return (Map<String, Object>) root.get("result");
        } catch (CloudflareApiException e) {
            throw e;
        } catch (Exception e) {
            throw new CloudflareApiException("Failed to parse setting response: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> normaliseZone(Map<String, Object> raw) {
        Map<String, Object> zone = new HashMap<>();
        zone.put("id", raw.get("id"));
        zone.put("name", raw.get("name"));
        zone.put("status", raw.get("status"));
        // Rename snake_case name_servers -> camelCase nameServers
        Object ns = raw.get("name_servers");
        if (ns != null) {
            zone.put("nameServers", ns);
        }
        return zone;
    }

    private static Map<String, Object> normaliseDnsRecord(Map<String, Object> raw) {
        Map<String, Object> record = new HashMap<>(raw);
        // Remove priority key if null/absent so tests can assert null
        if (!raw.containsKey("priority") || raw.get("priority") == null) {
            record.remove("priority");
        }
        return record;
    }
}
