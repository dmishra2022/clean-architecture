package training.worldcheck.screening.application;

import java.time.Clock;
import java.util.List;
import java.util.Optional;

import training.worldcheck.screening.application.port.in.CaseView;
import training.worldcheck.screening.application.port.in.CloseCaseUseCase;
import training.worldcheck.screening.application.port.in.FindCaseQuery;
import training.worldcheck.screening.application.port.in.OpenCaseUseCase;
import training.worldcheck.screening.application.port.in.ResolveMatchUseCase;
import training.worldcheck.screening.application.port.in.ScreenCaseUseCase;
import training.worldcheck.screening.application.port.out.CaseRepository;
import training.worldcheck.screening.application.port.out.DomainEventOutbox;
import training.worldcheck.screening.application.port.out.IdempotencyStore;
import training.worldcheck.screening.application.port.out.ReferenceDataSource;
import training.worldcheck.screening.application.port.out.UnitOfWork;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.ReferenceProfile;
import training.worldcheck.screening.domain.model.ScreeningCase;
import training.worldcheck.screening.domain.service.NameMatchingPolicy;

/**
 * Implements the use cases. It holds no business rules: it loads the aggregate, checks the tenant, calls one
 * domain method, saves, and hands the raised events to the outbox, all inside one unit of work.
 * Plain Java; Micronaut wires it in {@code config.ApplicationWiring}.
 */
public final class CaseApplicationService
        implements OpenCaseUseCase, ScreenCaseUseCase, ResolveMatchUseCase, CloseCaseUseCase, FindCaseQuery {

    private final CaseRepository cases;
    private final IdempotencyStore idempotency;
    private final ReferenceDataSource referenceData;
    private final DomainEventOutbox outbox;
    private final UnitOfWork unitOfWork;
    private final NameMatchingPolicy matchingPolicy;
    private final Clock clock;

    public CaseApplicationService(CaseRepository cases, IdempotencyStore idempotency, ReferenceDataSource referenceData,
                                  DomainEventOutbox outbox, UnitOfWork unitOfWork, NameMatchingPolicy matchingPolicy,
                                  Clock clock) {
        this.cases = cases;
        this.idempotency = idempotency;
        this.referenceData = referenceData;
        this.outbox = outbox;
        this.unitOfWork = unitOfWork;
        this.matchingPolicy = matchingPolicy;
        this.clock = clock;
    }

    @Override
    public CaseView open(OpenCaseCommand command) {
        return unitOfWork.write(() -> {
            if (command.idempotencyKey() != null) {
                Optional<CaseId> existing = idempotency.find(command.clientGroup(), command.idempotencyKey());
                if (existing.isPresent()) {
                    return CaseView.of(load(command.clientGroup(), existing.get()));
                }
            }
            ScreeningCase opened = ScreeningCase.open(CaseId.newId(), command.clientGroup(), command.party(),
                    clock.instant());
            CaseView view = commit(opened);
            if (command.idempotencyKey() != null) {
                idempotency.remember(command.clientGroup(), command.idempotencyKey(), opened.id());
            }
            return view;
        });
    }

    /**
     * The reference-data call can be slow and is remote, so it runs outside the database transaction.
     * Optimistic locking on save catches anyone who changed the case meanwhile.
     */
    @Override
    public CaseView screen(ScreenCaseCommand command) {
        Party party = unitOfWork.read(() -> load(command.clientGroup(), command.caseId()).party());
        List<ReferenceProfile> candidates = referenceData.candidatesFor(party);
        return unitOfWork.write(() -> {
            ScreeningCase screeningCase = load(command.clientGroup(), command.caseId());
            screeningCase.screen(candidates, matchingPolicy, clock.instant());
            return commit(screeningCase);
        });
    }

    @Override
    public CaseView resolve(ResolveMatchCommand command) {
        return unitOfWork.write(() -> {
            ScreeningCase screeningCase = load(command.clientGroup(), command.caseId());
            screeningCase.resolveMatch(command.matchId(), command.resolution(), command.rationale(), command.analyst(),
                    clock.instant());
            return commit(screeningCase);
        });
    }

    @Override
    public CaseView close(CloseCaseCommand command) {
        return unitOfWork.write(() -> {
            ScreeningCase screeningCase = load(command.clientGroup(), command.caseId());
            screeningCase.close(command.analyst(), clock.instant());
            return commit(screeningCase);
        });
    }

    @Override
    public Optional<CaseView> find(ClientGroupId clientGroup, CaseId caseId) {
        return unitOfWork.read(() -> cases.findById(caseId)
                .filter(c -> c.belongsTo(clientGroup))
                .map(CaseView::of));
    }

    private ScreeningCase load(ClientGroupId clientGroup, CaseId caseId) {
        return cases.findById(caseId)
                .filter(c -> c.belongsTo(clientGroup))
                .orElseThrow(() -> new CaseNotFoundException(caseId));
    }

    private CaseView commit(ScreeningCase screeningCase) {
        cases.save(screeningCase);
        outbox.append(screeningCase.pullEvents());
        return CaseView.of(screeningCase);
    }
}
