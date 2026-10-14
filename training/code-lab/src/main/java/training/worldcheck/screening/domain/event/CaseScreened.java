package training.worldcheck.screening.domain.event;

import java.time.Instant;
import java.util.UUID;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

public record CaseScreened(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                           int newMatches, int totalMatches, int screeningCount) implements DomainEvent {
}
