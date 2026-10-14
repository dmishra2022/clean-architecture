package training.worldcheck.screening.adapter.out.persistence;

import java.time.Clock;
import java.util.Optional;

import jakarta.inject.Singleton;
import training.worldcheck.screening.application.port.out.IdempotencyStore;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

/**
 * The primary key makes concurrent first requests with the same key fail on insert, which rolls back
 * the second case; the client's retry then finds the first one.
 */
@Singleton
class JdbcIdempotencyStore implements IdempotencyStore {

    private final IdempotencyRowRepository rows;
    private final Clock clock;

    JdbcIdempotencyStore(IdempotencyRowRepository rows, Clock clock) {
        this.rows = rows;
        this.clock = clock;
    }

    @Override
    public Optional<CaseId> find(ClientGroupId clientGroup, String key) {
        return rows.findById(IdempotencyRow.idOf(clientGroup.value(), key)).map(r -> new CaseId(r.caseId()));
    }

    @Override
    public void remember(ClientGroupId clientGroup, String key, CaseId caseId) {
        rows.save(new IdempotencyRow(IdempotencyRow.idOf(clientGroup.value(), key), clientGroup.value(),
                caseId.value(), clock.instant()));
    }
}
