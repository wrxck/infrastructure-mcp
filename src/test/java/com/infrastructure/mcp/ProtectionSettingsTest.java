package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ProtectionSettingsTest {

    @Test
    void generatesAllSettingActions() {
        var actions = ProtectionSettings.allActions();
        assertFalse(actions.isEmpty());
        assertTrue(actions.size() >= 25, "Expected at least 25 settings, got " + actions.size());
    }

    @Test
    void sslSettingsPresent() {
        var actions = ProtectionSettings.allActions();
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("ssl") && "strict".equals(a.value())));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("always_use_https")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("automatic_https_rewrites")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("min_tls_version") && "1.2".equals(a.value())));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("tls_1_3") && "on".equals(a.value())));
    }

    @Test
    void securitySettingsPresent() {
        var actions = ProtectionSettings.allActions();
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("security_level") && "medium".equals(a.value())));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("browser_check")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("email_obfuscation")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("server_side_exclude")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("hotlink_protection")));
    }

    @Test
    void speedSettingsPresent() {
        var actions = ProtectionSettings.allActions();
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("brotli")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("early_hints")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("http2")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("http3")));
    }

    @Test
    void networkSettingsPresent() {
        var actions = ProtectionSettings.allActions();
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("ipv6")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("websockets")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("opportunistic_encryption")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("opportunistic_onion")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("0rtt")));
    }

    @Test
    void cachingSettingsPresent() {
        var actions = ProtectionSettings.allActions();
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("cache_level")));
        assertTrue(actions.stream().anyMatch(a -> a.name().equals("always_online")));
    }

    @Test
    void hstsSettingHasCorrectStructure() {
        var actions = ProtectionSettings.allActions();
        var hsts = actions.stream().filter(a -> a.name().equals("security_header")).findFirst();
        assertTrue(hsts.isPresent());
        assertEquals("security_header", hsts.get().settingId());
    }

    @Test
    void dnssecActionIsSeparateType() {
        var actions = ProtectionSettings.allActions();
        var dnssec = actions.stream().filter(a -> a.name().equals("dnssec")).findFirst();
        assertTrue(dnssec.isPresent());
        assertTrue(dnssec.get().isCustomEndpoint());
    }

    @Test
    void eachActionHasCategory() {
        for (var action : ProtectionSettings.allActions()) {
            assertNotNull(action.category(), "Action " + action.name() + " missing category");
            assertFalse(action.category().isBlank());
        }
    }
}
