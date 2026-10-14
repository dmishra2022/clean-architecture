package training.clean.screening.adapters.reference;

import java.util.List;
import java.util.Optional;

import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.ReferenceProfile;
import training.clean.screening.usecases.gateway.ReferenceDataGateway;

/** Gateway to the remote reference-data service: call the API, translate every record at the border. */
public final class RemoteReferenceData implements ReferenceDataGateway {

    private final ReferenceDataApi api;
    private final ProfileTranslator translator;

    public RemoteReferenceData(ReferenceDataApi api, ProfileTranslator translator) {
        this.api = api;
        this.translator = translator;
    }

    @Override
    public List<ReferenceProfile> candidatesFor(Party party) {
        return api.candidates(party.name().value(), ProfileTranslator.upstreamTypeOf(party.type())).stream()
                .map(translator::translate)
                .flatMap(Optional::stream)
                .toList();
    }
}
