package training.clean.screening.usecases.testsupport;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

import training.clean.screening.entities.event.DomainEvent;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.CaseSnapshot;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.ProfileId;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.entities.model.RiskCategory;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.entities.policy.NameMatchingPolicy;
import training.clean.screening.usecases.closecase.CloseCaseInteractor;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.ConcurrentCaseUpdateException;
import training.clean.screening.usecases.gateway.EventOutboxGateway;
import training.clean.screening.usecases.gateway.IdempotencyGateway;
import training.clean.screening.usecases.gateway.ReferenceDataGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.opencase.OpenCaseInteractor;
import training.clean.screening.usecases.resolvematch.ResolveMatchInteractor;
import training.clean.screening.usecases.screencase.ScreenCaseInteractor;
import training.clean.screening.usecases.viewcase.ViewCaseInteractor;

/**
 * Every gateway as a hand-written in-memory fake, plus the interactors wired to them. This is the payoff of the
 * dependency rule: the use cases run in milliseconds with no framework, database or network.
 */
public final class TestWorld {

    public static final Instant NOW = Instant.parse("2026-10-11T09:00:00Z");

    public static final ReferenceProfile SANCTIONED_ALBESCU = new ReferenceProfile(new ProfileId("WC-1001"),
            "Viktor Ionel Albescu", List.of("Victor Albescu"), EntityType.INDIVIDUAL, RiskCategory.SANCTIONS,
            LocalDate.of(1961, 3, 14), new CountryCode("RO"));

    public final Cases cases = new Cases();
    public final Keys keys = new Keys();
    public final Outbox outbox = new Outbox();
    public final Transactions transactions = new Transactions();
    public final ReferenceData referenceData = new ReferenceData(List.of(SANCTIONED_ALBESCU));
    public final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    public final NameMatchingPolicy policy = new NameMatchingPolicy(80);

    public final OpenCaseInteractor openCase = new OpenCaseInteractor(cases, keys, outbox, transactions, clock);
    public final ScreenCaseInteractor screenCase =
            new ScreenCaseInteractor(cases, referenceData, outbox, transactions, policy, clock);
    public final ResolveMatchInteractor resolveMatch = new ResolveMatchInteractor(cases, outbox, transactions, clock);
    public final CloseCaseInteractor closeCase = new CloseCaseInteractor(cases, outbox, transactions, clock);
    public final ViewCaseInteractor viewCase = new ViewCaseInteractor(cases, transactions);

    /** Stores snapshots and bumps a version on every save, like the real gateway's optimistic lock. */
    public static final class Cases implements CaseGateway {
        private final Map<CaseId, CaseSnapshot> store = new HashMap<>();
        public RuntimeException failNextSaveWith;

        @Override
        public Optional<ScreeningCase> findById(CaseId id) {
            return Optional.ofNullable(store.get(id)).map(ScreeningCase::rehydrate);
        }

        @Override
        public void save(ScreeningCase c) {
            if (failNextSaveWith != null) {
                RuntimeException e = failNextSaveWith;
                failNextSaveWith = null;
                throw e;
            }
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

        public int size() {
            return store.size();
        }
    }

    public static final class Keys implements IdempotencyGateway {
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

    public static final class Outbox implements EventOutboxGateway {
        public final List<DomainEvent> events = new ArrayList<>();

        @Override
        public void append(List<DomainEvent> newEvents) {
            events.addAll(newEvents);
        }

        public List<String> types() {
            return events.stream().map(DomainEvent::type).toList();
        }
    }

    /** Snapshots every fake before a write and restores them on failure: a rollback. */
    public final class Transactions implements TransactionRunner {
        public boolean inWrite;
        public int writes;

        @Override
        public <T> T write(Supplier<T> work) {
            Map<CaseId, CaseSnapshot> casesBefore = new HashMap<>(cases.store);
            Map<String, CaseId> keysBefore = new HashMap<>(keys.keys);
            int eventsBefore = outbox.events.size();
            inWrite = true;
            writes++;
            try {
                return work.get();
            } catch (RuntimeException e) {
                cases.store.clear();
                cases.store.putAll(casesBefore);
                keys.keys.clear();
                keys.keys.putAll(keysBefore);
                outbox.events.subList(eventsBefore, outbox.events.size()).clear();
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

    public final class ReferenceData implements ReferenceDataGateway {
        private final List<ReferenceProfile> profiles;
        public boolean calledInsideWriteTransaction;

        ReferenceData(List<ReferenceProfile> profiles) {
            this.profiles = profiles;
        }

        @Override
        public List<ReferenceProfile> candidatesFor(Party party) {
            calledInsideWriteTransaction |= transactions.inWrite;
            return profiles;
        }
    }
}
