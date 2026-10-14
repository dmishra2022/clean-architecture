package training.worldcheck.screening.adapter.in.rest;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import training.worldcheck.screening.application.port.in.CaseView;

/**
 * The public HTTP contract (open host service). Bean Validation checks shape here; business rules are
 * checked by the domain, so the two kinds of error stay distinguishable (400 vs 422).
 */
public final class ApiModels {

    private ApiModels() {
    }

    @Serdeable
    public record OpenCaseRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank @Pattern(regexp = "INDIVIDUAL|ORGANISATION") String entityType,
            @Nullable LocalDate dateOfBirth,
            @Nullable @Pattern(regexp = "[A-Za-z]{2}") String country) {
    }

    @Serdeable
    public record ResolveMatchRequest(
            @NotBlank @Pattern(regexp = "POSITIVE|POSSIBLE|FALSE_POSITIVE") String resolution,
            @NotBlank String rationale,
            @NotBlank String analystId) {
    }

    @Serdeable
    public record CloseCaseRequest(@NotBlank String analystId) {
    }

    @Serdeable
    public record MatchResponse(
            String matchId,
            String profileId,
            String category,
            String matchedName,
            int score,
            String resolution,
            @Nullable String rationale,
            @Nullable String resolvedBy,
            @Nullable Instant resolvedAt) {

        static MatchResponse of(CaseView.MatchView m) {
            return new MatchResponse(m.matchId(), m.profileId(), m.category(), m.matchedName(), m.score(),
                    m.resolution(), m.rationale(), m.resolvedBy(), m.resolvedAt());
        }
    }

    @Serdeable
    public record CaseResponse(
            String caseId,
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
            List<MatchResponse> matches) {

        static CaseResponse of(CaseView v) {
            return new CaseResponse(v.caseId(), v.clientGroup(), v.partyName(), v.entityType(), v.dateOfBirth(),
                    v.country(), v.status(), v.outcome(), v.screeningCount(), v.openedAt(), v.lastScreenedAt(),
                    v.closedAt(), v.closedBy(), v.matches().stream().map(MatchResponse::of).toList());
        }
    }

    /** RFC 9457 problem details, plus the domain rule code. */
    @Serdeable
    public record Problem(String type, String title, int status, String detail, @Nullable String rule) {
    }
}
