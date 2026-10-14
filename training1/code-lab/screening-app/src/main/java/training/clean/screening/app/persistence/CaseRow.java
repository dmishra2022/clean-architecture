package training.clean.screening.app.persistence;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;
import io.micronaut.data.annotation.Version;

/** Micronaut Data's view of {@code screening_case}. Mirrors the plain {@code CaseRecord} of ring 3. */
@MappedEntity("screening_case")
record CaseRow(
        @Id UUID id,
        String clientGroupId,
        String partyName,
        String entityType,
        @Nullable LocalDate dateOfBirth,
        @Nullable String country,
        String status,
        @Nullable String outcome,
        int screeningCount,
        Instant openedAt,
        @Nullable Instant lastScreenedAt,
        @Nullable Instant closedAt,
        @Nullable String closedBy,
        @Version Long version) {
}
