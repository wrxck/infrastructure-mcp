package com.infrastructure.mcp;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;

/**
 * Client for reading Fleet's registry and shelling out to the fleet CLI.
 */
public class FleetClient {

    private static final Set<String> MULTI_PART_TLDS = Set.of(
            "co.uk", "org.uk", "me.uk", "net.uk", "ltd.uk", "plc.uk",
            "co.nz", "org.nz", "net.nz",
            "com.au", "net.au", "org.au", "edu.au", "gov.au",
            "co.za", "org.za",
            "co.in", "net.in", "org.in",
            "co.jp", "ne.jp", "or.jp",
            "com.br", "net.br", "org.br",
            "com.mx", "net.mx", "org.mx",
            "co.kr", "or.kr", "ne.kr",
            "com.sg", "net.sg", "org.sg",
            "com.hk", "net.hk", "org.hk"
    );

    private final String registryPath;
    private final String fleetBinary;
    private final ObjectMapper objectMapper;

    public FleetClient(String registryPath, String fleetBinary) {
        this.registryPath = registryPath;
        this.fleetBinary = fleetBinary;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Parse Fleet's registry.json and return all apps.
     * Returns an empty list if the file does not exist or cannot be parsed.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listApps() {
        File file = new File(registryPath);
        if (!file.exists()) {
            return Collections.emptyList();
        }
        try {
            Map<String, Object> registry = objectMapper.readValue(file, Map.class);
            Object apps = registry.get("apps");
            if (apps instanceof List<?> list) {
                List<Map<String, Object>> result = new ArrayList<>();
                for (Object item : list) {
                    if (item instanceof Map<?, ?> map) {
                        //noinspection unchecked
                        result.add((Map<String, Object>) map);
                    }
                }
                return Collections.unmodifiableList(result);
            }
        } catch (IOException e) {
            // Treat parse errors as empty — caller shouldn't crash on a corrupt registry
        }
        return Collections.emptyList();
    }

    /**
     * Collect every domain string from every app's "domains" array.
     * Uses LinkedHashSet to preserve insertion order while eliminating duplicates.
     */
    @SuppressWarnings("unchecked")
    public Set<String> getAllDomains() {
        Set<String> domains = new LinkedHashSet<>();
        for (Map<String, Object> app : listApps()) {
            Object domainsValue = app.get("domains");
            if (domainsValue instanceof List<?> list) {
                for (Object d : list) {
                    if (d instanceof String s && !s.isBlank()) {
                        domains.add(s);
                    }
                }
            }
        }
        return Collections.unmodifiableSet(domains);
    }

    /**
     * Return the set of root domains derived from all app domains.
     * Strips leading "www." and handles multi-part TLDs such as co.uk, com.au, etc.
     */
    public Set<String> getRootDomains() {
        Set<String> roots = new LinkedHashSet<>();
        for (String domain : getAllDomains()) {
            roots.add(extractRootDomain(domain));
        }
        return Collections.unmodifiableSet(roots);
    }

    /**
     * Shell out to the fleet binary with the given arguments and return stdout.
     *
     * @throws IOException          if the process cannot be started
     * @throws InterruptedException if the thread is interrupted while waiting
     */
    public String runCommand(String... args) throws IOException, InterruptedException {
        String[] command = new String[args.length + 1];
        command[0] = fleetBinary;
        System.arraycopy(args, 0, command, 1, args.length);

        Process process = new ProcessBuilder(command)
                .redirectErrorStream(true)
                .start();

        String output;
        try (InputStream is = process.getInputStream()) {
            output = new String(is.readAllBytes());
        }
        process.waitFor();
        return output;
    }

    /**
     * Extract the root domain from a fully-qualified domain name.
     * Strips a leading "www." subdomain and handles multi-part TLDs
     * (e.g. co.uk, com.au, co.nz, org.uk).
     *
     * Examples:
     *   www.example.com   -> example.com
     *   app.test.co.uk    -> test.co.uk
     *   blog.example.org  -> example.org
     */
    public static String extractRootDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return domain;
        }

        // Strip leading "www." before further processing
        String d = domain.startsWith("www.") ? domain.substring(4) : domain;

        String[] parts = d.split("\\.");

        // Need at least 2 parts to be a valid domain
        if (parts.length <= 2) {
            return d;
        }

        // Check whether the last two parts form a known multi-part TLD
        String candidateTld = parts[parts.length - 2] + "." + parts[parts.length - 1];
        if (MULTI_PART_TLDS.contains(candidateTld)) {
            // root = label before the two-part TLD + the TLD
            if (parts.length == 3) {
                // Already root-level: e.g. "example.co.uk"
                return d;
            }
            // Strip everything before the second-to-last two parts
            return parts[parts.length - 3] + "." + candidateTld;
        }

        // Standard single-part TLD: return last two labels
        return parts[parts.length - 2] + "." + parts[parts.length - 1];
    }
}
