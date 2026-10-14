package training.clean.screening.usecases.workqueue;

/** Input boundary: what should this client group's analysts work on next? */
public interface ListWorkQueue {

    void execute(WorkQueueRequest request, WorkQueueOutputBoundary presenter);
}
