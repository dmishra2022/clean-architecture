package training.clean.screening.usecases.opencase;

import training.clean.screening.usecases.shared.CaseOutputBoundary;

/** Input boundary: open a new screening case for a party. Controllers depend on this, never on the interactor. */
public interface OpenCase {

    void execute(OpenCaseRequest request, CaseOutputBoundary presenter);
}
