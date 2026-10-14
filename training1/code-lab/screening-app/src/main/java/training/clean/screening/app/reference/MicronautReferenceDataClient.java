package training.clean.screening.app.reference;

import java.util.List;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.http.client.annotation.Client;
import training.clean.screening.adapters.reference.ProfileRecord;
import training.clean.screening.adapters.reference.ReferenceDataApi;

/**
 * Declarative HTTP client: Micronaut generates the implementation of ring 3's {@link ReferenceDataApi} at compile
 * time. The base URL comes from {@code micronaut.http.services.reference-data.url}.
 */
@Client(id = "reference-data")
@Requires(property = "screening.reference-data.mode", value = "http")
interface MicronautReferenceDataClient extends ReferenceDataApi {

    @Override
    @Get("/v1/profiles/candidates")
    List<ProfileRecord> candidates(@QueryValue String name, @QueryValue String entityType);
}
