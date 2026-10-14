package training.clean.screening.adapters.persistence;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.CaseSnapshot;
import training.clean.screening.entities.model.MatchSnapshot;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.usecases.gateway.CaseGateway;
import training.clean.screening.usecases.gateway.ConcurrentCaseUpdateException;

/**
 * Gateway implementation: stores the aggregate as one case record plus one record per match. It speaks the use
 * cases' language on one side ({@link CaseGateway}) and rows on the other ({@link CaseRecords}).
 */
public final class SqlCaseGateway implements CaseGateway {

    private final CaseRecords records;

    public SqlCaseGateway(CaseRecords records) {
        this.records = records;
    }

    @Override
    public Optional<ScreeningCase> findById(CaseId id) {
        return records.findCase(id.value())
                .map(row -> CaseRecordMapper.toSnapshot(row, records.findMatches(row.id())))
                .map(ScreeningCase::rehydrate);
    }

    @Override
    public void save(ScreeningCase screeningCase) {
        CaseSnapshot snapshot = screeningCase.snapshot();
        CaseRecord record = CaseRecordMapper.toRecord(snapshot);
        boolean exists = records.findCase(record.id()).isPresent();
        if (exists) {
            try {
                records.updateCase(record);
            } catch (StaleRecordException e) {
                throw new ConcurrentCaseUpdateException(snapshot.id(), e);
            }
        } else {
            records.insertCase(record);
        }

        Set<UUID> stored = exists
                ? records.findMatches(record.id()).stream().map(MatchRecord::id).collect(Collectors.toSet())
                : Set.of();
        for (MatchSnapshot match : snapshot.matches()) {
            MatchRecord matchRecord = CaseRecordMapper.toRecord(snapshot.id(), match);
            if (stored.contains(matchRecord.id())) {
                records.updateMatch(matchRecord);
            } else {
                records.insertMatch(matchRecord);
            }
        }
    }
}
