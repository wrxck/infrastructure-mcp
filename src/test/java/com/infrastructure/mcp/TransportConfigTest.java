package com.infrastructure.mcp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;

import static org.junit.jupiter.api.Assertions.*;

class TransportConfigTest {

    @Test
    void defaults_to_stdio() {
        TransportConfig config = TransportConfig.fromArgs(new String[]{});
        assertFalse(config.http());
        assertEquals("127.0.0.1", config.bindHost());
        assertEquals(7402, config.port());
    }

    @Test
    void parses_http_options() {
        TransportConfig config = TransportConfig.fromArgs(new String[]{
                "--transport", "http", "--bind", "127.0.0.2", "--port", "7500",
                "--auth-token-file", "/run/credentials/x/token", "--unrelated", "value"});
        assertTrue(config.http());
        assertEquals("127.0.0.2", config.bindHost());
        assertEquals(7500, config.port());
        assertEquals(Path.of("/run/credentials/x/token"), config.authTokenFile());
    }

    @Test
    void rejects_unknown_transport() {
        assertThrows(IllegalArgumentException.class,
                () -> TransportConfig.fromArgs(new String[]{"--transport", "sse"}));
    }

    @Test
    void http_requires_a_token_file() {
        assertThrows(IllegalArgumentException.class,
                () -> TransportConfig.fromArgs(new String[]{"--transport", "http"}));
    }

    @Test
    void reads_and_trims_the_token(@TempDir Path dir) throws IOException {
        Path file = dir.resolve("token");
        Files.writeString(file, "  s3cret-token-value-0123456789abcdef\n");
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        TransportConfig config = TransportConfig.fromArgs(new String[]{
                "--transport", "http", "--auth-token-file", file.toString()});
        assertEquals("s3cret-token-value-0123456789abcdef", config.readToken());
    }

    @Test
    void refuses_a_world_readable_token(@TempDir Path dir) throws IOException {
        Path file = dir.resolve("token");
        Files.writeString(file, "s3cret-token-value-0123456789abcdef");
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-r--r--"));
        TransportConfig config = TransportConfig.fromArgs(new String[]{
                "--transport", "http", "--auth-token-file", file.toString()});
        assertThrows(IllegalStateException.class, config::readToken);
    }

    @Test
    void refuses_a_short_token(@TempDir Path dir) throws IOException {
        Path file = dir.resolve("token");
        Files.writeString(file, "short");
        Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
        TransportConfig config = TransportConfig.fromArgs(new String[]{
                "--transport", "http", "--auth-token-file", file.toString()});
        assertThrows(IllegalStateException.class, config::readToken);
    }
}
