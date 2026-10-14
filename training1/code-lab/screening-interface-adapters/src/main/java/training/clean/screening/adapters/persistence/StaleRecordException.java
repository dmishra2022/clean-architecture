package training.clean.screening.adapters.persistence;

import java.util.UUID;

/** Raised by a {@link CaseRecords} implementation when its optimistic-locking check fails. */
public class StaleRecordException extends RuntimeException {

    public StaleRecordException(UUID id, Throwable cause) {
        super("Row " + id + " has a newer version", cause);
    }
}
