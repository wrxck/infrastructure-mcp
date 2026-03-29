package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.spec.McpSchema;
import io.modelcontextprotocol.spec.McpSchema.CallToolResult;

import java.util.List;
import java.util.Map;

final class ResultHelper {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ResultHelper() {}

    static CallToolResult sanitizedResult(List<Map<String, Object>> data) {
        try {
            String boundary = ContentSanitizer.generateBoundary();
            var sanitized = ContentSanitizer.sanitizeRecords(data, boundary);
            String json = MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(sanitized);
            String ctx = ContentSanitizer.buildSecurityContext(boundary);
            return CallToolResult.builder()
                    .addTextContent(ctx)
                    .addTextContent(json)
                    .build();
        } catch (Exception e) {
            return errorResult("Failed to serialise: " + e.getMessage());
        }
    }

    static CallToolResult jsonResult(Object data) {
        try {
            String json = MAPPER.writerWithDefaultPrettyPrinter().writeValueAsString(data);
            return CallToolResult.builder().addTextContent(json).build();
        } catch (Exception e) {
            return errorResult("Failed to serialise: " + e.getMessage());
        }
    }

    static CallToolResult errorResult(String message) {
        return CallToolResult.builder().addTextContent(message).isError(true).build();
    }

    static String getString(Map<String, Object> args, String key) {
        Object value = args.get(key);
        if (value == null) throw new IllegalArgumentException("Missing required parameter: " + key);
        return String.valueOf(value);
    }

    static String getString(Map<String, Object> args, String key, String defaultValue) {
        Object value = args.get(key);
        return value != null ? String.valueOf(value) : defaultValue;
    }

    static boolean getBool(Map<String, Object> args, String key, boolean defaultValue) {
        Object value = args.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    static int getInt(Map<String, Object> args, String key, int defaultValue) {
        Object value = args.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(String.valueOf(value));
    }
}
