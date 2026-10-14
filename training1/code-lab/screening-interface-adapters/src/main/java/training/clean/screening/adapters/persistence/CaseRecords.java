package training.clean.screening.adapters.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The database as the gateway needs it: rows in, rows out. Owned by this ring and implemented by the framework
 * ring (Micronaut Data JDBC), so the mapping between aggregate and tables is tested here without a database.
 */
public interface CaseRecords {

    Optional<CaseRecord> findCase(UUID id);

    /** Highest score first. */
    List<MatchRecord> findMatches(UUID caseId);

    void insertCase(CaseRecord record);

    /**
     * Writes the row only if the stored version still equals {@code record.version()}, then increments it.
     *
     * @throws StaleRecordException if the stored version is different
     */
    void updateCase(CaseRecord record);

    void insertMatch(MatchRecord record);

    void updateMatch(MatchRecord record);
}
