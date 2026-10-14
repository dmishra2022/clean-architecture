package training.clean.screening.usecases.screencase;

import training.clean.screening.usecases.shared.CaseOutputBoundary;

/** Input boundary: screen the case's party against the reference data. Safe to repeat (rescreening). */
public interface ScreenCase {

    void execute(ScreenCaseRequest request, CaseOutputBoundary presenter);
}
