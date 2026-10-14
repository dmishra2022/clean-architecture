package training.worldcheck.screening.domain.model;

import java.util.regex.Pattern;

import training.worldcheck.screening.domain.DomainException;

/** Tenant boundary: every case belongs to exactly one client group. */
public record ClientGroupId(String value) {

    private static final Pattern FORMAT = Pattern.compile("[a-z0-9][a-z0-9-]{1,63}");

    public ClientGroupId {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw DomainException.invalid("Client group id must be 2-64 lowercase letters, digits or '-': " + value);
        }
    }

    @Override
    public String toString() {
        return value;
    }
}
