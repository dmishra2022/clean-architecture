package training.worldcheck.screening.adapter.out.events;

import java.time.Instant;
import java.util.UUID;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;

/** The id is the domain event id, so consumers can de-duplicate at-least-once deliveries. */
@MappedEntity("outbox_event")
record OutboxRow(
        @Id UUID id,
        UUID aggregateId,
        String clientGroupId,
        String eventType,
        String payload,
        Instant occurredAt,
        @Nullable Instant publishedAt) {
}
