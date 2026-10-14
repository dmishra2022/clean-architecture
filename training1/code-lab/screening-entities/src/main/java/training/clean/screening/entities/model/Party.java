package training.clean.screening.entities.model;

import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;

import training.clean.screening.entities.DomainException;

/**
 * The individual or organisation being screened. Date of birth and nationality are
 * secondary identifiers: optional, but they sharpen or weaken a name match.
 */
public record Party(PartyName name, EntityType type, LocalDate dateOfBirth, CountryCode country) {

    public Party {
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(type, "entity type");
        if (type == EntityType.ORGANISATION && dateOfBirth != null) {
            throw DomainException.invalid("An organisation has no date of birth");
        }
        if (dateOfBirth != null && dateOfBirth.isAfter(LocalDate.now())) {
            throw DomainException.invalid("Date of birth cannot be in the future");
        }
    }

    public Optional<LocalDate> knownDateOfBirth() {
        return Optional.ofNullable(dateOfBirth);
    }

    public Optional<CountryCode> knownCountry() {
        return Optional.ofNullable(country);
    }
}
