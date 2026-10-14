package training.clean.screening.usecases.gateway;

import training.clean.screening.entities.model.CaseId;

/**
 * Part of the {@link CaseGateway} contract: the gateway translates its own optimistic-locking failure into this,
 * so use cases can react without knowing which database or library detected it.
 */
public class ConcurrentCaseUpdateException extends RuntimeException {

    private final transient CaseId caseId;

    public ConcurrentCaseUpdateException(CaseId caseId, Throwable cause) {
        super("Case " + caseId + " was changed by someone else; reload and retry", cause);
        this.caseId = caseId;
    }

    public CaseId caseId() {
        return caseId;
    }
}
