package training.clean.screening.app.web;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import training.clean.screening.adapters.web.WorkQueueController;

@Controller("/api/v1/client-groups/{clientGroupId}/work-queue")
@ExecuteOn(TaskExecutors.BLOCKING)
class WorkQueueEndpoint {

    private final WorkQueueController controller;

    WorkQueueEndpoint(WorkQueueController controller) {
        this.controller = controller;
    }

    @Get
    HttpResponse<Object> list(String clientGroupId, @Nullable @QueryValue Integer limit) {
        return Responses.of(controller.list(clientGroupId, limit));
    }
}
