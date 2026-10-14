package training.clean.screening.entities.event;

import java.time.Instant;
import java.util.UUID;

import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.MatchId;
import training.clean.screening.entities.model.ProfileId;
import training.clean.screening.entities.model.Resolution;

public record MatchResolved(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                            MatchId matchId, ProfileId profileId, Resolution previous, Resolution resolution,
                            AnalystId analyst) implements DomainEvent {
}
