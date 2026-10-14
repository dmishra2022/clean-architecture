package training.clean.screening.adapters.reference;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.entities.model.RiskCategory;

class ReferenceDataTest {

    private final ProfileTranslator translator = new ProfileTranslator();

    @Test
    void upstreamCodesBecomeThisContextsModel() {
        ReferenceProfile p = translator.translate(new ProfileRecord("WC-2001", "Ana Petrova", List.of("Anna Petrova"),
                "P", "san", "1970-05-06", "BG")).orElseThrow();

        assertThat(p.type()).isEqualTo(EntityType.INDIVIDUAL);
        assertThat(p.category()).isEqualTo(RiskCategory.SANCTIONS);
        assertThat(p.dateOfBirth()).isEqualTo(LocalDate.of(1970, 5, 6));
        assertThat(p.country().value()).isEqualTo("BG");
    }

    @Test
    void aPartialDateIsNotAnIdentifier() {
        ReferenceProfile p = translator.translate(new ProfileRecord("WC-2002", "Ana Petrova", null, "P", "PEP",
                "1970-05", null)).orElseThrow();

        assertThat(p.dateOfBirth()).isNull();
        assertThat(p.aliases()).isEmpty();
        assertThat(p.country()).isNull();
    }

    @Test
    void anUntranslatableRecordIsSkippedNotLeaked() {
        assertThat(translator.translate(new ProfileRecord("WC-2003", "X", null, "V", "PEP", null, null))).isEmpty();
        assertThat(translator.translate(new ProfileRecord("WC-2004", "X", null, "E", "TERROR", null, null))).isEmpty();
    }

    @Test
    void theRemoteGatewayAsksInUpstreamTermsAndTranslatesTheAnswer() {
        List<String> calls = new ArrayList<>();
        RemoteReferenceData gateway = new RemoteReferenceData((name, type) -> {
            calls.add(name + "/" + type);
            return List.of(
                    new ProfileRecord("WC-3001", "Orion Shipping Ltd", null, "E", "SAN", null, "PA"),
                    new ProfileRecord("WC-3002", "Orion Shipping SA", null, "?", "SAN", null, "PA"));
        }, translator);

        List<ReferenceProfile> candidates = gateway.candidatesFor(
                new Party(new PartyName("Orion Shipping"), EntityType.ORGANISATION, null, null));

        assertThat(calls).containsExactly("Orion Shipping/E");
        assertThat(candidates).extracting(p -> p.id().value()).containsExactly("WC-3001");
    }

    @Test
    void inMemoryBlockingKeepsProfilesSharingAThreeLetterPrefix() {
        List<ReferenceProfile> candidates = new InMemoryReferenceData().candidatesFor(
                new Party(new PartyName("Viktor Albescu"), EntityType.INDIVIDUAL, null, null));

        assertThat(candidates).extracting(p -> p.id().value())
                .containsExactlyInAnyOrder("WC-1001", "WC-1010", "WC-1012");
    }
}
