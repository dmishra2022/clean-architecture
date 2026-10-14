package training.clean.screening.usecases.resolvematch;

import java.time.Clock;

import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.MatchId;
import training.clean.screening.entities.model.Resolution;
import training.clean.screening.entities.model.ResolutionRationale;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.EventOutboxGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.shared.CaseLookup;
import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.shared.Outcomes;
import training.clean.screening.usecases.shared.RequestValues;

/** Four-eyes and every other resolution rule live in the aggregate; this class only orchestrates. */
public final class ResolveMatchInteractor implements ResolveMatch {

    private final CaseGateway cases;
    private final EventOutboxGateway outbox;
    private final TransactionRunner transactions;
    private final Clock clock;

    public ResolveMatchInteractor(CaseGateway cases, EventOutboxGateway outbox, TransactionRunner transactions,
                                  Clock clock) {
        this.cases = cases;
        this.outbox = outbox;
        this.transactions = transactions;
        this.clock = clock;
    }

    @Override
    public void execute(ResolveMatchRequest request, CaseOutputBoundary presenter) {
        Outcomes.presentingFailures(presenter, () -> {
            ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
            CaseId caseId = CaseId.of(request.caseId());
            MatchId matchId = MatchId.of(request.matchId());
            Resolution resolution = RequestValues.resolution(request.resolution());
            ResolutionRationale rationale = new ResolutionRationale(request.rationale());
            AnalystId analyst = new AnalystId(request.analystId());

            CaseResponse response = transactions.write(() -> {
                ScreeningCase screeningCase = CaseLookup.load(cases, clientGroup, caseId);
                screeningCase.resolveMatch(matchId, resolution, rationale, analyst, clock.instant());
                cases.save(screeningCase);
                outbox.append(screeningCase.pullEvents());
                return CaseResponse.from(screeningCase);
            });

            presenter.presentCase(response);
        });
    }
}
