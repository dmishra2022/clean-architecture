package training.clean.screening.app.events;

import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import training.clean.screening.adapters.events.OutboxRelay;

/** The framework decides when the relay runs; the relay (ring 3) decides what running means. */
@Singleton
class ScheduledOutboxRelay {

    private final OutboxRelay relay;

    ScheduledOutboxRelay(OutboxRelay relay) {
        this.relay = relay;
    }

    @Scheduled(fixedDelay = "${screening.outbox.relay-interval:2s}",
               initialDelay = "${screening.outbox.initial-delay:2s}")
    void run() {
        relay.publishPending();
    }
}
