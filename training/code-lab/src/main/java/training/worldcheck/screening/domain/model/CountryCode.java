package training.worldcheck.screening.domain.model;

import java.util.Locale;
import java.util.regex.Pattern;

import training.worldcheck.screening.domain.DomainException;

/** ISO 3166-1 alpha-2 country code. */
public record CountryCode(String value) {

    private static final Pattern ALPHA_2 = Pattern.compile("[A-Z]{2}");

    public CountryCode {
        value = value == null ? null : value.strip().toUpperCase(Locale.ROOT);
        if (value == null || !ALPHA_2.matcher(value).matches()) {
            throw DomainException.invalid("Country must be an ISO 3166-1 alpha-2 code: " + value);
        }
    }

    public static CountryCode ofNullable(String raw) {
        return raw == null || raw.isBlank() ? null : new CountryCode(raw);
    }

    @Override
    public String toString() {
        return value;
    }
}
