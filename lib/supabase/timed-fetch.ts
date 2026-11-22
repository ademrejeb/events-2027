type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 8000;

function timeoutMs(): number {
  const raw = Number(process.env.SUPABASE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

/**
 * Supabase client `fetch` that gives up instead of hanging.
 *
 * When the database is unreachable (local stack not started, provider
 * incident), the underlying TCP connect can stall for many seconds and every
 * API request piles up behind it. A hard deadline turns that into one fast,
 * logged 500.
 */
export const timedFetch: Fetch = (input, init) => {
  const deadline = AbortSignal.timeout(timeoutMs());
  const caller = init?.signal;
  const signal =
    caller && typeof AbortSignal.any === "function"
      ? AbortSignal.any([caller, deadline])
      : (caller ?? deadline);
  return fetch(input, { ...init, signal });
};
