package training.worldcheck.screening.adapter.out.events;

import java.time.Instant;
import java.util.UUID;

/** What leaves this bounded context: an id for de-duplication, a routing key, and the published-language JSON. */
public record IntegrationEvent(UUID eventId, String type, UUID caseId, String clientGroupId, Instant occurredAt,
                               String payload) {
}
