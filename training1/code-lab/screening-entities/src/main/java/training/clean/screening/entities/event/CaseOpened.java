package training.clean.screening.entities.event;

import java.time.Instant;
import java.util.UUID;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.EntityType;

public record CaseOpened(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                         EntityType entityType) implements DomainEvent {
}
