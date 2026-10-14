package training.clean.screening.usecases.closecase;

import training.clean.screening.usecases.shared.CaseOutputBoundary;

/** Input boundary: close a fully reviewed case and record its outcome. */
public interface CloseCase {

    void execute(CloseCaseRequest request, CaseOutputBoundary presenter);
}
