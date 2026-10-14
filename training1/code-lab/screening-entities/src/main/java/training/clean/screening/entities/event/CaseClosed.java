package training.clean.screening.entities.event;

import java.time.Instant;
import java.util.UUID;

import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.CaseOutcome;
import training.clean.screening.entities.model.ClientGroupId;

public record CaseClosed(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                         CaseOutcome outcome, AnalystId closedBy) implements DomainEvent {
}
