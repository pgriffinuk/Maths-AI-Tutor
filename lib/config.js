// Site-wide feature flags that aren't secrets - safe to import from both
// client and server code.

// Stepwise is currently in private trials: flip to true to re-open public
// self-signup. While false, app/signup/page.js shows a "not open yet" card
// instead of the signup form, and every "Sign up" link/button across the
// site is hidden or repointed - see app/page.js and app/login/page.js.
export const SIGNUPS_OPEN = false;
