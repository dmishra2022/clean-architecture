package training.clean.screening.adapters.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.shared.CaseResponse.MatchResponse;

class CasePresenterTest {

    private static final Instant NOW = Instant.parse("2026-10-11T09:00:00Z");

    private final CasePresenter presenter = new CasePresenter();

    @Test
    void aNewlyOpenedCaseIs201WithItsLocation() {
        presenter.presentOpened(response("CREATED", List.of()), true);

        ViewModel vm = presenter.viewModel();
        assertThat(vm.status()).isEqualTo(201);
        assertThat(vm.contentType()).isEqualTo(ViewModel.JSON);
        assertThat(vm.location()).isEqualTo("/api/v1/client-groups/acme-bank/cases/c-1");
        assertThat(((CaseJson) vm.body()).allowedActions()).containsExactly("screen");
    }

    @Test
    void anIdempotentReplayIs200WithoutLocation() {
        presenter.presentOpened(response("CREATED", List.of()), false);

        assertThat(presenter.viewModel().status()).isEqualTo(200);
        assertThat(presenter.viewModel().location()).isNull();
    }

    @Test
    void theViewModelCarriesLabelsAndNextActions() {
        MatchResponse match = new MatchResponse("m-1", "WC-1001", "SANCTIONS", "Viktor Ionel Albescu", 96,
                "UNRESOLVED", null, null, null);
        presenter.presentCase(response("PENDING_REVIEW", List.of(match)));

        CaseJson body = (CaseJson) presenter.viewModel().body();
        assertThat(body.statusLabel()).isEqualTo("Waiting for analyst review");
        assertThat(body.allowedActions()).containsExactly("screen", "resolve");
        assertThat(body.matches().getFirst().categoryLabel()).isEqualTo("Sanctions");
    }

    @Test
    void eachFailureKindHasItsOwnStatusAndRule() {
        assertProblem(p -> p.presentInvalidRequest("INVALID_VALUE", "bad name"), 400, "INVALID_VALUE");
        assertProblem(p -> p.presentRuleViolation("FOUR_EYES", "same analyst"), 422, "FOUR_EYES");
        assertProblem(p -> p.presentNotFound("c-9"), 404, null);
        assertProblem(p -> p.presentConflict("c-9"), 409, "CONCURRENT_UPDATE");
    }

    @Test
    void aClosedCaseOffersNoActions() {
        assertThat(CasePresenter.allowedActions("CLOSED")).isEmpty();
        assertThat(CasePresenter.allowedActions("REVIEWED")).containsExactly("screen", "resolve", "close");
    }

    @Test
    void readingTheViewModelBeforeAnyOutcomeIsAProgrammingError() {
        assertThatThrownBy(presenter::viewModel).isInstanceOf(IllegalStateException.class);
    }

    private static void assertProblem(java.util.function.Consumer<CasePresenter> outcome, int status, String rule) {
        CasePresenter p = new CasePresenter();
        outcome.accept(p);
        ViewModel vm = p.viewModel();
        assertThat(vm.status()).isEqualTo(status);
        assertThat(vm.contentType()).isEqualTo(ViewModel.PROBLEM_JSON);
        assertThat(((ProblemJson) vm.body()).status()).isEqualTo(status);
        assertThat(((ProblemJson) vm.body()).rule()).isEqualTo(rule);
    }

    private static CaseResponse response(String status, List<MatchResponse> matches) {
        return new CaseResponse("c-1", "acme-bank", "Viktor Albescu", "INDIVIDUAL", null, "RO", status, null,
                matches.isEmpty() ? 0 : 1, NOW, null, null, null, matches);
    }
}
