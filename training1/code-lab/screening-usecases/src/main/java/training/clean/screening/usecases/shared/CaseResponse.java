package training.clean.screening.usecases.shared;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.Match;
import training.clean.screening.entities.model.ScreeningCase;

/**
 * Response model: what a case use case hands to its presenter. Plain data (strings, numbers, dates), no entity
 * types, so nothing outside this ring can call domain behaviour or depend on the shape of the aggregate.
 */
public record CaseResponse(
        String caseId,
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
        List<MatchResponse> matches) {

    public CaseResponse {
        matches = List.copyOf(matches);
    }

    public record MatchResponse(
            String matchId,
            String profileId,
            String category,
            String matchedName,
            int score,
            String resolution,
            String rationale,
            String resolvedBy,
            Instant resolvedAt) {

        static MatchResponse from(Match m) {
            return new MatchResponse(m.id().toString(), m.profileId().value(), m.category().name(), m.matchedName(),
                    m.score().value(), m.resolution().name(),
                    m.rationale().map(r -> r.value()).orElse(null),
                    m.resolvedBy().map(Object::toString).orElse(null),
                    m.resolvedAt().orElse(null));
        }
    }

    public static CaseResponse from(ScreeningCase c) {
        return new CaseResponse(
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
                c.matches().stream().map(MatchResponse::from).toList());
    }
}
