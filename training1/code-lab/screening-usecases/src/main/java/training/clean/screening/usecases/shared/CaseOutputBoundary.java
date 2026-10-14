package training.clean.screening.usecases.shared;

/**
 * Output boundary of every use case that works on one case. The interactor calls exactly one of these methods
 * per execution, after its transaction has committed or rolled back. A presenter in the interface-adapters ring
 * implements it and decides what the outcome looks like (HTTP status, JSON, a screen, a report line).
 * <p>
 * Failures are outcomes too: the interactor reports them here instead of throwing them at the controller,
 * so no outer ring has to know the entities' exception types.
 */
public interface CaseOutputBoundary {

    /** A case was opened, or an idempotent retry found the case the same key opened before. */
    void presentOpened(CaseResponse response, boolean newlyOpened);

    void presentCase(CaseResponse response);

    /** The request contained a value the model cannot accept (rule {@code INVALID_VALUE}). */
    void presentInvalidRequest(String rule, String message);

    /** The request was well formed but the entities refused it (four-eyes, closed case, open matches, ...). */
    void presentRuleViolation(String rule, String message);

    /** The case does not exist for this client group. Deliberately indistinguishable from "does not exist". */
    void presentNotFound(String caseId);

    /** Another analyst changed the case since it was loaded. */
    void presentConflict(String caseId);
}
