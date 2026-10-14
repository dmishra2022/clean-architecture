package training.clean.screening.entities.policy;

import training.clean.screening.entities.model.MatchScore;
import training.clean.screening.entities.model.ReferenceProfile;

/** Result of comparing one party to one reference profile. */
public record MatchEvaluation(ReferenceProfile profile, String matchedName, int nameSimilarity,
                              int secondaryAdjustment, MatchScore score) {
}
