export const NAMESPACE = 'urn:x-cast:dev.kalle.gamehub.state';
const screens = new Set(['library', 'quiz', 'controllers', 'tv']);
const integer = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;

// Restrict messages to public display data; never use HTML from a sender.
export function parseSnapshot(input) {
  let value = input;
  try { if (typeof input === 'string') value = JSON.parse(input); } catch { return null; }
  if (!value || value.type !== 'snapshot' || value.version !== 1 ||
      typeof value.sessionId !== 'string' || !value.sessionId.length || value.sessionId.length > 100 ||
      !integer(value.revision, Number.MAX_SAFE_INTEGER) || value.revision === 0 ||
      !screens.has(value.screen) || !integer(value.focus, 2) || !integer(value.players, 64) ||
      typeof value.revealed !== 'boolean') return null;
  if (value.screen === 'quiz' && (typeof value.question !== 'string' || value.question.length > 1000 ||
      !Array.isArray(value.answers) || value.answers.length !== 4 ||
      value.answers.some(answer => typeof answer !== 'string' || answer.length > 300))) return null;
  if (value.revealed && value.screen === 'quiz' &&
      (!integer(value.correct, 3) || !integer(value.selected, 3) || !integer(value.score, 1))) return null;
  return {
    type: 'snapshot', version: 1, sessionId: value.sessionId, revision: value.revision,
    screen: value.screen, focus: value.focus, players: value.players,
    question: value.screen === 'quiz' ? value.question : null,
    answers: value.screen === 'quiz' ? [...value.answers] : [],
    revealed: value.screen === 'quiz' && value.revealed,
    correct: value.screen === 'quiz' && value.revealed ? value.correct : null,
    selected: value.screen === 'quiz' && value.revealed ? value.selected : null,
    score: value.screen === 'quiz' && value.revealed ? value.score : null,
  };
}

export function createStore() {
  let owner = null;
  let current = null;
  // A single phone is authoritative. A disconnected owner releases the session.
  // Session UUID changes permit a restarted sender to send a complete snapshot.
  return {
    apply(input, senderId) {
      const next = parseSnapshot(input);
      if (!next || typeof senderId !== 'string' || (owner !== null && owner !== senderId)) return null;
      if (current?.sessionId === next.sessionId && next.revision <= current.revision) return null;
      owner = senderId;
      current = next;
      return next;
    },
    disconnect(senderId) { if (owner === senderId) { owner = null; current = null; return true; } return false; },
    get current() { return current; },
  };
}
