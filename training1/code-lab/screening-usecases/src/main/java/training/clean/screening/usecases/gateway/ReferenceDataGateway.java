package training.clean.screening.usecases.gateway;

import java.util.List;

import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.ReferenceProfile;

/**
 * Access to the risk-intelligence corpus, which belongs to another bounded context. Returns a short list of
 * candidates worth scoring, already translated into this context's model; the entities decide what matches.
 */
public interface ReferenceDataGateway {

    List<ReferenceProfile> candidatesFor(Party party);
}
