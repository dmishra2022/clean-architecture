package training.worldcheck.screening.adapter.out.persistence;

import java.sql.Connection;
import java.util.function.Supplier;

import io.micronaut.transaction.TransactionOperations;
import jakarta.inject.Singleton;
import training.worldcheck.screening.application.port.out.UnitOfWork;

/**
 * Implements the application's transaction boundary with Micronaut's programmatic transactions.
 * Every repository call made inside {@code work} joins the same JDBC connection; a runtime exception
 * rolls everything back, outbox rows included.
 */
@Singleton
class JdbcUnitOfWork implements UnitOfWork {

    private final TransactionOperations<Connection> transactions;

    JdbcUnitOfWork(TransactionOperations<Connection> transactions) {
        this.transactions = transactions;
    }

    @Override
    public <T> T write(Supplier<T> work) {
        return transactions.executeWrite(status -> work.get());
    }

    @Override
    public <T> T read(Supplier<T> work) {
        return transactions.executeRead(status -> work.get());
    }
}
