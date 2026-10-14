package training.clean.screening.app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.UUID;

import io.micronaut.http.HttpHeaders;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MutableHttpRequest;
import io.micronaut.http.client.BlockingHttpClient;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import training.clean.screening.adapters.events.IntegrationEvent;
import training.clean.screening.adapters.events.OutboxRelay;
import training.clean.screening.adapters.web.CaseJson;
import training.clean.screening.adapters.web.ProblemJson;
import training.clean.screening.adapters.web.WorkQueueJson;
import training.clean.screening.app.events.LoggingEventSink;

/** All four rings, real drivers: HTTP in, H2 and the outbox out, seeded in-memory reference data. */
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
    private String group;
    private String base;

    @BeforeEach
    void setUp() {
        http = httpClient.toBlocking();
        group = "bank-" + UUID.randomUUID().toString().substring(0, 8);
        base = "/api/v1/client-groups/" + group + "/cases";
    }

    @Test
    void screenResolveAndCloseACase() {
        HttpResponse<CaseJson> created = http.exchange(HttpRequest.POST(base, Map.of("name", "Viktor Albescu",
                "entityType", "INDIVIDUAL", "dateOfBirth", "1961-03-14", "country", "RO")), CaseJson.class);
        CaseJson opened = created.body();
        assertThat(created.code()).isEqualTo(201);
        assertThat(created.header(HttpHeaders.LOCATION)).isEqualTo(base + "/" + opened.caseId());
        assertThat(opened.allowedActions()).containsExactly("screen");

        CaseJson screened = http.retrieve(HttpRequest.POST(base + "/" + opened.caseId() + "/screenings", ""),
                CaseJson.class);
        assertThat(screened.status()).isEqualTo("PENDING_REVIEW");
        assertThat(screened.statusLabel()).isEqualTo("Waiting for analyst review");
        assertThat(screened.matches()).extracting(CaseJson.MatchJson::profileId).containsExactly("WC-1001");

        String matchId = screened.matches().getFirst().matchId();
        CaseJson resolved = http.retrieve(HttpRequest.PUT(
                base + "/" + opened.caseId() + "/matches/" + matchId + "/resolution",
                Map.of("resolution", "POSITIVE", "rationale", "DOB and nationality match the listing",
                        "analystId", "alice")), CaseJson.class);
        assertThat(resolved.allowedActions()).contains("close");

        CaseJson closed = http.retrieve(HttpRequest.POST(base + "/" + opened.caseId() + "/closure",
                Map.of("analystId", "alice")), CaseJson.class);
        assertThat(closed.status()).isEqualTo("CLOSED");
        assertThat(closed.outcome()).isEqualTo("RISK_CONFIRMED");
        assertThat(closed.allowedActions()).isNotNull().isEmpty();

        relay.publishPending();
        assertThat(sink.recent())
                .filteredOn(e -> e.caseId().toString().equals(opened.caseId()))
                .extracting(IntegrationEvent::type)
                .containsExactly("CaseOpened", "CaseScreened", "MatchResolved", "CaseClosed");
        assertThat(relay.pendingCount()).isZero();
    }

    @Test
    void anIdempotentReplayReturnsTheSameCaseWith200() {
        Map<String, String> body = Map.of("name", "Lucia Ferrante", "entityType", "INDIVIDUAL");
        HttpResponse<CaseJson> first = http.exchange(withKey(HttpRequest.POST(base, body)), CaseJson.class);
        HttpResponse<CaseJson> second = http.exchange(withKey(HttpRequest.POST(base, body)), CaseJson.class);

        assertThat(first.code()).isEqualTo(201);
        assertThat(second.code()).isEqualTo(200);
        assertThat(second.body().caseId()).isEqualTo(first.body().caseId());
    }

    @Test
    void casesAreInvisibleToOtherClientGroups() {
        CaseJson opened = open("Lucia Ferrante");

        assertThat(failure(HttpRequest.GET("/api/v1/client-groups/someone-else/cases/" + opened.caseId())).code())
                .isEqualTo(404);
    }

    @Test
    void aMalformedFormIs400FromTheControllerWithFieldErrors() {
        HttpClientResponseException e = failure(HttpRequest.POST(base, Map.of("name", "", "entityType", "ROBOT")));

        assertThat(e.code()).isEqualTo(400);
        assertThat(e.getResponse().getBody(ProblemJson.class)).hasValueSatisfying(p -> {
            assertThat(p.rule()).isEqualTo(ProblemJson.MALFORMED_REQUEST);
            assertThat(p.errors()).hasSize(2);
        });
    }

    @Test
    void anUnreadableBodyIs400WithTheSameProblemShape() {
        HttpClientResponseException e = failure(HttpRequest.POST(base,
                Map.of("name", "Lucia Ferrante", "entityType", "INDIVIDUAL", "dateOfBirth", "not-a-date")));

        assertThat(e.code()).isEqualTo(400);
        assertThat(e.getResponse().getBody(ProblemJson.class)).hasValueSatisfying(p -> {
            assertThat(p.rule()).isEqualTo(ProblemJson.MALFORMED_REQUEST);
            assertThat(p.errors()).containsExactly("body: cannot be read");
        });
    }

    @Test
    void anInvalidDomainValueIs400WithTheEntitiesRule() {
        HttpClientResponseException e = failure(HttpRequest.POST(base,
                Map.of("name", "Northwind Capital", "entityType", "ORGANISATION", "dateOfBirth", "1990-01-01")));

        assertThat(e.code()).isEqualTo(400);
        assertThat(e.getResponse().getBody(ProblemJson.class)).hasValueSatisfying(
                p -> assertThat(p.rule()).isEqualTo("INVALID_VALUE"));
    }

    @Test
    void breakingABusinessRuleIs422WithTheRule() {
        CaseJson opened = open("Viktor Albescu");
        http.retrieve(HttpRequest.POST(base + "/" + opened.caseId() + "/screenings", ""), CaseJson.class);

        HttpClientResponseException e = failure(
                HttpRequest.POST(base + "/" + opened.caseId() + "/closure", Map.of("analystId", "alice")));

        assertThat(e.code()).isEqualTo(422);
        assertThat(e.getResponse().getBody(ProblemJson.class)).hasValueSatisfying(
                p -> assertThat(p.rule()).isEqualTo("MATCHES_AWAITING_REVIEW"));
    }

    @Test
    void theWorkQueueListsOpenCasesInTriageOrder() {
        CaseJson quiet = open("Lucia Ferrante");
        CaseJson hot = open("Viktor Ionel Albescu");
        http.retrieve(HttpRequest.POST(base + "/" + hot.caseId() + "/screenings", ""), CaseJson.class);

        WorkQueueJson queue = http.retrieve(
                HttpRequest.GET("/api/v1/client-groups/" + group + "/work-queue?limit=10"), WorkQueueJson.class);

        assertThat(queue.items()).extracting(WorkQueueJson.ItemJson::caseId)
                .containsExactly(hot.caseId(), quiet.caseId());
        assertThat(queue.items()).extracting(WorkQueueJson.ItemJson::priority).containsExactly("HIGH", "LOW");
        assertThat(failure(HttpRequest.GET("/api/v1/client-groups/" + group + "/work-queue?limit=0")).code())
                .isEqualTo(400);
    }

    private CaseJson open(String name) {
        return http.retrieve(HttpRequest.POST(base, Map.of("name", name, "entityType", "INDIVIDUAL")),
                CaseJson.class);
    }

    private static <T> MutableHttpRequest<T> withKey(MutableHttpRequest<T> request) {
        return request.header("Idempotency-Key", "onboarding-42");
    }

    private HttpClientResponseException failure(HttpRequest<?> request) {
        try {
            http.exchange(request, CaseJson.class);
        } catch (HttpClientResponseException e) {
            return e;
        }
        throw new AssertionError("Expected an error response");
    }
}
