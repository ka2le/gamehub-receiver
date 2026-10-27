import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSnapshot, createStore} from './protocol.mjs';

const sample = (revision = 1) => ({type:'snapshot',version:1,sessionId:'session-one',revision,
  screen:'quiz',focus:0,players:2,question:'Question?',answers:['One','Two','Three','Four'],
  revealed:false,correct:null,selected:null,score:null});

test('invalid versions, malformed choices and invalid revisions are rejected', () => {
  assert.equal(parseSnapshot({...sample(),version:2}),null);
  assert.equal(parseSnapshot('{bad'),null);
  assert.equal(parseSnapshot({...sample(),answers:['One']}),null);
  assert.equal(parseSnapshot({...sample(),revision:-1}),null);
  assert.equal(parseSnapshot({...sample(),revealed:true,correct:8}),null);
});
test('unrevealed snapshots cannot leak answer or score fields', () => {
  const state = parseSnapshot({...sample(),correct:1,selected:1,score:1,privateChoices:[1,2]});
  assert.equal(state.correct,null);
  assert.equal(state.selected,null);
  assert.equal(state.score,null);
  assert.equal(state.privateChoices,undefined);
});
test('stale and duplicate revisions are ignored', () => {
  const store = createStore();
  assert.ok(store.apply(sample(5),'phone'));
  assert.equal(store.apply(sample(4),'phone'),null);
  assert.equal(store.apply(sample(5),'phone'),null);
  assert.ok(store.apply(sample(6),'phone'));
});
test('another phone cannot replace the owner until it disconnects', () => {
  const store = createStore();
  store.apply(sample(),'one');
  assert.equal(store.apply({...sample(2),sessionId:'other'},'two'),null);
  assert.equal(store.disconnect('two'),false);
  assert.equal(store.disconnect('one'),true);
  assert.ok(store.apply({...sample(),sessionId:'other'},'two'));
});
test('reconnect accepts a new full session and reveal', () => {
  const store = createStore();
  store.apply(sample(10),'phone');
  const revealed = store.apply({...sample(),sessionId:'restarted',revealed:true,correct:1,selected:1,score:1},'phone');
  assert.equal(revealed.score,1);
  assert.equal(revealed.correct,1);
});
