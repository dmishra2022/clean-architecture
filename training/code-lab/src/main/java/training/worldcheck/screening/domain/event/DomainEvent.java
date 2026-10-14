package training.worldcheck.screening.domain.event;

import java.time.Instant;
import java.util.UUID;

import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.ClientGroupId;

/** Something that happened to a case, named in the past tense, in the language of the business. */
public sealed interface DomainEvent permits CaseOpened, CaseScreened, MatchResolved, CaseClosed {

    UUID eventId();

    CaseId caseId();

    ClientGroupId clientGroup();

    Instant occurredAt();

    default String type() {
        return getClass().getSimpleName();
    }
}
