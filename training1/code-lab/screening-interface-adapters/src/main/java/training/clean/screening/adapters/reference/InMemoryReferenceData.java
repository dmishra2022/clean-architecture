package training.clean.screening.adapters.reference;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.ProfileId;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.entities.model.RiskCategory;
import training.clean.screening.usecases.gateway.ReferenceDataGateway;

/**
 * Local stand-in for the risk-intelligence corpus. Every name below is fictional training data.
 * <p>
 * Candidate selection ("blocking") keeps profiles that share a three-letter token prefix with the party, which is
 * what a search index does at scale before the expensive scoring step.
 */
public final class InMemoryReferenceData implements ReferenceDataGateway {

    public static final List<ReferenceProfile> PROFILES = List.of(
            individual("WC-1001", "Viktor Ionel Albescu", List.of("Victor Albescu", "V. I. Albescu"),
                    RiskCategory.SANCTIONS, LocalDate.of(1961, 3, 14), "RO"),
            individual("WC-1002", "Marisol Quintanar Reyes", List.of("Marisol Quintanar"),
                    RiskCategory.PEP, LocalDate.of(1975, 9, 2), "MX"),
            individual("WC-1003", "Dmitri Valenko", List.of("Dmitry Valenko", "Dimitri Walenko"),
                    RiskCategory.SANCTIONS, LocalDate.of(1958, 11, 30), "CY"),
            organisation("WC-1004", "Orion Shipping Holdings Ltd", List.of("Orion Maritime Holdings"),
                    RiskCategory.SANCTIONS, "PA"),
            organisation("WC-1005", "Golden Crescent Trading LLC", List.of("Golden Crescent General Trading"),
                    RiskCategory.LAW_ENFORCEMENT, "AE"),
            individual("WC-1006", "Amara Okonkwo-Bell", List.of(),
                    RiskCategory.ADVERSE_MEDIA, LocalDate.of(1982, 6, 21), "GB"),
            individual("WC-1007", "Henrik Faldström", List.of("Henrik Faldstrom"),
                    RiskCategory.PEP, LocalDate.of(1969, 1, 8), "SE"),
            individual("WC-1008", "Lucia Ferrante", List.of("Lucia M. Ferrante"),
                    RiskCategory.LAW_ENFORCEMENT, LocalDate.of(1990, 4, 17), "IT"),
            organisation("WC-1009", "Northwind Capital Partners SA", List.of(),
                    RiskCategory.ADVERSE_MEDIA, "LU"),
            individual("WC-1010", "Viktor Albescu", List.of(),
                    RiskCategory.ADVERSE_MEDIA, LocalDate.of(1988, 7, 1), "MD"),
            individual("WC-1011", "Tomas Reyes Quintana", List.of(),
                    RiskCategory.PEP, LocalDate.of(1971, 12, 5), "ES"),
            individual("WC-1012", "Sofia Albescu", List.of(),
                    RiskCategory.PEP, LocalDate.of(1964, 2, 19), "RO"));

    @Override
    public List<ReferenceProfile> candidatesFor(Party party) {
        Set<String> keys = blockingKeys(party.name().value());
        return PROFILES.stream()
                .filter(p -> p.allNames().anyMatch(n -> blockingKeys(n).stream().anyMatch(keys::contains)))
                .toList();
    }

    static Set<String> blockingKeys(String name) {
        Set<String> keys = new HashSet<>();
        for (String token : PartyName.tokens(name)) {
            if (token.length() >= 3) {
                keys.add(token.substring(0, 3));
            }
        }
        return keys;
    }

    private static ReferenceProfile individual(String id, String name, List<String> aliases, RiskCategory category,
                                               LocalDate dob, String country) {
        return new ReferenceProfile(new ProfileId(id), name, aliases, EntityType.INDIVIDUAL, category, dob,
                new CountryCode(country));
    }

    private static ReferenceProfile organisation(String id, String name, List<String> aliases, RiskCategory category,
                                                 String country) {
        return new ReferenceProfile(new ProfileId(id), name, aliases, EntityType.ORGANISATION, category, null,
                new CountryCode(country));
    }
}
