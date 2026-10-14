package training.clean.screening.adapters.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import training.clean.screening.adapters.web.Forms.CloseCaseForm;
import training.clean.screening.adapters.web.Forms.OpenCaseForm;
import training.clean.screening.adapters.web.Forms.ResolveMatchForm;
import training.clean.screening.usecases.opencase.OpenCaseRequest;
import training.clean.screening.usecases.shared.CaseResponse;

/**
 * The controller is tested with lambdas standing in for the input boundaries: it must pack the right request,
 * hand over a presenter and return whatever that presenter decided.
 */
class CaseControllerTest {

    private final List<Object> requests = new ArrayList<>();

    private final CaseController controller = new CaseController(
            (request, presenter) -> {
                requests.add(request);
                presenter.presentOpened(response(), true);
            },
            (request, presenter) -> requests.add(request),
            (request, presenter) -> requests.add(request),
            (request, presenter) -> requests.add(request),
            (request, presenter) -> {
                requests.add(request);
                presenter.presentNotFound(request.caseId());
            });

    @Test
    void aValidFormBecomesARequestModelAndThePresentersViewModelIsReturned() {
        ViewModel vm = controller.open("acme-bank", "key-1",
                new OpenCaseForm("Viktor Albescu", "INDIVIDUAL", LocalDate.of(1961, 3, 14), "RO"));

        assertThat(vm.status()).isEqualTo(201);
        assertThat(requests).containsExactly(new OpenCaseRequest("acme-bank", "key-1", "Viktor Albescu",
                "INDIVIDUAL", LocalDate.of(1961, 3, 14), "RO"));
    }

    @Test
    void aMalformedFormIs400AndNoUseCaseRuns() {
        ViewModel vm = controller.open("acme-bank", null, new OpenCaseForm(" ", "PERSON", null, "ROU"));

        ProblemJson problem = (ProblemJson) vm.body();
        assertThat(vm.status()).isEqualTo(400);
        assertThat(problem.rule()).isEqualTo(ProblemJson.MALFORMED_REQUEST);
        assertThat(problem.errors()).containsExactly(
                "name: must not be blank",
                "entityType: must be one of INDIVIDUAL, ORGANISATION",
                "country: must be two letters");
        assertThat(requests).isEmpty();
    }

    @Test
    void aMissingBodyIs400() {
        assertThat(controller.resolve("acme-bank", "c-1", "m-1", null).status()).isEqualTo(400);
        assertThat(controller.close("acme-bank", "c-1", null).status()).isEqualTo(400);
        assertThat(requests).isEmpty();
    }

    @Test
    void resolveFormsAreCheckedForShapeOnly() {
        ViewModel vm = controller.resolve("acme-bank", "c-1", "m-1", new ResolveMatchForm("UNRESOLVED", "", null));

        assertThat(((ProblemJson) vm.body()).errors()).containsExactly(
                "resolution: must be one of FALSE_POSITIVE, POSITIVE, POSSIBLE",
                "rationale: must not be blank",
                "analystId: must not be blank");
    }

    @Test
    void aFailureOutcomeIsReturnedAsTheViewModel() {
        assertThat(controller.view("acme-bank", "c-404").status()).isEqualTo(404);
    }

    @Test
    void aUseCaseThatPresentsNothingFailsLoudly() {
        org.assertj.core.api.Assertions.assertThatThrownBy(
                        () -> controller.close("acme-bank", "c-1", new CloseCaseForm("analyst-1")))
                .isInstanceOf(IllegalStateException.class);
    }

    private static CaseResponse response() {
        return new CaseResponse("c-1", "acme-bank", "Viktor Albescu", "INDIVIDUAL", null, "RO", "CREATED", null, 0,
                Instant.parse("2026-10-11T09:00:00Z"), null, null, null, List.of());
    }
}
