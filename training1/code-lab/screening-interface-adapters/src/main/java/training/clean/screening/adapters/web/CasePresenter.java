package training.clean.screening.adapters.web;

import java.util.List;
import java.util.Map;

import training.clean.screening.adapters.web.CaseJson.MatchJson;
import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;

/**
 * Turns a use case's outcome into the REST view model. All HTTP knowledge about cases is here: status codes,
 * the Location header, problem details, labels and the actions a client may offer. Create one per request.
 */
public final class CasePresenter implements CaseOutputBoundary {

    private static final Map<String, String> STATUS_LABELS = Map.of(
            "CREATED", "Not screened yet",
            "PENDING_REVIEW", "Waiting for analyst review",
            "REVIEWED", "Reviewed, ready to close",
            "CLOSED", "Closed");

    private static final Map<String, String> CATEGORY_LABELS = Map.of(
            "SANCTIONS", "Sanctions",
            "PEP", "Politically exposed person",
            "LAW_ENFORCEMENT", "Law enforcement",
            "ADVERSE_MEDIA", "Adverse media");

    private ViewModel viewModel;

    @Override
    public void presentOpened(CaseResponse response, boolean newlyOpened) {
        CaseJson body = toJson(response);
        viewModel = newlyOpened ? ViewModel.created(locationOf(response), body) : ViewModel.ok(body);
    }

    @Override
    public void presentCase(CaseResponse response) {
        viewModel = ViewModel.ok(toJson(response));
    }

    @Override
    public void presentInvalidRequest(String rule, String message) {
        viewModel = ViewModel.problem(ProblemJson.of(400, "Invalid value", message, rule));
    }

    @Override
    public void presentRuleViolation(String rule, String message) {
        viewModel = ViewModel.problem(ProblemJson.of(422, "Business rule violated", message, rule));
    }

    @Override
    public void presentNotFound(String caseId) {
        viewModel = ViewModel.problem(ProblemJson.of(404, "Case not found", "Case not found: " + caseId, null));
    }

    @Override
    public void presentConflict(String caseId) {
        viewModel = ViewModel.problem(ProblemJson.of(409, "Concurrent update",
                "Case " + caseId + " was changed by someone else; reload and retry", "CONCURRENT_UPDATE"));
    }

    public ViewModel viewModel() {
        if (viewModel == null) {
            throw new IllegalStateException("The use case finished without presenting an outcome");
        }
        return viewModel;
    }

    static String locationOf(CaseResponse response) {
        return "/api/v1/client-groups/" + response.clientGroupId() + "/cases/" + response.caseId();
    }

    /** Offering an action is a presentation decision; the entities still enforce every rule when it is used. */
    static List<String> allowedActions(String status) {
        return switch (status) {
            case "CREATED" -> List.of("screen");
            case "PENDING_REVIEW" -> List.of("screen", "resolve");
            case "REVIEWED" -> List.of("screen", "resolve", "close");
            default -> List.of();
        };
    }

    private static CaseJson toJson(CaseResponse r) {
        return new CaseJson(r.caseId(), r.clientGroupId(), r.partyName(), r.entityType(), r.dateOfBirth(),
                r.country(), r.status(), STATUS_LABELS.getOrDefault(r.status(), r.status()), r.outcome(),
                r.screeningCount(), r.openedAt(), r.lastScreenedAt(), r.closedAt(), r.closedBy(),
                allowedActions(r.status()),
                r.matches().stream().map(CasePresenter::toJson).toList());
    }

    private static MatchJson toJson(CaseResponse.MatchResponse m) {
        return new MatchJson(m.matchId(), m.profileId(), m.category(),
                CATEGORY_LABELS.getOrDefault(m.category(), m.category()), m.matchedName(), m.score(),
                m.resolution(), m.rationale(), m.resolvedBy(), m.resolvedAt());
    }
}
