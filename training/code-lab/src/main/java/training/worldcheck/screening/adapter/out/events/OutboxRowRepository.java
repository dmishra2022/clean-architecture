package training.worldcheck.screening.adapter.out.events;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.micronaut.data.annotation.Id;
import io.micronaut.data.jdbc.annotation.JdbcRepository;
import io.micronaut.data.model.Pageable;
import io.micronaut.data.model.query.builder.sql.Dialect;
import io.micronaut.data.repository.CrudRepository;

@JdbcRepository(dialect = Dialect.H2)
interface OutboxRowRepository extends CrudRepository<OutboxRow, UUID> {

    List<OutboxRow> findByPublishedAtIsNull(Pageable pageable);

    long countByPublishedAtIsNull();

    void update(@Id UUID id, Instant publishedAt);
}
