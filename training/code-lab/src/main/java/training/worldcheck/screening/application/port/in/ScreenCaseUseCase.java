package training.worldcheck.screening.application.port.in;

import java.util.Objects;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

/** Driving port: (re)screen a case against the reference data. */
public interface ScreenCaseUseCase {

    CaseView screen(ScreenCaseCommand command);

    record ScreenCaseCommand(ClientGroupId clientGroup, CaseId caseId) {
        public ScreenCaseCommand {
            Objects.requireNonNull(clientGroup, "client group");
            Objects.requireNonNull(caseId, "case id");
        }
    }
}
