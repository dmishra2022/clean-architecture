package training.worldcheck.screening.application.port.out;

import java.util.Optional;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

/** Driven port: remembers which case a client's idempotency key produced. Keys are scoped per client group. */
public interface IdempotencyStore {

    Optional<CaseId> find(ClientGroupId clientGroup, String key);

    void remember(ClientGroupId clientGroup, String key, CaseId caseId);
}
