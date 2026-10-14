package training.worldcheck.screening.adapter.in.rest;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;
import training.worldcheck.screening.adapter.in.rest.ApiModels.Problem;
import training.worldcheck.screening.application.CaseNotFoundException;
import training.worldcheck.screening.application.port.out.ConcurrentCaseUpdateException;
import training.worldcheck.screening.domain.DomainException;

/** Maps inner-layer exceptions to HTTP. The inner layers never know which status code they produce. */
final class ProblemHandlers {

    static final String PROBLEM_JSON = "application/problem+json";

    private ProblemHandlers() {
    }

    static HttpResponse<Problem> problem(HttpStatus status, String title, String detail, String rule) {
        return HttpResponse.<Problem>status(status)
                .contentType(MediaType.of(PROBLEM_JSON))
                .body(new Problem("about:blank", title, status.getCode(), detail, rule));
    }

    @Produces
    @Singleton
    @Requires(classes = {DomainException.class, ExceptionHandler.class})
    static class DomainExceptionHandler implements ExceptionHandler<DomainException, HttpResponse<Problem>> {
        @Override
        public HttpResponse<Problem> handle(HttpRequest request, DomainException e) {
            return e.isInvalidValue()
                    ? problem(HttpStatus.BAD_REQUEST, "Invalid value", e.getMessage(), e.rule())
                    : problem(HttpStatus.UNPROCESSABLE_ENTITY, "Business rule violated", e.getMessage(), e.rule());
        }
    }

    @Produces
    @Singleton
    @Requires(classes = {CaseNotFoundException.class, ExceptionHandler.class})
    static class CaseNotFoundHandler implements ExceptionHandler<CaseNotFoundException, HttpResponse<Problem>> {
        @Override
        public HttpResponse<Problem> handle(HttpRequest request, CaseNotFoundException e) {
            return problem(HttpStatus.NOT_FOUND, "Case not found", e.getMessage(), null);
        }
    }

    @Produces
    @Singleton
    @Requires(classes = {ConcurrentCaseUpdateException.class, ExceptionHandler.class})
    static class ConcurrentUpdateHandler
            implements ExceptionHandler<ConcurrentCaseUpdateException, HttpResponse<Problem>> {
        @Override
        public HttpResponse<Problem> handle(HttpRequest request, ConcurrentCaseUpdateException e) {
            return problem(HttpStatus.CONFLICT, "Concurrent update", e.getMessage(), "CONCURRENT_UPDATE");
        }
    }
}
