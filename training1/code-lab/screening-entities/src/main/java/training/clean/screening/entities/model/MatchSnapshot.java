package training.clean.screening.entities.model;

import java.time.Instant;

/** Persistence-neutral state of a {@link Match}, used to store and restore the aggregate. */
public record MatchSnapshot(
        MatchId id,
        ProfileId profileId,
        RiskCategory category,
        String matchedName,
        MatchScore score,
        Resolution resolution,
        ResolutionRationale rationale,
        AnalystId resolvedBy,
        Instant resolvedAt) {
}
