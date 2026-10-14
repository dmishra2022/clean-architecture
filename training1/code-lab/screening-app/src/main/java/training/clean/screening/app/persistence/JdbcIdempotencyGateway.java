package training.clean.screening.app.persistence;

import java.time.Clock;
import java.util.Optional;

import jakarta.inject.Singleton;
import training.clean.screening.app.persistence.Repositories.IdempotencyRows;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.usecases.gateway.IdempotencyGateway;

/**
 * Implements a use-case gateway directly from the framework ring: there is nothing to translate (an id in, an id
 * out), so a ring-3 class would only forward calls. Clean Architecture allows skipping a ring when it adds nothing.
 * <p>
 * The primary key makes two concurrent first requests with the same key fail on insert, which rolls back the
 * second case; the client's retry then finds the first one.
 */
@Singleton
class JdbcIdempotencyGateway implements IdempotencyGateway {

    private final IdempotencyRows rows;
    private final Clock clock;

    JdbcIdempotencyGateway(IdempotencyRows rows, Clock clock) {
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
