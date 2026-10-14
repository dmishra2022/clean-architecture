package training.clean.screening.adapters.events;

import java.time.Clock;
import java.util.List;

/**
 * Forwards unpublished outbox rows in occurrence order. Delivery is at-least-once: if the process dies between
 * publish and mark, the event is sent again and consumers de-duplicate on event id.
 * <p>
 * The policy lives here, in plain Java; the framework ring only decides when to call {@link #publishPending()}
 * (a scheduler) and where events go (a sink). With several instances, claim rows with
 * {@code SELECT ... FOR UPDATE SKIP LOCKED} in the {@link OutboxRecords} implementation.
 */
public final class OutboxRelay {

    public static final int BATCH = 100;

    private static final System.Logger LOG = System.getLogger(OutboxRelay.class.getName());

    private final OutboxRecords records;
    private final IntegrationEventSink sink;
    private final Clock clock;

    public OutboxRelay(OutboxRecords records, IntegrationEventSink sink, Clock clock) {
        this.records = records;
        this.sink = sink;
        this.clock = clock;
    }

    /** Returns how many events were delivered. Stops at the first failure so ordering is preserved. */
    public synchronized int publishPending() {
        List<OutboxRecord> batch = records.findUnpublished(BATCH);
        int delivered = 0;
        for (OutboxRecord row : batch) {
            try {
                sink.publish(new IntegrationEvent(row.id(), row.eventType(), row.aggregateId(), row.clientGroupId(),
                        row.occurredAt(), row.payload()));
            } catch (RuntimeException e) {
                LOG.log(System.Logger.Level.WARNING, "Outbox delivery failed for event " + row.id() + "; will retry", e);
                break;
            }
            records.markPublished(row.id(), clock.instant());
            delivered++;
        }
        return delivered;
    }

    public long pendingCount() {
        return records.countUnpublished();
    }
}
