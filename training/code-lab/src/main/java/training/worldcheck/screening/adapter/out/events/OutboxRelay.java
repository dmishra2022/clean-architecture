package training.worldcheck.screening.adapter.out.events;

import java.time.Clock;
import java.util.List;

import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.Sort;
import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Polls the outbox and forwards unpublished events in occurrence order. Delivery is at-least-once: if the
 * process dies between publish and mark, the event is sent again, and consumers de-duplicate on event id.
 * <p>
 * With several instances, claim rows with {@code SELECT ... FOR UPDATE SKIP LOCKED} or run the relay on one
 * leader; this single-instance version keeps the idea visible.
 */
@Singleton
public class OutboxRelay {

    private static final Logger LOG = LoggerFactory.getLogger(OutboxRelay.class);
    private static final int BATCH = 100;

    private final OutboxRowRepository rows;
    private final IntegrationEventSink sink;
    private final Clock clock;

    OutboxRelay(OutboxRowRepository rows, IntegrationEventSink sink, Clock clock) {
        this.rows = rows;
        this.sink = sink;
        this.clock = clock;
    }

    @Scheduled(fixedDelay = "${screening.outbox.relay-interval:2s}",
               initialDelay = "${screening.outbox.initial-delay:2s}")
    void scheduledRun() {
        publishPending();
    }

    /** Returns how many events were delivered. Stops at the first failure to preserve ordering. */
    public synchronized int publishPending() {
        List<OutboxRow> batch = rows.findByPublishedAtIsNull(
                Pageable.from(0, BATCH, Sort.of(Sort.Order.asc("occurredAt"))));
        int delivered = 0;
        for (OutboxRow row : batch) {
            try {
                sink.publish(new IntegrationEvent(row.id(), row.eventType(), row.aggregateId(), row.clientGroupId(),
                        row.occurredAt(), row.payload()));
            } catch (RuntimeException e) {
                LOG.warn("Outbox delivery failed for event {}; will retry", row.id(), e);
                break;
            }
            rows.update(row.id(), clock.instant());
            delivered++;
        }
        return delivered;
    }

    public long pendingCount() {
        return rows.countByPublishedAtIsNull();
    }
}
