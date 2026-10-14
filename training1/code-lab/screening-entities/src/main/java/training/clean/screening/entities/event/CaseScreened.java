package training.clean.screening.entities.event;

import java.time.Instant;
import java.util.UUID;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;

public record CaseScreened(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                           int newMatches, int totalMatches, int screeningCount) implements DomainEvent {
}
