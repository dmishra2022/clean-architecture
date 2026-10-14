package training.clean.screening.adapters.events;

import java.util.LinkedHashMap;
import java.util.Map;

import training.clean.screening.entities.event.CaseClosed;
import training.clean.screening.entities.event.CaseOpened;
import training.clean.screening.entities.event.CaseScreened;
import training.clean.screening.entities.event.DomainEvent;
import training.clean.screening.entities.event.MatchResolved;

/**
 * The published language of this bounded context, version 1: the JSON other contexts receive. Changing a field
 * here is a contract change for every consumer, so it is written by hand, field by field.
 */
public final class EventJson {

    public static final int SCHEMA_VERSION = 1;

    private EventJson() {
    }

    public static String of(DomainEvent event) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("schemaVersion", SCHEMA_VERSION);
        fields.put("eventId", event.eventId().toString());
        fields.put("type", event.type());
        fields.put("caseId", event.caseId().toString());
        fields.put("clientGroupId", event.clientGroup().value());
        fields.put("occurredAt", event.occurredAt().toString());
        switch (event) {
            case CaseOpened e -> fields.put("entityType", e.entityType().name());
            case CaseScreened e -> {
                fields.put("newMatches", e.newMatches());
                fields.put("totalMatches", e.totalMatches());
                fields.put("screeningCount", e.screeningCount());
            }
            case MatchResolved e -> {
                fields.put("matchId", e.matchId().toString());
                fields.put("profileId", e.profileId().value());
                fields.put("previousResolution", e.previous().name());
                fields.put("resolution", e.resolution().name());
                fields.put("analystId", e.analyst().value());
            }
            case CaseClosed e -> {
                fields.put("outcome", e.outcome().name());
                fields.put("closedBy", e.closedBy().value());
            }
        }
        return write(fields);
    }

    static String write(Map<String, Object> fields) {
        StringBuilder json = new StringBuilder("{");
        fields.forEach((name, value) -> {
            if (json.length() > 1) {
                json.append(',');
            }
            json.append(quote(name)).append(':').append(value instanceof Number ? value.toString() : quote(String.valueOf(value)));
        });
        return json.append('}').toString();
    }

    static String quote(String s) {
        StringBuilder out = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.append('"').toString();
    }
}
