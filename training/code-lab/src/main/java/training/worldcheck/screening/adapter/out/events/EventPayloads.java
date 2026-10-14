package training.worldcheck.screening.adapter.out.events;

import java.util.LinkedHashMap;
import java.util.Map;

import training.worldcheck.screening.domain.event.CaseClosed;
import training.worldcheck.screening.domain.event.CaseOpened;
import training.worldcheck.screening.domain.event.CaseScreened;
import training.worldcheck.screening.domain.event.DomainEvent;
import training.worldcheck.screening.domain.event.MatchResolved;

/**
 * Published language: the integration-event shape other contexts depend on. Changing a field here is an API
 * change, which is why it is mapped explicitly instead of serialising domain records directly.
 */
final class EventPayloads {

    static final int SCHEMA_VERSION = 1;

    private EventPayloads() {
    }

    static Map<String, Object> of(DomainEvent event) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("schemaVersion", SCHEMA_VERSION);
        payload.put("eventId", event.eventId().toString());
        payload.put("type", event.type());
        payload.put("caseId", event.caseId().toString());
        payload.put("clientGroupId", event.clientGroup().value());
        payload.put("occurredAt", event.occurredAt().toString());
        switch (event) {
            case CaseOpened e -> payload.put("entityType", e.entityType().name());
            case CaseScreened e -> {
                payload.put("newMatches", e.newMatches());
                payload.put("totalMatches", e.totalMatches());
                payload.put("screeningCount", e.screeningCount());
            }
            case MatchResolved e -> {
                payload.put("matchId", e.matchId().toString());
                payload.put("profileId", e.profileId().value());
                payload.put("previousResolution", e.previous().name());
                payload.put("resolution", e.resolution().name());
                payload.put("analystId", e.analyst().value());
            }
            case CaseClosed e -> {
                payload.put("outcome", e.outcome().name());
                payload.put("closedBy", e.closedBy().value());
            }
        }
        return payload;
    }
}
