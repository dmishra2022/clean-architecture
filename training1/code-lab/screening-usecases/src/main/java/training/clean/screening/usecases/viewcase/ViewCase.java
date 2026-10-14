package training.clean.screening.usecases.viewcase;

import training.clean.screening.usecases.shared.CaseOutputBoundary;

/** Input boundary: show one case to an analyst of the owning client group. */
public interface ViewCase {

    void execute(ViewCaseRequest request, CaseOutputBoundary presenter);
}
