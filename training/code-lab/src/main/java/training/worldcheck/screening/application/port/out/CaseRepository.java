package training.worldcheck.screening.application.port.out;

import java.util.Optional;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ScreeningCase;

/**
 * Driven port: a collection-like store of whole aggregates. One repository per aggregate root,
 * no repositories for inner entities such as matches.
 */
public interface CaseRepository {

    Optional<ScreeningCase> findById(CaseId id);

    /**
     * Inserts or updates the whole aggregate.
     *
     * @throws ConcurrentCaseUpdateException if someone else saved the case since it was loaded
     */
    void save(ScreeningCase screeningCase);
}
