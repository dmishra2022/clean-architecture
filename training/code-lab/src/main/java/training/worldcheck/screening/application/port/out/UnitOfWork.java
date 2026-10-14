package training.worldcheck.screening.application.port.out;

import java.util.function.Supplier;

/**
 * Driven port for transaction boundaries. The application layer decides where a transaction starts and
 * ends; the adapter decides how (JDBC, JTA, nothing at all in unit tests).
 */
public interface UnitOfWork {

    <T> T write(Supplier<T> work);

    <T> T read(Supplier<T> work);
}
