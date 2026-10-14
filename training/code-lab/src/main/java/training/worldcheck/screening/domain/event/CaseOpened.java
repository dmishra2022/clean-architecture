package training.worldcheck.screening.domain.event;

import java.time.Instant;
import java.util.UUID;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.EntityType;

public record CaseOpened(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                         EntityType entityType) implements DomainEvent {
}
