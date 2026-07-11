// In-memory API session token minted after PIN unlock (never persisted).
// Used by refund, send-email, and clear-queues backends that require x-session-token.
let _apiSessionToken = null;

export function setApiSessionToken(token) {
  _apiSessionToken = token || null;
}

export function getApiSessionToken() {
  return _apiSessionToken;
}

export function clearApiSessionToken() {
  _apiSessionToken = null;
}
