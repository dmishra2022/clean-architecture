package training.clean.screening.app.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import io.micronaut.data.exceptions.OptimisticLockException;
import jakarta.inject.Singleton;
import training.clean.screening.adapters.persistence.CaseRecord;
import training.clean.screening.adapters.persistence.CaseRecords;
import training.clean.screening.adapters.persistence.MatchRecord;
import training.clean.screening.adapters.persistence.StaleRecordException;
import training.clean.screening.app.persistence.Repositories.CaseRows;
import training.clean.screening.app.persistence.Repositories.MatchRows;

/**
 * A driver, not a translator: copies plain records to annotated rows field by field. All decisions about how the
 * aggregate maps to tables were made in ring 3; this class only knows how Micronaut Data talks to JDBC.
 */
@Singleton
class MicronautCaseRecords implements CaseRecords {

    private final CaseRows cases;
    private final MatchRows matches;

    MicronautCaseRecords(CaseRows cases, MatchRows matches) {
        this.cases = cases;
        this.matches = matches;
    }

    @Override
    public Optional<CaseRecord> findCase(UUID id) {
        return cases.findById(id).map(MicronautCaseRecords::toRecord);
    }

    @Override
    public List<MatchRecord> findMatches(UUID caseId) {
        return matches.findByCaseIdOrderByScoreDesc(caseId).stream().map(MicronautCaseRecords::toRecord).toList();
    }

    @Override
    public void insertCase(CaseRecord record) {
        cases.save(toRow(record));
    }

    @Override
    public void updateCase(CaseRecord record) {
        try {
            cases.update(toRow(record));
        } catch (OptimisticLockException e) {
            throw new StaleRecordException(record.id(), e);
        }
    }

    @Override
    public void insertMatch(MatchRecord record) {
        matches.save(toRow(record));
    }

    @Override
    public void updateMatch(MatchRecord record) {
        matches.update(toRow(record));
    }

    static CaseRecord toRecord(CaseRow r) {
        return new CaseRecord(r.id(), r.clientGroupId(), r.partyName(), r.entityType(), r.dateOfBirth(), r.country(),
                r.status(), r.outcome(), r.screeningCount(), r.openedAt(), r.lastScreenedAt(), r.closedAt(),
                r.closedBy(), r.version());
    }

    static MatchRecord toRecord(MatchRow r) {
        return new MatchRecord(r.id(), r.caseId(), r.profileId(), r.category(), r.matchedName(), r.score(),
                r.resolution(), r.rationale(), r.resolvedBy(), r.resolvedAt());
    }

    private static CaseRow toRow(CaseRecord r) {
        return new CaseRow(r.id(), r.clientGroupId(), r.partyName(), r.entityType(), r.dateOfBirth(), r.country(),
                r.status(), r.outcome(), r.screeningCount(), r.openedAt(), r.lastScreenedAt(), r.closedAt(),
                r.closedBy(), r.version());
    }

    private static MatchRow toRow(MatchRecord r) {
        return new MatchRow(r.id(), r.caseId(), r.profileId(), r.category(), r.matchedName(), r.score(),
                r.resolution(), r.rationale(), r.resolvedBy(), r.resolvedAt());
    }
}
