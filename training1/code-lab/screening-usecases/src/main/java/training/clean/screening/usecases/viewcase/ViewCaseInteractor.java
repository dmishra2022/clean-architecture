package training.clean.screening.usecases.viewcase;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.shared.CaseLookup;
import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.shared.Outcomes;

public final class ViewCaseInteractor implements ViewCase {

    private final CaseGateway cases;
    private final TransactionRunner transactions;

    public ViewCaseInteractor(CaseGateway cases, TransactionRunner transactions) {
        this.cases = cases;
        this.transactions = transactions;
    }

    @Override
    public void execute(ViewCaseRequest request, CaseOutputBoundary presenter) {
        Outcomes.presentingFailures(presenter, () -> {
            ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
            CaseId caseId = CaseId.of(request.caseId());
            CaseResponse response = transactions.read(
                    () -> CaseResponse.from(CaseLookup.load(cases, clientGroup, caseId)));
            presenter.presentCase(response);
        });
    }
}
