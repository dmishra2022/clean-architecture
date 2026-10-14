package training.clean.screening.adapters.web;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The JSON bodies the web API accepts, and their shape checks. Shape (present, right format, right length) is
 * checked here and answered with 400 before any use case runs; meaning (is this a valid party, may this analyst
 * downgrade this match) is decided by the entities.
 */
public final class Forms {

    private static final Set<String> ENTITY_TYPES = Set.of("INDIVIDUAL", "ORGANISATION");
    private static final Set<String> RESOLUTIONS = Set.of("POSITIVE", "POSSIBLE", "FALSE_POSITIVE");
    private static final Pattern TWO_LETTERS = Pattern.compile("[A-Za-z]{2}");

    private Forms() {
    }

    public record OpenCaseForm(String name, String entityType, LocalDate dateOfBirth, String country) {

        List<String> errors() {
            List<String> errors = new ArrayList<>();
            required(errors, "name", name);
            if (name != null && name.length() > 200) {
                errors.add("name: size must be at most 200");
            }
            oneOf(errors, "entityType", entityType, ENTITY_TYPES);
            if (country != null && !country.isBlank() && !TWO_LETTERS.matcher(country).matches()) {
                errors.add("country: must be two letters");
            }
            return errors;
        }
    }

    public record ResolveMatchForm(String resolution, String rationale, String analystId) {

        List<String> errors() {
            List<String> errors = new ArrayList<>();
            oneOf(errors, "resolution", resolution, RESOLUTIONS);
            required(errors, "rationale", rationale);
            required(errors, "analystId", analystId);
            return errors;
        }
    }

    public record CloseCaseForm(String analystId) {

        List<String> errors() {
            List<String> errors = new ArrayList<>();
            required(errors, "analystId", analystId);
            return errors;
        }
    }

    private static void required(List<String> errors, String field, String value) {
        if (value == null || value.isBlank()) {
            errors.add(field + ": must not be blank");
        }
    }

    private static void oneOf(List<String> errors, String field, String value, Set<String> allowed) {
        if (value == null || !allowed.contains(value)) {
            errors.add(field + ": must be one of " + String.join(", ", allowed.stream().sorted().toList()));
        }
    }
}
