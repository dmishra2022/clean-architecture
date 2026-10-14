package training.clean.screening.usecases.testsupport;

import java.util.ArrayList;
import java.util.List;

import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;

/** Records what the interactor told its presenter. Tests assert on outcomes, not on HTTP. */
public final class RecordingPresenter implements CaseOutputBoundary {

    public final List<String> calls = new ArrayList<>();
    public CaseResponse response;
    public Boolean newlyOpened;
    public String rule;

    @Override
    public void presentOpened(CaseResponse response, boolean newlyOpened) {
        calls.add("opened");
        this.response = response;
        this.newlyOpened = newlyOpened;
    }

    @Override
    public void presentCase(CaseResponse response) {
        calls.add("case");
        this.response = response;
    }

    @Override
    public void presentInvalidRequest(String rule, String message) {
        calls.add("invalid");
        this.rule = rule;
    }

    @Override
    public void presentRuleViolation(String rule, String message) {
        calls.add("violation");
        this.rule = rule;
    }

    @Override
    public void presentNotFound(String caseId) {
        calls.add("notFound");
    }

    @Override
    public void presentConflict(String caseId) {
        calls.add("conflict");
    }

    public String only() {
        if (calls.size() != 1) {
            throw new AssertionError("Expected exactly one presenter call but got " + calls);
        }
        return calls.getFirst();
    }
}
