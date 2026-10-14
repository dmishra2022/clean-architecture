package training.worldcheck.screening.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import training.worldcheck.screening.application.port.in.CaseView;
import training.worldcheck.screening.application.port.in.CloseCaseUseCase.CloseCaseCommand;
import training.worldcheck.screening.application.port.in.OpenCaseUseCase.OpenCaseCommand;
import training.worldcheck.screening.application.port.in.ResolveMatchUseCase.ResolveMatchCommand;
import training.worldcheck.screening.application.port.in.ScreenCaseUseCase.ScreenCaseCommand;
import training.worldcheck.screening.application.port.out.CaseRepository;
import training.worldcheck.screening.application.port.out.ConcurrentCaseUpdateException;
import training.worldcheck.screening.application.port.out.DomainEventOutbox;
import training.worldcheck.screening.application.port.out.IdempotencyStore;
import training.worldcheck.screening.application.port.out.ReferenceDataSource;
import training.worldcheck.screening.application.port.out.UnitOfWork;
import training.worldcheck.screening.domain.DomainException;
import training.worldcheck.screening.domain.TestProfiles;
import training.worldcheck.screening.domain.event.DomainEvent;
import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.CaseSnapshot;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.MatchId;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.ReferenceProfile;
import training.worldcheck.screening.domain.model.Resolution;
import training.worldcheck.screening.domain.model.ResolutionRationale;
import training.worldcheck.screening.domain.model.ScreeningCase;
import training.worldcheck.screening.domain.service.NameMatchingPolicy;

/**
 * Tests the use cases through their ports with hand-written fakes: no Micronaut, no database, milliseconds to run.
 * This is the payoff of the hexagon: the core is testable without its adapters.
 */
class CaseApplicationServiceTest {

    private static final ClientGroupId BANK_A = new ClientGroupId("bank-a");
    private static final ClientGroupId BANK_B = new ClientGroupId("bank-b");

    private final FakeCaseRepository repository = new FakeCaseRepository();
    private final FakeIdempotencyStore idempotency = new FakeIdempotencyStore();
    private final RecordingOutbox outbox = new RecordingOutbox();
    private final TrackingUnitOfWork unitOfWork = new TrackingUnitOfWork();
    private final StubReferenceData referenceData = new StubReferenceData(unitOfWork);
    private final CaseApplicationService service = new CaseApplicationService(repository, idempotency, referenceData,
            outbox, unitOfWork, new NameMatchingPolicy(80),
            Clock.fixed(Instant.parse("2026-10-11T09:00:00Z"), ZoneOffset.UTC));

    @Test
    void fullLifecycleWritesEveryEventToTheOutboxInOrder() {
        CaseView opened = service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null));
        CaseId id = CaseId.of(opened.caseId());

        CaseView screened = service.screen(new ScreenCaseCommand(BANK_A, id));
        String matchId = screened.matches().getFirst().matchId();
        service.resolve(new ResolveMatchCommand(BANK_A, id, MatchId.of(matchId), Resolution.POSITIVE,
                new ResolutionRationale("Same passport number as listing"), new AnalystId("alice")));
        CaseView closed = service.close(new CloseCaseCommand(BANK_A, id, new AnalystId("alice")));

        assertThat(closed.status()).isEqualTo("CLOSED");
        assertThat(closed.outcome()).isEqualTo("RISK_CONFIRMED");
        assertThat(outbox.events).extracting(DomainEvent::type)
                .containsExactly("CaseOpened", "CaseScreened", "MatchResolved", "CaseClosed");
    }

    @Test
    void sameIdempotencyKeyReturnsTheSameCaseAndRaisesNoNewEvents() {
        CaseView first = service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), "req-1"));
        CaseView second = service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), "req-1"));
        CaseView otherTenant = service.open(new OpenCaseCommand(BANK_B, TestProfiles.viktorAlbescu(), "req-1"));

        assertThat(second.caseId()).isEqualTo(first.caseId());
        assertThat(otherTenant.caseId()).isNotEqualTo(first.caseId());
        assertThat(outbox.events).hasSize(2);
    }

    @Test
    void anotherClientGroupCannotSeeOrChangeTheCase() {
        CaseId id = CaseId.of(service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null)).caseId());

        assertThat(service.find(BANK_B, id)).isEmpty();
        assertThatThrownBy(() -> service.screen(new ScreenCaseCommand(BANK_B, id)))
                .isInstanceOf(CaseNotFoundException.class);
    }

    @Test
    void referenceDataIsFetchedOutsideTheWriteTransaction() {
        CaseId id = CaseId.of(service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null)).caseId());
        service.screen(new ScreenCaseCommand(BANK_A, id));

        assertThat(referenceData.calledInsideWriteTransaction).isFalse();
    }

    @Test
    void aRuleViolationRollsBackTheWholeUnitOfWork() {
        CaseId id = CaseId.of(service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null)).caseId());
        int eventsBefore = outbox.events.size();

        assertThatThrownBy(() -> service.close(new CloseCaseCommand(BANK_A, id, new AnalystId("alice"))))
                .isInstanceOf(DomainException.class);

        assertThat(outbox.events).hasSize(eventsBefore);
        assertThat(service.find(BANK_A, id)).hasValueSatisfying(v -> assertThat(v.status()).isEqualTo("CREATED"));
    }

    @Test
    void staleWritesAreRejected() {
        CaseId id = CaseId.of(service.open(new OpenCaseCommand(BANK_A, TestProfiles.viktorAlbescu(), null)).caseId());
        ScreeningCase first = repository.findById(id).orElseThrow();
        ScreeningCase second = repository.findById(id).orElseThrow();
        repository.save(first);

        assertThatThrownBy(() -> repository.save(second)).isInstanceOf(ConcurrentCaseUpdateException.class);
    }

    /** Stores snapshots and bumps a version, like the JDBC adapter's optimistic lock. */
    static final class FakeCaseRepository implements CaseRepository {
        private final Map<CaseId, CaseSnapshot> store = new HashMap<>();

        @Override
        public Optional<ScreeningCase> findById(CaseId id) {
            return Optional.ofNullable(store.get(id)).map(ScreeningCase::rehydrate);
        }

        @Override
        public void save(ScreeningCase c) {
            CaseSnapshot incoming = c.snapshot();
            CaseSnapshot current = store.get(c.id());
            if (current != null && current.version() != incoming.version()) {
                throw new ConcurrentCaseUpdateException(c.id(), null);
            }
            long next = current == null ? 0 : current.version() + 1;
            store.put(c.id(), new CaseSnapshot(incoming.id(), incoming.clientGroup(), incoming.party(),
                    incoming.status(), incoming.outcome(), incoming.screeningCount(), incoming.openedAt(),
                    incoming.lastScreenedAt(), incoming.closedAt(), incoming.closedBy(), next, incoming.matches()));
        }

        Map<CaseId, CaseSnapshot> copy() {
            return new HashMap<>(store);
        }

        void restore(Map<CaseId, CaseSnapshot> state) {
            store.clear();
            store.putAll(state);
        }
    }

    static final class FakeIdempotencyStore implements IdempotencyStore {
        private final Map<String, CaseId> keys = new HashMap<>();

        @Override
        public Optional<CaseId> find(ClientGroupId clientGroup, String key) {
            return Optional.ofNullable(keys.get(clientGroup + ":" + key));
        }

        @Override
        public void remember(ClientGroupId clientGroup, String key, CaseId caseId) {
            keys.put(clientGroup + ":" + key, caseId);
        }
    }

    static final class RecordingOutbox implements DomainEventOutbox {
        private final List<DomainEvent> events = new ArrayList<>();

        @Override
        public void append(List<DomainEvent> newEvents) {
            events.addAll(newEvents);
        }
    }

    /** Snapshots the fakes before each write and restores them on failure: a rollback. */
    final class TrackingUnitOfWork implements UnitOfWork {
        boolean inWrite;

        @Override
        public <T> T write(Supplier<T> work) {
            Map<CaseId, CaseSnapshot> cases = repository.copy();
            int events = outbox.events.size();
            inWrite = true;
            try {
                return work.get();
            } catch (RuntimeException e) {
                repository.restore(cases);
                outbox.events.subList(events, outbox.events.size()).clear();
                throw e;
            } finally {
                inWrite = false;
            }
        }

        @Override
        public <T> T read(Supplier<T> work) {
            return work.get();
        }
    }

    static final class StubReferenceData implements ReferenceDataSource {
        private final TrackingUnitOfWork unitOfWork;
        boolean calledInsideWriteTransaction;

        StubReferenceData(TrackingUnitOfWork unitOfWork) {
            this.unitOfWork = unitOfWork;
        }

        @Override
        public List<ReferenceProfile> candidatesFor(Party party) {
            calledInsideWriteTransaction |= unitOfWork.inWrite;
            return List.of(TestProfiles.ALBESCU_SANCTIONED, TestProfiles.ALBESCU_NAMESAKE);
        }
    }
}
