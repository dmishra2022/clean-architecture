package training.worldcheck.screening.adapter.out.reference;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import training.worldcheck.screening.application.port.out.ReferenceDataSource;
import training.worldcheck.screening.domain.model.CountryCode;
import training.worldcheck.screening.domain.model.EntityType;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.ProfileId;
import training.worldcheck.screening.domain.model.ReferenceProfile;
import training.worldcheck.screening.domain.model.RiskCategory;

/**
 * Anti-corruption layer over the reference-data service. Upstream codes ("P", "E", "SAN", "PEP") and partial
 * dates are translated into this context's model; records that cannot be translated are skipped and logged
 * rather than leaking a half-valid profile into matching.
 */
@Singleton
@Requires(property = "screening.reference-data.mode", value = "http")
class HttpReferenceDataSource implements ReferenceDataSource {

    private static final Logger LOG = LoggerFactory.getLogger(HttpReferenceDataSource.class);

    private final ReferenceDataClient client;

    HttpReferenceDataSource(ReferenceDataClient client) {
        this.client = client;
    }

    @Override
    public List<ReferenceProfile> candidatesFor(Party party) {
        String type = party.type() == EntityType.INDIVIDUAL ? "P" : "E";
        return client.candidates(party.name().value(), type).stream()
                .map(this::translate)
                .filter(Objects::nonNull)
                .toList();
    }

    private ReferenceProfile translate(ProfileDto dto) {
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
            return new ReferenceProfile(new ProfileId(dto.uid()), dto.primaryName(), dto.akas(), type, category,
                    fullDateOrNull(dto.birthDate()), CountryCode.ofNullable(dto.countryIso()));
        } catch (RuntimeException e) {
            LOG.warn("Skipping untranslatable reference profile {}: {}", dto.uid(), e.getMessage());
            return null;
        }
    }

    /** Upstream sends "1961", "1961-03" or "1961-03-14"; only a full date is a usable identifier here. */
    private static LocalDate fullDateOrNull(String raw) {
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
