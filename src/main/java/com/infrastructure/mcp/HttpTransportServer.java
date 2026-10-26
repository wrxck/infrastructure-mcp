package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.modelcontextprotocol.json.jackson2.JacksonMcpJsonMapper;
import io.modelcontextprotocol.server.McpServer;
import io.modelcontextprotocol.server.McpServerFeatures.SyncToolSpecification;
import io.modelcontextprotocol.server.McpSyncServer;
import io.modelcontextprotocol.server.transport.HttpServletStreamableServerTransportProvider;
import io.modelcontextprotocol.spec.McpSchema.ServerCapabilities;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.eclipse.jetty.ee10.servlet.FilterHolder;
import org.eclipse.jetty.ee10.servlet.ServletContextHandler;
import org.eclipse.jetty.ee10.servlet.ServletHolder;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.ServerConnector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.EnumSet;
import java.util.List;

// the token keeps out other local users and containers on the host network
final class HttpTransportServer {

    private static final Logger log = LoggerFactory.getLogger(HttpTransportServer.class);
    static final String ENDPOINT = "/mcp";

    private final Server jetty;
    private final McpSyncServer mcp;

    private HttpTransportServer(Server jetty, McpSyncServer mcp) {
        this.jetty = jetty;
        this.mcp = mcp;
    }

    static HttpTransportServer start(String name, String version, List<SyncToolSpecification> tools,
                                     String bindHost, int port, String token) throws Exception {
        var provider = HttpServletStreamableServerTransportProvider.builder()
                .jsonMapper(new JacksonMcpJsonMapper(new ObjectMapper()))
                .mcpEndpoint(ENDPOINT)
                .keepAliveInterval(Duration.ofSeconds(30))
                .build();

        McpSyncServer mcp = McpServer.sync(provider)
                .serverInfo(name, version)
                .capabilities(ServerCapabilities.builder().tools(true).build())
                .tools(tools)
                .build();

        var context = new ServletContextHandler();
        context.setContextPath("/");
        context.addFilter(new FilterHolder(new BearerTokenFilter(token)), "/*",
                EnumSet.of(jakarta.servlet.DispatcherType.REQUEST));
        var holder = new ServletHolder(provider);
        holder.setAsyncSupported(true);
        context.addServlet(holder, ENDPOINT);

        var jetty = new Server(new InetSocketAddress(bindHost, port));
        jetty.setHandler(context);
        jetty.setStopAtShutdown(false);
        jetty.start();
        var server = new HttpTransportServer(jetty, mcp);
        log.info("{} listening on http://{}:{}{} ({} tools)", name, bindHost, server.port(), ENDPOINT, tools.size());
        return server;
    }

    int port() {
        return ((ServerConnector) jetty.getConnectors()[0]).getLocalPort();
    }

    void stop() throws Exception {
        mcp.close();
        jetty.stop();
    }

    void join() throws InterruptedException {
        jetty.join();
    }

    // hashing first gives a constant-time compare that also hides the token length
    static final class BearerTokenFilter implements Filter {

        private final byte[] expected;

        BearerTokenFilter(String token) {
            this.expected = sha256(token);
        }

        @Override
        public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
                throws IOException, ServletException {
            var request = (HttpServletRequest) req;
            var response = (HttpServletResponse) res;
            String header = request.getHeader("Authorization");
            String presented = header != null && header.startsWith("Bearer ") ? header.substring(7).trim() : "";
            if (!MessageDigest.isEqual(expected, sha256(presented))) {
                response.setHeader("WWW-Authenticate", "Bearer");
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
            chain.doFilter(req, res);
        }

        private static byte[] sha256(String value) {
            try {
                return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException(e);
            }
        }
    }
}
