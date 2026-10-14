package training.worldcheck.screening.adapter.out.persistence;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import io.micronaut.data.exceptions.OptimisticLockException;
import jakarta.inject.Singleton;
import training.worldcheck.screening.application.port.out.CaseRepository;
import training.worldcheck.screening.application.port.out.ConcurrentCaseUpdateException;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.CaseSnapshot;
import training.worldcheck.screening.domain.model.MatchSnapshot;
import training.worldcheck.screening.domain.model.ScreeningCase;

/**
 * Driven adapter for {@link CaseRepository}. Stores the aggregate as one case row plus one row per match,
 * and relies on the {@code version} column for optimistic locking.
 */
@Singleton
class JdbcCaseRepository implements CaseRepository {

    private final CaseRowRepository caseRows;
    private final MatchRowRepository matchRows;

    JdbcCaseRepository(CaseRowRepository caseRows, MatchRowRepository matchRows) {
        this.caseRows = caseRows;
        this.matchRows = matchRows;
    }

    @Override
    public Optional<ScreeningCase> findById(CaseId id) {
        return caseRows.findById(id.value())
                .map(row -> CaseRowMapper.toSnapshot(row, matchRows.findByCaseIdOrderByScoreDesc(row.id())))
                .map(ScreeningCase::rehydrate);
    }

    @Override
    public void save(ScreeningCase screeningCase) {
        CaseSnapshot snapshot = screeningCase.snapshot();
        CaseRow row = CaseRowMapper.toRow(snapshot);
        if (caseRows.existsById(row.id())) {
            try {
                caseRows.update(row);
            } catch (OptimisticLockException e) {
                throw new ConcurrentCaseUpdateException(snapshot.id(), e);
            }
        } else {
            caseRows.save(row);
        }

        Set<UUID> stored = matchRows.findByCaseIdOrderByScoreDesc(row.id()).stream()
                .map(MatchRow::id)
                .collect(Collectors.toSet());
        for (MatchSnapshot match : snapshot.matches()) {
            MatchRow matchRow = CaseRowMapper.toRow(snapshot.id(), match);
            if (stored.contains(matchRow.id())) {
                matchRows.update(matchRow);
            } else {
                matchRows.save(matchRow);
            }
        }
    }
}
