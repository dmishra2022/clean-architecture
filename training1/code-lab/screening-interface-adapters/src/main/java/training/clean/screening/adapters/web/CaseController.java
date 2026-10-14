package training.clean.screening.adapters.web;

import java.util.List;
import java.util.function.Consumer;

import training.clean.screening.adapters.web.Forms.CloseCaseForm;
import training.clean.screening.adapters.web.Forms.OpenCaseForm;
import training.clean.screening.adapters.web.Forms.ResolveMatchForm;
import training.clean.screening.usecases.closecase.CloseCase;
import training.clean.screening.usecases.closecase.CloseCaseRequest;
import training.clean.screening.usecases.opencase.OpenCase;
import training.clean.screening.usecases.opencase.OpenCaseRequest;
import training.clean.screening.usecases.resolvematch.ResolveMatch;
import training.clean.screening.usecases.resolvematch.ResolveMatchRequest;
import training.clean.screening.usecases.screencase.ScreenCase;
import training.clean.screening.usecases.screencase.ScreenCaseRequest;
import training.clean.screening.usecases.viewcase.ViewCase;
import training.clean.screening.usecases.viewcase.ViewCaseRequest;

/**
 * Controller in Clean Architecture terms: it packs web input into a request model, picks the input boundary and
 * hands it a fresh presenter. It does not know Micronaut; the framework's endpoint calls it with plain values.
 * It depends on input-boundary interfaces only, never on the interactors.
 */
public final class CaseController {

    private final OpenCase openCase;
    private final ScreenCase screenCase;
    private final ResolveMatch resolveMatch;
    private final CloseCase closeCase;
    private final ViewCase viewCase;

    public CaseController(OpenCase openCase, ScreenCase screenCase, ResolveMatch resolveMatch, CloseCase closeCase,
                          ViewCase viewCase) {
        this.openCase = openCase;
        this.screenCase = screenCase;
        this.resolveMatch = resolveMatch;
        this.closeCase = closeCase;
        this.viewCase = viewCase;
    }

    public ViewModel open(String clientGroupId, String idempotencyKey, OpenCaseForm form) {
        if (form == null) {
            return malformed(List.of("body: required"));
        }
        List<String> errors = form.errors();
        if (!errors.isEmpty()) {
            return malformed(errors);
        }
        return present(p -> openCase.execute(new OpenCaseRequest(clientGroupId, idempotencyKey, form.name(),
                form.entityType(), form.dateOfBirth(), form.country()), p));
    }

    public ViewModel screen(String clientGroupId, String caseId) {
        return present(p -> screenCase.execute(new ScreenCaseRequest(clientGroupId, caseId), p));
    }

    public ViewModel resolve(String clientGroupId, String caseId, String matchId, ResolveMatchForm form) {
        if (form == null) {
            return malformed(List.of("body: required"));
        }
        List<String> errors = form.errors();
        if (!errors.isEmpty()) {
            return malformed(errors);
        }
        return present(p -> resolveMatch.execute(new ResolveMatchRequest(clientGroupId, caseId, matchId,
                form.resolution(), form.rationale(), form.analystId()), p));
    }

    public ViewModel close(String clientGroupId, String caseId, CloseCaseForm form) {
        if (form == null) {
            return malformed(List.of("body: required"));
        }
        List<String> errors = form.errors();
        if (!errors.isEmpty()) {
            return malformed(errors);
        }
        return present(p -> closeCase.execute(new CloseCaseRequest(clientGroupId, caseId, form.analystId()), p));
    }

    public ViewModel view(String clientGroupId, String caseId) {
        return present(p -> viewCase.execute(new ViewCaseRequest(clientGroupId, caseId), p));
    }

    private static ViewModel present(Consumer<CasePresenter> useCase) {
        CasePresenter presenter = new CasePresenter();
        useCase.accept(presenter);
        return presenter.viewModel();
    }

    private static ViewModel malformed(List<String> errors) {
        return ViewModel.problem(ProblemJson.malformed(errors));
    }
}
