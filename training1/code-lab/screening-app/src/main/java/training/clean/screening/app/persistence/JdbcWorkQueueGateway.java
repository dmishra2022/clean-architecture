package training.clean.screening.app.persistence;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.inject.Singleton;
import training.clean.screening.app.persistence.Repositories.CaseRows;
import training.clean.screening.app.persistence.Repositories.MatchRows;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.usecases.workqueue.WorkQueueEntry;
import training.clean.screening.usecases.workqueue.WorkQueueGateway;

/**
 * The work queue's read model, built straight from the tables in two queries without rehydrating a single
 * aggregate. Reads may bypass the entities; writes never do.
 */
@Singleton
class JdbcWorkQueueGateway implements WorkQueueGateway {

    private static final List<String> OPEN_STATUSES = List.of("CREATED", "PENDING_REVIEW", "REVIEWED");
    private static final String UNRESOLVED = "UNRESOLVED";

    private final CaseRows cases;
    private final MatchRows matches;

    JdbcWorkQueueGateway(CaseRows cases, MatchRows matches) {
        this.cases = cases;
        this.matches = matches;
    }

    @Override
    public List<WorkQueueEntry> openCases(ClientGroupId clientGroup) {
        List<CaseRow> open = cases.findByClientGroupIdAndStatusInList(clientGroup.value(), OPEN_STATUSES);
        if (open.isEmpty()) {
            return List.of();
        }
        Map<UUID, List<MatchRow>> unresolved = matches.findByCaseIdInList(open.stream().map(CaseRow::id).toList())
                .stream()
                .filter(m -> UNRESOLVED.equals(m.resolution()))
                .collect(Collectors.groupingBy(MatchRow::caseId));
        return open.stream().map(c -> {
            List<MatchRow> pending = unresolved.getOrDefault(c.id(), List.of());
            int highest = pending.stream().mapToInt(MatchRow::score).max().orElse(0);
            return new WorkQueueEntry(c.id().toString(), c.partyName(), c.status(), pending.size(), highest,
                    c.openedAt());
        }).toList();
    }
}
