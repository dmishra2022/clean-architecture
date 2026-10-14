package training.clean.screening.usecases.opencase;

import java.time.Clock;
import java.util.Optional;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.EventOutboxGateway;
import training.clean.screening.usecases.gateway.IdempotencyGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.shared.CaseLookup;
import training.clean.screening.usecases.shared.CaseOutputBoundary;
import training.clean.screening.usecases.shared.CaseResponse;
import training.clean.screening.usecases.shared.Outcomes;
import training.clean.screening.usecases.shared.RequestValues;

/**
 * Application rule: a client may retry "open case" with the same idempotency key and must get the same case back,
 * never a duplicate. Everything about what a valid party or case is belongs to the entities.
 */
public final class OpenCaseInteractor implements OpenCase {

    private final CaseGateway cases;
    private final IdempotencyGateway idempotency;
    private final EventOutboxGateway outbox;
    private final TransactionRunner transactions;
    private final Clock clock;

    public OpenCaseInteractor(CaseGateway cases, IdempotencyGateway idempotency, EventOutboxGateway outbox,
                              TransactionRunner transactions, Clock clock) {
        this.cases = cases;
        this.idempotency = idempotency;
        this.outbox = outbox;
        this.transactions = transactions;
        this.clock = clock;
    }

    @Override
    public void execute(OpenCaseRequest request, CaseOutputBoundary presenter) {
        Outcomes.presentingFailures(presenter, () -> {
            ClientGroupId clientGroup = new ClientGroupId(request.clientGroupId());
            Party party = new Party(
                    new PartyName(request.name()),
                    RequestValues.entityType(request.entityType()),
                    request.dateOfBirth(),
                    CountryCode.ofNullable(request.country()));
            String key = RequestValues.optionalText(request.idempotencyKey());

            Opened result = transactions.write(() -> {
                if (key != null) {
                    Optional<CaseId> existing = idempotency.find(clientGroup, key);
                    if (existing.isPresent()) {
                        return new Opened(CaseResponse.from(CaseLookup.load(cases, clientGroup, existing.get())), false);
                    }
                }
                ScreeningCase opened = ScreeningCase.open(CaseId.newId(), clientGroup, party, clock.instant());
                cases.save(opened);
                outbox.append(opened.pullEvents());
                if (key != null) {
                    idempotency.remember(clientGroup, key, opened.id());
                }
                return new Opened(CaseResponse.from(opened), true);
            });

            presenter.presentOpened(result.response(), result.newlyOpened());
        });
    }

    private record Opened(CaseResponse response, boolean newlyOpened) {
    }
}
