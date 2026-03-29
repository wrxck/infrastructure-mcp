package com.infrastructure.mcp;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

final class DnsRecordMapper {

    private static final Set<String> UNMAPPABLE_TYPES = Set.of("URL", "URL301", "FRAME", "MXE");
    private static final Set<String> UNPROXIED_TYPES = Set.of("MX", "TXT", "SRV", "NS", "CAA", "SPF");
    private static final Set<String> PROXYABLE_TYPES = Set.of("A", "AAAA", "CNAME");
    private static final Set<String> MAIL_HOSTNAMES = Set.of("mail", "smtp", "imap", "pop", "pop3",
            "autodiscover", "autoconfig", "_dmarc", "_domainkey");

    private DnsRecordMapper() {}

    static Map<String, Object> toCloudflareDnsRecord(Map<String, Object> ncRecord, String zoneName) {
        String type = String.valueOf(ncRecord.get("type")).toUpperCase();
        if (UNMAPPABLE_TYPES.contains(type)) return null;

        String ncName = String.valueOf(ncRecord.get("name"));
        String address = String.valueOf(ncRecord.get("address"));
        String mxPref = String.valueOf(ncRecord.get("mxPref"));
        int ttl = 1800;
        try { ttl = Integer.parseInt(String.valueOf(ncRecord.get("ttl"))); }
        catch (NumberFormatException ignored) {}

        var cf = new LinkedHashMap<String, Object>();
        cf.put("type", type);
        cf.put("name", "@".equals(ncName) ? zoneName : ncName + "." + zoneName);
        cf.put("content", address);

        boolean proxied = shouldProxy(type, ncName);
        cf.put("proxied", proxied);
        cf.put("ttl", proxied ? 1 : Math.max(ttl, 120));

        if ("MX".equals(type) || "SRV".equals(type)) {
            try {
                int pref = Integer.parseInt(mxPref);
                cf.put("priority", pref > 0 ? pref : 10);
            } catch (NumberFormatException e) {
                cf.put("priority", 10);
            }
        }

        return cf;
    }

    static ConversionResult convertAll(List<Map<String, Object>> ncRecords, String zoneName) {
        var mapped = new ArrayList<Map<String, Object>>();
        var skipped = new ArrayList<Map<String, Object>>();
        for (var nc : ncRecords) {
            var cf = toCloudflareDnsRecord(nc, zoneName);
            if (cf != null) mapped.add(cf);
            else skipped.add(nc);
        }
        return new ConversionResult(mapped, skipped);
    }

    private static boolean shouldProxy(String type, String hostname) {
        if (UNPROXIED_TYPES.contains(type)) return false;
        if (!PROXYABLE_TYPES.contains(type)) return false;
        String lower = hostname.toLowerCase();
        if (MAIL_HOSTNAMES.contains(lower)) return false;
        for (String prefix : MAIL_HOSTNAMES) {
            if (lower.startsWith(prefix + ".")) return false;
        }
        return true;
    }

    record ConversionResult(List<Map<String, Object>> mapped, List<Map<String, Object>> skipped) {}
}
