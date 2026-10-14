package training.clean.screening.app.web;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Header;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.ExecuteOn;
import training.clean.screening.adapters.web.CaseController;
import training.clean.screening.adapters.web.Forms.CloseCaseForm;
import training.clean.screening.adapters.web.Forms.OpenCaseForm;
import training.clean.screening.adapters.web.Forms.ResolveMatchForm;

/**
 * The framework's half of the web delivery mechanism: routes, headers and body binding. It hands plain values to
 * the ring-3 controller and copies back the view model, so it never imports a use case or an entity.
 * <p>
 * JDBC is blocking, so requests run on the blocking executor (virtual threads on Java 21+), not the event loop.
 */
@Controller("/api/v1/client-groups/{clientGroupId}/cases")
@ExecuteOn(TaskExecutors.BLOCKING)
class CaseEndpoint {

    private final CaseController controller;

    CaseEndpoint(CaseController controller) {
        this.controller = controller;
    }

    @Post
    HttpResponse<Object> open(String clientGroupId, @Nullable @Header("Idempotency-Key") String idempotencyKey,
                              @Nullable @Body OpenCaseForm form) {
        return Responses.of(controller.open(clientGroupId, idempotencyKey, form));
    }

    @Get("/{caseId}")
    HttpResponse<Object> view(String clientGroupId, String caseId) {
        return Responses.of(controller.view(clientGroupId, caseId));
    }

    @Post("/{caseId}/screenings")
    HttpResponse<Object> screen(String clientGroupId, String caseId) {
        return Responses.of(controller.screen(clientGroupId, caseId));
    }

    @Put("/{caseId}/matches/{matchId}/resolution")
    HttpResponse<Object> resolve(String clientGroupId, String caseId, String matchId,
                                 @Nullable @Body ResolveMatchForm form) {
        return Responses.of(controller.resolve(clientGroupId, caseId, matchId, form));
    }

    @Post("/{caseId}/closure")
    HttpResponse<Object> close(String clientGroupId, String caseId, @Nullable @Body CloseCaseForm form) {
        return Responses.of(controller.close(clientGroupId, caseId, form));
    }
}
