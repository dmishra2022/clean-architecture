package training.clean.screening.usecases.shared;

import java.util.Locale;

import training.clean.screening.entities.DomainException;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Resolution;

/**
 * Request models carry plain strings; this turns the enumerated ones into entity types, rejecting unknown values
 * with the same {@code INVALID_VALUE} rule the value objects use.
 */
public final class RequestValues {

    private RequestValues() {
    }

    public static EntityType entityType(String raw) {
        return parse(EntityType.class, raw, "Entity type must be INDIVIDUAL or ORGANISATION");
    }

    public static Resolution resolution(String raw) {
        return parse(Resolution.class, raw, "Resolution must be POSITIVE, POSSIBLE or FALSE_POSITIVE");
    }

    public static String optionalText(String raw) {
        return raw == null || raw.isBlank() ? null : raw.strip();
    }

    private static <E extends Enum<E>> E parse(Class<E> type, String raw, String message) {
        if (raw == null) {
            throw DomainException.invalid(message);
        }
        try {
            return Enum.valueOf(type, raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw DomainException.invalid(message + ": " + raw);
        }
    }
}
