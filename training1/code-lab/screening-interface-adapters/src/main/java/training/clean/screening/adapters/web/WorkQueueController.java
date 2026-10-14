package training.clean.screening.adapters.web;

import training.clean.screening.usecases.workqueue.ListWorkQueue;
import training.clean.screening.usecases.workqueue.WorkQueueRequest;

public final class WorkQueueController {

    public static final int DEFAULT_LIMIT = 20;

    private final ListWorkQueue listWorkQueue;

    public WorkQueueController(ListWorkQueue listWorkQueue) {
        this.listWorkQueue = listWorkQueue;
    }

    public ViewModel list(String clientGroupId, Integer limit) {
        WorkQueuePresenter presenter = new WorkQueuePresenter();
        listWorkQueue.execute(new WorkQueueRequest(clientGroupId, limit == null ? DEFAULT_LIMIT : limit), presenter);
        return presenter.viewModel();
    }
}
