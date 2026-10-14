package training.worldcheck.screening.application.port.out;

import java.util.List;

import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.ReferenceProfile;

/**
 * Driven port to the risk-intelligence corpus (another bounded context). Returns a short list of
 * candidates worth scoring; the domain decides which of them are matches.
 */
public interface ReferenceDataSource {

    List<ReferenceProfile> candidatesFor(Party party);
}
