package training.worldcheck.screening.domain.model;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

/** A risk-intelligence record a party can be matched against. Read-only inside this context. */
public record ReferenceProfile(
        ProfileId id,
        String primaryName,
        List<String> aliases,
        EntityType type,
        RiskCategory category,
        LocalDate dateOfBirth,
        CountryCode country) {

    public ReferenceProfile {
        Objects.requireNonNull(id, "profile id");
        Objects.requireNonNull(primaryName, "primary name");
        Objects.requireNonNull(type, "entity type");
        Objects.requireNonNull(category, "risk category");
        aliases = aliases == null ? List.of() : List.copyOf(aliases);
    }

    public Stream<String> allNames() {
        return Stream.concat(Stream.of(primaryName), aliases.stream());
    }

    public Optional<LocalDate> knownDateOfBirth() {
        return Optional.ofNullable(dateOfBirth);
    }

    public Optional<CountryCode> knownCountry() {
        return Optional.ofNullable(country);
    }
}
