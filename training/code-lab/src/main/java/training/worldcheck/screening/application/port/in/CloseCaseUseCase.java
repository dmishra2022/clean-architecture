package training.worldcheck.screening.application.port.in;

import java.util.Objects;

import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

/** Driving port: close a fully reviewed case. */
public interface CloseCaseUseCase {

    CaseView close(CloseCaseCommand command);

    record CloseCaseCommand(ClientGroupId clientGroup, CaseId caseId, AnalystId analyst) {
        public CloseCaseCommand {
            Objects.requireNonNull(clientGroup, "client group");
            Objects.requireNonNull(caseId, "case id");
            Objects.requireNonNull(analyst, "analyst");
        }
    }
}
