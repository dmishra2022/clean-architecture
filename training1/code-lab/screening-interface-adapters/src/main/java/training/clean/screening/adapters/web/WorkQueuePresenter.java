package training.clean.screening.adapters.web;

import training.clean.screening.adapters.web.WorkQueueJson.ItemJson;
import training.clean.screening.usecases.workqueue.WorkQueueOutputBoundary;
import training.clean.screening.usecases.workqueue.WorkQueueResponse;

public final class WorkQueuePresenter implements WorkQueueOutputBoundary {

    private ViewModel viewModel;

    @Override
    public void presentWorkQueue(WorkQueueResponse response) {
        viewModel = ViewModel.ok(new WorkQueueJson(response.clientGroupId(), response.items().size(),
                response.items().stream().map(item -> new ItemJson(
                        item.entry().caseId(),
                        item.entry().partyName(),
                        item.entry().status(),
                        item.priority().name(),
                        item.entry().unresolvedMatches(),
                        item.entry().highestScore(),
                        item.entry().openedAt(),
                        "/api/v1/client-groups/" + response.clientGroupId() + "/cases/" + item.entry().caseId()))
                        .toList()));
    }

    @Override
    public void presentInvalidRequest(String rule, String message) {
        viewModel = ViewModel.problem(ProblemJson.of(400, "Invalid value", message, rule));
    }

    public ViewModel viewModel() {
        if (viewModel == null) {
            throw new IllegalStateException("The use case finished without presenting an outcome");
        }
        return viewModel;
    }
}
