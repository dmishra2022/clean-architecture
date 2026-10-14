package training.clean.screening.app.web;

import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.MutableHttpResponse;
import training.clean.screening.adapters.web.ViewModel;

/** Copies a view model into an HTTP response. No branching on meaning: every decision was made by a presenter. */
final class Responses {

    private Responses() {
    }

    static MutableHttpResponse<Object> of(ViewModel vm) {
        MutableHttpResponse<Object> response = HttpResponse.status(HttpStatus.valueOf(vm.status()));
        response.contentType(MediaType.of(vm.contentType()));
        if (vm.location() != null) {
            response.header(HttpHeaders.LOCATION, vm.location());
        }
        if (vm.body() != null) {
            response.body(vm.body());
        }
        return response;
    }
}
