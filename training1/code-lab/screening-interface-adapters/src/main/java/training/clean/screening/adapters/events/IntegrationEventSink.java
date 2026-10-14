package training.clean.screening.adapters.events;

/**
 * Where the relay delivers events: a broker in production (Kafka, Solace, SNS), a log locally. Implementations
 * live in the framework ring and must throw when delivery fails, so the row stays in the outbox and is retried.
 */
public interface IntegrationEventSink {

    void publish(IntegrationEvent event);
}
