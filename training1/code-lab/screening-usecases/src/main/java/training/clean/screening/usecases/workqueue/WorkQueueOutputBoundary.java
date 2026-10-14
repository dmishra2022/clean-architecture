package training.clean.screening.usecases.workqueue;

public interface WorkQueueOutputBoundary {

    void presentWorkQueue(WorkQueueResponse response);

    void presentInvalidRequest(String rule, String message);
}
