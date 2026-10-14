package training.clean.screening.adapters.web;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * View model of a case for the analyst UI and API clients. Besides the data it carries presentation decisions:
 * a human label for the status and the actions the UI should offer next.
 */
public record CaseJson(
        String caseId,
        String clientGroupId,
        String partyName,
        String entityType,
        LocalDate dateOfBirth,
        String country,
        String status,
        String statusLabel,
        String outcome,
        int screeningCount,
        Instant openedAt,
        Instant lastScreenedAt,
        Instant closedAt,
        String closedBy,
        List<String> allowedActions,
        List<MatchJson> matches) {

    public record MatchJson(
            String matchId,
            String profileId,
            String category,
            String categoryLabel,
            String matchedName,
            int score,
            String resolution,
            String rationale,
            String resolvedBy,
            Instant resolvedAt) {
    }
}
