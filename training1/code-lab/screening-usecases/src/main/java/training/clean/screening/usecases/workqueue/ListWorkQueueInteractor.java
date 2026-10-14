package training.clean.screening.usecases.workqueue;

import java.util.Comparator;
import java.util.List;

import training.clean.screening.entities.DomainException;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.workqueue.WorkQueueResponse.Item;
import training.clean.screening.usecases.workqueue.WorkQueueResponse.Priority;

/**
 * Application-specific business rule: how the analyst team triages its work. It is not an enterprise rule (another
 * application over the same cases, such as a regulator report, would order them differently), so it lives here
 * and not in the entities.
 */
public final class ListWorkQueueInteractor implements ListWorkQueue {

    public static final int HIGH_PRIORITY_SCORE = 95;
    public static final int MAX_LIMIT = 100;

    private static final Comparator<Item> TRIAGE_ORDER = Comparator
            .comparing(Item::priority)
            .thenComparing(item -> item.entry().openedAt());

    private final WorkQueueGateway queue;
    private final TransactionRunner transactions;

    public ListWorkQueueInteractor(WorkQueueGateway queue, TransactionRunner transactions) {
        this.queue = queue;
        this.transactions = transactions;
    }

    @Override
    public void execute(WorkQueueRequest request, WorkQueueOutputBoundary presenter) {
        ClientGroupId clientGroup;
        try {
            clientGroup = new ClientGroupId(request.clientGroupId());
            if (request.limit() < 1 || request.limit() > MAX_LIMIT) {
                throw DomainException.invalid("Limit must be 1-" + MAX_LIMIT + ": " + request.limit());
            }
        } catch (DomainException e) {
            presenter.presentInvalidRequest(e.rule(), e.getMessage());
            return;
        }

        List<Item> items = transactions.read(() -> queue.openCases(clientGroup)).stream()
                .map(entry -> new Item(entry, priorityOf(entry)))
                .sorted(TRIAGE_ORDER)
                .limit(request.limit())
                .toList();
        presenter.presentWorkQueue(new WorkQueueResponse(clientGroup.value(), items));
    }

    static Priority priorityOf(WorkQueueEntry entry) {
        if (entry.unresolvedMatches() > 0 && entry.highestScore() >= HIGH_PRIORITY_SCORE) {
            return Priority.HIGH;
        }
        return entry.unresolvedMatches() > 0 ? Priority.MEDIUM : Priority.LOW;
    }
}
