package training.worldcheck.screening.adapter.out.reference;

import java.util.List;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

/** The upstream context's model, kept exactly as it arrives. Only the translator may read it. */
@Serdeable
record ProfileDto(
        String uid,
        String primaryName,
        @Nullable List<String> akas,
        String profileType,
        String riskCategory,
        @Nullable String birthDate,
        @Nullable String countryIso) {
}
