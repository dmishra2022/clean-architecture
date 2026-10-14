package training.worldcheck.screening.domain.event;

import java.time.Instant;
import java.util.UUID;

import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.MatchId;
import training.worldcheck.screening.domain.model.ProfileId;
import training.worldcheck.screening.domain.model.Resolution;

public record MatchResolved(UUID eventId, CaseId caseId, ClientGroupId clientGroup, Instant occurredAt,
                            MatchId matchId, ProfileId profileId, Resolution previous, Resolution resolution,
                            AnalystId analyst) implements DomainEvent {
}
