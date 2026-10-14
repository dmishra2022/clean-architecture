package training.worldcheck.screening.config;

import io.micronaut.context.annotation.ConfigurationProperties;
import io.micronaut.core.bind.annotation.Bindable;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** Bound from {@code screening.matching.*} at startup; invalid values fail fast before traffic arrives. */
@ConfigurationProperties("screening.matching")
public record MatchingProperties(@Bindable(defaultValue = "80") @Min(50) @Max(100) int threshold) {
}
