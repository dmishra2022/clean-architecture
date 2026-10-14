package training.clean.screening.adapters.persistence;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** One row of {@code screening_case}, as plain data. The framework ring maps it to and from SQL. */
public record CaseRecord(
        UUID id,
        String clientGroupId,
        String partyName,
        String entityType,
        LocalDate dateOfBirth,
        String country,
        String status,
        String outcome,
        int screeningCount,
        Instant openedAt,
        Instant lastScreenedAt,
        Instant closedAt,
        String closedBy,
        long version) {
}
