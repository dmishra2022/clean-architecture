package training.clean.screening.adapters.events;

import java.time.Instant;
import java.util.UUID;

/** One row of {@code outbox_event}. The id is the domain event id, so consumers can de-duplicate. */
public record OutboxRecord(
        UUID id,
        UUID aggregateId,
        String clientGroupId,
        String eventType,
        String payload,
        Instant occurredAt,
        Instant publishedAt) {
}
