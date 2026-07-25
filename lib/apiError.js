// Client-safe (no secrets) - turns an AI route's error response into a
// short, friendly message a student should actually see, based on the
// `code` the route (via lib/claude.js's claudeErrorResponse) attached to
// the error body. Falls back to a generic reassuring message for anything
// unrecognised, rather than surfacing a raw API/network error string.
export function friendlyApiError(data) {
  const code = data && data.code;

  // Our own daily practice limit - server already sends a clear, friendly
  // message for this one (see lib/rateLimit.js's RATE_LIMIT_MESSAGE).
  if (code === 'own_rate_limit') return data.error;

  if (code === 'timeout' || code === 'network') {
    return "That took too long to respond - check your connection and try again.";
  }

  if (code === 'anthropic_rate_limit') {
    return 'Our AI provider is busy right now - please try again in a moment.';
  }

  return "Something went wrong on our end - try again, and if it keeps happening, use the Feedback button to let us know.";
}
