import {NAMESPACE, createStore} from './protocol.mjs';

const screen = document.getElementById('screen');
const connection = document.getElementById('connection');
const store = createStore();
let lastMessage = 0;
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function notice(title, text) {
  screen.className = 'notice';
  screen.replaceChildren(el('h1', title), el('p', text));
}
function render(state) {
  screen.className = state.screen;
  if (state.screen === 'library') {
    const tile = el('div', undefined, `game-tile ${state.focus === 0 ? 'focused-tile' : 'unfocused'}`);
    const art = el('div', undefined, 'art');
    const illustration = el('img');
    illustration.src = 'quiz-art.svg'; illustration.alt = '';
    art.append(illustration);
    const footer = el('div', undefined, 'tile-footer');
    footer.append(el('span', 'TRIVIA', 'genre'), el('h2', 'Quick Quiz'),
      el('p', 'A little friendly competition.'), el('span', '▶  Play', 'play-label'));
    tile.append(art, footer);
    const dock = el('div', undefined, 'dock');
    dock.append(el('span', `Controllers · ${state.players}`, state.focus === 1 ? 'focused' : ''),
      el('span', 'Play on TV', state.focus === 2 ? 'focused' : ''));
    screen.replaceChildren(tile, dock);
  } else if (state.screen === 'quiz') {
    const answers = el('div', undefined, 'answers');
    state.answers.forEach((text, index) => {
      const correct = state.revealed && state.correct === index;
      const picked = state.revealed && state.selected === index;
      const answer = el('div', undefined, `answer${correct ? ' correct' : picked ? ' selected' : ''}`);
      answer.append(el('span', String(index + 1), 'number'), el('span', text));
      if (correct) answer.append(el('span', '✓ Correct', 'check'));
      else if (picked) answer.append(el('span', 'Chosen', 'picked-label'));
      answers.append(answer);
    });
    screen.replaceChildren(el('span', state.revealed ? 'THE REVEAL' : 'QUICK QUIZ', 'eyebrow'), el('h1', state.question), answers,
      el('p', state.revealed ? state.score === 1 ? 'Correct · 1 point' : 'Mars is the Red Planet' : '', 'feedback'));
  } else if (state.screen === 'controllers') {
    notice('Controllers', state.players ? `${state.players} player${state.players === 1 ? '' : 's'} joined` : 'Pair a controller on your phone');
  } else notice('Play on TV', 'Choose Quick Quiz on your phone');
}

notice('Ready for a round?', 'Open Huddle on your phone');
if (new URLSearchParams(location.search).has('preview')) {
  const sample = new URLSearchParams(location.search).get('preview');
  render({screen: sample === 'quiz' || sample === 'reveal' ? 'quiz' : 'library', focus: 0, players: 2,
    question: 'Which planet is known as the Red Planet?', answers: ['Venus','Mars','Jupiter','Saturn'],
    revealed: sample === 'reveal', correct: 1, selected: 1, score: 1});
  connection.textContent = 'Layout preview · not connected';
} else if (globalThis.cast?.framework) {
  const context = cast.framework.CastReceiverContext.getInstance();
  function ready(senderId) { context.sendCustomMessage(NAMESPACE, senderId, {type: 'ready', version: 1}); }
  context.addCustomMessageListener(NAMESPACE, event => {
    const next = store.apply(event.data, event.senderId);
    if (!next) return;
    lastMessage = Date.now();
    document.body.classList.remove('disconnected');
    connection.textContent = 'Connected';
    render(next);
    context.sendCustomMessage(NAMESPACE, event.senderId,
      {type: 'ack', version: 1, sessionId: next.sessionId, revision: next.revision});
  });
  context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, event => ready(event.senderId));
  context.addEventListener(cast.framework.system.EventType.SENDER_DISCONNECTED, event => {
    if (store.disconnect(event.senderId)) {
      connection.textContent = 'Phone disconnected';
      document.body.classList.add('disconnected');
    }
  });
  context.start({customNamespaces: {[NAMESPACE]: cast.framework.system.MessageType.JSON}, disableIdleTimeout: true});
  setInterval(() => {
    if (lastMessage && Date.now() - lastMessage > 15000) {
      connection.textContent = 'Waiting for phone';
      document.body.classList.add('disconnected');
    }
  }, 3000);
} else connection.textContent = 'Receiver SDK unavailable';
