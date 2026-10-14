package training.clean.screening.app.config;

import java.time.Clock;

import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import training.clean.screening.adapters.events.IntegrationEventSink;
import training.clean.screening.adapters.events.OutboxEventGateway;
import training.clean.screening.adapters.events.OutboxRecords;
import training.clean.screening.adapters.events.OutboxRelay;
import training.clean.screening.adapters.persistence.CaseRecords;
import training.clean.screening.adapters.persistence.SqlCaseGateway;
import training.clean.screening.adapters.reference.InMemoryReferenceData;
import training.clean.screening.adapters.reference.ProfileTranslator;
import training.clean.screening.adapters.reference.ReferenceDataApi;
import training.clean.screening.adapters.reference.RemoteReferenceData;
import training.clean.screening.adapters.web.CaseController;
import training.clean.screening.adapters.web.WorkQueueController;
import training.clean.screening.entities.policy.NameMatchingPolicy;
import training.clean.screening.usecases.closecase.CloseCase;
import training.clean.screening.usecases.closecase.CloseCaseInteractor;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.EventOutboxGateway;
import training.clean.screening.usecases.gateway.IdempotencyGateway;
import training.clean.screening.usecases.gateway.ReferenceDataGateway;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.opencase.OpenCase;
import training.clean.screening.usecases.opencase.OpenCaseInteractor;
import training.clean.screening.usecases.resolvematch.ResolveMatch;
import training.clean.screening.usecases.resolvematch.ResolveMatchInteractor;
import training.clean.screening.usecases.screencase.ScreenCase;
import training.clean.screening.usecases.screencase.ScreenCaseInteractor;
import training.clean.screening.usecases.viewcase.ViewCase;
import training.clean.screening.usecases.viewcase.ViewCaseInteractor;
import training.clean.screening.usecases.workqueue.ListWorkQueue;
import training.clean.screening.usecases.workqueue.ListWorkQueueInteractor;
import training.clean.screening.usecases.workqueue.WorkQueueGateway;

/**
 * The Main component: the dirtiest class in the system and the only one that knows every ring. It builds the plain
 * objects of rings 1-3 and hands them to Micronaut as beans. Every factory method returns the inner-ring
 * interface, so nothing else can ask the container for an interactor or a concrete gateway.
 * <p>
 * Micronaut resolves this at compile time: a missing gateway is a build error, not a startup surprise.
 */
@Factory
public class MainWiring {

    static final String REFERENCE_MODE = "screening.reference-data.mode";

    @Singleton
    Clock clock() {
        return Clock.systemUTC();
    }

    @Singleton
    NameMatchingPolicy nameMatchingPolicy(MatchingProperties properties) {
        return new NameMatchingPolicy(properties.threshold());
    }

    // Gateways implemented by the interface-adapters ring

    @Singleton
    CaseGateway caseGateway(CaseRecords records) {
        return new SqlCaseGateway(records);
    }

    @Singleton
    EventOutboxGateway eventOutboxGateway(OutboxRecords records) {
        return new OutboxEventGateway(records);
    }

    @Singleton
    @Requires(property = REFERENCE_MODE, value = "in-memory", defaultValue = "in-memory")
    ReferenceDataGateway inMemoryReferenceData() {
        return new InMemoryReferenceData();
    }

    @Singleton
    @Requires(property = REFERENCE_MODE, value = "http")
    ReferenceDataGateway remoteReferenceData(ReferenceDataApi api) {
        return new RemoteReferenceData(api, new ProfileTranslator());
    }

    @Singleton
    OutboxRelay outboxRelay(OutboxRecords records, IntegrationEventSink sink, Clock clock) {
        return new OutboxRelay(records, sink, clock);
    }

    // Use cases, exposed only through their input boundaries

    @Singleton
    OpenCase openCase(CaseGateway cases, IdempotencyGateway idempotency, EventOutboxGateway outbox,
                      TransactionRunner transactions, Clock clock) {
        return new OpenCaseInteractor(cases, idempotency, outbox, transactions, clock);
    }

    @Singleton
    ScreenCase screenCase(CaseGateway cases, ReferenceDataGateway referenceData, EventOutboxGateway outbox,
                          TransactionRunner transactions, NameMatchingPolicy policy, Clock clock) {
        return new ScreenCaseInteractor(cases, referenceData, outbox, transactions, policy, clock);
    }

    @Singleton
    ResolveMatch resolveMatch(CaseGateway cases, EventOutboxGateway outbox, TransactionRunner transactions,
                              Clock clock) {
        return new ResolveMatchInteractor(cases, outbox, transactions, clock);
    }

    @Singleton
    CloseCase closeCase(CaseGateway cases, EventOutboxGateway outbox, TransactionRunner transactions, Clock clock) {
        return new CloseCaseInteractor(cases, outbox, transactions, clock);
    }

    @Singleton
    ViewCase viewCase(CaseGateway cases, TransactionRunner transactions) {
        return new ViewCaseInteractor(cases, transactions);
    }

    @Singleton
    ListWorkQueue listWorkQueue(WorkQueueGateway queue, TransactionRunner transactions) {
        return new ListWorkQueueInteractor(queue, transactions);
    }

    // Controllers of the interface-adapters ring, called by the framework's endpoints

    @Singleton
    CaseController caseController(OpenCase open, ScreenCase screen, ResolveMatch resolve, CloseCase close,
                                  ViewCase view) {
        return new CaseController(open, screen, resolve, close, view);
    }

    @Singleton
    WorkQueueController workQueueController(ListWorkQueue listWorkQueue) {
        return new WorkQueueController(listWorkQueue);
    }
}
