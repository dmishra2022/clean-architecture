package training.clean.screening.entities.model;

public enum CaseStatus {
    /** Opened, not screened yet. */
    CREATED,
    /** At least one match is unresolved or possible. */
    PENDING_REVIEW,
    /** Every match has a final resolution (or there were none); ready to close. */
    REVIEWED,
    /** Terminal. */
    CLOSED
}
