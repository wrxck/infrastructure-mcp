package com.infrastructure.mcp;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.Set;

// http lets many sessions share one server instead of one jvm per session
record TransportConfig(boolean http, String bindHost, int port, Path authTokenFile) {

    static final int DEFAULT_PORT = 7402;
    private static final int MIN_TOKEN_LENGTH = 32;

    static TransportConfig fromArgs(String[] args) {
        String transport = "stdio";
        String bindHost = "127.0.0.1";
        int port = DEFAULT_PORT;
        Path tokenFile = null;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--transport" -> transport = nextArg(args, i++);
                case "--bind" -> bindHost = nextArg(args, i++);
                case "--port" -> port = Integer.parseInt(nextArg(args, i++));
                case "--auth-token-file" -> tokenFile = Path.of(nextArg(args, i++));
                default -> { }
            }
        }

        if (!transport.equals("stdio") && !transport.equals("http")) {
            throw new IllegalArgumentException("--transport must be stdio or http, not " + transport);
        }
        boolean http = transport.equals("http");
        if (http && tokenFile == null) {
            throw new IllegalArgumentException("--transport http needs --auth-token-file");
        }
        return new TransportConfig(http, bindHost, port, tokenFile);
    }

    // a token that every user can read, or guess, protects nothing
    String readToken() {
        try {
            Set<PosixFilePermission> perms = Files.getPosixFilePermissions(authTokenFile);
            if (perms.contains(PosixFilePermission.OTHERS_READ)) {
                throw new IllegalStateException(authTokenFile + " is readable by every user; chmod o-r it");
            }
            String token = Files.readString(authTokenFile).trim();
            if (token.length() < MIN_TOKEN_LENGTH) {
                throw new IllegalStateException(
                        "token in " + authTokenFile + " is shorter than " + MIN_TOKEN_LENGTH + " characters");
            }
            return token;
        } catch (IOException e) {
            throw new IllegalStateException("cannot read " + authTokenFile + ": " + e.getMessage(), e);
        }
    }

    private static String nextArg(String[] args, int i) {
        if (i + 1 >= args.length) {
            throw new IllegalArgumentException("Missing value for " + args[i]);
        }
        return args[i + 1];
    }
}
