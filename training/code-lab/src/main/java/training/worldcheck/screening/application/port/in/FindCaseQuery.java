package training.worldcheck.screening.application.port.in;

import java.util.Optional;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

/** Driving port (query side): read a case. Cases of other client groups are invisible. */
public interface FindCaseQuery {

    Optional<CaseView> find(ClientGroupId clientGroup, CaseId caseId);
}
