package training.worldcheck.screening.domain.model;

import java.time.Instant;
import java.util.List;

/**
 * Persistence-neutral state of a {@link ScreeningCase} (memento). Repositories store and load this,
 * so the aggregate never needs setters or framework annotations.
 */
public record CaseSnapshot(
        CaseId id,
        ClientGroupId clientGroup,
        Party party,
        CaseStatus status,
        CaseOutcome outcome,
        int screeningCount,
        Instant openedAt,
        Instant lastScreenedAt,
        Instant closedAt,
        AnalystId closedBy,
        long version,
        List<MatchSnapshot> matches) {

    public CaseSnapshot {
        matches = List.copyOf(matches);
    }
}
