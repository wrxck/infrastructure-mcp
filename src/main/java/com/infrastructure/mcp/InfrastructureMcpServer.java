package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.json.jackson2.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.StdioServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema.ServerCapabilities;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class InfrastructureMcpServer {

    private static final Logger log = LoggerFactory.getLogger(InfrastructureMcpServer.class);
    private static final String SERVER_NAME = "infrastructure-mcp";
    private static final String SERVER_VERSION = "1.0.0";

    public static void main(String[] args) {
        try {
            var config = ServerConfig.fromSystem();
            var tools = new InfrastructureTools(config);
            var specs = tools.toolSpecs();

            var transport = new StdioServerTransportProvider(new JacksonMcpJsonMapper(new ObjectMapper()));

            McpSyncServer server = McpServer.sync(transport)
                    .serverInfo(SERVER_NAME, SERVER_VERSION)
                    .capabilities(ServerCapabilities.builder().tools(true).build())
                    .tools(specs)
                    .build();

            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                log.info("Shutting down {}", SERVER_NAME);
                server.close();
            }));

            log.info("{} started ({} tools)", SERVER_NAME, specs.size());
        } catch (Exception e) {
            log.error("Failed to start {}: {}", SERVER_NAME, e.getMessage());
            System.exit(1);
        }
    }
}
