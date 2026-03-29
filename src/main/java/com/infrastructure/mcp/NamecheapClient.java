package com.infrastructure.mcp;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * API client for Namecheap's XML API.
 */
class NamecheapClient {

    private static final String BASE_URL = "https://api.namecheap.com/xml.response";

    // Known multi-part TLDs (second-level domains that are registrar-level)
    private static final Set<String> MULTI_PART_TLDS = Set.of(
            "co.uk", "org.uk", "me.uk", "net.uk", "ltd.uk", "plc.uk",
            "co.nz", "net.nz", "org.nz", "school.nz", "geo.nz",
            "co.za", "org.za", "net.za", "edu.za",
            "com.au", "net.au", "org.au", "edu.au", "gov.au", "asn.au",
            "co.jp", "or.jp", "ne.jp", "ac.jp", "ad.jp", "ed.jp", "go.jp",
            "com.br", "net.br", "org.br", "edu.br", "gov.br",
            "com.mx", "net.mx", "org.mx",
            "com.ar", "net.ar", "org.ar",
            "com.cn", "net.cn", "org.cn", "edu.cn", "gov.cn",
            "com.sg", "net.sg", "org.sg", "edu.sg", "gov.sg",
            "com.hk", "net.hk", "org.hk",
            "com.tw", "net.tw", "org.tw",
            "co.in", "net.in", "org.in",
            "co.ke", "or.ke",
            "com.tr", "net.tr", "org.tr"
    );

    private final String apiUser;
    private final String apiKey;
    private final String clientIp;
    private final RateLimiter rateLimiter;
    private final HttpClient httpClient;

    NamecheapClient(String apiUser, String apiKey, String clientIp, RateLimiter rateLimiter) {
        this.apiUser = apiUser;
        this.apiKey = apiKey;
        this.clientIp = clientIp;
        this.rateLimiter = rateLimiter;
        this.httpClient = HttpClient.newHttpClient();
    }

    /**
     * Lists all domains, paginating through all pages.
     */
    List<Map<String, Object>> listDomains() {
        List<Map<String, Object>> all = new ArrayList<>();
        int page = 1;
        int pageSize = 100;

        while (true) {
            String url = buildUrl("namecheap.domains.getList",
                    "Page=" + page,
                    "PageSize=" + pageSize);
            String xml = get(url);
            checkApiErrors(xml);
            List<Map<String, Object>> page_results = parseDomainsListResponse(xml);
            all.addAll(page_results);

            // Check if there are more pages
            Document doc = parseXml(xml);
            NodeList pagingNodes = doc.getElementsByTagName("Paging");
            if (pagingNodes.getLength() == 0) break;
            Element paging = (Element) pagingNodes.item(0);
            int totalItems = Integer.parseInt(getElementText(paging, "TotalItems"));
            int currentPage = Integer.parseInt(getElementText(paging, "CurrentPage"));
            if (currentPage * pageSize >= totalItems) break;
            page++;
        }

        return all;
    }

    /**
     * Gets DNS host records for a domain.
     */
    List<Map<String, Object>> getDnsHosts(String domain) {
        String[] parts = splitDomain(domain);
        String url = buildUrl("namecheap.domains.dns.getHosts",
                "SLD=" + encode(parts[0]),
                "TLD=" + encode(parts[1]));
        String xml = get(url);
        checkApiErrors(xml);
        return parseDnsHostsResponse(xml);
    }

    /**
     * Gets the current nameservers for a domain.
     */
    Map<String, Object> getNameservers(String domain) {
        String[] parts = splitDomain(domain);
        String url = buildUrl("namecheap.domains.dns.getList",
                "SLD=" + encode(parts[0]),
                "TLD=" + encode(parts[1]));
        String xml = get(url);
        checkApiErrors(xml);
        return parseNameserversResponse(xml);
    }

    /**
     * Sets custom nameservers for a domain.
     */
    Map<String, Object> setNameservers(String domain, List<String> nameservers) {
        String[] parts = splitDomain(domain);
        String nsParam = "Nameservers=" + encode(String.join(",", nameservers));
        String url = buildUrl("namecheap.domains.dns.setCustom",
                "SLD=" + encode(parts[0]),
                "TLD=" + encode(parts[1]),
                nsParam);
        String xml = get(url);
        checkApiErrors(xml);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("Domain", domain);
        result.put("Nameservers", nameservers);
        result.put("Updated", true);
        return result;
    }

    // -------------------------------------------------------------------------
    // Package-private static parsing methods (testable without HTTP)
    // -------------------------------------------------------------------------

    /**
     * Parses the domain list XML response.
     */
    static List<Map<String, Object>> parseDomainsListResponse(String xml) {
        Document doc = parseXml(xml);
        NodeList domainNodes = doc.getElementsByTagName("Domain");
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < domainNodes.getLength(); i++) {
            Element el = (Element) domainNodes.item(i);
            Map<String, Object> domain = new LinkedHashMap<>();
            copyAttributes(el, domain, "Name", "Expires", "IsExpired", "AutoRenew", "WhoisGuard",
                    "IsLocked", "Created", "User", "IsOurDNS");
            result.add(domain);
        }
        return result;
    }

    /**
     * Parses DNS hosts XML response.
     */
    static List<Map<String, Object>> parseDnsHostsResponse(String xml) {
        Document doc = parseXml(xml);
        NodeList hostNodes = doc.getElementsByTagName("host");
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 0; i < hostNodes.getLength(); i++) {
            Element el = (Element) hostNodes.item(i);
            Map<String, Object> host = new LinkedHashMap<>();
            copyAttributes(el, host, "HostId", "Name", "Type", "Address", "MXPref", "TTL", "IsActive",
                    "IsDDNSEnabled", "FriendlyName");
            result.add(host);
        }
        return result;
    }

    /**
     * Parses nameservers XML response.
     */
    static Map<String, Object> parseNameserversResponse(String xml) {
        Document doc = parseXml(xml);
        NodeList resultNodes = doc.getElementsByTagName("DomainDNSGetListResult");
        Map<String, Object> result = new LinkedHashMap<>();

        if (resultNodes.getLength() > 0) {
            Element el = (Element) resultNodes.item(0);
            String domain = el.getAttribute("Domain");
            String isUsingOurDNS = el.getAttribute("IsUsingOurDNS");
            if (!domain.isEmpty()) result.put("Domain", domain);
            if (!isUsingOurDNS.isEmpty()) result.put("IsUsingOurDNS", isUsingOurDNS);

            NodeList nsNodes = el.getElementsByTagName("Nameserver");
            List<String> nameservers = new ArrayList<>();
            for (int i = 0; i < nsNodes.getLength(); i++) {
                nameservers.add(nsNodes.item(i).getTextContent().trim());
            }
            result.put("Nameservers", nameservers);
        }

        return result;
    }

    /**
     * Checks for API errors in the XML response and throws if found.
     */
    static void checkApiErrors(String xml) {
        Document doc = parseXml(xml);
        Element root = doc.getDocumentElement();
        String status = root.getAttribute("Status");
        if ("ERROR".equalsIgnoreCase(status)) {
            NodeList errorNodes = doc.getElementsByTagName("Error");
            if (errorNodes.getLength() > 0) {
                Element errorEl = (Element) errorNodes.item(0);
                String code = errorEl.getAttribute("Number");
                String message = errorEl.getTextContent().trim();
                throw new NamecheapApiException("[" + code + "] " + message);
            }
            throw new NamecheapApiException("Namecheap API returned ERROR status");
        }
    }

    /**
     * Splits a domain into SLD and TLD parts, handling multi-part TLDs.
     * <p>
     * Examples:
     * <ul>
     *   <li>"example.com" -> ["example", "com"]</li>
     *   <li>"example.co.uk" -> ["example", "co.uk"]</li>
     *   <li>"sub.example.com" -> ["sub.example", "com"]</li>
     * </ul>
     */
    static String[] splitDomain(String domain) {
        String[] parts = domain.split("\\.");
        if (parts.length < 2) {
            return new String[]{domain, ""};
        }

        // Try two-part TLD first (last two segments)
        if (parts.length >= 3) {
            String possibleTld = parts[parts.length - 2] + "." + parts[parts.length - 1];
            if (MULTI_PART_TLDS.contains(possibleTld)) {
                // SLD is everything before the two-part TLD
                String sld = String.join(".", java.util.Arrays.copyOf(parts, parts.length - 2));
                return new String[]{sld, possibleTld};
            }
        }

        // Default: single-part TLD (last segment)
        String tld = parts[parts.length - 1];
        String sld = String.join(".", java.util.Arrays.copyOf(parts, parts.length - 1));
        return new String[]{sld, tld};
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String buildUrl(String command, String... extraParams) {
        StringBuilder sb = new StringBuilder(BASE_URL);
        sb.append("?ApiUser=").append(encode(apiUser));
        sb.append("&ApiKey=").append(encode(apiKey));
        sb.append("&UserName=").append(encode(apiUser));
        sb.append("&ClientIp=").append(encode(clientIp));
        sb.append("&Command=").append(encode(command));
        for (String param : extraParams) {
            sb.append("&").append(param);
        }
        return sb.toString();
    }

    private String get(String url) {
        rateLimiter.acquire();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new NamecheapApiException("HTTP " + response.statusCode() + " from Namecheap API");
            }
            return response.body();
        } catch (IOException | InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new NamecheapApiException("HTTP request to Namecheap API failed: " + e.getMessage());
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static Document parseXml(String xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            // Disable DTD and external entity processing for security
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setExpandEntityReferences(false);

            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(new InputSource(new StringReader(xml)));
        } catch (Exception e) {
            throw new NamecheapApiException("Failed to parse XML response: " + e.getMessage());
        }
    }

    private static void copyAttributes(Element el, Map<String, Object> map, String... attrNames) {
        for (String name : attrNames) {
            String val = el.getAttribute(name);
            if (val != null && !val.isEmpty()) {
                map.put(name, val);
            }
        }
    }

    private static String getElementText(Element parent, String tagName) {
        NodeList nodes = parent.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) {
            return nodes.item(0).getTextContent().trim();
        }
        return "";
    }

    /**
     * Thrown when the Namecheap API returns an error response.
     */
    static final class NamecheapApiException extends RuntimeException {
        NamecheapApiException(String message) {
            super(message);
        }
    }
}
