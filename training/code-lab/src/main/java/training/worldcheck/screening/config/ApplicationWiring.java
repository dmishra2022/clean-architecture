package training.worldcheck.screening.config;

import java.time.Clock;

import io.micronaut.context.annotation.Factory;
import jakarta.inject.Singleton;
import training.worldcheck.screening.application.CaseApplicationService;
import training.worldcheck.screening.application.port.out.CaseRepository;
import training.worldcheck.screening.application.port.out.DomainEventOutbox;
import training.worldcheck.screening.application.port.out.IdempotencyStore;
import training.worldcheck.screening.application.port.out.ReferenceDataSource;
import training.worldcheck.screening.application.port.out.UnitOfWork;
import training.worldcheck.screening.domain.service.NameMatchingPolicy;

/**
 * The only place where the framework meets the core. Domain and application classes carry no Micronaut
 * annotations; this factory turns them into beans, and Micronaut resolves the adapters for each port.
 */
@Factory
public class ApplicationWiring {

    @Singleton
    Clock clock() {
        return Clock.systemUTC();
    }

    @Singleton
    NameMatchingPolicy nameMatchingPolicy(MatchingProperties properties) {
        return new NameMatchingPolicy(properties.threshold());
    }

    @Singleton
    CaseApplicationService caseApplicationService(CaseRepository cases, IdempotencyStore idempotency,
                                                  ReferenceDataSource referenceData, DomainEventOutbox outbox,
                                                  UnitOfWork unitOfWork, NameMatchingPolicy policy, Clock clock) {
        return new CaseApplicationService(cases, idempotency, referenceData, outbox, unitOfWork, policy, clock);
    }
}
