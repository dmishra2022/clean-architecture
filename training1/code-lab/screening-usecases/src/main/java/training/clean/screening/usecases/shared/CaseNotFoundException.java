package training.clean.screening.usecases.shared;

import training.clean.screening.entities.model.CaseId;

/** Thrown inside a use case to abort its transaction; never escapes the use cases ring. */
public class CaseNotFoundException extends RuntimeException {

    private final transient CaseId caseId;

    public CaseNotFoundException(CaseId caseId) {
        super("Case not found: " + caseId);
        this.caseId = caseId;
    }

    public CaseId caseId() {
        return caseId;
    }
}
