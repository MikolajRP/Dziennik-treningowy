// Shared localStorage key formats for one-time onboarding UI, so the
// "I already showed this" flag set by one flow is recognized by the other —
// e.g. accepting a coach invite from the athlete-side welcome modal also
// suppresses the separate first-visit tutorial on the coach page for the
// same person.
export const coachTutorialSeenKey = (userId: string) => `coachTutorialSeen:${userId}`;
export const newCoachWelcomeSeenKey = (userId: string) => `newCoachWelcomeSeen:${userId}`;
