package com.infrastructure.mcp;

import java.time.Instant;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Simple token-bucket rate limiter that enforces a maximum number of calls per minute.
 */
final class RateLimiter {

    private final int maxPerMinute;
    private final ConcurrentLinkedDeque<Instant> timestamps = new ConcurrentLinkedDeque<>();

    RateLimiter(int maxPerMinute) {
        if (maxPerMinute <= 0) {
            throw new IllegalArgumentException("maxPerMinute must be positive, got: " + maxPerMinute);
        }
        this.maxPerMinute = maxPerMinute;
    }

    /**
     * Records a call attempt. Throws {@link RateLimitException} if the rate limit has been exceeded.
     */
    void acquire() {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(60);

        // Purge entries older than 60 seconds
        timestamps.removeIf(t -> t.isBefore(cutoff));

        if (timestamps.size() >= maxPerMinute) {
            throw new RateLimitException(
                    "Rate limit exceeded: " + maxPerMinute + " requests per minute allowed, " +
                    "but " + timestamps.size() + " requests have already been made in the last 60 seconds");
        }

        timestamps.addLast(now);
    }

    /**
     * Thrown when the rate limit is exceeded.
     */
    static final class RateLimitException extends RuntimeException {
        RateLimitException(String message) {
            super(message);
        }
    }
}
