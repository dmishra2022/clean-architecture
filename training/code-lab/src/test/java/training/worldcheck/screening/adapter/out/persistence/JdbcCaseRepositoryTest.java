package training.worldcheck.screening.adapter.out.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import training.worldcheck.screening.application.port.out.CaseRepository;
import training.worldcheck.screening.application.port.out.ConcurrentCaseUpdateException;
import training.worldcheck.screening.domain.TestProfiles;
import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.Resolution;
import training.worldcheck.screening.domain.model.ResolutionRationale;
import training.worldcheck.screening.domain.model.ScreeningCase;
import training.worldcheck.screening.domain.service.NameMatchingPolicy;

/** The adapter is tested through its port, against the real schema created by Flyway. */
@MicronautTest
class JdbcCaseRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-10-11T09:00:00Z");

    @Inject
    CaseRepository repository;

    private final NameMatchingPolicy policy = new NameMatchingPolicy(80);

    @Test
    void storesAndRestoresTheWholeAggregate() {
        ScreeningCase c = ScreeningCase.open(CaseId.newId(), new ClientGroupId("bank-a"), TestProfiles.viktorAlbescu(), NOW);
        c.screen(List.of(TestProfiles.ALBESCU_SANCTIONED), policy, NOW);
        c.resolveMatch(c.matches().getFirst().id(), Resolution.POSITIVE,
                new ResolutionRationale("Same passport number"), new AnalystId("alice"), NOW);
        repository.save(c);

        ScreeningCase loaded = repository.findById(c.id()).orElseThrow();

        assertThat(loaded.status()).isEqualTo(c.status());
        assertThat(loaded.party()).isEqualTo(c.party());
        assertThat(loaded.matches()).singleElement().satisfies(m -> {
            assertThat(m.resolution()).isEqualTo(Resolution.POSITIVE);
            assertThat(m.resolvedBy()).contains(new AnalystId("alice"));
        });
    }

    @Test
    void twoAnalystsSavingTheSameVersionConflict() {
        ScreeningCase c = ScreeningCase.open(CaseId.newId(), new ClientGroupId("bank-a"), TestProfiles.viktorAlbescu(), NOW);
        repository.save(c);

        ScreeningCase alicesCopy = repository.findById(c.id()).orElseThrow();
        ScreeningCase bobsCopy = repository.findById(c.id()).orElseThrow();
        alicesCopy.screen(List.of(TestProfiles.ALBESCU_SANCTIONED), policy, NOW);
        bobsCopy.screen(List.of(), policy, NOW);

        repository.save(alicesCopy);
        assertThatThrownBy(() -> repository.save(bobsCopy)).isInstanceOf(ConcurrentCaseUpdateException.class);
        assertThat(repository.findById(c.id()).orElseThrow().matches()).hasSize(1);
    }
}
