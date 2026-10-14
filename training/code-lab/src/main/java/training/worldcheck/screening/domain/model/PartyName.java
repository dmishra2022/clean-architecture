package training.worldcheck.screening.domain.model;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

import training.worldcheck.screening.domain.DomainException;

/**
 * Name as submitted, plus the normalised form used for matching.
 * Equality is on the submitted value: two spellings are two different names.
 */
public record PartyName(String value) {

    public PartyName {
        if (value == null) {
            throw DomainException.invalid("Name is required");
        }
        value = value.strip().replaceAll("\\s+", " ");
        if (value.length() < 2 || value.length() > 200) {
            throw DomainException.invalid("Name must be 2-200 characters");
        }
        if (value.codePoints().noneMatch(Character::isLetter)) {
            throw DomainException.invalid("Name must contain at least one letter");
        }
    }

    public String normalised() {
        return normalise(value);
    }

    public List<String> tokens() {
        return tokens(value);
    }

    /** Upper case, accents removed, punctuation replaced by spaces, whitespace collapsed. */
    public static String normalise(String raw) {
        String decomposed = Normalizer.normalize(raw, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return decomposed.toUpperCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+", " ")
                .strip();
    }

    public static List<String> tokens(String raw) {
        String normalised = normalise(raw);
        return normalised.isEmpty() ? List.of() : Arrays.asList(normalised.split(" "));
    }
}
