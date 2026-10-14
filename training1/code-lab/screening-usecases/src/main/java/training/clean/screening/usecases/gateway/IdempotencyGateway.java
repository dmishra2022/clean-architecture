package training.clean.screening.usecases.gateway;

import java.util.Optional;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;

/** Remembers which case a client's idempotency key created, per client group. */
public interface IdempotencyGateway {

    Optional<CaseId> find(ClientGroupId clientGroup, String key);

    void remember(ClientGroupId clientGroup, String key, CaseId caseId);
}
