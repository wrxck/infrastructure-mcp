package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class NamecheapClientTest {

    private static final String DOMAIN_LIST_XML = """
            <?xml version="1.0" encoding="utf-8"?>
            <ApiResponse Status="OK">
              <CommandResponse>
                <DomainListResult>
                  <Domain Name="example.com" Expires="03/20/2027" IsExpired="false" AutoRenew="true" WhoisGuard="ENABLED"/>
                  <Domain Name="test.co.uk" Expires="01/15/2028" IsExpired="false" AutoRenew="false" WhoisGuard="NOTPRESENT"/>
                </DomainListResult>
                <Paging><TotalItems>2</TotalItems><CurrentPage>1</CurrentPage><PageSize>20</PageSize></Paging>
              </CommandResponse>
            </ApiResponse>
            """;

    private static final String DNS_HOSTS_XML = """
            <?xml version="1.0" encoding="utf-8"?>
            <ApiResponse Status="OK">
              <CommandResponse>
                <DomainDNSGetHostsResult Domain="example.com" IsUsingOurDNS="true">
                  <host HostId="1" Name="@" Type="A" Address="1.2.3.4" MXPref="0" TTL="1800" IsActive="true"/>
                  <host HostId="2" Name="www" Type="CNAME" Address="example.com." MXPref="0" TTL="1800" IsActive="true"/>
                  <host HostId="3" Name="@" Type="MX" Address="mail.example.com." MXPref="10" TTL="1800" IsActive="true"/>
                  <host HostId="4" Name="@" Type="TXT" Address="v=spf1 include:_spf.google.com ~all" MXPref="0" TTL="1800" IsActive="true"/>
                </DomainDNSGetHostsResult>
              </CommandResponse>
            </ApiResponse>
            """;

    private static final String NAMESERVERS_XML = """
            <?xml version="1.0" encoding="utf-8"?>
            <ApiResponse Status="OK">
              <CommandResponse>
                <DomainDNSGetListResult Domain="example.com" IsUsingOurDNS="true">
                  <Nameserver>dns1.registrar-servers.com</Nameserver>
                  <Nameserver>dns2.registrar-servers.com</Nameserver>
                </DomainDNSGetListResult>
              </CommandResponse>
            </ApiResponse>
            """;

    private static final String ERROR_XML = """
            <?xml version="1.0" encoding="utf-8"?>
            <ApiResponse Status="ERROR">
              <Errors><Error Number="2019166">Domain not found</Error></Errors>
            </ApiResponse>
            """;

    @Test
    void parsesDomainsListXml() {
        List<Map<String, Object>> domains = NamecheapClient.parseDomainsListResponse(DOMAIN_LIST_XML);

        assertEquals(2, domains.size());

        Map<String, Object> first = domains.get(0);
        assertEquals("example.com", first.get("Name"));
        assertEquals("03/20/2027", first.get("Expires"));
        assertEquals("false", first.get("IsExpired"));
        assertEquals("true", first.get("AutoRenew"));
        assertEquals("ENABLED", first.get("WhoisGuard"));

        Map<String, Object> second = domains.get(1);
        assertEquals("test.co.uk", second.get("Name"));
        assertEquals("01/15/2028", second.get("Expires"));
        assertEquals("false", second.get("IsExpired"));
        assertEquals("false", second.get("AutoRenew"));
        assertEquals("NOTPRESENT", second.get("WhoisGuard"));
    }

    @Test
    void parsesDnsHostsXml() {
        List<Map<String, Object>> hosts = NamecheapClient.parseDnsHostsResponse(DNS_HOSTS_XML);

        assertEquals(4, hosts.size());

        Map<String, Object> aRecord = hosts.get(0);
        assertEquals("1", aRecord.get("HostId"));
        assertEquals("@", aRecord.get("Name"));
        assertEquals("A", aRecord.get("Type"));
        assertEquals("1.2.3.4", aRecord.get("Address"));
        assertEquals("0", aRecord.get("MXPref"));
        assertEquals("1800", aRecord.get("TTL"));
        assertEquals("true", aRecord.get("IsActive"));

        Map<String, Object> cnameRecord = hosts.get(1);
        assertEquals("www", cnameRecord.get("Name"));
        assertEquals("CNAME", cnameRecord.get("Type"));
        assertEquals("example.com.", cnameRecord.get("Address"));

        Map<String, Object> mxRecord = hosts.get(2);
        assertEquals("MX", mxRecord.get("Type"));
        assertEquals("10", mxRecord.get("MXPref"));

        Map<String, Object> txtRecord = hosts.get(3);
        assertEquals("TXT", txtRecord.get("Type"));
        assertEquals("v=spf1 include:_spf.google.com ~all", txtRecord.get("Address"));
    }

    @Test
    void parsesNameserversXml() {
        Map<String, Object> result = NamecheapClient.parseNameserversResponse(NAMESERVERS_XML);

        @SuppressWarnings("unchecked")
        List<String> nameservers = (List<String>) result.get("Nameservers");
        assertNotNull(nameservers);
        assertEquals(2, nameservers.size());
        assertEquals("dns1.registrar-servers.com", nameservers.get(0));
        assertEquals("dns2.registrar-servers.com", nameservers.get(1));
    }

    @Test
    void detectsApiError() {
        NamecheapClient.NamecheapApiException ex = assertThrows(
                NamecheapClient.NamecheapApiException.class,
                () -> NamecheapClient.checkApiErrors(ERROR_XML)
        );

        assertTrue(ex.getMessage().contains("2019166"), "Exception should contain error code");
        assertTrue(ex.getMessage().contains("Domain not found"), "Exception should contain error message");
    }

    @Test
    void splitsDomainCorrectly() {
        assertArrayEquals(new String[]{"example", "com"}, NamecheapClient.splitDomain("example.com"));
        assertArrayEquals(new String[]{"example", "co.uk"}, NamecheapClient.splitDomain("example.co.uk"));
        assertArrayEquals(new String[]{"sub.example", "com"}, NamecheapClient.splitDomain("sub.example.com"));
    }
}
