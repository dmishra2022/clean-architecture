package training.worldcheck.screening.adapter.out.persistence;

import java.util.List;

import training.worldcheck.screening.domain.model.AnalystId;
import training.worldcheck.screening.domain.model.CaseId;
import training.worldcheck.screening.domain.model.CaseOutcome;
import training.worldcheck.screening.domain.model.CaseSnapshot;
import training.worldcheck.screening.domain.model.CaseStatus;
import training.worldcheck.screening.domain.model.ClientGroupId;
import training.worldcheck.screening.domain.model.CountryCode;
import training.worldcheck.screening.domain.model.EntityType;
import training.worldcheck.screening.domain.model.MatchId;
import training.worldcheck.screening.domain.model.MatchScore;
import training.worldcheck.screening.domain.model.MatchSnapshot;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.PartyName;
import training.worldcheck.screening.domain.model.ProfileId;
import training.worldcheck.screening.domain.model.Resolution;
import training.worldcheck.screening.domain.model.ResolutionRationale;
import training.worldcheck.screening.domain.model.RiskCategory;

/** Translates between the domain memento and table rows, in both directions. */
final class CaseRowMapper {

    private CaseRowMapper() {
    }

    static CaseRow toRow(CaseSnapshot s) {
        Party party = s.party();
        return new CaseRow(
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

    static MatchRow toRow(CaseId caseId, MatchSnapshot m) {
        return new MatchRow(
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

    static CaseSnapshot toSnapshot(CaseRow row, List<MatchRow> matchRows) {
        Party party = new Party(
                new PartyName(row.partyName()),
                EntityType.valueOf(row.entityType()),
                row.dateOfBirth(),
                CountryCode.ofNullable(row.country()));
        return new CaseSnapshot(
                new CaseId(row.id()),
                new ClientGroupId(row.clientGroupId()),
                party,
                CaseStatus.valueOf(row.status()),
                row.outcome() == null ? null : CaseOutcome.valueOf(row.outcome()),
                row.screeningCount(),
                row.openedAt(),
                row.lastScreenedAt(),
                row.closedAt(),
                row.closedBy() == null ? null : new AnalystId(row.closedBy()),
                row.version(),
                matchRows.stream().map(CaseRowMapper::toSnapshot).toList());
    }

    static MatchSnapshot toSnapshot(MatchRow row) {
        return new MatchSnapshot(
                new MatchId(row.id()),
                new ProfileId(row.profileId()),
                RiskCategory.valueOf(row.category()),
                row.matchedName(),
                new MatchScore(row.score()),
                Resolution.valueOf(row.resolution()),
                row.rationale() == null ? null : new ResolutionRationale(row.rationale()),
                row.resolvedBy() == null ? null : new AnalystId(row.resolvedBy()),
                row.resolvedAt());
    }
}
