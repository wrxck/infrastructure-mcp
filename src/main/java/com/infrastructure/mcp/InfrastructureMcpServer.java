package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.json.jackson2.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.StdioServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema.ServerCapabilities;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

public class InfrastructureMcpServer {

    private static final Logger log = LoggerFactory.getLogger(InfrastructureMcpServer.class);
    private static final String SERVER_NAME = "infrastructure-mcp";
    private static final String SERVER_VERSION = resolveVersion();

    private static String resolveVersion() {
        String v = InfrastructureMcpServer.class.getPackage().getImplementationVersion();
        return v != null ? v : "dev";
    }

    public static void main(String[] args) {
        for (String arg : args) {
            if ("--setup".equals(arg) || "--install".equals(arg)) {
                new SetupTui(System.in, System.out).run();
                return;
            }
        }

        try {
            var config = ServerConfig.fromSystem();
            var tools = new InfrastructureTools(config);
            var specs = tools.toolSpecs();

            TransportConfig transport = TransportConfig.fromArgs(args);
            if (transport.http()) {
                startHttpServer(specs, transport);
            } else {
                startServer(specs);
            }
        } catch (Exception e) {
            log.error("Failed to start {}: {}", SERVER_NAME, e.getMessage());
            System.exit(1);
        }
    }

    private static void startHttpServer(List<SyncToolSpecification> specs, TransportConfig transport)
            throws Exception {
        HttpTransportServer server = HttpTransportServer.start(SERVER_NAME, SERVER_VERSION, specs,
                transport.bindHost(), transport.port(), transport.readToken());
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("Shutting down {}", SERVER_NAME);
            try {
                server.stop();
            } catch (Exception e) {
                log.warn("Error during shutdown: {}", e.getMessage());
            }
        }));
        server.join();
    }

    private static void startServer(List<SyncToolSpecification> specs) {
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
    }
}
