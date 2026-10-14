package training.worldcheck.screening.application.port.in;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import training.worldcheck.screening.domain.model.CountryCode;
import training.worldcheck.screening.domain.model.Match;
import training.worldcheck.screening.domain.model.ScreeningCase;

/**
 * What use cases return. Adapters get a flat, immutable view and never touch the aggregate,
 * so they cannot call domain behaviour outside a transaction.
 */
public record CaseView(
        String caseId,
        String clientGroup,
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
        List<MatchView> matches) {

    public record MatchView(
            String matchId,
            String profileId,
            String category,
            String matchedName,
            int score,
            String resolution,
            String rationale,
            String resolvedBy,
            Instant resolvedAt) {

        static MatchView of(Match m) {
            return new MatchView(m.id().toString(), m.profileId().value(), m.category().name(), m.matchedName(),
                    m.score().value(), m.resolution().name(),
                    m.rationale().map(r -> r.value()).orElse(null),
                    m.resolvedBy().map(Object::toString).orElse(null),
                    m.resolvedAt().orElse(null));
        }
    }

    public static CaseView of(ScreeningCase c) {
        return new CaseView(
                c.id().toString(),
                c.clientGroup().value(),
                c.party().name().value(),
                c.party().type().name(),
                c.party().dateOfBirth(),
                c.party().knownCountry().map(CountryCode::value).orElse(null),
                c.status().name(),
                c.outcome().map(Enum::name).orElse(null),
                c.screeningCount(),
                c.openedAt(),
                c.lastScreenedAt().orElse(null),
                c.closedAt().orElse(null),
                c.closedBy().map(Object::toString).orElse(null),
                c.matches().stream().map(MatchView::of).toList());
    }
}
