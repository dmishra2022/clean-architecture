package training.worldcheck.screening.adapter.out.persistence;

import java.util.UUID;

import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;

/** SQL for these methods is generated at compile time by the Micronaut Data annotation processor. */
@JdbcRepository(dialect = Dialect.H2)
interface CaseRowRepository extends CrudRepository<CaseRow, UUID> {
}
