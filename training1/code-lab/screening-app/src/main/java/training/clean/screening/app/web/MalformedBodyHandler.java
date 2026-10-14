package training.clean.screening.app.web;

import java.util.List;

import io.micronaut.context.annotation.Replaces;
import io.micronaut.core.convert.exceptions.ConversionErrorException;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ConversionErrorHandler;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import jakarta.inject.Singleton;
import training.clean.screening.adapters.web.ProblemJson;
import training.clean.screening.adapters.web.ViewModel;

/**
 * A body the framework cannot even bind (a date that is not a date, a string where an object belongs) never
 * reaches the controller. It gets the same problem shape as the controller's own shape errors.
 */
@Produces
@Singleton
@Replaces(ConversionErrorHandler.class)
class MalformedBodyHandler implements ExceptionHandler<ConversionErrorException, HttpResponse<Object>> {

    @Override
    public HttpResponse<Object> handle(HttpRequest request, ConversionErrorException e) {
        String field = e.getArgument() == null || e.getArgument().getAnnotationMetadata().hasAnnotation(Body.class)
                ? "body"
                : e.getArgument().getName();
        return Responses.of(ViewModel.problem(ProblemJson.malformed(List.of(field + ": cannot be read"))));
    }
}
