package training.clean.screening.usecases.gateway;

import java.util.Optional;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ScreeningCase;

/**
 * What the case use cases need from storage, in the language of the use cases. Declared here, implemented
 * further out (interface adapters), so source code points inward while calls flow outward.
 */
public interface CaseGateway {

    Optional<ScreeningCase> findById(CaseId id);

    /**
     * Inserts a new case or updates an existing one.
     *
     * @throws ConcurrentCaseUpdateException if another transaction saved a newer version first
     */
    void save(ScreeningCase screeningCase);
}
