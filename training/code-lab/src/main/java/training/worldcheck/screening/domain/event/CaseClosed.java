package training.worldcheck.screening.domain.event;

import java.time.Instant;
import java.util.UUID;

import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.CaseOutcome;
import training.worldcheck.screening.domain.model.ClientGroupId;

public record CaseClosed(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                         CaseOutcome outcome, AnalystId closedBy) implements DomainEvent {
}
