package training.worldcheck.screening.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.UUID;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import training.worldcheck.screening.adapter.in.rest.ApiModels.CaseResponse;
import training.worldcheck.screening.adapter.in.rest.ApiModels.Problem;
import training.worldcheck.screening.adapter.out.events.IntegrationEvent;
import training.worldcheck.screening.adapter.out.events.LoggingEventSink;
import training.worldcheck.screening.adapter.out.events.OutboxRelay;

/** Whole hexagon, real adapters: HTTP in, H2 + outbox out, seeded in-memory reference data. */
@MicronautTest
class CaseApiTest {

    @Inject
    @Client("/")
    HttpClient httpClient;

    @Inject
    OutboxRelay relay;

    @Inject
    LoggingEventSink sink;

    private BlockingHttpClient http;
    private String base;

    @BeforeEach
    void setUp() {
        http = httpClient.toBlocking();
        base = "/api/v1/client-groups/bank-" + UUID.randomUUID().toString().substring(0, 8) + "/cases";
    }

    @Test
    void screenResolveAndCloseACase() {
        CaseResponse opened = open(Map.of("name", "Viktor Albescu", "entityType", "INDIVIDUAL",
                "dateOfBirth", "1961-03-14", "country", "RO"), null);
        assertThat(opened.status()).isEqualTo("CREATED");

        CaseResponse screened = http.retrieve(HttpRequest.POST(base + "/" + opened.caseId() + "/screenings", ""),
                CaseResponse.class);
        assertThat(screened.status()).isEqualTo("PENDING_REVIEW");
        assertThat(screened.matches()).extracting(ApiModels.MatchResponse::profileId).containsExactly("WC-1001");

        String matchId = screened.matches().getFirst().matchId();
        CaseResponse resolved = http.retrieve(HttpRequest.PUT(
                base + "/" + opened.caseId() + "/matches/" + matchId + "/resolution",
                Map.of("resolution", "POSITIVE", "rationale", "DOB and nationality match the listing",
                        "analystId", "alice")), CaseResponse.class);
        assertThat(resolved.status()).isEqualTo("REVIEWED");

        CaseResponse closed = http.retrieve(HttpRequest.POST(base + "/" + opened.caseId() + "/closure",
                Map.of("analystId", "alice")), CaseResponse.class);
        assertThat(closed.status()).isEqualTo("CLOSED");
        assertThat(closed.outcome()).isEqualTo("RISK_CONFIRMED");

        relay.publishPending();
        assertThat(sink.recent())
                .filteredOn(e -> e.caseId().toString().equals(opened.caseId()))
                .extracting(IntegrationEvent::type)
                .containsExactly("CaseOpened", "CaseScreened", "MatchResolved", "CaseClosed");
        assertThat(relay.pendingCount()).isZero();
    }

    @Test
    void repeatingARequestWithTheSameIdempotencyKeyReturnsTheSameCase() {
        Map<String, String> body = Map.of("name", "Lucia Ferrante", "entityType", "INDIVIDUAL");
        CaseResponse first = open(body, "onboarding-42");
        CaseResponse second = open(body, "onboarding-42");

        assertThat(second.caseId()).isEqualTo(first.caseId());
    }

    @Test
    void casesAreInvisibleToOtherClientGroups() {
        CaseResponse opened = open(Map.of("name", "Lucia Ferrante", "entityType", "INDIVIDUAL"), null);

        assertThatThrownBy(() -> http.retrieve(
                HttpRequest.GET("/api/v1/client-groups/someone-else/cases/" + opened.caseId()), CaseResponse.class))
                .isInstanceOfSatisfying(HttpClientResponseException.class,
                        e -> assertThat(e.getStatus().getCode()).isEqualTo(HttpStatus.NOT_FOUND.getCode()));
    }

    @Test
    void malformedInputIsA400() {
        HttpClientResponseException e = failure(HttpRequest.POST(base, Map.of("name", "", "entityType", "ROBOT")));
        assertThat(e.getStatus().getCode()).isEqualTo(HttpStatus.BAD_REQUEST.getCode());
    }

    @Test
    void anInvalidDomainValueIsA400WithTheRule() {
        HttpClientResponseException e = failure(HttpRequest.POST(base,
                Map.of("name", "Northwind Capital", "entityType", "ORGANISATION", "dateOfBirth", "1990-01-01")));
        assertThat(e.getStatus().getCode()).isEqualTo(HttpStatus.BAD_REQUEST.getCode());
        assertThat(e.getResponse().getBody(Problem.class)).hasValueSatisfying(
                p -> assertThat(p.rule()).isEqualTo("INVALID_VALUE"));
    }

    @Test
    void breakingABusinessRuleIsA422WithTheRule() {
        CaseResponse opened = open(Map.of("name", "Viktor Albescu", "entityType", "INDIVIDUAL"), null);
        http.retrieve(HttpRequest.POST(base + "/" + opened.caseId() + "/screenings", ""), CaseResponse.class);

        HttpClientResponseException e = failure(
                HttpRequest.POST(base + "/" + opened.caseId() + "/closure", Map.of("analystId", "alice")));

        assertThat(e.getStatus().getCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY.getCode());
        assertThat(e.getResponse().getBody(Problem.class)).hasValueSatisfying(
                p -> assertThat(p.rule()).isEqualTo("MATCHES_AWAITING_REVIEW"));
    }

    private CaseResponse open(Map<String, String> body, String idempotencyKey) {
        var request = HttpRequest.POST(base, body);
        if (idempotencyKey != null) {
            request.header("Idempotency-Key", idempotencyKey);
        }
        HttpResponse<CaseResponse> response = http.exchange(request, CaseResponse.class);
        assertThat(response.getStatus().getCode()).isEqualTo(HttpStatus.CREATED.getCode());
        return response.body();
    }

    private HttpClientResponseException failure(HttpRequest<?> request) {
        try {
            http.exchange(request, CaseResponse.class);
        } catch (HttpClientResponseException e) {
            return e;
        }
        throw new AssertionError("Expected an error response");
    }
}
