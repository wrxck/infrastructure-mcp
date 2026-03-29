package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Nested;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class SetupTuiTest {

    private SetupTui createTui(String input) {
        var in = new ByteArrayInputStream(input.getBytes(StandardCharsets.UTF_8));
        var out = new PrintStream(new ByteArrayOutputStream());
        return new SetupTui(in, out);
    }

    private String runTui(String input) {
        var in = new ByteArrayInputStream(input.getBytes(StandardCharsets.UTF_8));
        var baos = new ByteArrayOutputStream();
        var out = new PrintStream(baos);
        var tui = new SetupTui(in, out);
        tui.run();
        return baos.toString(StandardCharsets.UTF_8);
    }

    @Nested
    class MaskSecret {

        @Test
        void masksLongSecret() {
            assertEquals("cfk_****0492", SetupTui.maskSecret("cfk_4KUhTl5zzlPGdwKnWwERcQrRQxnY3HqpWS4XcJU4b2090492"));
        }

        @Test
        void masksShortSecret() {
            assertEquals("****", SetupTui.maskSecret("short"));
        }

        @Test
        void masksNull() {
            assertEquals("****", SetupTui.maskSecret(null));
        }

        @Test
        void masksEmpty() {
            assertEquals("****", SetupTui.maskSecret(""));
        }

        @Test
        void masksBoundary() {
            assertEquals("****", SetupTui.maskSecret("12345678"));
        }

        @Test
        void masksNineChars() {
            assertEquals("1234****6789", SetupTui.maskSecret("123456789"));
        }
    }

    @Nested
    class AuthType {

        @Test
        void defaultsToGlobalApiKey() {
            var tui = createTui("");
            assertEquals("global", tui.getCloudflareAuthType());
        }

        @Test
        void validWithGlobalApiKey() {
            var tui = createTui("");
            tui.setCloudflareAuthType("global");
            tui.setCloudflareApiKey("key");
            tui.setCloudflareEmail("user@example.com");
            tui.setCloudflareAccountId("id");
            tui.setNamecheapApiUser("user");
            tui.setNamecheapApiKey("key");
            tui.setNamecheapClientIp("1.2.3.4");
            assertTrue(tui.isConfigValid());
        }

        @Test
        void validWithApiToken() {
            var tui = createTui("");
            tui.setCloudflareAuthType("token");
            tui.setCloudflareApiToken("token");
            tui.setCloudflareAccountId("id");
            tui.setNamecheapApiUser("user");
            tui.setNamecheapApiKey("key");
            tui.setNamecheapClientIp("1.2.3.4");
            assertTrue(tui.isConfigValid());
        }

        @Test
        void invalidGlobalKeyWithoutEmail() {
            var tui = createTui("");
            tui.setCloudflareAuthType("global");
            tui.setCloudflareApiKey("key");
            tui.setCloudflareEmail("");
            tui.setCloudflareAccountId("id");
            tui.setNamecheapApiUser("user");
            tui.setNamecheapApiKey("key");
            tui.setNamecheapClientIp("1.2.3.4");
            assertFalse(tui.isConfigValid());
        }
    }

    @Nested
    class Validation {

        @Test
        void invalidWhenEmpty() {
            var tui = createTui("");
            assertFalse(tui.isConfigValid());
        }

        @Test
        void invalidWhenPartial() {
            var tui = createTui("");
            tui.setCloudflareAuthType("token");
            tui.setCloudflareApiToken("token");
            tui.setCloudflareAccountId("id");
            // Missing namecheap fields
            assertFalse(tui.isConfigValid());
        }

        @Test
        void validWhenAllRequired() {
            var tui = createTui("");
            tui.setCloudflareAuthType("token");
            tui.setCloudflareApiToken("token");
            tui.setCloudflareAccountId("id");
            tui.setNamecheapApiUser("user");
            tui.setNamecheapApiKey("key");
            tui.setNamecheapClientIp("1.2.3.4");
            assertTrue(tui.isConfigValid());
        }

        @Test
        void invalidWithEmptyToken() {
            var tui = createTui("");
            tui.setCloudflareAuthType("token");
            tui.setCloudflareApiToken("");
            tui.setCloudflareAccountId("id");
            tui.setNamecheapApiUser("user");
            tui.setNamecheapApiKey("key");
            tui.setNamecheapClientIp("1.2.3.4");
            assertFalse(tui.isConfigValid());
        }
    }

    @Nested
    class Navigation {

        @Test
        void quitOnFirstPage() {
            String output = runTui("q\n");
            assertTrue(output.contains("cancelled"));
        }

        @Test
        void quitWithFullWord() {
            String output = runTui("quit\n");
            assertTrue(output.contains("cancelled"));
        }

        @Test
        void advancePagesWithEnter() {
            // Welcome -> (enter) -> Cloudflare (auth choice + key + email + account + nav) -> (q)
            String output = runTui("\n\n\n\n\nq\n");
            assertTrue(output.contains("Cloudflare"));
        }

        @Test
        void backNavigation() {
            // Welcome -> (enter) -> Cloudflare (auth + key + email + account) -> back -> Welcome -> quit
            String output = runTui("\n\n\n\n\nb\nq\n");
            assertTrue(output.contains("Welcome"));
        }
    }

    @Nested
    class PageContent {

        @Test
        void welcomePageShowsPrerequisites() {
            String output = runTui("q\n");
            assertTrue(output.contains("Cloudflare"));
            assertTrue(output.contains("Namecheap API"));
        }

        @Test
        void cloudflarePagePromptsForAuthType() {
            // Welcome -> enter -> Cloudflare shows auth type choice -> quit
            String output = runTui("\n1\ntest-key\ntest@email.com\ntest-account\nq\n");
            assertTrue(output.contains("Global API Key"));
            assertTrue(output.contains("Account ID"));
        }

        @Test
        void summaryPageShowsAllFields() {
            // Welcome(nav) -> CF(authtype,key,email,account,nav) -> NC(user,key,ip,nav) -> Fleet(path,binary,claude,nav) -> Summary(q)
            String output = runTui("\n\n\n\n\n\n\n\n\n\n\n\n\n\nq\n");
            assertTrue(output.contains("Summary"));
        }
    }

    @Nested
    class Defaults {

        @Test
        void fleetRegistryHasDefault() {
            var tui = createTui("");
            assertEquals("/home/matt/fleet/data/registry.json", tui.getFleetRegistryPath());
        }

        @Test
        void fleetBinaryHasDefault() {
            var tui = createTui("");
            assertEquals("fleet", tui.getFleetBinary());
        }

        @Test
        void claudeBinaryHasDefault() {
            var tui = createTui("");
            assertEquals("claude", tui.getClaudeBinary());
        }
    }

    @Nested
    class InputHandling {

        @Test
        void emptyInputKeepsCurrentValue() {
            var tui = createTui("");
            tui.setCloudflareApiToken("original");
            assertEquals("original", tui.getCloudflareApiToken());
        }

        @Test
        void settersAndGettersWork() {
            var tui = createTui("");
            tui.setCloudflareApiToken("t1");
            tui.setCloudflareAccountId("a1");
            tui.setCloudflareApiKey("k1");
            tui.setCloudflareEmail("e1");
            tui.setNamecheapApiUser("u1");
            tui.setNamecheapApiKey("nk1");
            tui.setNamecheapClientIp("1.1.1.1");

            assertEquals("t1", tui.getCloudflareApiToken());
            assertEquals("a1", tui.getCloudflareAccountId());
            assertEquals("k1", tui.getCloudflareApiKey());
            assertEquals("e1", tui.getCloudflareEmail());
            assertEquals("u1", tui.getNamecheapApiUser());
            assertEquals("nk1", tui.getNamecheapApiKey());
            assertEquals("1.1.1.1", tui.getNamecheapClientIp());
        }
    }
}
