package training.clean.screening.entities;

import java.time.LocalDate;
import java.util.List;

import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.ProfileId;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.entities.model.RiskCategory;

/** Fictional reference data for entity tests; nothing outside the entities ring is involved. */
public final class TestProfiles {

    public static final ReferenceProfile ALBESCU_SANCTIONED = new ReferenceProfile(new ProfileId("T-1"),
            "Viktor Ionel Albescu", List.of("Victor Albescu"), EntityType.INDIVIDUAL, RiskCategory.SANCTIONS,
            LocalDate.of(1961, 3, 14), new CountryCode("RO"));

    public static final ReferenceProfile ALBESCU_NAMESAKE = new ReferenceProfile(new ProfileId("T-2"),
            "Viktor Albescu", List.of(), EntityType.INDIVIDUAL, RiskCategory.ADVERSE_MEDIA,
            LocalDate.of(1988, 7, 1), new CountryCode("MD"));

    public static final ReferenceProfile ALBESCU_PEP = new ReferenceProfile(new ProfileId("T-3"),
            "V. Albescu", List.of("Viktor Albescu"), EntityType.INDIVIDUAL, RiskCategory.PEP,
            null, new CountryCode("RO"));

    public static final ReferenceProfile ORION = new ReferenceProfile(new ProfileId("T-4"),
            "Orion Shipping Holdings Ltd", List.of(), EntityType.ORGANISATION, RiskCategory.SANCTIONS,
            null, new CountryCode("PA"));

    private TestProfiles() {
    }

    public static Party viktorAlbescu() {
        return new Party(new PartyName("Viktor Albescu"), EntityType.INDIVIDUAL, LocalDate.of(1961, 3, 14),
                new CountryCode("RO"));
    }

    public static Party individual(String name) {
        return new Party(new PartyName(name), EntityType.INDIVIDUAL, null, null);
    }
}
