package com.infrastructure.mcp;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

final class ProtectionSettings {

    private ProtectionSettings() {}

    record SettingAction(String name, String category, String settingId, Object value, boolean isCustomEndpoint) {
        static SettingAction setting(String name, String category, Object value) {
            return new SettingAction(name, category, name, value, false);
        }
        static SettingAction setting(String name, String category, String settingId, Object value) {
            return new SettingAction(name, category, settingId, value, false);
        }
        static SettingAction custom(String name, String category) {
            return new SettingAction(name, category, name, null, true);
        }
    }

    static List<SettingAction> allActions() {
        var actions = new ArrayList<SettingAction>();

        // SSL/TLS
        actions.add(SettingAction.setting("ssl", "SSL", "strict"));
        actions.add(SettingAction.setting("always_use_https", "SSL", "on"));
        actions.add(SettingAction.setting("automatic_https_rewrites", "SSL", "on"));
        actions.add(SettingAction.setting("tls_1_3", "SSL", "on"));
        actions.add(SettingAction.setting("min_tls_version", "SSL", "1.2"));
        actions.add(SettingAction.setting("security_header", "SSL", "security_header",
                Map.of("strict_transport_security", Map.of(
                        "enabled", true, "max_age", 15552000,
                        "include_subdomains", true, "nosniff", true))));

        // Security
        actions.add(SettingAction.setting("security_level", "Security", "medium"));
        actions.add(SettingAction.setting("browser_check", "Security", "on"));
        actions.add(SettingAction.setting("challenge_ttl", "Security", 1800));
        actions.add(SettingAction.setting("email_obfuscation", "Security", "on"));
        actions.add(SettingAction.setting("server_side_exclude", "Security", "on"));
        actions.add(SettingAction.setting("hotlink_protection", "Security", "on"));
        actions.add(SettingAction.custom("bot_fight_mode", "Security"));

        // DDoS
        actions.add(SettingAction.custom("ddos_managed_rulesets", "DDoS"));

        // DNSSEC
        actions.add(SettingAction.custom("dnssec", "DNSSEC"));

        // Speed
        actions.add(SettingAction.setting("minify", "Speed", Map.of("js", "on", "css", "on", "html", "on")));
        actions.add(SettingAction.setting("brotli", "Speed", "on"));
        actions.add(SettingAction.setting("early_hints", "Speed", "on"));
        actions.add(SettingAction.setting("http2", "Speed", "on"));
        actions.add(SettingAction.setting("http3", "Speed", "on"));

        // Caching
        actions.add(SettingAction.setting("cache_level", "Caching", "aggressive"));
        actions.add(SettingAction.setting("always_online", "Caching", "on"));
        actions.add(SettingAction.setting("crawler_hints", "Caching", "on"));

        // Network
        actions.add(SettingAction.setting("ipv6", "Network", "on"));
        actions.add(SettingAction.setting("websockets", "Network", "on"));
        actions.add(SettingAction.setting("opportunistic_encryption", "Network", "on"));
        actions.add(SettingAction.setting("opportunistic_onion", "Network", "on"));
        actions.add(SettingAction.setting("0rtt", "Network", "on"));

        return actions;
    }

    static List<SettingAction> checkableActions() {
        return allActions();
    }
}
