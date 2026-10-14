package training.clean.screening.adapters.reference;

import java.util.List;

/**
 * The remote reference-data API, as this ring needs it. The framework ring implements it with a declarative HTTP
 * client; tests implement it with a lambda.
 */
public interface ReferenceDataApi {

    List<ProfileRecord> candidates(String name, String entityType);
}
