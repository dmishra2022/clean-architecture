package training.worldcheck.screening.application;

import training.worldcheck.screening.domain.model.CaseId;

/** Also thrown for cases that exist in another client group, so tenants cannot probe each other's ids. */
public class CaseNotFoundException extends RuntimeException {

    public CaseNotFoundException(CaseId caseId) {
        super("Case not found: " + caseId);
    }
}
