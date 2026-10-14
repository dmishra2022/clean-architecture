package training.clean.screening.adapters.events;

import java.util.List;

import training.clean.screening.entities.event.DomainEvent;
import training.clean.screening.usecases.gateway.EventOutboxGateway;

/** Writes each domain event as an outbox row in the published language, inside the use case's transaction. */
public final class OutboxEventGateway implements EventOutboxGateway {

    private final OutboxRecords records;

    public OutboxEventGateway(OutboxRecords records) {
        this.records = records;
    }

    @Override
    public void append(List<DomainEvent> events) {
        for (DomainEvent event : events) {
            records.insert(new OutboxRecord(event.eventId(), event.caseId().value(), event.clientGroup().value(),
                    event.type(), EventJson.of(event), event.occurredAt(), null));
        }
    }
}
