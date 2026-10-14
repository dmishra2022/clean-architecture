package training.clean.screening.app.events;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import training.clean.screening.adapters.events.IntegrationEvent;
import training.clean.screening.adapters.events.IntegrationEventSink;

/** Default sink: logs each event and keeps the most recent ones in memory for inspection and tests. */
@Singleton
@Requires(property = "screening.events.sink", value = "log", defaultValue = "log")
public class LoggingEventSink implements IntegrationEventSink {

    private static final Logger LOG = LoggerFactory.getLogger(LoggingEventSink.class);
    private static final int KEEP = 500;

    private final Deque<IntegrationEvent> recent = new ArrayDeque<>();

    @Override
    public synchronized void publish(IntegrationEvent event) {
        LOG.info("Published {} for case {} ({})", event.type(), event.caseId(), event.payload());
        recent.addLast(event);
        if (recent.size() > KEEP) {
            recent.removeFirst();
        }
    }

    public synchronized List<IntegrationEvent> recent() {
        return List.copyOf(recent);
    }
}
