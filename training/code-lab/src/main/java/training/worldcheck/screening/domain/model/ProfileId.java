package training.worldcheck.screening.domain.model;

import training.worldcheck.screening.domain.DomainException;

/** Identifier of a reference (risk intelligence) profile in the data corpus. */
public record ProfileId(String value) {

    public ProfileId {
        if (value == null || value.isBlank()) {
            throw DomainException.invalid("Profile id is required");
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
