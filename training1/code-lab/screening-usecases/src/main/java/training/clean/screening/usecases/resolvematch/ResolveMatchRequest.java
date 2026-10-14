package training.clean.screening.usecases.resolvematch;

public record ResolveMatchRequest(
        String clientGroupId,
        String caseId,
        String matchId,
        String resolution,
        String rationale,
        String analystId) {
}
