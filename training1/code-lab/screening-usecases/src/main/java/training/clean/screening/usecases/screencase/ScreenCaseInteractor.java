package training.clean.screening.usecases.screencase;

import java.time.Clock;
import java.util.List;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.entities.policy.NameMatchingPolicy;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.EventOutboxGateway;
import training.clean.screening.usecases.gateway.ReferenceDataGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.shared.CaseLookup;
import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.shared.Outcomes;

/**
 * Application rule: the reference-data call is remote and can be slow, so it runs outside the write transaction.
 * Optimistic locking on save catches anyone who changed the case in the meantime.
 */
public final class ScreenCaseInteractor implements ScreenCase {

    private final CaseGateway cases;
    private final ReferenceDataGateway referenceData;
    private final EventOutboxGateway outbox;
    private final TransactionRunner transactions;
    private final NameMatchingPolicy matchingPolicy;
    private final Clock clock;

    public ScreenCaseInteractor(CaseGateway cases, ReferenceDataGateway referenceData, EventOutboxGateway outbox,
                                TransactionRunner transactions, NameMatchingPolicy matchingPolicy, Clock clock) {
        this.cases = cases;
        this.referenceData = referenceData;
        this.outbox = outbox;
        this.transactions = transactions;
        this.matchingPolicy = matchingPolicy;
        this.clock = clock;
    }

    @Override
    public void execute(ScreenCaseRequest request, CaseOutputBoundary presenter) {
        Outcomes.presentingFailures(presenter, () -> {
            ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
            CaseId caseId = CaseId.of(request.caseId());

            Party party = transactions.read(() -> CaseLookup.load(cases, clientGroup, caseId).party());
            List<ReferenceProfile> candidates = referenceData.candidatesFor(party);

            CaseResponse response = transactions.write(() -> {
                ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
                screeningCase.screen(candidates, matchingPolicy, clock.instant());
                cases.save(screeningCase);
                outbox.append(screeningCase.pullEvents());
                return CaseResponse.from(screeningCase);
            });

            presenter.presentCase(response);
        });
    }
}
