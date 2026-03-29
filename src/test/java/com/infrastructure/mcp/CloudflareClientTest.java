package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CloudflareClientTest {

    @Test
    void parsesZoneListResponse() {
        String json = """
                {"success": true, "result": [{"id": "zone-id-1", "name": "example.com", "status": "active", "name_servers": ["ns1.cloudflare.com", "ns2.cloudflare.com"]}]}
                """;

        List<Map<String, Object>> zones = CloudflareClient.parseZoneListResponse(json);

        assertEquals(1, zones.size());
        Map<String, Object> zone = zones.get(0);
        assertEquals("zone-id-1", zone.get("id"));
        assertEquals("example.com", zone.get("name"));
        assertEquals("active", zone.get("status"));

        @SuppressWarnings("unchecked")
        List<String> nameServers = (List<String>) zone.get("nameServers");
        assertNotNull(nameServers);
        assertEquals(2, nameServers.size());
        assertTrue(nameServers.contains("ns1.cloudflare.com"));
        assertTrue(nameServers.contains("ns2.cloudflare.com"));
    }

    @Test
    void parsesZoneCreateResponse() {
        String json = """
                {"success": true, "result": {"id": "new-zone-id", "name": "test.com", "status": "pending", "name_servers": ["anna.ns.cloudflare.com", "bob.ns.cloudflare.com"]}}
                """;

        Map<String, Object> zone = CloudflareClient.parseZoneResponse(json);

        assertEquals("new-zone-id", zone.get("id"));
        assertEquals("test.com", zone.get("name"));
        assertEquals("pending", zone.get("status"));

        @SuppressWarnings("unchecked")
        List<String> nameServers = (List<String>) zone.get("nameServers");
        assertNotNull(nameServers);
        assertEquals(2, nameServers.size());
        assertTrue(nameServers.contains("anna.ns.cloudflare.com"));
        assertTrue(nameServers.contains("bob.ns.cloudflare.com"));
    }

    @Test
    void parsesDnsRecordListResponse() {
        String json = """
                {"success": true, "result": [{"id": "r1", "type": "A", "name": "example.com", "content": "1.2.3.4", "proxied": true, "ttl": 1}, {"id": "r2", "type": "MX", "name": "example.com", "content": "mail.example.com", "priority": 10, "proxied": false, "ttl": 300}]}
                """;

        List<Map<String, Object>> records = CloudflareClient.parseDnsRecordListResponse(json);

        assertEquals(2, records.size());

        Map<String, Object> aRecord = records.get(0);
        assertEquals("r1", aRecord.get("id"));
        assertEquals("A", aRecord.get("type"));
        assertEquals("example.com", aRecord.get("name"));
        assertEquals("1.2.3.4", aRecord.get("content"));
        assertEquals(true, aRecord.get("proxied"));
        assertNull(aRecord.get("priority"));

        Map<String, Object> mxRecord = records.get(1);
        assertEquals("r2", mxRecord.get("id"));
        assertEquals("MX", mxRecord.get("type"));
        assertEquals("mail.example.com", mxRecord.get("content"));
        assertEquals(false, mxRecord.get("proxied"));
        assertNotNull(mxRecord.get("priority"));
        assertEquals(10, ((Number) mxRecord.get("priority")).intValue());
    }

    @Test
    void parsesSettingResponse() {
        String json = """
                {"success": true, "result": {"id": "ssl", "value": "full"}}
                """;

        Map<String, Object> setting = CloudflareClient.parseSettingResponse(json);

        assertEquals("ssl", setting.get("id"));
        assertEquals("full", setting.get("value"));
    }

    @Test
    void detectsApiError() {
        String json = """
                {"success": false, "errors": [{"code": 1003, "message": "Zone not found"}]}
                """;

        CloudflareClient.CloudflareApiException ex = assertThrows(
                CloudflareClient.CloudflareApiException.class,
                () -> CloudflareClient.checkSuccess(json)
        );

        assertTrue(ex.getMessage().contains("Zone not found"));
    }
}
