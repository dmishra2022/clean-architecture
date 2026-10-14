package training.clean.screening.usecases.workqueue;

import java.util.List;

public record WorkQueueResponse(String clientGroupId, List<Item> items) {

    public WorkQueueResponse {
        items = List.copyOf(items);
    }

    public record Item(WorkQueueEntry entry, Priority priority) {
    }

    public enum Priority {
        /** A near-certain match is waiting: review today. */
        HIGH,
        /** At least one match is waiting for a decision. */
        MEDIUM,
        /** Nothing to decide: not screened yet, or ready to close. */
        LOW
    }
}
