package training.worldcheck.screening.adapter.out.persistence;

import java.time.Instant;
import java.util.UUID;

import io.micronaut.data.annotation.Id;
import io.micronaut.data.annotation.MappedEntity;

/** Primary key is {@code clientGroupId + ":" + key}, so the same key in two tenants never collides. */
@MappedEntity("idempotency_key")
record IdempotencyRow(@Id String id, String clientGroupId, UUID caseId, Instant createdAt) {

    static String idOf(String clientGroupId, String key) {
        return clientGroupId + ":" + key;
    }
}
