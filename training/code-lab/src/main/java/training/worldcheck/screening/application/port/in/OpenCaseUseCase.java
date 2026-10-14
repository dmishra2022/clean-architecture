package training.worldcheck.screening.application.port.in;

import java.util.Objects;

import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.Party;

/** Driving port: open a new screening case for a party. */
public interface OpenCaseUseCase {

    /**
     * Opens a case. When {@code idempotencyKey} was already used by the same client group, returns the
     * case created the first time instead of opening another one.
     */
    CaseView open(OpenCaseCommand command);

    record OpenCaseCommand(ClientGroupId clientGroup, Party party, String idempotencyKey) {
        public OpenCaseCommand {
            Objects.requireNonNull(clientGroup, "client group");
            Objects.requireNonNull(party, "party");
            idempotencyKey = idempotencyKey == null || idempotencyKey.isBlank() ? null : idempotencyKey.strip();
        }
    }
}
