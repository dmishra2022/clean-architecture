package training.clean.screening.adapters.web;

import java.time.Instant;
import java.util.List;

public record WorkQueueJson(String clientGroupId, int size, List<ItemJson> items) {

    public record ItemJson(
            String caseId,
            String partyName,
            String status,
            String priority,
            int unresolvedMatches,
            int highestScore,
            Instant openedAt,
            String href) {
    }
}
