package training.clean.screening.usecases.workqueue;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;
import training.clean.screening.usecases.gateway.TransactionRunner;
import training.clean.screening.usecases.workqueue.WorkQueueResponse.Priority;

class ListWorkQueueInteractorTest {

    private static final Instant DAY_1 = Instant.parse("2026-10-01T09:00:00Z");
    private static final Instant DAY_2 = Instant.parse("2026-10-02T09:00:00Z");
    private static final Instant DAY_3 = Instant.parse("2026-10-03T09:00:00Z");

    private final List<WorkQueueEntry> open = List.of(
            new WorkQueueEntry("c-ready", "Jane Whitfield", "REVIEWED", 0, 0, DAY_1),
            new WorkQueueEntry("c-medium-new", "Lucia Ferrante", "PENDING_REVIEW", 1, 84, DAY_3),
            new WorkQueueEntry("c-high", "Viktor Albescu", "PENDING_REVIEW", 1, 100, DAY_3),
            new WorkQueueEntry("c-medium-old", "Dmitri Walenko", "PENDING_REVIEW", 2, 88, DAY_2));

    private final ListWorkQueueInteractor interactor = new ListWorkQueueInteractor(group -> open, new DirectTransactions());

    @Test
    void ordersByPriorityThenOldestFirst() {
        Recording presenter = new Recording();

        interactor.execute(new WorkQueueRequest("bank-a", 10), presenter);

        assertThat(presenter.response.items()).extracting(i -> i.entry().caseId())
                .containsExactly("c-high", "c-medium-old", "c-medium-new", "c-ready");
        assertThat(presenter.response.items()).extracting(WorkQueueResponse.Item::priority)
                .containsExactly(Priority.HIGH, Priority.MEDIUM, Priority.MEDIUM, Priority.LOW);
    }

    @Test
    void appliesTheLimitAfterSorting() {
        Recording presenter = new Recording();

        interactor.execute(new WorkQueueRequest("bank-a", 1), presenter);

        assertThat(presenter.response.items()).extracting(i -> i.entry().caseId()).containsExactly("c-high");
    }

    @Test
    void rejectsALimitOutsideTheAllowedRange() {
        Recording presenter = new Recording();

        interactor.execute(new WorkQueueRequest("bank-a", 0), presenter);

        assertThat(presenter.rule).isEqualTo("INVALID_VALUE");
        assertThat(presenter.response).isNull();
    }

    private static final class Recording implements WorkQueueOutputBoundary {
        WorkQueueResponse response;
        String rule;

        @Override
        public void presentWorkQueue(WorkQueueResponse response) {
            this.response = response;
        }

        @Override
        public void presentInvalidRequest(String rule, String message) {
            this.rule = rule;
        }
    }

    private static final class DirectTransactions implements TransactionRunner {
        @Override
        public <T> T write(Supplier<T> work) {
            return work.get();
        }

        @Override
        public <T> T read(Supplier<T> work) {
            return work.get();
        }
    }
}
