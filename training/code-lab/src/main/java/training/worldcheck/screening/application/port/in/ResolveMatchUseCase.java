package training.worldcheck.screening.application.port.in;

import java.util.Objects;

import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.MatchId;
import training.worldcheck.screening.domain.model.Resolution;
import training.worldcheck.screening.domain.model.ResolutionRationale;

/** Driving port: an analyst resolves one match on a case. */
public interface ResolveMatchUseCase {

    CaseView resolve(ResolveMatchCommand command);

    record ResolveMatchCommand(ClientGroupId clientGroup, CaseId caseId, MatchId matchId, Resolution resolution,
                               ResolutionRationale rationale, AnalystId analyst) {
        public ResolveMatchCommand {
            Objects.requireNonNull(clientGroup, "client group");
            Objects.requireNonNull(caseId, "case id");
            Objects.requireNonNull(matchId, "match id");
            Objects.requireNonNull(analyst, "analyst");
        }
    }
}
