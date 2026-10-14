package training.clean.screening.app.persistence;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import io.micronaut.data.annotation.Id;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;

/** SQL for every method below is generated at compile time by the Micronaut Data annotation processor. */
final class Repositories {

    private Repositories() {
    }

    @JdbcRepository(dialect = Dialect.H2)
    interface CaseRows extends CrudRepository<CaseRow, UUID> {

        List<CaseRow> findByClientGroupIdAndStatusInList(String clientGroupId, Collection<String> status);
    }

    @JdbcRepository(dialect = Dialect.H2)
    interface MatchRows extends CrudRepository<MatchRow, UUID> {

        List<MatchRow> findByCaseIdOrderByScoreDesc(UUID caseId);

        List<MatchRow> findByCaseIdInList(Collection<UUID> caseId);
    }

    @JdbcRepository(dialect = Dialect.H2)
    interface IdempotencyRows extends CrudRepository<IdempotencyRow, String> {
    }

    @JdbcRepository(dialect = Dialect.H2)
    interface OutboxRows extends CrudRepository<OutboxRow, UUID> {

        List<OutboxRow> findByPublishedAtIsNull(Pageable pageable);

        long countByPublishedAtIsNull();

        void update(@Id UUID id, Instant publishedAt);
    }
}
