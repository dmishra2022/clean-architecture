package training.clean.screening.adapters.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import training.clean.screening.adapters.reference.InMemoryReferenceData;
import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.CaseStatus;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Match;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.Resolution;
import training.clean.screening.entities.model.ResolutionRationale;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.entities.policy.NameMatchingPolicy;
import training.clean.screening.usecases.gateway.ConcurrentCaseUpdateException;

class SqlCaseGatewayTest {

    private static final Instant NOW = Instant.parse("2026-10-11T09:00:00Z");
    private static final ClientGroupId GROUP = new ClientGroupId("acme-bank");

    private final InMemoryCaseRecords records = new InMemoryCaseRecords();
    private final SqlCaseGateway gateway = new SqlCaseGateway(records);

    @Test
    void aScreenedCaseSurvivesTheRoundTripThroughRecords() {
        ScreeningCase original = screenedAlbescu();
        gateway.save(original);

        ScreeningCase loaded = gateway.findById(original.id()).orElseThrow();

        assertThat(loaded.snapshot().matches()).isNotEmpty()
                .containsExactlyInAnyOrderElementsOf(original.snapshot().matches());
        assertThat(loaded.status()).isEqualTo(CaseStatus.PENDING_REVIEW);
        assertThat(loaded.party()).isEqualTo(original.party());
        assertThat(loaded.screeningCount()).isEqualTo(1);
        assertThat(loaded.version()).isZero();
    }

    @Test
    void savingAgainUpdatesExistingMatchRowsAndBumpsTheVersion() {
        gateway.save(screenedAlbescu());
        CaseId id = records.cases.keySet().stream().findFirst().map(CaseId::new).orElseThrow();
        int inserted = records.matchInserts;

        ScreeningCase loaded = gateway.findById(id).orElseThrow();
        Match top = loaded.matches().getFirst();
        loaded.resolveMatch(top.id(), Resolution.FALSE_POSITIVE, new ResolutionRationale("Different date of birth"),
                new AnalystId("analyst-1"), NOW);
        gateway.save(loaded);

        assertThat(records.matchInserts).isEqualTo(inserted);
        assertThat(records.matchUpdates).isEqualTo(inserted);
        assertThat(records.cases.get(id.value()).version()).isEqualTo(1);
        assertThat(gateway.findById(id).orElseThrow().findMatch(top.id()).orElseThrow().resolution())
                .isEqualTo(Resolution.FALSE_POSITIVE);
    }

    @Test
    void aStaleVersionBecomesTheUseCasesConcurrencyException() {
        gateway.save(screenedAlbescu());
        CaseId id = records.cases.keySet().stream().findFirst().map(CaseId::new).orElseThrow();
        ScreeningCase first = gateway.findById(id).orElseThrow();
        ScreeningCase second = gateway.findById(id).orElseThrow();
        gateway.save(first);

        assertThatThrownBy(() -> gateway.save(second))
                .isInstanceOf(ConcurrentCaseUpdateException.class)
                .hasCauseInstanceOf(StaleRecordException.class);
    }

    @Test
    void anUnknownIdIsEmpty() {
        assertThat(gateway.findById(CaseId.newId())).isEmpty();
    }

    private static ScreeningCase screenedAlbescu() {
        Party party = new Party(new PartyName("Viktor Albescu"), EntityType.INDIVIDUAL, LocalDate.of(1961, 3, 14),
                new CountryCode("RO"));
        ScreeningCase c = ScreeningCase.open(CaseId.newId(), GROUP, party, NOW);
        c.screen(InMemoryReferenceData.PROFILES, new NameMatchingPolicy(NameMatchingPolicy.DEFAULT_THRESHOLD), NOW);
        c.pullEvents();
        return c;
    }
}
