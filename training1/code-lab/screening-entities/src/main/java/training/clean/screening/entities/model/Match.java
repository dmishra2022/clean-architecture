package training.clean.screening.entities.model;

import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

/**
 * Entity inside the {@link ScreeningCase} aggregate. It has identity, but no public mutators:
 * only the aggregate root can change it, so the root can enforce the case-level rules.
 */
public final class Match {

    private final MatchId id;
    private final ProfileId profileId;
    private final RiskCategory category;
    private final String matchedName;
    private MatchScore score;
    private Resolution resolution;
    private ResolutionRationale rationale;
    private AnalystId resolvedBy;
    private Instant resolvedAt;

    private Match(MatchId id, ProfileId profileId, RiskCategory category, String matchedName, MatchScore score,
                  Resolution resolution, ResolutionRationale rationale, AnalystId resolvedBy, Instant resolvedAt) {
        this.id = Objects.requireNonNull(id);
        this.profileId = Objects.requireNonNull(profileId);
        this.category = Objects.requireNonNull(category);
        this.matchedName = Objects.requireNonNull(matchedName);
        this.score = Objects.requireNonNull(score);
        this.resolution = Objects.requireNonNull(resolution);
        this.rationale = rationale;
        this.resolvedBy = resolvedBy;
        this.resolvedAt = resolvedAt;
    }

    static Match detected(ProfileId profileId, RiskCategory category, String matchedName, MatchScore score) {
        return new Match(MatchId.newId(), profileId, category, matchedName, score, Resolution.UNRESOLVED,
                null, null, null);
    }

    static Match restore(MatchSnapshot s) {
        return new Match(s.id(), s.profileId(), s.category(), s.matchedName(), s.score(), s.resolution(),
                s.rationale(), s.resolvedBy(), s.resolvedAt());
    }

    void resolve(Resolution newResolution, ResolutionRationale why, AnalystId analyst, Instant at) {
        this.resolution = newResolution;
        this.rationale = why;
        this.resolvedBy = analyst;
        this.resolvedAt = at;
    }

    void rescore(MatchScore newScore) {
        this.score = newScore;
    }

    MatchSnapshot snapshot() {
        return new MatchSnapshot(id, profileId, category, matchedName, score, resolution, rationale, resolvedBy,
                resolvedAt);
    }

    public MatchId id() {
        return id;
    }

    public ProfileId profileId() {
        return profileId;
    }

    public RiskCategory category() {
        return category;
    }

    public String matchedName() {
        return matchedName;
    }

    public MatchScore score() {
        return score;
    }

    public Resolution resolution() {
        return resolution;
    }

    public Optional<ResolutionRationale> rationale() {
        return Optional.ofNullable(rationale);
    }

    public Optional<AnalystId> resolvedBy() {
        return Optional.ofNullable(resolvedBy);
    }

    public Optional<Instant> resolvedAt() {
        return Optional.ofNullable(resolvedAt);
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Match other && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return id.hashCode();
    }
}
