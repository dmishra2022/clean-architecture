package training.worldcheck.screening.domain.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;

import training.worldcheck.screening.domain.DomainException;
import training.worldcheck.screening.domain.model.CountryCode;
import training.worldcheck.screening.domain.model.EntityType;
import training.worldcheck.screening.domain.model.MatchScore;
import training.worldcheck.screening.domain.model.Party;
import training.worldcheck.screening.domain.model.PartyName;
import training.worldcheck.screening.domain.model.ReferenceProfile;

/**
 * Domain service: scoring a party against a profile does not belong to either object, so it lives here.
 * <p>
 * Score = best name similarity across the profile's names (0-100), then adjusted by secondary identifiers:
 * same date of birth +8, different birth year -30, same country +4, different country -8. Different entity
 * types never match. A match is reported when the final score reaches the threshold.
 * <p>
 * The training course's browser simulator implements the same algorithm in JavaScript.
 */
public final class NameMatchingPolicy {

    public static final int DEFAULT_THRESHOLD = 80;

    static final int SAME_DOB = 8;
    static final int DIFFERENT_BIRTH_YEAR = -30;
    static final int SAME_COUNTRY = 4;
    static final int DIFFERENT_COUNTRY = -8;

    private static final Set<String> ORGANISATION_NOISE = Set.of(
            "LTD", "LIMITED", "LLC", "INC", "PLC", "CORP", "CORPORATION", "CO", "GMBH", "SA", "AG", "BV");

    private final int threshold;

    public NameMatchingPolicy(int threshold) {
        if (threshold < 50 || threshold > 100) {
            throw DomainException.invalid("Matching threshold must be 50-100: " + threshold);
        }
        this.threshold = threshold;
    }

    public int threshold() {
        return threshold;
    }

    public Optional<MatchEvaluation> evaluate(Party party, ReferenceProfile profile) {
        if (party.type() != profile.type()) {
            return Optional.empty();
        }
        List<String> partyTokens = meaningfulTokens(party.name().value(), party.type());
        record Candidate(String name, int similarity) {
        }
        Candidate best = profile.allNames()
                .map(n -> new Candidate(n, nameSimilarity(partyTokens, meaningfulTokens(n, profile.type()))))
                .max(Comparator.comparingInt(Candidate::similarity))
                .orElseThrow();

        int adjustment = dateOfBirthAdjustment(party.dateOfBirth(), profile.dateOfBirth())
                + countryAdjustment(party.country(), profile.country());
        MatchScore score = MatchScore.clamped(best.similarity() + adjustment);
        if (!score.isAtLeast(threshold)) {
            return Optional.empty();
        }
        return Optional.of(new MatchEvaluation(profile, best.name(), best.similarity(), adjustment, score));
    }

    static int dateOfBirthAdjustment(LocalDate party, LocalDate profile) {
        if (party == null || profile == null) {
            return 0;
        }
        if (party.equals(profile)) {
            return SAME_DOB;
        }
        return party.getYear() == profile.getYear() ? 0 : DIFFERENT_BIRTH_YEAR;
    }

    static int countryAdjustment(CountryCode party, CountryCode profile) {
        if (party == null || profile == null) {
            return 0;
        }
        return party.equals(profile) ? SAME_COUNTRY : DIFFERENT_COUNTRY;
    }

    static List<String> meaningfulTokens(String name, EntityType type) {
        List<String> tokens = new ArrayList<>(PartyName.tokens(name));
        if (type == EntityType.ORGANISATION) {
            tokens.removeIf(ORGANISATION_NOISE::contains);
        }
        return tokens;
    }

    /** Best of: plain ratio, token-sort ratio (word order ignored), token-set ratio (extra words ignored). */
    static int nameSimilarity(List<String> a, List<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        double plain = ratio(String.join(" ", a), String.join(" ", b));
        double sorted = ratio(sortedJoin(a), sortedJoin(b));
        double best = Math.max(plain, sorted);

        Set<String> common = new TreeSet<>(a);
        common.retainAll(new TreeSet<>(b));
        if (common.size() >= 2) {
            String intersection = String.join(" ", common);
            String withRestA = join(intersection, minus(a, common));
            String withRestB = join(intersection, minus(b, common));
            best = Math.max(best, Math.max(ratio(intersection, withRestA), ratio(intersection, withRestB)));
            best = Math.max(best, ratio(withRestA, withRestB));
        }
        return (int) Math.round(best * 100);
    }

    /** 2 * LCS / (|a| + |b|): 1.0 for equal strings, 0.0 for nothing in common. */
    static double ratio(String a, String b) {
        if (a.isEmpty() && b.isEmpty()) {
            return 1.0;
        }
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                current[j] = a.charAt(i - 1) == b.charAt(j - 1)
                        ? previous[j - 1] + 1
                        : Math.max(previous[j], current[j - 1]);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return 2.0 * previous[b.length()] / (a.length() + b.length());
    }

    private static String sortedJoin(List<String> tokens) {
        return String.join(" ", new TreeSet<>(tokens));
    }

    private static String minus(List<String> tokens, Set<String> remove) {
        return String.join(" ", new TreeSet<>(tokens.stream().filter(t -> !remove.contains(t)).toList()));
    }

    private static String join(String left, String right) {
        return right.isEmpty() ? left : left + " " + right;
    }
}
