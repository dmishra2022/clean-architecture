package training.clean.screening.usecases.workqueue;

import java.util.List;

import training.clean.screening.entities.model.ClientGroupId;

/**
 * Declared next to the only use case that needs it (common closure): changing the work queue changes one package.
 */
public interface WorkQueueGateway {

    /** Every case of the client group that is not closed, in no particular order. */
    List<WorkQueueEntry> openCases(ClientGroupId clientGroup);
}
