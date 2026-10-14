package training.worldcheck.screening.domain.service;

import training.worldcheck.screening.domain.model.MatchScore;
import training.worldcheck.screening.domain.model.ReferenceProfile;

/** Result of comparing one party to one reference profile. */
public record MatchEvaluation(ReferenceProfile profile, String matchedName, int nameSimilarity,
                              int secondaryAdjustment, MatchScore score) {
}
