// The Warden — Lanternfall's opponent. A readable heuristic, not a random player:
// it spends its embers on the best value it can see, clears guardians first,
// saves burn spells for lethal, and hits the lantern when the board is clear.
// Every choice is deterministic for a given state and seed.
//
// Planning runs on a deep clone of the state, so the real game is never touched
// until the driver replays the chosen moves through the engine.

import { cardById } from './cards.js';
import { MAX_BOARD, attack, guardians, other, playCard } from './engine.js';
import { mulberry32 } from './random.js';

function cloneState(state) {
  const copy = JSON.parse(JSON.stringify({
    turn: state.turn,
    active: state.active,
    phase: state.phase,
    winner: state.winner,
    log: [],
    you: state.you,
    foe: state.foe,
  }));
  copy.rng = mulberry32(state.seed + state.turn * 7919 + 13);
  copy.seed = state.seed;
  return copy;
}

// Plan one whole turn as a list of moves the driver executes in order.
export function takeTurn(state, who) {
  const sim = cloneState(state);
  sim.active = who;
  const moves = [];

  // 1. Spend embers: keep playing the best affordable card until nothing fits.
  // eslint-disable-next-line no-constant-condition
  while (sim.phase === 'play') {
    const pick = chooseCardToPlay(sim, who);
    if (pick === null) break;
    moves.push({ kind: 'play', handIndex: pick.handIndex, target: pick.target });
    playCard(sim, who, pick.handIndex, pick.target);
  }

  // 2. Attack with every ready creature: guardians first, then the best trade,
  //    then straight at the lantern when nothing worth killing stands in the way.
  if (sim.phase === 'play') {
    const attackers = [...sim[who].board].filter((c) => c.canAttack);
    for (const attacker of attackers) {
      if (sim.phase !== 'play') break;
      const target = chooseAttackTarget(sim, who, attacker);
      if (!target) continue;
      moves.push({ kind: 'attack', attackerUid: attacker.uid, target });
      attack(sim, who, attacker.uid, target);
    }
  }
  return moves;
}

function chooseCardToPlay(state, who) {
  const me = state[who];
  let best = null;
  let bestScore = 0;
  me.hand.forEach((id, handIndex) => {
    const card = cardById(id);
    if (card.cost > me.mana) return;
    if (card.type === 'creature' && me.board.length >= MAX_BOARD) return;
    const score = scoreCard(state, who, card);
    if (score > bestScore) {
      bestScore = score;
      best = { handIndex, target: chooseSpellTarget(state, who, card) };
    }
  });
  // Never play a card that scores nothing: holding embers beats wasting them.
  if (bestScore <= 0 || best === null) return null;
  // A spell that needs a target must actually have one.
  if (best.target === undefined) {
    const card = cardById(me.hand[best.handIndex]);
    if (card.type === 'spell' && card.target !== 'self' && card.target !== 'none') return null;
  }
  return best;
}

function scoreCard(state, who, card) {
  const me = state[who];
  const foe = state[other(who)];
  if (card.type === 'creature') {
    // Stat value, a little extra for guardians and for on-play effects.
    let value = card.atk + card.hp + (card.guardian ? 1.5 : 0);
    if (card.onPlay === 'draw') value += 1.5;
    if (card.onPlay === 'ping') value += 1;
    if (card.onPlay && card.onPlay.startsWith('heal')) value += 1;
    if (me.board.length === 0) value += 0.5;
    return value - card.cost * 0.4;
  }
  // Spells are scored by what they actually achieve right now.
  switch (card.spell) {
    case 'damage3':
    case 'damage6':
    case 'damage2draw': {
      const amount = card.spell === 'damage3' ? 3 : card.spell === 'damage6' ? 6 : 2;
      if (amount >= foe.life) return 100; // lethal
      const prey = foe.board
        .filter((c) => c.hp <= amount)
        .sort((a, b) => b.atk - a.atk)[0];
      if (prey) return 2 + prey.atk * 0.8;
      if (foe.life <= 8 && amount >= 3) return 2.5; // push face damage late
      return card.spell === 'damage2draw' ? 1.2 : 0;
    }
    case 'damage2': {
      const prey = foe.board.filter((c) => c.hp <= 2).sort((a, b) => b.atk - a.atk)[0];
      return prey ? 2 + prey.atk * 0.8 : 0;
    }
    case 'quake':
      return foe.board.length >= 2 ? 3 + foe.board.length : 0;
    case 'draw2':
      return me.hand.length <= 3 ? 2.5 : 0.5;
    case 'heal4':
      return me.life <= 10 ? 3 : 0;
    case 'heal6':
      return me.life <= 12 ? 3.5 : 0;
    default:
      return 0;
  }
}

function chooseSpellTarget(state, who, card) {
  const foe = state[other(who)];
  const foeWho = other(who);
  if (card.target === 'self' || card.target === 'none') return undefined;
  if (card.spell === 'damage2') {
    const prey = foe.board.filter((c) => c.hp <= 2).sort((a, b) => b.atk - a.atk)[0];
    if (prey) return { kind: 'creature', who: foeWho, uid: prey.uid };
    return undefined;
  }
  // damage3 / damage6 / damage2draw: kill the biggest thing they can, else face.
  const amount = card.spell === 'damage3' ? 3 : card.spell === 'damage6' ? 6 : 2;
  const prey = foe.board
    .filter((c) => c.hp <= amount)
    .sort((a, b) => b.atk - a.atk)[0];
  if (prey) return { kind: 'creature', who: foeWho, uid: prey.uid };
  const guards = guardians(state, foeWho);
  if (guards.length > 0) {
    return { kind: 'creature', who: foeWho, uid: guards[0].uid };
  }
  return { kind: 'face', who: foeWho };
}

function chooseAttackTarget(state, who, attacker) {
  const foe = state[other(who)];
  const foeWho = other(who);
  const guards = guardians(state, foeWho);
  if (guards.length > 0) {
    return { kind: 'creature', who: foeWho, uid: guards[0].uid };
  }
  // Trade up: kill a creature that hits harder than we do, if we survive it.
  const trades = foe.board
    .filter((c) => c.hp <= attacker.atk && c.atk > attacker.atk && attacker.hp > c.atk)
    .sort((a, b) => b.atk - a.atk);
  if (trades.length > 0) return { kind: 'creature', who: foeWho, uid: trades[0].uid };
  // A lethal swing ends the game.
  if (attacker.atk >= foe.life) return { kind: 'face', who: foeWho };
  // Clear the board when we can do it and live — but only against something that
  // actually threatens us (2+ attack). A 1-attack creature is not worth a swing:
  // hitting the lantern keeps the game moving instead of stalling it out.
  const clears = foe.board
    .filter((c) => c.hp <= attacker.atk && c.atk >= 2 && attacker.hp > c.atk)
    .sort((a, b) => b.atk - a.atk);
  if (clears.length > 0) return { kind: 'creature', who: foeWho, uid: clears[0].uid };
  return { kind: 'face', who: foeWho };
}
