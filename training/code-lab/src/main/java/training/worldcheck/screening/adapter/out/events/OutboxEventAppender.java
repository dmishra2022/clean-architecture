package training.worldcheck.screening.adapter.out.events;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

import io.micronaut.json.JsonMapper;
import jakarta.inject.Singleton;
import training.worldcheck.screening.application.port.out.DomainEventOutbox;
import training.worldcheck.screening.domain.event.DomainEvent;

/** Writes events into the outbox table using the caller's transaction. */
@Singleton
class OutboxEventAppender implements DomainEventOutbox {

    private final OutboxRowRepository rows;
    private final JsonMapper json;

    OutboxEventAppender(OutboxRowRepository rows, JsonMapper json) {
        this.rows = rows;
        this.json = json;
    }

    @Override
    public void append(List<DomainEvent> events) {
        for (DomainEvent event : events) {
            rows.save(new OutboxRow(event.eventId(), event.caseId().value(), event.clientGroup().value(),
                    event.type(), toJson(event), event.occurredAt(), null));
        }
    }

    private String toJson(DomainEvent event) {
        try {
            return json.writeValueAsString(EventPayloads.of(event));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
