package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * Interactive paginated setup TUI for configuring the Infrastructure MCP server.
 * Walks the user through entering credentials, validates them, and registers
 * the server with Claude Code.
 */
final class SetupTui {

    private static final String RESET = "\033[0m";
    private static final String BOLD = "\033[1m";
    private static final String DIM = "\033[2m";
    private static final String CYAN = "\033[36m";
    private static final String GREEN = "\033[32m";
    private static final String YELLOW = "\033[33m";
    private static final String RED = "\033[31m";
    private static final String WHITE = "\033[97m";
    private static final String BG_BLUE = "\033[44m";

    private static final ObjectMapper MAPPER = new ObjectMapper()
            .enable(SerializationFeature.INDENT_OUTPUT);

    private final Scanner scanner;
    private final PrintStream out;

    // Collected config values
    private String cloudflareApiToken = "";
    private String cloudflareAccountId = "";
    private String namecheapApiUser = "";
    private String namecheapApiKey = "";
    private String namecheapClientIp = "";
    private String fleetRegistryPath = "/home/matt/fleet/data/registry.json";
    private String fleetBinary = "fleet";
    private String claudeBinary = "claude";
    private String jarPath = "";

    SetupTui(InputStream in, PrintStream out) {
        this.scanner = new Scanner(in);
        this.out = out;
    }

    void run() {
        resolveJarPath();

        int currentPage = 0;
        int totalPages = 5;

        while (currentPage < totalPages) {
            clearScreen();
            switch (currentPage) {
                case 0 -> showWelcomePage();
                case 1 -> showCloudflarePage();
                case 2 -> showNamecheapPage();
                case 3 -> showFleetPage();
                case 4 -> showSummaryPage();
            }

            String nav = promptNavigation(currentPage, totalPages);
            switch (nav) {
                case "next" -> currentPage++;
                case "back" -> currentPage = Math.max(0, currentPage - 1);
                case "quit" -> { printQuit(); return; }
                case "install" -> { doInstall(); return; }
            }
        }
    }

    // --- Pages ---

    private void showWelcomePage() {
        printHeader("Welcome", 1, 5);
        out.println();
        out.println(CYAN + "  Infrastructure MCP Server — Setup Wizard" + RESET);
        out.println();
        out.println("  This wizard will help you configure the server by collecting");
        out.println("  your API credentials and registering with Claude Code.");
        out.println();
        out.println(DIM + "  What you'll need:" + RESET);
        out.println();
        out.println("    " + YELLOW + "1." + RESET + " Cloudflare API token and account ID");
        out.println("       " + DIM + "https://dash.cloudflare.com/profile/api-tokens" + RESET);
        out.println();
        out.println("    " + YELLOW + "2." + RESET + " Namecheap API username and key");
        out.println("       " + DIM + "https://ap.www.namecheap.com/settings/tools/apiaccess" + RESET);
        out.println();
        out.println("    " + YELLOW + "3." + RESET + " Fleet registry path " + DIM + "(optional)" + RESET);
        out.println();
        printDivider();
    }

    private void showCloudflarePage() {
        printHeader("Cloudflare", 2, 5);
        out.println();
        out.println(CYAN + "  Cloudflare API Configuration" + RESET);
        out.println();
        out.println("  Create an API token at:");
        out.println("  " + DIM + "https://dash.cloudflare.com/profile/api-tokens" + RESET);
        out.println();
        out.println("  Recommended permissions: " + YELLOW + "Zone:Read, DNS:Edit, Zone Settings:Edit" + RESET);
        out.println();

        cloudflareApiToken = promptField("API Token", cloudflareApiToken, true, true);
        cloudflareAccountId = promptField("Account ID", cloudflareAccountId, true, false);

        out.println();
        if (!cloudflareApiToken.isEmpty() && !cloudflareAccountId.isEmpty()) {
            out.println("  " + GREEN + "  Cloudflare credentials set" + RESET);
        } else {
            out.println("  " + RED + "  Both fields are required" + RESET);
        }

        printDivider();
    }

    private void showNamecheapPage() {
        printHeader("Namecheap", 3, 5);
        out.println();
        out.println(CYAN + "  Namecheap API Configuration" + RESET);
        out.println();
        out.println("  Enable API access at:");
        out.println("  " + DIM + "https://ap.www.namecheap.com/settings/tools/apiaccess" + RESET);
        out.println();
        out.println("  Whitelist your server IP in the Namecheap dashboard.");
        out.println();

        namecheapApiUser = promptField("API User", namecheapApiUser, true, false);
        namecheapApiKey = promptField("API Key", namecheapApiKey, true, true);
        namecheapClientIp = promptField("Whitelisted IP", namecheapClientIp, true, false);

        out.println();
        if (!namecheapApiUser.isEmpty() && !namecheapApiKey.isEmpty() && !namecheapClientIp.isEmpty()) {
            out.println("  " + GREEN + "  Namecheap credentials set" + RESET);
        } else {
            out.println("  " + RED + "  All three fields are required" + RESET);
        }

        printDivider();
    }

    private void showFleetPage() {
        printHeader("Fleet", 4, 5);
        out.println();
        out.println(CYAN + "  Fleet Configuration " + DIM + "(optional)" + RESET);
        out.println();
        out.println("  If you use Fleet for app deployment, configure its path here.");
        out.println("  Leave defaults if you don't use Fleet.");
        out.println();

        fleetRegistryPath = promptField("Registry path", fleetRegistryPath, false, false);
        fleetBinary = promptField("Fleet binary", fleetBinary, false, false);

        out.println();

        // Check if registry exists
        if (Files.exists(Path.of(fleetRegistryPath))) {
            out.println("  " + GREEN + "  Registry found at " + fleetRegistryPath + RESET);
        } else {
            out.println("  " + YELLOW + "  Registry not found — Fleet tools will return empty results" + RESET);
        }

        out.println();
        out.println(DIM + "  Claude binary " + RESET + DIM + "(for --install registration)" + RESET);
        claudeBinary = promptField("Claude binary", claudeBinary, false, false);

        printDivider();
    }

    private void showSummaryPage() {
        printHeader("Summary", 5, 5);
        out.println();
        out.println(CYAN + "  Configuration Summary" + RESET);
        out.println();

        printSummaryRow("Cloudflare Token", maskSecret(cloudflareApiToken), !cloudflareApiToken.isEmpty());
        printSummaryRow("Cloudflare Account", cloudflareAccountId, !cloudflareAccountId.isEmpty());
        printSummaryRow("Namecheap User", namecheapApiUser, !namecheapApiUser.isEmpty());
        printSummaryRow("Namecheap Key", maskSecret(namecheapApiKey), !namecheapApiKey.isEmpty());
        printSummaryRow("Namecheap IP", namecheapClientIp, !namecheapClientIp.isEmpty());
        printSummaryRow("Fleet Registry", fleetRegistryPath, Files.exists(Path.of(fleetRegistryPath)));
        printSummaryRow("Fleet Binary", fleetBinary, true);
        printSummaryRow("JAR Path", jarPath, !jarPath.isEmpty());

        out.println();

        boolean valid = isConfigValid();
        if (valid) {
            out.println("  " + GREEN + "  Ready to install!" + RESET);
        } else {
            out.println("  " + RED + "  Missing required fields — go back to fill them in" + RESET);
        }

        printDivider();
    }

    // --- Navigation ---

    private String promptNavigation(int page, int totalPages) {
        out.println();
        StringBuilder nav = new StringBuilder("  ");

        if (page > 0) {
            nav.append(DIM).append("[b] Back").append(RESET).append("  ");
        }

        if (page < totalPages - 1) {
            nav.append(GREEN).append("[enter] Next").append(RESET).append("  ");
        } else if (isConfigValid()) {
            nav.append(GREEN).append("[enter] Install").append(RESET).append("  ");
        }

        nav.append(DIM).append("[q] Quit").append(RESET);

        out.println(nav);
        out.print("  " + WHITE + "> " + RESET);

        String input = scanner.nextLine().trim().toLowerCase();

        if (input.equals("q") || input.equals("quit")) return "quit";
        if (input.equals("b") || input.equals("back")) return "back";

        if (page == totalPages - 1 && isConfigValid()) {
            return "install";
        }

        return "next";
    }

    // --- Install ---

    private void doInstall() {
        clearScreen();
        printHeader("Installing", 0, 0);
        out.println();

        // Build env map
        var env = new LinkedHashMap<String, String>();
        env.put("CLOUDFLARE_API_TOKEN", cloudflareApiToken);
        env.put("CLOUDFLARE_ACCOUNT_ID", cloudflareAccountId);
        env.put("NAMECHEAP_API_USER", namecheapApiUser);
        env.put("NAMECHEAP_API_KEY", namecheapApiKey);
        env.put("NAMECHEAP_CLIENT_IP", namecheapClientIp);
        if (!fleetRegistryPath.equals("/home/matt/fleet/data/registry.json")) {
            env.put("FLEET_REGISTRY_PATH", fleetRegistryPath);
        }
        if (!fleetBinary.equals("fleet")) {
            env.put("FLEET_BINARY", fleetBinary);
        }

        // Try Claude CLI registration first
        out.println("  Registering with Claude Code...");
        out.println();

        boolean cliInstalled = registerViaCli(env);

        if (cliInstalled) {
            out.println("  " + GREEN + "  Registered via Claude CLI" + RESET);
        } else {
            out.println("  " + YELLOW + "  Claude CLI not found — writing config file instead" + RESET);
            boolean fileInstalled = registerViaConfigFile(env);
            if (fileInstalled) {
                out.println("  " + GREEN + "  Config written successfully" + RESET);
            } else {
                out.println("  " + RED + "  Failed to write config" + RESET);
                printManualConfig(env);
            }
        }

        out.println();
        out.println("  " + GREEN + BOLD + "  Setup complete!" + RESET);
        out.println();
        out.println("  Restart Claude Code for the new MCP server to be available.");
        out.println();
    }

    private boolean registerViaCli(Map<String, String> env) {
        try {
            var args = new ArrayList<String>();
            args.addAll(List.of(claudeBinary, "mcp", "add",
                    "--scope", "user", "--transport", "stdio", "infrastructure", "--",
                    "java", "-jar", jarPath));

            var pb = new ProcessBuilder(args);
            for (var entry : env.entrySet()) {
                pb.environment().put(entry.getKey(), entry.getValue());
            }
            pb.redirectErrorStream(true);

            // Build the command with env flags
            var cmd = new ArrayList<String>();
            cmd.addAll(List.of(claudeBinary, "mcp", "add",
                    "--scope", "user", "--transport", "stdio"));
            for (var entry : env.entrySet()) {
                cmd.add("-e");
                cmd.add(entry.getKey() + "=" + entry.getValue());
            }
            cmd.add("infrastructure");
            cmd.add("--");
            cmd.add("java");
            cmd.add("-jar");
            cmd.add(jarPath);

            Process process = new ProcessBuilder(cmd).redirectErrorStream(true).start();
            String output;
            try (var is = process.getInputStream()) {
                output = new String(is.readAllBytes());
            }
            int exit = process.waitFor();
            if (exit != 0) {
                out.println("  " + DIM + output.trim() + RESET);
                return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean registerViaConfigFile(Map<String, String> env) {
        try {
            Path configPath = Path.of(System.getProperty("user.home"), ".claude.json");
            ObjectNode root;
            if (Files.exists(configPath)) {
                root = (ObjectNode) MAPPER.readTree(configPath.toFile());
            } else {
                root = MAPPER.createObjectNode();
            }

            ObjectNode servers = root.has("mcpServers")
                    ? (ObjectNode) root.get("mcpServers")
                    : root.putObject("mcpServers");

            ObjectNode server = servers.putObject("infrastructure-mcp");
            server.put("type", "stdio");
            server.put("command", "java");
            var argsNode = server.putArray("args");
            argsNode.add("-jar");
            argsNode.add(jarPath);

            var envNode = server.putObject("env");
            for (var entry : env.entrySet()) {
                envNode.put(entry.getKey(), entry.getValue());
            }

            MAPPER.writeValue(configPath.toFile(), root);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void printManualConfig(Map<String, String> env) {
        out.println();
        out.println("  " + YELLOW + "Add this to ~/.claude.json under mcpServers:" + RESET);
        out.println();
        try {
            var node = MAPPER.createObjectNode();
            node.put("type", "stdio");
            node.put("command", "java");
            var args = node.putArray("args");
            args.add("-jar");
            args.add(jarPath);
            var envNode = node.putObject("env");
            for (var entry : env.entrySet()) {
                envNode.put(entry.getKey(), entry.getValue());
            }
            String json = MAPPER.writeValueAsString(node);
            for (String line : json.split("\n")) {
                out.println("    " + DIM + line + RESET);
            }
        } catch (Exception ignored) {}
    }

    // --- UI helpers ---

    private void clearScreen() {
        out.print("\033[2J\033[H");
        out.flush();
    }

    private void printHeader(String title, int page, int total) {
        out.println();
        out.print("  " + BG_BLUE + WHITE + BOLD + " Infrastructure MCP ");
        if (total > 0) {
            out.print("— " + title + " (" + page + "/" + total + ") ");
        } else {
            out.print("— " + title + " ");
        }
        out.println(RESET);
    }

    private void printDivider() {
        out.println();
        out.println("  " + DIM + "─".repeat(60) + RESET);
    }

    private String promptField(String label, String currentValue, boolean required, boolean secret) {
        String req = required ? RED + "*" + RESET : "";
        String display = currentValue.isEmpty() ? DIM + "(empty)" + RESET
                : (secret ? DIM + maskSecret(currentValue) + RESET : DIM + currentValue + RESET);

        out.println("  " + WHITE + label + req + RESET + "  " + display);
        out.print("  " + DIM + "New value (enter to keep): " + RESET);

        String input = scanner.nextLine().trim();
        if (input.isEmpty()) return currentValue;
        return input;
    }

    private void printSummaryRow(String label, String value, boolean ok) {
        String icon = ok ? GREEN + "  " + RESET : RED + "  " + RESET;
        out.printf("  %s %-20s %s%s%n", icon, label, DIM, value.isEmpty() ? "(not set)" : value + RESET);
    }

    static String maskSecret(String secret) {
        if (secret == null || secret.length() <= 8) return "****";
        return secret.substring(0, 4) + "****" + secret.substring(secret.length() - 4);
    }

    private void printQuit() {
        out.println();
        out.println("  " + DIM + "Setup cancelled. Run with --setup to try again." + RESET);
        out.println();
    }

    boolean isConfigValid() {
        return !cloudflareApiToken.isEmpty()
                && !cloudflareAccountId.isEmpty()
                && !namecheapApiUser.isEmpty()
                && !namecheapApiKey.isEmpty()
                && !namecheapClientIp.isEmpty();
    }

    private void resolveJarPath() {
        try {
            var source = SetupTui.class.getProtectionDomain().getCodeSource();
            if (source != null && source.getLocation() != null) {
                jarPath = Path.of(source.getLocation().toURI()).toAbsolutePath().toString();
            }
        } catch (Exception ignored) {}
        if (jarPath.isEmpty()) {
            jarPath = "infrastructure-mcp-1.0.0.jar";
        }
    }

    // --- Getters for testing ---

    String getCloudflareApiToken() { return cloudflareApiToken; }
    String getCloudflareAccountId() { return cloudflareAccountId; }
    String getNamecheapApiUser() { return namecheapApiUser; }
    String getNamecheapApiKey() { return namecheapApiKey; }
    String getNamecheapClientIp() { return namecheapClientIp; }
    String getFleetRegistryPath() { return fleetRegistryPath; }
    String getFleetBinary() { return fleetBinary; }
    String getClaudeBinary() { return claudeBinary; }

    // Setters for testing
    void setCloudflareApiToken(String v) { cloudflareApiToken = v; }
    void setCloudflareAccountId(String v) { cloudflareAccountId = v; }
    void setNamecheapApiUser(String v) { namecheapApiUser = v; }
    void setNamecheapApiKey(String v) { namecheapApiKey = v; }
    void setNamecheapClientIp(String v) { namecheapClientIp = v; }
}
