package training.clean.screening.adapters.web;

/**
 * Everything the web framework needs to write a response, already decided: status, media type, location and body.
 * The framework-side endpoint copies it into an HTTP response without making a single decision of its own
 * (humble object), so all response logic is testable here without starting a server.
 */
public record ViewModel(int status, String contentType, String location, Object body) {

    public static final String JSON = "application/json";
    public static final String PROBLEM_JSON = "application/problem+json";

    public static ViewModel ok(Object body) {
        return new ViewModel(200, JSON, null, body);
    }

    public static ViewModel created(String location, Object body) {
        return new ViewModel(201, JSON, location, body);
    }

    public static ViewModel problem(ProblemJson problem) {
        return new ViewModel(problem.status(), PROBLEM_JSON, null, problem);
    }
}
