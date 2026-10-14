package training.worldcheck.screening.adapter.out.persistence;

import java.time.Instant;
import java.util.UUID;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;

@MappedEntity("case_match")
record MatchRow(
        @Id UUID id,
        UUID caseId,
        String profileId,
        String category,
        String matchedName,
        int score,
        String resolution,
        @Nullable String rationale,
        @Nullable String resolvedBy,
        @Nullable Instant resolvedAt) {
}
