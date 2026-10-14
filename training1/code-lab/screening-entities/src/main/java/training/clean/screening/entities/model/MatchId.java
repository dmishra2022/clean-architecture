package training.clean.screening.entities.model;

import java.util.Objects;
import java.util.UUID;

import training.clean.screening.entities.DomainException;

public record MatchId(UUID value) {

    public MatchId {
        Objects.requireNonNull(value, "match id");
    }

    public static MatchId newId() {
        return new MatchId(UUID.randomUUID());
    }

    public static MatchId of(String raw) {
        try {
            return new MatchId(UUID.fromString(raw));
        } catch (IllegalArgumentException e) {
            throw DomainException.invalid("Match id must be a UUID: " + raw);
        }
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
