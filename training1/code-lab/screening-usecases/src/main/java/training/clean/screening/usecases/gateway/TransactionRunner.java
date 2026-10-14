package training.clean.screening.usecases.gateway;

import java.util.function.Supplier;

/**
 * The use case decides where a transaction starts and ends; the outer rings decide how (JDBC, JTA, nothing at
 * all in unit tests). A runtime exception thrown by {@code work} rolls everything back.
 */
public interface TransactionRunner {

    <T> T write(Supplier<T> work);

    <T> T read(Supplier<T> work);
}
