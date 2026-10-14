package training.clean.screening.adapters.web;

import java.util.List;

/** RFC 9457 problem details, plus the stable rule code and, for malformed requests, the field errors. */
public record ProblemJson(String type, String title, int status, String detail, String rule, List<String> errors) {

    public static final String MALFORMED_REQUEST = "MALFORMED_REQUEST";

    public static ProblemJson of(int status, String title, String detail, String rule) {
        return new ProblemJson("about:blank", title, status, detail, rule, null);
    }

    public static ProblemJson malformed(List<String> errors) {
        return new ProblemJson("about:blank", "Malformed request", 400, String.join("; ", errors), MALFORMED_REQUEST,
                List.copyOf(errors));
    }
}
