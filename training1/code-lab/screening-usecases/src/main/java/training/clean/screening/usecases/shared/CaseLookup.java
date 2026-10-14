package training.clean.screening.usecases.shared;

import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.usecases.gateway.CaseGateway;

/** Loads a case for one tenant. Another tenant's case is reported exactly like a missing one. */
public final class CaseLookup {

    private CaseLookup() {
    }

    public static ScreeningCase load(CaseGateway cases, ClientGroupId clientGroup, CaseId caseId) {
        return cases.findById(caseId)
                .filter(c -> c.belongsTo(clientGroup))
                .orElseThrow(() -> new CaseNotFoundException(caseId));
    }
}
