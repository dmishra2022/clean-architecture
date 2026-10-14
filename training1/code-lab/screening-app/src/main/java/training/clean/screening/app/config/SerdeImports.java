package training.clean.screening.app.config;

import io.micronaut.serde.annotation.SerdeImport;
import training.clean.screening.adapters.reference.ProfileRecord;
import training.clean.screening.adapters.web.CaseJson;
import training.clean.screening.adapters.web.Forms;
import training.clean.screening.adapters.web.ProblemJson;
import training.clean.screening.adapters.web.WorkQueueJson;

/**
 * Generates JSON (de)serializers for the plain records of the interface-adapters ring, at compile time and from
 * the outside, so that ring never has to carry a {@code @Serdeable} annotation.
 */
@SerdeImport(Forms.OpenCaseForm.class)
@SerdeImport(Forms.ResolveMatchForm.class)
@SerdeImport(Forms.CloseCaseForm.class)
@SerdeImport(CaseJson.class)
@SerdeImport(CaseJson.MatchJson.class)
@SerdeImport(ProblemJson.class)
@SerdeImport(WorkQueueJson.class)
@SerdeImport(WorkQueueJson.ItemJson.class)
@SerdeImport(ProfileRecord.class)
final class SerdeImports {

    private SerdeImports() {
    }
}
