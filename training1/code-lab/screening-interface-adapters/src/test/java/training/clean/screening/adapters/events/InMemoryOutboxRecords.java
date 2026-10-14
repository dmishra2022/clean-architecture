package training.clean.screening.adapters.events;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class InMemoryOutboxRecords implements OutboxRecords {

    final List<OutboxRecord> rows = new ArrayList<>();

    @Override
    public void insert(OutboxRecord record) {
        rows.add(record);
    }

    @Override
    public List<OutboxRecord> findUnpublished(int limit) {
        return rows.stream().filter(r -> r.publishedAt() == null).limit(limit).toList();
    }

    @Override
    public void markPublished(UUID id, Instant publishedAt) {
        rows.replaceAll(r -> r.id().equals(id)
                ? new OutboxRecord(r.id(), r.aggregateId(), r.clientGroupId(), r.eventType(), r.payload(),
                        r.occurredAt(), publishedAt)
                : r);
    }

    @Override
    public long countUnpublished() {
        return rows.stream().filter(r -> r.publishedAt() == null).count();
    }
}
