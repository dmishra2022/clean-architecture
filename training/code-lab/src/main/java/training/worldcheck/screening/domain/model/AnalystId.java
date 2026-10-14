package training.worldcheck.screening.domain.model;

import training.worldcheck.screening.domain.DomainException;

public record AnalystId(String value) {

    public AnalystId {
        if (value == null || value.isBlank() || value.length() > 64) {
            throw DomainException.invalid("Analyst id must be 1-64 characters");
        }
        value = value.strip();
    }

    @Override
    public String toString() {
        return value;
    }
}
