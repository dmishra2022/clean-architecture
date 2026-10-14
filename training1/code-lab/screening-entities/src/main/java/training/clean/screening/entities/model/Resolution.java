package training.clean.screening.entities.model;

public enum Resolution {
    /** Not yet reviewed. */
    UNRESOLVED,
    /** The party is the person or organisation in the profile. */
    POSITIVE,
    /** Could be the same party; needs more evidence before the case can close. */
    POSSIBLE,
    /** Not the same party. */
    FALSE_POSITIVE;

    public boolean blocksClosure() {
        return this == UNRESOLVED || this == POSSIBLE;
    }
}
