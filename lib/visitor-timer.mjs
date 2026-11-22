/**
 * UI countdown only: protected requests must also validate the session server-side.
 * Capture requestStartedAt = performance.now() immediately before redeeming.
 * The response must supply serverNow and expiresAt as ISO timestamps.
 * Call only for a server-validated visitor session, never for an administrator.
 * On reload, revalidate the session; do not create a new local 10-second deadline.
 */
export function startVisitorTimer({
  serverNow,
  expiresAt,
  requestStartedAt,
  onTick = () => {},
  onExpire
}) {
  if (typeof onTick !== 'function' || typeof onExpire !== 'function') {
    throw new TypeError('Servono callback valide per il timer visitatore.');
  }
  const serverMs = typeof serverNow === 'string' ? Date.parse(serverNow) : NaN;
  const expiryMs = typeof expiresAt === 'string' ? Date.parse(expiresAt) : NaN;
  const initialNow = performance.now();
  if (!Number.isFinite(serverMs) || !Number.isFinite(expiryMs) ||
      !Number.isFinite(requestStartedAt) || requestStartedAt < 0 ||
      requestStartedAt > initialNow) {
    throw new TypeError('Scadenza server o riferimento temporale non validi.');
  }

  // Subtract the whole request duration conservatively; never add network time.
  const deadline = requestStartedAt + Math.max(0, expiryMs - serverMs);
  let active = true;
  let timeoutId = null;
  const remainingMs = () => Math.max(0, deadline - performance.now());

  function cleanup() {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = null;
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('focus', check);
    window.removeEventListener('pageshow', check);
  }

  function expire(reason) {
    if (!active) return;
    active = false;
    cleanup();
    try {
      onTick(0);
    } finally {
      onExpire(reason);
    }
  }

  function check() {
    if (!active) return;
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = null;
    const remaining = remainingMs();
    if (remaining <= 0) {
      expire('expired');
      return;
    }
    try {
      onTick(Math.ceil(remaining / 1000));
    } catch (error) {
      expire('timer_error');
      throw error;
    }
    if (active) timeoutId = setTimeout(check, Math.min(100, remaining));
  }

  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  check();

  return Object.freeze({
    check,
    getRemainingMs: () => active ? remainingMs() : 0,
    dispose() {
      active = false;
      cleanup();
    }
  });
}
