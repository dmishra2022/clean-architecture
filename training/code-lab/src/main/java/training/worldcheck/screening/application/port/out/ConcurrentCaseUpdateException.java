package training.worldcheck.screening.application.port.out;

import training.worldcheck.screening.domain.model.CaseId;

/** Defined by the port so adapters translate their own locking failures into it. */
public class ConcurrentCaseUpdateException extends RuntimeException {

    public ConcurrentCaseUpdateException(CaseId caseId, Throwable cause) {
        super("Case " + caseId + " was changed by someone else; reload and retry", cause);
    }
}
