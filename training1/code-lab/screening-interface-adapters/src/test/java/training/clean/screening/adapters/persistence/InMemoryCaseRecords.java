package training.clean.screening.adapters.persistence;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** The two tables as maps, with the same version check and increment the database performs. */
final class InMemoryCaseRecords implements CaseRecords {

    final Map<UUID, CaseRecord> cases = new LinkedHashMap<>();
    final Map<UUID, MatchRecord> matches = new LinkedHashMap<>();
    int matchInserts;
    int matchUpdates;

    @Override
    public Optional<CaseRecord> findCase(UUID id) {
        return Optional.ofNullable(cases.get(id));
    }

    @Override
    public List<MatchRecord> findMatches(UUID caseId) {
        return matches.values().stream()
                .filter(m -> m.caseId().equals(caseId))
                .sorted(Comparator.comparingInt(MatchRecord::score).reversed())
                .toList();
    }

    @Override
    public void insertCase(CaseRecord record) {
        cases.put(record.id(), record);
    }

    @Override
    public void updateCase(CaseRecord record) {
        CaseRecord stored = cases.get(record.id());
        if (stored.version() != record.version()) {
            throw new StaleRecordException(record.id(), null);
        }
        cases.put(record.id(), withVersion(record, record.version() + 1));
    }

    @Override
    public void insertMatch(MatchRecord record) {
        matches.put(record.id(), record);
        matchInserts++;
    }

    @Override
    public void updateMatch(MatchRecord record) {
        matches.put(record.id(), record);
        matchUpdates++;
    }

    private static CaseRecord withVersion(CaseRecord r, long version) {
        return new CaseRecord(r.id(), r.clientGroupId(), r.partyName(), r.entityType(), r.dateOfBirth(), r.country(),
                r.status(), r.outcome(), r.screeningCount(), r.openedAt(), r.lastScreenedAt(), r.closedAt(),
                r.closedBy(), version);
    }
}
