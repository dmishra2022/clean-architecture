package training.clean.screening.adapters.persistence;

import java.time.Instant;
import java.util.UUID;

/** One row of {@code case_match}. */
public record MatchRecord(
        UUID id,
        UUID caseId,
        String profileId,
        String category,
        String matchedName,
        int score,
        String resolution,
        String rationale,
        String resolvedBy,
        Instant resolvedAt) {
}
