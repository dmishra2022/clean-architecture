package training.clean.screening.usecases.gateway;

import java.util.List;

import training.clean.screening.entities.event.DomainEvent;

/**
 * Records domain events for later publication. Implementations must write in the caller's transaction, so an
 * event is stored if and only if the state change that raised it is committed.
 */
public interface EventOutboxGateway {

    void append(List<DomainEvent> events);
}
