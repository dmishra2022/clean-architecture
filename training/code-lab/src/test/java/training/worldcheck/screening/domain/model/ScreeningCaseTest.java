package training.worldcheck.screening.domain.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import training.worldcheck.screening.domain.DomainException;
import training.worldcheck.screening.domain.TestProfiles;
import training.worldcheck.screening.domain.event.CaseClosed;
import training.worldcheck.screening.domain.event.CaseOpened;
import training.worldcheck.screening.domain.event.CaseScreened;
import training.worldcheck.screening.domain.event.DomainEvent;
import training.worldcheck.screening.domain.event.MatchResolved;
import training.worldcheck.screening.domain.service.NameMatchingPolicy;

class ScreeningCaseTest {

    private static final Instant T0 = Instant.parse("2026-10-11T09:00:00Z");
    private static final ClientGroupId BANK_A = new ClientGroupId("bank-a");
    private static final AnalystId ALICE = new AnalystId("alice");
    private static final AnalystId BOB = new AnalystId("bob");
    private static final ResolutionRationale SAME_PERSON =
            new ResolutionRationale("Passport number and DOB match the sanctions notice");
    private static final ResolutionRationale DIFFERENT_PERSON =
            new ResolutionRationale("Different DOB on certified passport copy");

    private final NameMatchingPolicy policy = new NameMatchingPolicy(80);

    @Test
    void openingRaisesCaseOpened() {
        ScreeningCase c = newCase();

        assertThat(c.status()).isEqualTo(CaseStatus.CREATED);
        assertThat(c.pullEvents()).singleElement().isInstanceOf(CaseOpened.class);
    }

    @Test
    void screeningKeepsOnlyHitsAboveThreshold() {
        ScreeningCase c = newCase();
        c.screen(List.of(TestProfiles.ALBESCU_SANCTIONED, TestProfiles.ALBESCU_NAMESAKE, TestProfiles.ORION), policy, T0);

        assertThat(c.matches()).extracting(Match::profileId).containsExactly(TestProfiles.ALBESCU_SANCTIONED.id());
        assertThat(c.status()).isEqualTo(CaseStatus.PENDING_REVIEW);
        assertThat(lastEvent(c)).isInstanceOfSatisfying(CaseScreened.class, e -> {
            assertThat(e.newMatches()).isEqualTo(1);
            assertThat(e.screeningCount()).isEqualTo(1);
        });
    }

    @Test
    void noHitsMeansReviewedStraightAway() {
        ScreeningCase c = newCase();
        c.screen(List.of(TestProfiles.ORION), policy, T0);

        assertThat(c.matches()).isEmpty();
        assertThat(c.status()).isEqualTo(CaseStatus.REVIEWED);
    }

    @Test
    void rescreeningKeepsResolutionsAndNeverDuplicates() {
        ScreeningCase c = screenedCase();
        Match match = c.matches().getFirst();
        c.resolveMatch(match.id(), Resolution.FALSE_POSITIVE, DIFFERENT_PERSON, ALICE, T0);

        c.screen(List.of(TestProfiles.ALBESCU_SANCTIONED), policy, T0.plusSeconds(60));

        assertThat(c.matches()).singleElement().satisfies(m -> {
            assertThat(m.id()).isEqualTo(match.id());
            assertThat(m.resolution()).isEqualTo(Resolution.FALSE_POSITIVE);
        });
        assertThat(c.status()).isEqualTo(CaseStatus.REVIEWED);
        assertThat(c.screeningCount()).isEqualTo(2);
    }

    @Test
    void matchesAreNeverRemovedWhenAProfileStopsMatching() {
        ScreeningCase c = screenedCase();
        c.screen(List.of(), policy, T0.plusSeconds(60));

        assertThat(c.matches()).hasSize(1);
    }

    @Test
    void everyResolutionNeedsARationaleAndCannotGoBackToUnresolved() {
        ScreeningCase c = screenedCase();
        MatchId id = c.matches().getFirst().id();

        assertRule(() -> c.resolveMatch(id, Resolution.POSITIVE, null, ALICE, T0), ScreeningCase.RESOLUTION_REQUIRED);
        assertRule(() -> c.resolveMatch(id, Resolution.UNRESOLVED, SAME_PERSON, ALICE, T0),
                ScreeningCase.RESOLUTION_REQUIRED);
        assertRule(() -> new ResolutionRationale("too short"), DomainException.INVALID_VALUE);
    }

    @Test
    void resolvingAnUnknownMatchFails() {
        ScreeningCase c = screenedCase();
        assertRule(() -> c.resolveMatch(MatchId.newId(), Resolution.POSITIVE, SAME_PERSON, ALICE, T0),
                ScreeningCase.MATCH_NOT_FOUND);
    }

    @Test
    void fourEyesTheConfirmingAnalystCannotDowngradeAPositive() {
        ScreeningCase c = screenedCase();
        MatchId id = c.matches().getFirst().id();
        c.resolveMatch(id, Resolution.POSITIVE, SAME_PERSON, ALICE, T0);

        assertRule(() -> c.resolveMatch(id, Resolution.FALSE_POSITIVE, DIFFERENT_PERSON, ALICE, T0),
                ScreeningCase.FOUR_EYES);

        c.resolveMatch(id, Resolution.FALSE_POSITIVE, DIFFERENT_PERSON, BOB, T0);
        assertThat(lastEvent(c)).isInstanceOfSatisfying(MatchResolved.class, e -> {
            assertThat(e.previous()).isEqualTo(Resolution.POSITIVE);
            assertThat(e.resolution()).isEqualTo(Resolution.FALSE_POSITIVE);
            assertThat(e.analyst()).isEqualTo(BOB);
        });
    }

    @Test
    void anUnscreenedCaseCannotClose() {
        assertRule(() -> newCase().close(ALICE, T0), ScreeningCase.NOT_SCREENED);
    }

    @Test
    void unresolvedAndPossibleMatchesBlockClosure() {
        ScreeningCase c = screenedCase();
        assertRule(() -> c.close(ALICE, T0), ScreeningCase.MATCHES_AWAITING_REVIEW);

        c.resolveMatch(c.matches().getFirst().id(), Resolution.POSSIBLE, SAME_PERSON, ALICE, T0);
        assertThat(c.status()).isEqualTo(CaseStatus.PENDING_REVIEW);
        assertRule(() -> c.close(ALICE, T0), ScreeningCase.MATCHES_AWAITING_REVIEW);
    }

    @Test
    void closingWithAPositiveConfirmsRisk() {
        ScreeningCase c = screenedCase();
        c.resolveMatch(c.matches().getFirst().id(), Resolution.POSITIVE, SAME_PERSON, ALICE, T0);
        c.close(ALICE, T0);

        assertThat(c.status()).isEqualTo(CaseStatus.CLOSED);
        assertThat(c.outcome()).contains(CaseOutcome.RISK_CONFIRMED);
        assertThat(lastEvent(c)).isInstanceOfSatisfying(CaseClosed.class,
                e -> assertThat(e.outcome()).isEqualTo(CaseOutcome.RISK_CONFIRMED));
    }

    @Test
    void closingWithOnlyFalsePositivesIsClear() {
        ScreeningCase c = screenedCase();
        c.resolveMatch(c.matches().getFirst().id(), Resolution.FALSE_POSITIVE, DIFFERENT_PERSON, ALICE, T0);
        c.close(ALICE, T0);

        assertThat(c.outcome()).contains(CaseOutcome.CLEAR);
    }

    @Test
    void aClosedCaseRejectsEveryCommand() {
        ScreeningCase c = newCase();
        c.screen(List.of(), policy, T0);
        c.close(ALICE, T0);

        assertRule(() -> c.screen(List.of(), policy, T0), ScreeningCase.CASE_CLOSED);
        assertRule(() -> c.close(ALICE, T0), ScreeningCase.CASE_CLOSED);
        assertRule(() -> c.resolveMatch(MatchId.newId(), Resolution.POSITIVE, SAME_PERSON, ALICE, T0),
                ScreeningCase.CASE_CLOSED);
    }

    @Test
    void snapshotRoundTripRestoresStateWithoutReplayingEvents() {
        ScreeningCase original = screenedCase();
        original.resolveMatch(original.matches().getFirst().id(), Resolution.POSITIVE, SAME_PERSON, ALICE, T0);

        ScreeningCase restored = ScreeningCase.rehydrate(original.snapshot());

        assertThat(restored.snapshot()).isEqualTo(original.snapshot());
        assertThat(restored.pullEvents()).isEmpty();
    }

    @Test
    void pullingEventsClearsThem() {
        ScreeningCase c = screenedCase();
        assertThat(c.pullEvents()).isNotEmpty();
        assertThat(c.pullEvents()).isEmpty();
    }

    private ScreeningCase newCase() {
        return ScreeningCase.open(CaseId.newId(), BANK_A, TestProfiles.viktorAlbescu(), T0);
    }

    private ScreeningCase screenedCase() {
        ScreeningCase c = newCase();
        c.screen(List.of(TestProfiles.ALBESCU_SANCTIONED), policy, T0);
        return c;
    }

    private static DomainEvent lastEvent(ScreeningCase c) {
        List<DomainEvent> events = c.pullEvents();
        return events.getLast();
    }

    private static void assertRule(Runnable action, String rule) {
        assertThatThrownBy(action::run)
                .isInstanceOf(DomainException.class)
                .satisfies(e -> assertThat(((DomainException) e).rule()).isEqualTo(rule));
    }
}
