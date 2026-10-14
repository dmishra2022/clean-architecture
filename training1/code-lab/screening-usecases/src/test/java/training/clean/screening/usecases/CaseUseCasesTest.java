package training.clean.screening.usecases;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.usecases.closecase.CloseCaseRequest;
import training.clean.screening.usecases.gateway.ConcurrentCaseUpdateException;
import training.clean.screening.usecases.opencase.OpenCaseRequest;
import training.clean.screening.usecases.resolvematch.ResolveMatchRequest;
import training.clean.screening.usecases.screencase.ScreenCaseRequest;
import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.testsupport.RecordingPresenter;
import training.clean.screening.usecases.testsupport.TestWorld;
import training.clean.screening.usecases.viewcase.ViewCaseRequest;

/** The case use cases, driven through their input boundaries, observed through their output boundary. */
class CaseUseCasesTest {

    private final TestWorld world = new TestWorld();

    @Test
    void fullLifecycleRecordsEveryEventInOrder() {
        String caseId = open("bank-a", null).caseId();
        CaseResponse screened = screen("bank-a", caseId).response;
        String matchId = screened.matches().getFirst().matchId();

        RecordingPresenter resolved = present(p -> world.resolveMatch.execute(new ResolveMatchRequest(
                "bank-a", caseId, matchId, "POSITIVE", "Same passport number as the listing", "anna"), p));
        RecordingPresenter closed = present(p -> world.closeCase.execute(
                new CloseCaseRequest("bank-a", caseId, "anna"), p));

        assertThat(resolved.only()).isEqualTo("case");
        assertThat(closed.response.status()).isEqualTo("CLOSED");
        assertThat(closed.response.outcome()).isEqualTo("RISK_CONFIRMED");
        assertThat(world.outbox.types()).containsExactly("CaseOpened", "CaseScreened", "MatchResolved", "CaseClosed");
    }

    @Test
    void openingPresentsANewCase() {
        RecordingPresenter presenter = present(p -> world.openCase.execute(request("bank-a", null), p));

        assertThat(presenter.only()).isEqualTo("opened");
        assertThat(presenter.newlyOpened).isTrue();
        assertThat(presenter.response.status()).isEqualTo("CREATED");
    }

    @Test
    void sameIdempotencyKeyPresentsTheSameCaseAsAReplay() {
        CaseResponse first = open("bank-a", "onboarding-42");
        RecordingPresenter replay = present(p -> world.openCase.execute(request("bank-a", "onboarding-42"), p));
        CaseResponse otherTenant = open("bank-b", "onboarding-42");

        assertThat(replay.newlyOpened).isFalse();
        assertThat(replay.response.caseId()).isEqualTo(first.caseId());
        assertThat(otherTenant.caseId()).isNotEqualTo(first.caseId());
        assertThat(world.outbox.types()).containsExactly("CaseOpened", "CaseOpened");
    }

    @Test
    void invalidValuesArePresentedAndNothingIsStored() {
        RecordingPresenter presenter = present(p -> world.openCase.execute(new OpenCaseRequest(
                "bank-a", null, "Northwind Capital", "ORGANISATION", LocalDate.of(1990, 1, 1), null), p));
        RecordingPresenter unknownType = present(p -> world.openCase.execute(new OpenCaseRequest(
                "bank-a", null, "Viktor Albescu", "ROBOT", null, null), p));

        assertThat(presenter.only()).isEqualTo("invalid");
        assertThat(presenter.rule).isEqualTo("INVALID_VALUE");
        assertThat(unknownType.only()).isEqualTo("invalid");
        assertThat(world.cases.size()).isZero();
    }

    @Test
    void referenceDataIsFetchedOutsideTheWriteTransaction() {
        String caseId = open("bank-a", null).caseId();

        RecordingPresenter presenter = screen("bank-a", caseId);

        assertThat(presenter.response.matches()).extracting(CaseResponse.MatchResponse::profileId)
                .containsExactly("WC-1001");
        assertThat(world.referenceData.calledInsideWriteTransaction).isFalse();
    }

    @Test
    void anotherClientGroupGetsNotFoundForEveryUseCase() {
        String caseId = open("bank-a", null).caseId();

        assertThat(present(p -> world.viewCase.execute(new ViewCaseRequest("bank-b", caseId), p)).only())
                .isEqualTo("notFound");
        assertThat(screen("bank-b", caseId).only()).isEqualTo("notFound");
        assertThat(present(p -> world.closeCase.execute(new CloseCaseRequest("bank-b", caseId, "anna"), p)).only())
                .isEqualTo("notFound");
    }

    @Test
    void aRuleViolationIsPresentedAndRollsBackTheTransaction() {
        String caseId = open("bank-a", null).caseId();
        int eventsBefore = world.outbox.events.size();

        RecordingPresenter presenter = present(p -> world.closeCase.execute(
                new CloseCaseRequest("bank-a", caseId, "anna"), p));

        assertThat(presenter.only()).isEqualTo("violation");
        assertThat(presenter.rule).isEqualTo("NOT_SCREENED");
        assertThat(world.outbox.events).hasSize(eventsBefore);
        assertThat(view("bank-a", caseId).status()).isEqualTo("CREATED");
    }

    @Test
    void fourEyesIsEnforcedByTheEntityAndPresentedAsARuleViolation() {
        String caseId = open("bank-a", null).caseId();
        String matchId = screen("bank-a", caseId).response.matches().getFirst().matchId();
        resolve(caseId, matchId, "POSITIVE", "anna");

        RecordingPresenter downgrade = resolve(caseId, matchId, "FALSE_POSITIVE", "anna");
        RecordingPresenter secondAnalyst = resolve(caseId, matchId, "FALSE_POSITIVE", "ben");

        assertThat(downgrade.rule).isEqualTo("FOUR_EYES");
        assertThat(secondAnalyst.only()).isEqualTo("case");
    }

    @Test
    void anUnknownResolutionIsAnInvalidRequest() {
        String caseId = open("bank-a", null).caseId();
        String matchId = screen("bank-a", caseId).response.matches().getFirst().matchId();

        RecordingPresenter presenter = resolve(caseId, matchId, "MAYBE", "anna");

        assertThat(presenter.only()).isEqualTo("invalid");
    }

    @Test
    void aConcurrentUpdateIsPresentedAsAConflict() {
        String caseId = open("bank-a", null).caseId();
        world.cases.failNextSaveWith = new ConcurrentCaseUpdateException(CaseId.of(caseId), null);

        assertThat(screen("bank-a", caseId).only()).isEqualTo("conflict");
    }

    private CaseResponse open(String clientGroup, String key) {
        return present(p -> world.openCase.execute(request(clientGroup, key), p)).response;
    }

    private RecordingPresenter screen(String clientGroup, String caseId) {
        return present(p -> world.screenCase.execute(new ScreenCaseRequest(clientGroup, caseId), p));
    }

    private RecordingPresenter resolve(String caseId, String matchId, String resolution, String analyst) {
        return present(p -> world.resolveMatch.execute(new ResolveMatchRequest(
                "bank-a", caseId, matchId, resolution, "Reviewed against the passport copy", analyst), p));
    }

    private CaseResponse view(String clientGroup, String caseId) {
        return present(p -> world.viewCase.execute(new ViewCaseRequest(clientGroup, caseId), p)).response;
    }

    private static OpenCaseRequest request(String clientGroup, String key) {
        return new OpenCaseRequest(clientGroup, key, "Viktor Albescu", "INDIVIDUAL", LocalDate.of(1961, 3, 14), "RO");
    }

    private static RecordingPresenter present(java.util.function.Consumer<RecordingPresenter> useCase) {
        RecordingPresenter presenter = new RecordingPresenter();
        useCase.accept(presenter);
        return presenter;
    }
}
