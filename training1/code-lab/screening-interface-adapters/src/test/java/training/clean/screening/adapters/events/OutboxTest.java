package training.clean.screening.adapters.events;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import training.clean.screening.adapters.reference.InMemoryReferenceData;
import training.clean.screening.entities.event.DomainEvent;
import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.Match;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.Resolution;
import training.clean.screening.entities.model.ResolutionRationale;
import training.clean.screening.entities.model.ScreeningCase;
import training.clean.screening.entities.policy.NameMatchingPolicy;

class OutboxTest {

    private static final Instant NOW = Instant.parse("2026-10-11T09:00:00Z");

    private final InMemoryOutboxRecords records = new InMemoryOutboxRecords();
    private final OutboxEventGateway gateway = new OutboxEventGateway(records);

    @Test
    void everyEventIsWrittenInThePublishedLanguage() {
        List<DomainEvent> events = lifecycle();
        gateway.append(events);
        int matches = events.size() - 3;

        assertThat(matches).isPositive();
        assertThat(records.rows).extracting(OutboxRecord::eventType)
                .startsWith("CaseOpened", "CaseScreened", "MatchResolved").endsWith("CaseClosed")
                .filteredOn("MatchResolved"::equals).hasSize(matches);
        assertThat(records.rows).extracting(OutboxRecord::id)
                .containsExactlyElementsOf(events.stream().map(DomainEvent::eventId).toList());

        String opened = records.rows.getFirst().payload();
        assertThat(opened).startsWith("{\"schemaVersion\":1,\"eventId\":\"")
                .contains("\"type\":\"CaseOpened\"", "\"clientGroupId\":\"acme-bank\"",
                        "\"occurredAt\":\"2026-10-11T09:00:00Z\"", "\"entityType\":\"INDIVIDUAL\"");
        assertThat(records.rows.get(1).payload()).contains("\"newMatches\":" + matches, "\"totalMatches\":" + matches,
                "\"screeningCount\":1");
        assertThat(records.rows.get(2).payload()).contains("\"previousResolution\":\"UNRESOLVED\"",
                "\"resolution\":\"FALSE_POSITIVE\"", "\"analystId\":\"analyst-1\"");
        assertThat(records.rows.getLast().payload()).contains("\"outcome\":\"CLEAR\"", "\"closedBy\":\"analyst-2\"");
    }

    @Test
    void stringsAreEscaped() {
        assertThat(EventJson.quote("a \"b\"\\\n")).isEqualTo("\"a \\\"b\\\"\\\\\\n\"");
    }

    @Test
    void theRelayDeliversInOrderAndMarksEachRow() {
        List<DomainEvent> events = lifecycle();
        gateway.append(events);
        List<IntegrationEvent> delivered = new ArrayList<>();
        OutboxRelay relay = new OutboxRelay(records, delivered::add, Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(relay.publishPending()).isEqualTo(events.size());

        assertThat(delivered).extracting(IntegrationEvent::eventId)
                .containsExactlyElementsOf(events.stream().map(DomainEvent::eventId).toList());
        assertThat(relay.pendingCount()).isZero();
        assertThat(relay.publishPending()).isZero();
    }

    @Test
    void theRelayStopsAtTheFirstFailureAndRetriesFromThere() {
        List<DomainEvent> events = lifecycle();
        gateway.append(events);
        List<String> delivered = new ArrayList<>();
        boolean[] brokerDown = {false};
        OutboxRelay relay = new OutboxRelay(records, event -> {
            if (brokerDown[0] || (event.type().equals("MatchResolved") && delivered.size() == 2)) {
                brokerDown[0] = true;
                throw new IllegalStateException("broker unavailable");
            }
            delivered.add(event.type());
        }, Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(relay.publishPending()).isEqualTo(2);
        assertThat(relay.pendingCount()).isEqualTo(events.size() - 2);

        brokerDown[0] = false;
        delivered.add("--broker back--");
        assertThat(relay.publishPending()).isEqualTo(events.size() - 2);
        assertThat(delivered).startsWith("CaseOpened", "CaseScreened", "--broker back--", "MatchResolved")
                .endsWith("CaseClosed").hasSize(events.size() + 1);
    }

    /** Open, screen (Albescu hits), clear every match, close: at least one of each event type. */
    private static List<DomainEvent> lifecycle() {
        Party party = new Party(new PartyName("Viktor Albescu"), EntityType.INDIVIDUAL, LocalDate.of(1961, 3, 14),
                new CountryCode("RO"));
        ScreeningCase c = ScreeningCase.open(CaseId.newId(), new ClientGroupId("acme-bank"), party, NOW);
        c.screen(InMemoryReferenceData.PROFILES, new NameMatchingPolicy(NameMatchingPolicy.DEFAULT_THRESHOLD), NOW);
        for (Match m : c.matches()) {
            c.resolveMatch(m.id(), Resolution.FALSE_POSITIVE, new ResolutionRationale("Different date of birth"),
                    new AnalystId("analyst-1"), NOW);
        }
        c.close(new AnalystId("analyst-2"), NOW);
        return c.pullEvents();
    }
}
