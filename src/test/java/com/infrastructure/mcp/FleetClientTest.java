package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class FleetClientTest {

    private static final String TEST_REGISTRY_JSON = """
            {
              "version": 1,
              "apps": [
                {"name": "mysite", "displayName": "My Site", "composePath": "/home/matt/mysite", "serviceName": "mysite", "domains": ["mysite.com", "www.mysite.com"], "port": 5000, "type": "proxy", "containers": ["mysite"]},
                {"name": "databases", "displayName": "Databases", "composePath": "/home/matt/databases", "serviceName": "databases", "domains": [], "port": null, "type": "service", "containers": ["postgres", "redis"]},
                {"name": "blog", "displayName": "Blog", "composePath": "/home/matt/blog", "serviceName": "blog", "domains": ["blog.example.org"], "port": 3000, "type": "spa", "containers": ["blog"]}
              ]
            }
            """;

    @Test
    void parsesRegistryAndExtractsAppsWithDomains(@TempDir Path tempDir) throws IOException {
        Path registryFile = tempDir.resolve("registry.json");
        Files.writeString(registryFile, TEST_REGISTRY_JSON);

        FleetClient client = new FleetClient(registryFile.toString(), "fleet");
        List<Map<String, Object>> apps = client.listApps();

        assertEquals(3, apps.size());

        Map<String, Object> mysite = apps.get(0);
        assertEquals("mysite", mysite.get("name"));
        assertEquals("My Site", mysite.get("displayName"));

        @SuppressWarnings("unchecked")
        List<String> domains = (List<String>) mysite.get("domains");
        assertTrue(domains.contains("mysite.com"));
        assertTrue(domains.contains("www.mysite.com"));
    }

    @Test
    void extractsUniqueDomains(@TempDir Path tempDir) throws IOException {
        Path registryFile = tempDir.resolve("registry.json");
        Files.writeString(registryFile, TEST_REGISTRY_JSON);

        FleetClient client = new FleetClient(registryFile.toString(), "fleet");
        Set<String> domains = client.getAllDomains();

        assertEquals(3, domains.size());
        assertTrue(domains.contains("mysite.com"));
        assertTrue(domains.contains("www.mysite.com"));
        assertTrue(domains.contains("blog.example.org"));
    }

    @Test
    void extractsRootDomains(@TempDir Path tempDir) throws IOException {
        Path registryFile = tempDir.resolve("registry.json");
        Files.writeString(registryFile, TEST_REGISTRY_JSON);

        FleetClient client = new FleetClient(registryFile.toString(), "fleet");
        Set<String> rootDomains = client.getRootDomains();

        // www.mysite.com -> mysite.com, mysite.com -> mysite.com (deduplicated)
        // blog.example.org -> example.org
        assertEquals(2, rootDomains.size());
        assertTrue(rootDomains.contains("mysite.com"));
        assertTrue(rootDomains.contains("example.org"));
    }

    @Test
    void handlesEmptyRegistry(@TempDir Path tempDir) throws IOException {
        Path registryFile = tempDir.resolve("registry.json");
        Files.writeString(registryFile, """
                {"version": 1, "apps": []}
                """);

        FleetClient client = new FleetClient(registryFile.toString(), "fleet");

        assertTrue(client.listApps().isEmpty());
        assertTrue(client.getAllDomains().isEmpty());
        assertTrue(client.getRootDomains().isEmpty());
    }

    @Test
    void handlesMissingRegistryFile(@TempDir Path tempDir) {
        Path nonExistent = tempDir.resolve("does-not-exist.json");

        FleetClient client = new FleetClient(nonExistent.toString(), "fleet");

        assertDoesNotThrow(() -> {
            List<Map<String, Object>> apps = client.listApps();
            assertTrue(apps.isEmpty());
        });
    }

    @Test
    void extractRootDomainStripsWww() {
        assertEquals("example.com", FleetClient.extractRootDomain("www.example.com"));
    }

    @Test
    void extractRootDomainHandlesMultiPartTld() {
        assertEquals("test.co.uk", FleetClient.extractRootDomain("app.test.co.uk"));
        assertEquals("test.co.uk", FleetClient.extractRootDomain("www.test.co.uk"));
        assertEquals("example.org.uk", FleetClient.extractRootDomain("example.org.uk"));
        assertEquals("example.com.au", FleetClient.extractRootDomain("sub.example.com.au"));
        assertEquals("example.co.nz", FleetClient.extractRootDomain("example.co.nz"));
    }
}
