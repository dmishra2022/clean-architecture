package training.clean.screening.usecases.closecase;

import java.time.Clock;

import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.EventOutboxGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.shared.CaseLookup;
import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.shared.Outcomes;

public final class CloseCaseInteractor implements CloseCase {

    private final CaseGateway cases;
    private final EventOutboxGateway outbox;
    private final TransactionRunner transactions;
    private final Clock clock;

    public CloseCaseInteractor(CaseGateway cases, EventOutboxGateway outbox, TransactionRunner transactions,
                               Clock clock) {
        this.cases = cases;
        this.outbox = outbox;
        this.transactions = transactions;
        this.clock = clock;
    }

    @Override
    public void execute(CloseCaseRequest request, CaseOutputBoundary presenter) {
        Outcomes.presentingFailures(presenter, () -> {
            ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
            CaseId caseId = CaseId.of(request.caseId());
            AnalystId analyst = new AnalystId(request.analystId());

            CaseResponse response = transactions.write(() -> {
                ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
                screeningCase.close(analyst, clock.instant());
                cases.save(screeningCase);
                outbox.append(screeningCase.pullEvents());
                return CaseResponse.from(screeningCase);
            });

            presenter.presentCase(response);
        });
    }
}
