package training.clean.screening.usecases.shared;

import training.clean.screening.entities.DomainException;
import training.clean.screening.usecases.gateway.ConcurrentCaseUpdateException;

/**
 * Runs a case use case and turns its expected failures into presenter calls. The transaction has already rolled
 * back when the exception arrives here. Unexpected exceptions are not outcomes and propagate unchanged.
 */
public final class Outcomes {

    private Outcomes() {
    }

    public static void presentingFailures(CaseOutputBoundary presenter, Runnable useCase) {
        try {
            useCase.run();
        } catch (DomainException e) {
            if (e.isInvalidValue()) {
                presenter.presentInvalidRequest(e.rule(), e.getMessage());
            } else {
                presenter.presentRuleViolation(e.rule(), e.getMessage());
            }
        } catch (CaseNotFoundException e) {
            presenter.presentNotFound(e.caseId().toString());
        } catch (ConcurrentCaseUpdateException e) {
            presenter.presentConflict(e.caseId().toString());
        }
    }
}
