package training.clean.screening.adapters.persistence;

import java.util.List;

import training.clean.screening.entities.model.AnalystId;
import training.clean.screening.entities.model.CaseId;
import training.clean.screening.entities.model.CaseOutcome;
import training.clean.screening.entities.model.CaseSnapshot;
import training.clean.screening.entities.model.CaseStatus;
import training.clean.screening.entities.model.ClientGroupId;
import training.clean.screening.entities.model.CountryCode;
import training.clean.screening.entities.model.EntityType;
import training.clean.screening.entities.model.MatchId;
import training.clean.screening.entities.model.MatchScore;
import training.clean.screening.entities.model.MatchSnapshot;
import training.clean.screening.entities.model.Party;
import training.clean.screening.entities.model.PartyName;
import training.clean.screening.entities.model.ProfileId;
import training.clean.screening.entities.model.Resolution;
import training.clean.screening.entities.model.ResolutionRationale;
import training.clean.screening.entities.model.RiskCategory;

/** Translates between the aggregate's memento and table records, in both directions. */
final class CaseRecordMapper {

    private CaseRecordMapper() {
    }

    static CaseRecord toRecord(CaseSnapshot s) {
        Party party = s.party();
        return new CaseRecord(
                s.id().value(),
                s.clientGroup().value(),
                party.name().value(),
                party.type().name(),
                party.dateOfBirth(),
                party.country() == null ? null : party.country().value(),
                s.status().name(),
                s.outcome() == null ? null : s.outcome().name(),
                s.screeningCount(),
                s.openedAt(),
                s.lastScreenedAt(),
                s.closedAt(),
                s.closedBy() == null ? null : s.closedBy().value(),
                s.version());
    }

    static MatchRecord toRecord(CaseId caseId, MatchSnapshot m) {
        return new MatchRecord(
                m.id().value(),
                caseId.value(),
                m.profileId().value(),
                m.category().name(),
                m.matchedName(),
                m.score().value(),
                m.resolution().name(),
                m.rationale() == null ? null : m.rationale().value(),
                m.resolvedBy() == null ? null : m.resolvedBy().value(),
                m.resolvedAt());
    }

    static CaseSnapshot toSnapshot(CaseRecord r, List<MatchRecord> matches) {
        Party party = new Party(
                new PartyName(r.partyName()),
                EntityType.valueOf(r.entityType()),
                r.dateOfBirth(),
                CountryCode.ofNullable(r.country()));
        return new CaseSnapshot(
                new CaseId(r.id()),
                new ClientGroupId(r.clientGroupId()),
                party,
                CaseStatus.valueOf(r.status()),
                r.outcome() == null ? null : CaseOutcome.valueOf(r.outcome()),
                r.screeningCount(),
                r.openedAt(),
                r.lastScreenedAt(),
                r.closedAt(),
                r.closedBy() == null ? null : new AnalystId(r.closedBy()),
                r.version(),
                matches.stream().map(CaseRecordMapper::toSnapshot).toList());
    }

    static MatchSnapshot toSnapshot(MatchRecord r) {
        return new MatchSnapshot(
                new MatchId(r.id()),
                new ProfileId(r.profileId()),
                RiskCategory.valueOf(r.category()),
                r.matchedName(),
                new MatchScore(r.score()),
                Resolution.valueOf(r.resolution()),
                r.rationale() == null ? null : new ResolutionRationale(r.rationale()),
                r.resolvedBy() == null ? null : new AnalystId(r.resolvedBy()),
                r.resolvedAt());
    }
}
