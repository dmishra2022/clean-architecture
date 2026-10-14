package training.clean.screening.app.persistence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.Sort;
import jakarta.inject.Singleton;
import training.clean.screening.adapters.events.OutboxRecord;
import training.clean.screening.adapters.events.OutboxRecords;
import training.clean.screening.app.persistence.Repositories.OutboxRows;

/** {@link #insert} runs on the connection of the surrounding use-case transaction, so events commit with state. */
@Singleton
class MicronautOutboxRecords implements OutboxRecords {

    private static final Sort OLDEST_FIRST = Sort.of(Sort.Order.asc("occurredAt"));

    private final OutboxRows rows;

    MicronautOutboxRecords(OutboxRows rows) {
        this.rows = rows;
    }

    @Override
    public void insert(OutboxRecord r) {
        rows.save(new OutboxRow(r.id(), r.aggregateId(), r.clientGroupId(), r.eventType(), r.payload(),
                r.occurredAt(), r.publishedAt()));
    }

    @Override
    public List<OutboxRecord> findUnpublished(int limit) {
        return rows.findByPublishedAtIsNull(Pageable.from(0, limit, OLDEST_FIRST)).stream()
                .map(r -> new OutboxRecord(r.id(), r.aggregateId(), r.clientGroupId(), r.eventType(), r.payload(),
                        r.occurredAt(), r.publishedAt()))
                .toList();
    }

    @Override
    public void markPublished(UUID id, Instant publishedAt) {
        rows.update(id, publishedAt);
    }

    @Override
    public long countUnpublished() {
        return rows.countByPublishedAtIsNull();
    }
}
