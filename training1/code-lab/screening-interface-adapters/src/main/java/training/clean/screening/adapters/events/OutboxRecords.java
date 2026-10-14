package training.clean.screening.adapters.events;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** The outbox table, implemented by the framework ring. {@code insert} must join the caller's transaction. */
public interface OutboxRecords {

    void insert(OutboxRecord record);

    /** Oldest first. */
    List<OutboxRecord> findUnpublished(int limit);

    void markPublished(UUID id, Instant publishedAt);

    long countUnpublished();
}
