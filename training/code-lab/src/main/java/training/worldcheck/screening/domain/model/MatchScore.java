package training.worldcheck.screening.domain.model;

import training.worldcheck.screening.domain.DomainException;

public record MatchScore(int value) implements Comparable<MatchScore> {

    public MatchScore {
        if (value < 0 || value > 100) {
            throw DomainException.invalid("Match score must be 0-100: " + value);
        }
    }

    public static MatchScore clamped(double raw) {
        return new MatchScore((int) Math.round(Math.max(0, Math.min(100, raw))));
    }

    public boolean isAtLeast(int threshold) {
        return value >= threshold;
    }

    @Override
    public int compareTo(MatchScore other) {
        return Integer.compare(value, other.value);
    }
}
