package com.infrastructure.mcp;

import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.spec.McpSchema;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HttpTransportServerTest {

    private static final String TOKEN = "test-token-0123456789abcdef0123456789";
    private static final String INIT = """
            {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18",
            "capabilities":{},"clientInfo":{"name":"test","version":"1"}}}""";

    private HttpTransportServer server;
    private final HttpClient client = HttpClient.newHttpClient();

    @BeforeEach
    void start() throws Exception {
        var tool = SyncToolSpecification.builder()
                .tool(McpSchema.Tool.builder().name("ping").description("ping")
                        .inputSchema(new McpSchema.JsonSchema("object", Map.of(), List.of(), null, null, null))
                        .build())
                .callHandler((exchange, request) -> McpSchema.CallToolResult.builder()
                        .addTextContent("pong").build())
                .build();
        server = HttpTransportServer.start("infrastructure-mcp", "test", List.of(tool), "127.0.0.1", 0, TOKEN);
    }

    @AfterEach
    void stop() throws Exception {
        server.stop();
    }

    private HttpResponse<String> post(String auth) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.port() + "/mcp"))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json, text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(INIT));
        if (auth != null) {
            builder.header("Authorization", auth);
        }
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void rejects_a_request_without_a_token() throws Exception {
        var response = post(null);
        assertEquals(401, response.statusCode());
        assertEquals("Bearer", response.headers().firstValue("WWW-Authenticate").orElse(""));
    }

    @Test
    void rejects_a_wrong_token() throws Exception {
        assertEquals(401, post("Bearer wrong-token").statusCode());
    }

    @Test
    void rejects_a_token_with_the_wrong_scheme() throws Exception {
        assertEquals(401, post("Basic " + TOKEN).statusCode());
    }

    @Test
    void accepts_the_right_token() throws Exception {
        var response = post("Bearer " + TOKEN);
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("infrastructure-mcp"), response.body());
        assertTrue(response.headers().firstValue("Mcp-Session-Id").isPresent());
    }

    @Test
    void serves_only_the_mcp_path() throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + server.port() + "/other"))
                .header("Authorization", "Bearer " + TOKEN).GET().build();
        assertEquals(404, client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
    }
}
