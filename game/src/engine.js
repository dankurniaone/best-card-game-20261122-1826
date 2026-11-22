// The rules of Lanternfall, as pure functions over a plain state object.
// Nothing here touches the DOM: the renderer draws this state, the input layer
// calls these functions, and the AI reads them to choose its moves. A whole game
// can be simulated headlessly, which is how the screenshots are staged and how
// the balance is tested: same seed, same game, every time.

import { buildDeck, cardById } from './cards.js';
import { mulberry32, shuffle } from './random.js';

export const MAX_LIFE = 20;
export const MAX_MANA = 8;
export const MAX_BOARD = 5;
export const MAX_HAND = 7;
export const START_HAND = 4;

let uidCounter = 0;

function makePlayer() {
  return { life: MAX_LIFE, mana: 0, maxMana: 0, deck: [], hand: [], board: [], fatigue: 0 };
}

export function newGame(seed) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    turn: 0,
    active: 'you',
    phase: 'title', // title | play | won | lost
    winner: null,
    log: [],
    you: makePlayer(),
    foe: makePlayer(),
  };
  state.you.deck = shuffle(buildDeck(), rng);
  state.foe.deck = shuffle(buildDeck(), rng);
  return state;
}

export function other(who) {
  return who === 'you' ? 'foe' : 'you';
}

export function sideName(who) {
  return who === 'you' ? 'You' : 'The Warden';
}

export function log(state, text) {
  state.log.unshift(text);
  if (state.log.length > 8) state.log.length = 8;
}

export function drawCard(state, who) {
  const player = state[who];
  if (player.deck.length === 0) {
    player.fatigue += 1;
    player.life = Math.max(0, player.life - player.fatigue);
    log(state, `${sideName(who)} take ${player.fatigue} fatigue damage — the deck is empty.`);
    checkEnd(state);
    return null;
  }
  const id = player.deck.pop();
  if (player.hand.length >= MAX_HAND) {
    log(state, `${sideName(who)} burn a card — hand is full.`);
    return null;
  }
  player.hand.push(id);
  return id;
}

// Begin a turn: raise the ember cap, refill embers, draw, wake the board.
export function startTurn(state, who) {
  const player = state[who];
  state.active = who;
  state.turn += 1;
  player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
  player.mana = player.maxMana;
  for (const creature of player.board) creature.canAttack = true;
  drawCard(state, who);
}

export function startGame(state) {
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(state, 'you');
    drawCard(state, 'foe');
  }
  // The second player is a full turn behind in a race, so they open with one
  // extra card — the classic coin.
  drawCard(state, 'foe');
  state.phase = 'play';
  log(state, 'The lanterns are lit. Your move — play a card, then strike.');
  startTurn(state, 'you');
}

function summon(state, who, card) {
  const creature = {
    uid: `c${(uidCounter += 1)}`,
    cardId: card.id,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    guardian: Boolean(card.guardian),
    canAttack: false,
  };
  state[who].board.push(creature);
  return creature;
}

function damageCreature(state, who, uid, amount) {
  const board = state[who].board;
  const index = board.findIndex((c) => c.uid === uid);
  if (index === -1) return false;
  board[index].hp -= amount;
  if (board[index].hp <= 0) {
    const name = cardById(board[index].cardId).name;
    board.splice(index, 1);
    log(state, `${name} shatters.`);
  }
  return true;
}

function damagePlayer(state, who, amount) {
  state[who].life -= amount;
  if (state[who].life < 0) state[who].life = 0;
  checkEnd(state);
}

function healPlayer(state, who, amount) {
  state[who].life = Math.min(MAX_LIFE, state[who].life + amount);
}

function runOnPlay(state, who, card) {
  const foe = other(who);
  switch (card.onPlay) {
    case 'draw':
      drawCard(state, who);
      break;
    case 'heal1':
      healPlayer(state, who, 1);
      break;
    case 'heal2':
      healPlayer(state, who, 2);
      break;
    case 'heal3':
      healPlayer(state, who, 3);
      break;
    case 'ping': {
      const targets = state[foe].board;
      if (targets.length > 0) {
        const pick = targets[Math.floor(state.rng() * targets.length)];
        damageCreature(state, foe, pick.uid, 1);
      } else {
        damagePlayer(state, foe, 1);
      }
      break;
    }
    default:
      break;
  }
}

// A spell's target is { kind: 'face', who } or { kind: 'creature', who, uid }.
export function resolveSpell(state, who, card, target) {
  const foe = other(who);
  switch (card.spell) {
    case 'damage3':
    case 'damage6':
    case 'damage2draw': {
      const amount = card.spell === 'damage3' ? 3 : card.spell === 'damage6' ? 6 : 2;
      if (target.kind === 'face') damagePlayer(state, target.who, amount);
      else damageCreature(state, target.who, target.uid, amount);
      if (card.spell === 'damage2draw') drawCard(state, who);
      break;
    }
    case 'damage2':
      damageCreature(state, target.who, target.uid, 2);
      break;
    case 'quake':
      for (const creature of [...state[foe].board]) damageCreature(state, foe, creature.uid, 2);
      break;
    case 'draw2':
      drawCard(state, who);
      drawCard(state, who);
      break;
    case 'heal4':
      healPlayer(state, who, 4);
      break;
    case 'heal6':
      healPlayer(state, who, 6);
      break;
    default:
      break;
  }
}

// Play the card at handIndex. For a spell, pass its target; creatures need none.
// Returns true when the card was played.
export function playCard(state, who, handIndex, target) {
  if (state.phase !== 'play' || state.active !== who) return false;
  const player = state[who];
  const card = cardById(player.hand[handIndex]);
  if (!card || player.mana < card.cost) return false;
  if (card.type === 'creature' && player.board.length >= MAX_BOARD) return false;
  if (card.type === 'spell' && card.target === 'any' && !target) return false;
  if (card.type === 'spell' && card.target === 'creature' && (!target || target.kind !== 'creature')) return false;

  player.hand.splice(handIndex, 1);
  player.mana -= card.cost;
  log(state, `${sideName(who)} play ${card.name}.`);
  if (card.type === 'creature') {
    summon(state, who, card);
    runOnPlay(state, who, card);
  } else {
    resolveSpell(state, who, card, target ?? { kind: 'face', who: other(who) });
  }
  checkEnd(state);
  return true;
}

// A guardian on the enemy board must be struck before anything else.
export function guardians(state, who) {
  return state[who].board.filter((c) => c.guardian);
}

export function canAttackTarget(state, who, target) {
  if (state.phase !== 'play' || state.active !== who) return false;
  const guards = guardians(state, other(who));
  if (guards.length > 0) {
    return target.kind === 'creature' && target.who === other(who) && guards.some((g) => g.uid === target.uid);
  }
  return true;
}

// One creature strikes: a creature trades blows, a lantern takes the damage.
export function attack(state, who, attackerUid, target) {
  if (state.phase !== 'play' || state.active !== who) return false;
  const attacker = state[who].board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return false;
  if (!canAttackTarget(state, who, target)) return false;
  attacker.canAttack = false;
  const foe = other(who);
  if (target.kind === 'face') {
    damagePlayer(state, foe, attacker.atk);
    log(state, `${cardById(attacker.cardId).name} strikes the lantern for ${attacker.atk}.`);
  } else {
    const defender = state[foe].board.find((c) => c.uid === target.uid);
    if (!defender) return false;
    damageCreature(state, foe, target.uid, attacker.atk);
    damageCreature(state, who, attackerUid, defender.atk);
    log(state, `${cardById(attacker.cardId).name} trades with ${cardById(defender.cardId).name}.`);
  }
  checkEnd(state);
  return true;
}

export function endTurn(state) {
  if (state.phase !== 'play') return;
  const next = other(state.active);
  startTurn(state, next);
}

export function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.foe.life <= 0 && state.you.life <= 0) {
    state.phase = 'won';
    state.winner = 'you';
    log(state, 'Both lanterns gutter out — yours burns a heartbeat longer. You win!');
  } else if (state.foe.life <= 0) {
    state.phase = 'won';
    state.winner = 'you';
    log(state, 'The Warden’s lantern goes dark. You win!');
  } else if (state.you.life <= 0) {
    state.phase = 'lost';
    state.winner = 'foe';
    log(state, 'Your lantern goes dark. The Warden wins.');
  }
}
