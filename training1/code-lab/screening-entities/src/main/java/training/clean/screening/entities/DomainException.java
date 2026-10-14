package training.clean.screening.entities;

/**
 * Raised when a value is invalid or a business rule would be broken.
 * The {@code rule} is a stable code that use cases hand to presenters, which turn it into client-facing errors.
 */
public class DomainException extends RuntimeException {

    public static final String INVALID_VALUE = "INVALID_VALUE";

    private final String rule;

    public DomainException(String rule, String message) {
        super(message);
        this.rule = rule;
    }

    public static DomainException invalid(String message) {
        return new DomainException(INVALID_VALUE, message);
    }

    public String rule() {
        return rule;
    }

    public boolean isInvalidValue() {
        return INVALID_VALUE.equals(rule);
    }
}
