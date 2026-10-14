package training.worldcheck.screening.application.port.out;

import java.util.List;

import training.worldcheck.screening.domain.event.DomainEvent;

/**
 * Driven port: records events in the same transaction as the aggregate change. Delivery to other
 * contexts happens later and at least once, so a crash can never save a case without its events.
 */
public interface DomainEventOutbox {

    void append(List<DomainEvent> events);
}
