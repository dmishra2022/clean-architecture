package training.clean.screening.adapters.reference;

import java.util.List;

/** The upstream reference-data context's model, exactly as it arrives. Only {@link ProfileTranslator} reads it. */
public record ProfileRecord(
        String uid,
        String primaryName,
        List<String> akas,
        String profileType,
        String riskCategory,
        String birthDate,
        String countryIso) {
}
