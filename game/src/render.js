// Drawing the table: every pixel of Lanternfall is DOM, so the cards stay crisp
// and legible at thumbnail size. render(state, ui) rebuilds the board from the
// engine state; ui holds only the transient selection (which card, which attacker).

import { ELEMENTS, cardById } from './cards.js';
import { MAX_LIFE, MAX_MANA, guardians, other, sideName } from './engine.js';

function elIcon(el) {
  const info = ELEMENTS[el];
  return `<span class="el-glyph" style="color:${info.color};background:${info.soft}">${info.glyph}</span>`;
}

function creatureCard(state, who, creature, opts = {}) {
  const card = cardById(creature.cardId);
  const info = ELEMENTS[card.el];
  const classes = ['card', 'creature', `el-${card.el}`];
  if (opts.selected) classes.push('selected');
  if (opts.targetable) classes.push('targetable');
  if (opts.canAttack) classes.push('ready');
  else classes.push('resting');
  if (creature.guardian) classes.push('guardian');
  return `<button type="button" class="${classes.join(' ')}" data-uid="${creature.uid}" data-who="${who}"
      style="--el:${info.color};--el-soft:${info.soft}">
    <span class="cost">${card.cost}</span>
    <span class="card-el">${elIcon(card.el)}<span class="el-name">${info.label}</span></span>
    <span class="card-art" aria-hidden="true">${info.glyph}</span>
    <span class="card-name">${card.name}</span>
    <span class="card-text">${card.text}</span>
    <span class="stats"><span class="atk">⚔ ${creature.atk}</span><span class="hp">♥ ${creature.hp}</span></span>
  </button>`;
}

function handCard(state, who, id, index, opts = {}) {
  const card = cardById(id);
  const info = ELEMENTS[card.el];
  const playable = who === 'you' && state.active === 'you' && state.phase === 'play' && state.you.mana >= card.cost
    && (card.type !== 'creature' || state.you.board.length < 5);
  const classes = ['card', 'hand-card', `el-${card.el}`];
  if (opts.selected) classes.push('selected');
  if (playable) classes.push('playable');
  else if (who === 'you') classes.push('unplayable');
  const stats = card.type === 'creature'
    ? `<span class="stats"><span class="atk">⚔ ${card.atk}</span><span class="hp">♥ ${card.hp}</span></span>`
    : '<span class="stats"><span class="spell-tag">SPELL</span></span>';
  return `<button type="button" class="${classes.join(' ')}" data-hand="${index}" data-who="${who}"
      style="--el:${info.color};--el-soft:${info.soft}">
    <span class="cost">${card.cost}</span>
    <span class="card-el">${elIcon(card.el)}<span class="el-name">${info.label}</span></span>
    <span class="card-art" aria-hidden="true">${info.glyph}</span>
    <span class="card-name">${card.name}</span>
    <span class="card-text">${card.text}</span>
    ${stats}
  </button>`;
}

function cardBack(index) {
  return `<div class="card card-back" data-back="${index}"><span class="back-glyph">✦</span><span class="back-word">LANTERNFALL</span></div>`;
}

function lantern(state, who, opts = {}) {
  const player = state[who];
  const low = player.life <= 8 ? ' low' : '';
  const classes = ['lantern', who, low];
  if (opts.targetable) classes.push('targetable');
  const manaPips = Array.from({ length: MAX_MANA }, (_, i) =>
    `<span class="pip${i < player.maxMana ? ' full' : ''}${i < player.mana ? ' lit' : ''}">●</span>`).join('');
  return `<button type="button" class="${classes.join(' ')}" data-lantern="${who}">
    <span class="lantern-name">${who === 'you' ? 'Your Lantern' : 'The Warden'}</span>
    <span class="flame">🔥 ${player.life}<span class="flame-max"> / ${MAX_LIFE}</span></span>
    <span class="mana" title="Embers">${manaPips}</span>
    <span class="deck-count">Deck ${player.deck.length} · Hand ${player.hand.length}</span>
  </button>`;
}

function boardRow(state, who, ui) {
  const player = state[who];
  const isFoe = who === 'foe';
  const guards = guardians(state, other(who));
  const cells = player.board.map((creature) => {
    const selected = ui.attackerUid === creature.uid;
    const canAttack = who === 'you' && state.active === 'you' && state.phase === 'play' && creature.canAttack;
    const targetable = ui.attackerUid !== null && isFoe && ui.pendingTarget
      && (guards.length === 0 || guards.some((g) => g.uid === creature.uid));
    return creatureCard(state, who, creature, { selected, canAttack, targetable });
  });
  while (cells.length < 5) cells.push('<div class="slot"></div>');
  return `<div class="board-row ${who}">${cells.join('')}</div>`;
}

export function render(state, ui) {
  const root = document.getElementById('game');
  if (!root) return;
  const yourTurn = state.active === 'you' && state.phase === 'play';
  const foeGuards = guardians(state, 'you');
  const foeFaceTargetable = ui.attackerUid !== null && foeGuards.length === 0;
  const yourFaceTargetable = ui.spellTarget === 'foe-face';

  const hand = state.you.hand.map((id, i) => handCard(state, 'you', id, i, {
    selected: ui.handIndex === i,
  })).join('');
  const foeHand = state.foe.hand.map((_, i) => cardBack(i)).join('');

  const hint = hintText(state, ui);
  const logLines = state.log.map((line) => `<li>${escapeHtml(line)}</li>`).join('');

  root.innerHTML = `
  <header class="topbar">
    <div class="brand"><span class="brand-glyph">✦</span> LANTERNFALL <span class="brand-sub">Duel of the Last Lantern</span></div>
    <div class="turn-banner">${state.phase === 'play' ? (yourTurn ? '✦ Your turn — play a card, then strike' : '… The Warden is thinking') : ''}</div>
    <div class="seed-note">Seed ${state.seed} · Turn ${state.turn}</div>
  </header>
  <main class="table">
    <section class="side foe-side">
      <div class="side-head"><span class="side-label">THE WARDEN · opponent</span>${lantern(state, 'foe', { targetable: foeFaceTargetable })}</div>
      <div class="hand-row foe-hand">${foeHand}</div>
      ${boardRow(state, 'foe', ui)}
    </section>
    <section class="middle">
      <div class="hint">${hint}</div>
      <ol class="log">${logLines}</ol>
      <div class="actions">
        <button type="button" id="end-turn" class="end-turn" ${yourTurn ? '' : 'disabled'}>End turn ⏎</button>
        <button type="button" id="restart" class="restart">New game</button>
      </div>
    </section>
    <section class="side you-side">
      ${boardRow(state, 'you', ui)}
      <div class="hand-row you-hand">${hand}</div>
      <div class="side-head"><span class="side-label">YOU · keeper of the last lantern</span>${lantern(state, 'you', { targetable: yourFaceTargetable })}</div>
    </section>
  </main>
  ${overlay(state)}
  <footer class="help">Click a card to play it · Click your creature, then an enemy or its lantern, to attack · Keys: 1–7 select a card, E ends turn, Esc cancels</footer>`;
}

function hintText(state, ui) {
  if (state.phase !== 'play') return '';
  if (ui.spellNeedsTarget) return 'Choose a target for your spell — click a creature or a lantern.';
  if (ui.attackerUid !== null) return 'Choose a target — an enemy creature, or the Warden’s lantern.';
  if (ui.handIndex !== null) return 'Card selected — click the table to play it, or Esc to cancel.';
  if (state.active !== 'you') return 'The Warden plays…';
  return 'Your move: play a card, attack with your creatures, then end your turn.';
}

function overlay(state) {
  if (state.phase === 'title') {
    return `<div class="overlay title-screen">
      <div class="title-card">
        <div class="title-glyph">✦</div>
        <h1>LANTERNFALL</h1>
        <p class="tagline">Duel of the Last Lantern</p>
        <p class="rules">Two keepers. One flame each. Spend embers to summon creatures and cast
        spells, break through the Warden’s guardians, and snuff out their lantern
        before yours goes dark. First to 0 flame loses.</p>
        <ul class="elements">
          <li><b style="color:#e5484d">▲ Ember</b> — burn them down</li>
          <li><b style="color:#2f7fe0">≋ Tide</b> — draw, control</li>
          <li><b style="color:#2e9e5b">✿ Thorn</b> — heal, endure</li>
          <li><b style="color:#7a8699">◆ Stone</b> — guardians hold the line</li>
        </ul>
        <button type="button" id="start-game" class="big-button">Light your lantern</button>
        <p class="title-foot">20 flame each · 40-card decks · deterministic — every seed replays the same game</p>
      </div>
    </div>`;
  }
  if (state.phase === 'won') {
    return `<div class="overlay end-screen win">
      <div class="end-card">
        <div class="end-glyph">👑</div>
        <h1>VICTORY</h1>
        <p>The Warden’s lantern gutters out. Yours burns on —<br>brightest in the dark.</p>
        <p class="end-score">Your flame ${state.you.life} · Warden’s flame 0 · ${state.turn} turns</p>
        <button type="button" id="play-again" class="big-button">Play again</button>
      </div>
    </div>`;
  }
  if (state.phase === 'lost') {
    return `<div class="overlay end-screen loss">
      <div class="end-card">
        <div class="end-glyph">🌑</div>
        <h1>THE LIGHT FADES</h1>
        <p>Your lantern goes dark. The Warden keeps the last flame —<br>this time. Light it again.</p>
        <p class="end-score">Your flame 0 · Warden’s flame ${state.foe.life} · ${state.turn} turns</p>
        <button type="button" id="play-again" class="big-button">Try again</button>
      </div>
    </div>`;
  }
  return '';
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
