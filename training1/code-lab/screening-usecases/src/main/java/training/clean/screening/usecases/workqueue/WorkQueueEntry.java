package training.clean.screening.usecases.workqueue;

import java.time.Instant;

/**
 * One open case as the work queue needs it. A read model: the gateway may build it straight from tables or a
 * projection without loading the aggregate, because a query changes nothing and protects no invariant.
 *
 * @param unresolvedMatches matches no analyst has resolved yet
 * @param highestScore      the highest score among those unresolved matches, 0 if there are none
 */
public record WorkQueueEntry(
        String caseId,
        String partyName,
        String status,
        int unresolvedMatches,
        int highestScore,
        Instant openedAt) {
}
