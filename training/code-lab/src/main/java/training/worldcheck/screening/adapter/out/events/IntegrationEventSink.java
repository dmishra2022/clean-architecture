package training.worldcheck.screening.adapter.out.events;

/**
 * Where the relay sends events: a message broker in production (Kafka, Solace, SNS), a log locally.
 * Implementations must throw if delivery fails so the row stays in the outbox and is retried.
 */
public interface IntegrationEventSink {

    void publish(IntegrationEvent event);
}
