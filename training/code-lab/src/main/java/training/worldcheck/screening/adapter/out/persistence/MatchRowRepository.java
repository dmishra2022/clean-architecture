package training.worldcheck.screening.adapter.out.persistence;

import java.util.List;
import java.util.UUID;

import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;

@JdbcRepository(dialect = Dialect.H2)
interface MatchRowRepository extends CrudRepository<MatchRow, UUID> {

    List<MatchRow> findByCaseIdOrderByScoreDesc(UUID caseId);
}
