package training.clean.screening.entities.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import training.clean.screening.entities.DomainException;
import training.clean.screening.entities.event.CaseClosed;
import training.clean.screening.entities.event.CaseOpened;
import training.clean.screening.entities.event.CaseScreened;
import training.clean.screening.entities.event.DomainEvent;
import training.clean.screening.entities.event.MatchResolved;
import training.clean.screening.entities.policy.MatchEvaluation;
import training.clean.screening.entities.policy.NameMatchingPolicy;

/**
 * Aggregate root for one screening unit of work. Everything that must be consistent in a single
 * transaction lives here; everything else is referenced by id.
 *
 * <h2>Invariants</h2>
 * <ol>
 *   <li>A closed case cannot be screened, resolved or closed again.</li>
 *   <li>At most one match per reference profile; rescreening keeps earlier resolutions.</li>
 *   <li>Matches are never removed, even if a profile stops matching (audit trail).</li>
 *   <li>A resolution must be final-or-possible (never back to UNRESOLVED) and carry a rationale.</li>
 *   <li>Four-eyes: the analyst who confirmed a POSITIVE cannot downgrade it; a second analyst must.</li>
 *   <li>A case can only close after at least one screening, with no UNRESOLVED or POSSIBLE matches.</li>
 *   <li>Status is derived from the matches, never set from outside.</li>
 * </ol>
 */
public final class ScreeningCase {

    public static final String CASE_CLOSED = "CASE_CLOSED";
    public static final String MATCH_NOT_FOUND = "MATCH_NOT_FOUND";
    public static final String RESOLUTION_REQUIRED = "RESOLUTION_REQUIRED";
    public static final String FOUR_EYES = "FOUR_EYES";
    public static final String NOT_SCREENED = "NOT_SCREENED";
    public static final String MATCHES_AWAITING_REVIEW = "MATCHES_AWAITING_REVIEW";

    private final CaseId id;
    private final ClientGroupId clientGroup;
    private final Party party;
    private final Instant openedAt;
    private final long version;
    private final Map<ProfileId, Match> matches = new LinkedHashMap<>();
    private final List<DomainEvent> pendingEvents = new ArrayList<>();

    private CaseStatus status;
    private CaseOutcome outcome;
    private int screeningCount;
    private Instant lastScreenedAt;
    private Instant closedAt;
    private AnalystId closedBy;

    private ScreeningCase(CaseId id, ClientGroupId clientGroup, Party party, Instant openedAt, long version) {
        this.id = Objects.requireNonNull(id, "id");
        this.clientGroup = Objects.requireNonNull(clientGroup, "client group");
        this.party = Objects.requireNonNull(party, "party");
        this.openedAt = Objects.requireNonNull(openedAt, "opened at");
        this.version = version;
    }

    public static ScreeningCase open(CaseId id, ClientGroupId clientGroup, Party party, Instant now) {
        ScreeningCase screeningCase = new ScreeningCase(id, clientGroup, party, now, 0);
        screeningCase.status = CaseStatus.CREATED;
        screeningCase.raise(new CaseOpened(UUID.randomUUID(), id, clientGroup, now, party.type()));
        return screeningCase;
    }

    public static ScreeningCase rehydrate(CaseSnapshot s) {
        ScreeningCase screeningCase = new ScreeningCase(s.id(), s.clientGroup(), s.party(), s.openedAt(), s.version());
        screeningCase.status = s.status();
        screeningCase.outcome = s.outcome();
        screeningCase.screeningCount = s.screeningCount();
        screeningCase.lastScreenedAt = s.lastScreenedAt();
        screeningCase.closedAt = s.closedAt();
        screeningCase.closedBy = s.closedBy();
        s.matches().forEach(m -> screeningCase.matches.put(m.profileId(), Match.restore(m)));
        return screeningCase;
    }

    /** Screens the party against candidate profiles. The policy decides what is a match; the case decides what to keep. */
    public void screen(Collection<ReferenceProfile> candidates, NameMatchingPolicy policy, Instant now) {
        requireOpen("screen");
        int newMatches = 0;
        for (ReferenceProfile profile : candidates) {
            Optional<MatchEvaluation> evaluation = policy.evaluate(party, profile);
            if (evaluation.isEmpty()) {
                continue;
            }
            MatchEvaluation hit = evaluation.get();
            Match existing = matches.get(profile.id());
            if (existing == null) {
                matches.put(profile.id(), Match.detected(profile.id(), profile.category(), hit.matchedName(), hit.score()));
                newMatches++;
            } else {
                existing.rescore(hit.score());
            }
        }
        screeningCount++;
        lastScreenedAt = now;
        recalculateStatus();
        raise(new CaseScreened(UUID.randomUUID(), id, clientGroup, now, newMatches, matches.size(), screeningCount));
    }

    public void resolveMatch(MatchId matchId, Resolution resolution, ResolutionRationale rationale,
                             AnalystId analyst, Instant now) {
        requireOpen("resolve a match on");
        Objects.requireNonNull(analyst, "analyst");
        if (resolution == null || resolution == Resolution.UNRESOLVED) {
            throw new DomainException(RESOLUTION_REQUIRED, "A resolution must be POSITIVE, POSSIBLE or FALSE_POSITIVE");
        }
        if (rationale == null) {
            throw new DomainException(RESOLUTION_REQUIRED, "A rationale is required for every resolution");
        }
        Match match = findMatch(matchId)
                .orElseThrow(() -> new DomainException(MATCH_NOT_FOUND, "No match " + matchId + " on case " + id));

        Resolution previous = match.resolution();
        boolean downgradingPositive = previous == Resolution.POSITIVE && resolution != Resolution.POSITIVE;
        if (downgradingPositive && match.resolvedBy().filter(analyst::equals).isPresent()) {
            throw new DomainException(FOUR_EYES,
                    "A confirmed positive can only be downgraded by a different analyst than " + analyst);
        }

        match.resolve(resolution, rationale, analyst, now);
        recalculateStatus();
        raise(new MatchResolved(UUID.randomUUID(), id, clientGroup, now, match.id(), match.profileId(), previous,
                resolution, analyst));
    }

    public void close(AnalystId analyst, Instant now) {
        requireOpen("close");
        Objects.requireNonNull(analyst, "analyst");
        if (screeningCount == 0) {
            throw new DomainException(NOT_SCREENED, "Case " + id + " has never been screened");
        }
        long awaiting = matches.values().stream().filter(m -> m.resolution().blocksClosure()).count();
        if (awaiting > 0) {
            throw new DomainException(MATCHES_AWAITING_REVIEW,
                    awaiting + " match(es) are unresolved or possible on case " + id);
        }
        outcome = matches.values().stream().anyMatch(m -> m.resolution() == Resolution.POSITIVE)
                ? CaseOutcome.RISK_CONFIRMED
                : CaseOutcome.CLEAR;
        status = CaseStatus.CLOSED;
        closedAt = now;
        closedBy = analyst;
        raise(new CaseClosed(UUID.randomUUID(), id, clientGroup, now, outcome, analyst));
    }

    /** Returns and clears events raised since the aggregate was loaded. Called once per transaction. */
    public List<DomainEvent> pullEvents() {
        List<DomainEvent> events = List.copyOf(pendingEvents);
        pendingEvents.clear();
        return events;
    }

    public CaseSnapshot snapshot() {
        return new CaseSnapshot(id, clientGroup, party, status, outcome, screeningCount, openedAt, lastScreenedAt,
                closedAt, closedBy, version, matches.values().stream().map(Match::snapshot).toList());
    }

    public boolean belongsTo(ClientGroupId group) {
        return clientGroup.equals(group);
    }

    public Optional<Match> findMatch(MatchId matchId) {
        return matches.values().stream().filter(m -> m.id().equals(matchId)).findFirst();
    }

    public CaseId id() {
        return id;
    }

    public ClientGroupId clientGroup() {
        return clientGroup;
    }

    public Party party() {
        return party;
    }

    public CaseStatus status() {
        return status;
    }

    public Optional<CaseOutcome> outcome() {
        return Optional.ofNullable(outcome);
    }

    public List<Match> matches() {
        return List.copyOf(matches.values());
    }

    public int screeningCount() {
        return screeningCount;
    }

    public Instant openedAt() {
        return openedAt;
    }

    public Optional<Instant> lastScreenedAt() {
        return Optional.ofNullable(lastScreenedAt);
    }

    public Optional<Instant> closedAt() {
        return Optional.ofNullable(closedAt);
    }

    public Optional<AnalystId> closedBy() {
        return Optional.ofNullable(closedBy);
    }

    /** Concurrency token from the store; the aggregate carries it but never interprets it. */
    public long version() {
        return version;
    }

    private void requireOpen(String action) {
        if (status == CaseStatus.CLOSED) {
            throw new DomainException(CASE_CLOSED, "Cannot " + action + " closed case " + id);
        }
    }

    private void recalculateStatus() {
        if (screeningCount == 0) {
            status = CaseStatus.CREATED;
        } else if (matches.values().stream().anyMatch(m -> m.resolution().blocksClosure())) {
            status = CaseStatus.PENDING_REVIEW;
        } else {
            status = CaseStatus.REVIEWED;
        }
    }

    private void raise(DomainEvent event) {
        pendingEvents.add(event);
    }
}
