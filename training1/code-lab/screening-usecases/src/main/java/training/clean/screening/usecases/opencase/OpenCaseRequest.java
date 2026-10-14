package training.clean.screening.usecases.opencase;

import java.time.LocalDate;

/**
 * Request model: a plain data structure built by a controller. It holds no entity types, so a controller never
 * needs to know how the model represents a party; the interactor builds the value objects and they validate
 * themselves.
 */
public record OpenCaseRequest(
        String clientGroupId,
        String idempotencyKey,
        String name,
        String entityType,
        LocalDate dateOfBirth,
        String country) {
}
