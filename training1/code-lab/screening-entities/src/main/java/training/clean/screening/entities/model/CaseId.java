package training.clean.screening.entities.model;

import java.util.Objects;
import java.util.UUID;

import training.clean.screening.entities.DomainException;

public record CaseId(UUID value) {

    public CaseId {
        Objects.requireNonNull(value, "case id");
    }

    public static CaseId newId() {
        return new CaseId(UUID.randomUUID());
    }

    public static CaseId of(String raw) {
        try {
            return new CaseId(UUID.fromString(raw));
        } catch (IllegalArgumentException e) {
            throw DomainException.invalid("Case id must be a UUID: " + raw);
        }
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
