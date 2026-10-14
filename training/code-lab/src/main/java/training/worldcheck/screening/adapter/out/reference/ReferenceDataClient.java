package training.worldcheck.screening.adapter.out.reference;

import java.util.List;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.http.client.annotation.Client;

/**
 * Declarative HTTP client: Micronaut generates the implementation at compile time.
 * The base URL comes from {@code micronaut.http.services.reference-data.url}.
 */
@Client(id = "reference-data")
@Requires(property = "screening.reference-data.mode", value = "http")
interface ReferenceDataClient {

    @Get("/v1/profiles/candidates")
    List<ProfileDto> candidates(@QueryValue String name, @QueryValue String entityType);
}
