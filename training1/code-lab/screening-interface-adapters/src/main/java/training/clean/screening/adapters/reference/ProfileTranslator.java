package training.clean.screening.adapters.reference;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.Optional;

import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.ProfileId;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.entities.model.RiskCategory;

/**
 * Anti-corruption layer: upstream codes ("P", "E", "SAN", "PEP") and partial dates become this context's model.
 * A record that cannot be translated is skipped rather than leaking a half-valid profile into matching.
 */
public final class ProfileTranslator {

    private static final System.Logger LOG = System.getLogger(ProfileTranslator.class.getName());

    public Optional<ReferenceProfile> translate(ProfileRecord dto) {
        try {
            EntityType type = switch (dto.profileType()) {
                case "P" -> EntityType.INDIVIDUAL;
                case "E" -> EntityType.ORGANISATION;
                default -> throw new IllegalArgumentException("profile type " + dto.profileType());
            };
            RiskCategory category = switch (dto.riskCategory().toUpperCase(Locale.ROOT)) {
                case "SAN", "SANCTIONS" -> RiskCategory.SANCTIONS;
                case "PEP" -> RiskCategory.PEP;
                case "LE", "LAW_ENFORCEMENT" -> RiskCategory.LAW_ENFORCEMENT;
                case "AM", "ADVERSE_MEDIA" -> RiskCategory.ADVERSE_MEDIA;
                default -> throw new IllegalArgumentException("risk category " + dto.riskCategory());
            };
            return Optional.of(new ReferenceProfile(new ProfileId(dto.uid()), dto.primaryName(), dto.akas(), type,
                    category, fullDateOrNull(dto.birthDate()), CountryCode.ofNullable(dto.countryIso())));
        } catch (RuntimeException e) {
            LOG.log(System.Logger.Level.WARNING, "Skipping untranslatable reference profile " + dto.uid() + ": "
                    + e.getMessage());
            return Optional.empty();
        }
    }

    public static String upstreamTypeOf(EntityType type) {
        return type == EntityType.INDIVIDUAL ? "P" : "E";
    }

    /** Upstream sends "1961", "1961-03" or "1961-03-14"; only a full date is a usable identifier here. */
    static LocalDate fullDateOrNull(String raw) {
        if (raw == null || raw.length() != 10) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
