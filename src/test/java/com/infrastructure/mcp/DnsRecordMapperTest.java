package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DnsRecordMapperTest {

    @Test
    void mapsARecordAtRoot() {
        var nc = record("@", "A", "1.2.3.4", "0", "1800");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("A", cf.get("type"));
        assertEquals("example.com", cf.get("name"));
        assertEquals("1.2.3.4", cf.get("content"));
        assertEquals(true, cf.get("proxied"));
    }

    @Test
    void mapsWwwCnameAsProxied() {
        var nc = record("www", "CNAME", "example.com.", "0", "1800");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("CNAME", cf.get("type"));
        assertEquals("www.example.com", cf.get("name"));
        assertEquals(true, cf.get("proxied"));
    }

    @Test
    void mapsMxRecordAsUnproxied() {
        var nc = record("@", "MX", "mail.example.com.", "10", "1800");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("MX", cf.get("type"));
        assertEquals(false, cf.get("proxied"));
        assertEquals(10, cf.get("priority"));
    }

    @Test
    void mapsTxtRecordAsUnproxied() {
        var nc = record("@", "TXT", "v=spf1 include:_spf.google.com ~all", "0", "1800");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("TXT", cf.get("type"));
        assertEquals(false, cf.get("proxied"));
        assertNull(cf.get("priority"));
    }

    @Test
    void mapsSubdomainARecordAsProxied() {
        var nc = record("api", "A", "5.6.7.8", "0", "300");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("api.example.com", cf.get("name"));
        assertEquals(true, cf.get("proxied"));
    }

    @Test
    void mapsMailSubdomainAsUnproxied() {
        var nc = record("mail", "A", "5.6.7.8", "0", "1800");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("mail.example.com", cf.get("name"));
        assertEquals(false, cf.get("proxied"));
    }

    @Test
    void skipsUrlRedirectRecords() {
        assertNull(DnsRecordMapper.toCloudflareDnsRecord(record("@", "URL", "http://example.com", "0", "1800"), "example.com"));
    }

    @Test
    void skipsUrl301Records() {
        assertNull(DnsRecordMapper.toCloudflareDnsRecord(record("@", "URL301", "http://example.com", "0", "1800"), "example.com"));
    }

    @Test
    void skipsFrameRecords() {
        assertNull(DnsRecordMapper.toCloudflareDnsRecord(record("@", "FRAME", "http://example.com", "0", "1800"), "example.com"));
    }

    @Test
    void mapsAaaaRecord() {
        var nc = record("@", "AAAA", "2001:db8::1", "0", "1800");
        var cf = DnsRecordMapper.toCloudflareDnsRecord(nc, "example.com");
        assertEquals("AAAA", cf.get("type"));
        assertEquals(true, cf.get("proxied"));
    }

    @Test
    void batchConvertsAndReportsSkipped() {
        var records = List.of(
                record("@", "A", "1.2.3.4", "0", "1800"),
                record("@", "URL301", "http://example.com", "0", "1800"),
                record("@", "MX", "mail.example.com.", "10", "1800"));
        var result = DnsRecordMapper.convertAll(records, "example.com");
        assertEquals(2, result.mapped().size());
        assertEquals(1, result.skipped().size());
        assertEquals("URL301", result.skipped().get(0).get("type"));
    }

    private static Map<String, Object> record(String name, String type, String address, String mxPref, String ttl) {
        var r = new LinkedHashMap<String, Object>();
        r.put("name", name);
        r.put("type", type);
        r.put("address", address);
        r.put("mxPref", mxPref);
        r.put("ttl", ttl);
        return r;
    }
}
