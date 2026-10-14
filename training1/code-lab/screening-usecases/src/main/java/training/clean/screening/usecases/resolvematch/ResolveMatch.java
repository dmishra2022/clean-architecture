package training.clean.screening.usecases.resolvematch;

import training.clean.screening.usecases.shared.CaseOutputBoundary;

/** Input boundary: an analyst records a decision about one match, with a rationale for the audit trail. */
public interface ResolveMatch {

    void execute(ResolveMatchRequest request, CaseOutputBoundary presenter);
}
