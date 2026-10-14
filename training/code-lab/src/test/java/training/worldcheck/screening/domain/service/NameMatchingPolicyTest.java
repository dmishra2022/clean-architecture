package training.worldcheck.screening.domain.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import training.worldcheck.screening.domain.DomainException;
import training.worldcheck.screening.domain.TestProfiles;
import training.worldcheck.screening.domain.model.CountryCode;
import training.worldcheck.screening.domain.model.EntityType;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.PartyName;

class NameMatchingPolicyTest {

    private final NameMatchingPolicy policy = new NameMatchingPolicy(80);

    @Test
    void identicalNamesScoreFullSimilarity() {
        assertThat(NameMatchingPolicy.nameSimilarity(List.of("VIKTOR", "ALBESCU"), List.of("VIKTOR", "ALBESCU")))
                .isEqualTo(100);
    }

    @Test
    void wordOrderAndAccentsAreIgnored() {
        assertThat(similarity("Albescu, Viktor", "Viktor Albescu")).isEqualTo(100);
        assertThat(similarity("Henrik Fäldström", "Henrik Faldstrom")).isEqualTo(100);
    }

    @Test
    void aTypoStillMatches() {
        assertThat(similarity("Viktor Albesku", "Viktor Albescu")).isGreaterThanOrEqualTo(85);
    }

    @Test
    void anExtraMiddleNameStillMatchesWhenTwoTokensAgree() {
        assertThat(similarity("Viktor Albescu", "Viktor Ionel Albescu")).isEqualTo(100);
    }

    @Test
    void oneSharedTokenIsNotEnough() {
        assertThat(similarity("Viktor", "Viktor Ionel Albescu")).isLessThan(60);
    }

    @Test
    void matchingDateOfBirthAndCountryRaiseTheScore() {
        MatchEvaluation hit = policy.evaluate(TestProfiles.viktorAlbescu(), TestProfiles.ALBESCU_SANCTIONED).orElseThrow();
        assertThat(hit.nameSimilarity()).isEqualTo(100);
        assertThat(hit.secondaryAdjustment()).isEqualTo(NameMatchingPolicy.SAME_DOB + NameMatchingPolicy.SAME_COUNTRY);
        assertThat(hit.score().value()).isEqualTo(100);
    }

    @Test
    void aDifferentBirthYearRulesOutANamesake() {
        assertThat(policy.evaluate(TestProfiles.viktorAlbescu(), TestProfiles.ALBESCU_NAMESAKE)).isEmpty();
    }

    @Test
    void withoutSecondaryIdentifiersTheNamesakeIsReported() {
        assertThat(policy.evaluate(TestProfiles.individual("Viktor Albescu"), TestProfiles.ALBESCU_NAMESAKE))
                .isPresent();
    }

    @Test
    void individualsNeverMatchOrganisations() {
        Party person = new Party(new PartyName("Orion Shipping Holdings"), EntityType.INDIVIDUAL, null, null);
        assertThat(policy.evaluate(person, TestProfiles.ORION)).isEmpty();
    }

    @Test
    void legalFormSuffixesAreIgnoredForOrganisations() {
        Party company = new Party(new PartyName("Orion Shipping Holdings"), EntityType.ORGANISATION, null,
                new CountryCode("PA"));
        assertThat(policy.evaluate(company, TestProfiles.ORION)).hasValueSatisfying(
                hit -> assertThat(hit.score().value()).isEqualTo(100));
    }

    @Test
    void theBestAliasIsReported() {
        Party party = new Party(new PartyName("Victor Albescu"), EntityType.INDIVIDUAL, LocalDate.of(1961, 3, 14), null);
        assertThat(policy.evaluate(party, TestProfiles.ALBESCU_SANCTIONED))
                .hasValueSatisfying(hit -> assertThat(hit.matchedName()).isEqualTo("Victor Albescu"));
    }

    @Test
    void thresholdMustBeSensible() {
        assertThatThrownBy(() -> new NameMatchingPolicy(20)).isInstanceOf(DomainException.class);
    }

    private static int similarity(String a, String b) {
        return NameMatchingPolicy.nameSimilarity(
                NameMatchingPolicy.meaningfulTokens(a, EntityType.INDIVIDUAL),
                NameMatchingPolicy.meaningfulTokens(b, EntityType.INDIVIDUAL));
    }
}
