package training.clean.screening.entities.model;

import training.clean.screening.entities.DomainException;

/** Analyst's justification for a resolution. Auditors read this, so it must say something. */
public record ResolutionRationale(String value) {

    public static final int MIN_LENGTH = 10;
    public static final int MAX_LENGTH = 2000;

    public ResolutionRationale {
        value = value == null ? "" : value.strip();
        if (value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw DomainException.invalid(
                    "Rationale must be " + MIN_LENGTH + "-" + MAX_LENGTH + " characters");
        }
    }
}
