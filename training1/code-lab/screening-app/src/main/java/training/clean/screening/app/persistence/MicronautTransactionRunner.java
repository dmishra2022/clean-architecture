package training.clean.screening.app.persistence;

import java.sql.Connection;
import java.util.function.Supplier;

import io.micronaut.transaction.TransactionOperations;
import jakarta.inject.Singleton;
import training.clean.screening.usecases.gateway.TransactionRunner;

/**
 * The use cases' transaction boundary, implemented with Micronaut's programmatic transactions. Every repository
 * call inside {@code work} joins the same JDBC connection; a runtime exception rolls everything back, outbox rows
 * included.
 */
@Singleton
class MicronautTransactionRunner implements TransactionRunner {

    private final TransactionOperations<Connection> transactions;

    MicronautTransactionRunner(TransactionOperations<Connection> transactions) {
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
