// Mouse and keyboard for Lanternfall. Clicks are resolved against the live engine
// state: a hand card is selected, then played (or aimed at a target for a spell);
// a ready creature is selected, then aimed at an enemy creature or a lantern.
// Invalid clicks do nothing — the table never lies about what is legal.

import { cardById } from './cards.js';
import { attack, canAttackTarget, endTurn, guardians, other, playCard } from './engine.js';

export function freshUi() {
  return { handIndex: null, attackerUid: null, spellNeedsTarget: false, spellTarget: null };
}

function clearSelection(ui) {
  ui.handIndex = null;
  ui.attackerUid = null;
  ui.spellNeedsTarget = false;
  ui.spellTarget = null;
}

export function bindInput(root, getState, ui, hooks) {
  root.addEventListener('click', (event) => {
    const state = getState();
    const target = event.target.closest('[data-hand],[data-uid],[data-lantern],#end-turn,#restart,#start-game,#play-again');
    if (!target) {
      clearSelection(ui);
      hooks.redraw();
      return;
    }
    if (target.id === 'start-game' || target.id === 'play-again') {
      hooks.start();
      return;
    }
    if (target.id === 'restart') {
      hooks.restart();
      return;
    }
    if (target.id === 'end-turn') {
      if (state.phase === 'play' && state.active === 'you') {
        clearSelection(ui);
        endTurn(state);
        hooks.redraw();
        hooks.afterYourTurn();
      }
      return;
    }
    if (state.phase !== 'play' || state.active !== 'you') return;

    // A lantern is a spell or attack target, never a card of its own.
    if (target.dataset.lantern) {
      const who = target.dataset.lantern;
      if (ui.spellNeedsTarget) {
        const card = cardById(state.you.hand[ui.handIndex]);
        if (card && card.target === 'any') {
          const handIndex = ui.handIndex;
          clearSelection(ui);
          if (playCard(state, 'you', handIndex, { kind: 'face', who })) hooks.redraw();
        }
        return;
      }
      if (ui.attackerUid !== null) {
        const attackerUid = ui.attackerUid;
        clearSelection(ui);
        if (attack(state, 'you', attackerUid, { kind: 'face', who })) hooks.redraw();
      }
      return;
    }

    // Your own board creature: select it as the attacker.
    if (target.dataset.uid && target.dataset.who === 'you') {
      const creature = state.you.board.find((c) => c.uid === target.dataset.uid);
      if (creature && creature.canAttack) {
        clearSelection(ui);
        ui.attackerUid = creature.uid;
        hooks.redraw();
      }
      return;
    }

    // An enemy creature: the target of an attack or a spell.
    if (target.dataset.uid && target.dataset.who === 'foe') {
      const uid = target.dataset.uid;
      if (ui.spellNeedsTarget) {
        const card = cardById(state.you.hand[ui.handIndex]);
        if (card && (card.target === 'any' || card.target === 'creature')) {
          const handIndex = ui.handIndex;
          clearSelection(ui);
          if (playCard(state, 'you', handIndex, { kind: 'creature', who: 'foe', uid })) hooks.redraw();
        }
        return;
      }
      if (ui.attackerUid !== null) {
        const attackerUid = ui.attackerUid;
        if (canAttackTarget(state, 'you', { kind: 'creature', who: 'foe', uid })) {
          clearSelection(ui);
          if (attack(state, 'you', attackerUid, { kind: 'creature', who: 'foe', uid })) hooks.redraw();
        }
        return;
      }
      return;
    }

    // A card in your hand: select it, or play it at once when it needs no target.
    if (target.dataset.hand !== undefined) {
      const handIndex = Number(target.dataset.hand);
      const card = cardById(state.you.hand[handIndex]);
      if (!card) return;
      clearSelection(ui);
      if (state.you.mana < card.cost) return;
      if (card.type === 'creature' && state.you.board.length >= 5) return;
      if (card.type === 'spell' && (card.target === 'any' || card.target === 'creature')) {
        ui.handIndex = handIndex;
        ui.spellNeedsTarget = true;
        hooks.redraw();
        return;
      }
      if (playCard(state, 'you', handIndex)) hooks.redraw();
      return;
    }
  });

  document.addEventListener('keydown', (event) => {
    const state = getState();
    if (event.key === 'Escape') {
      clearSelection(ui);
      hooks.redraw();
      return;
    }
    if (state.phase === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      hooks.start();
      return;
    }
    if (state.phase !== 'play' || state.active !== 'you') return;
    if (event.key === 'e' || event.key === 'E') {
      clearSelection(ui);
      endTurn(state);
      hooks.redraw();
      hooks.afterYourTurn();
      return;
    }
    const digit = Number.parseInt(event.key, 10);
    if (digit >= 1 && digit <= 7) {
      const handIndex = digit - 1;
      const card = cardById(state.you.hand[handIndex]);
      if (!card || state.you.mana < card.cost) return;
      clearSelection(ui);
      ui.handIndex = handIndex;
      if (card.type === 'spell' && (card.target === 'any' || card.target === 'creature')) {
        ui.spellNeedsTarget = true;
      } else if (playCard(state, 'you', handIndex)) {
        ui.handIndex = null;
      }
      hooks.redraw();
    }
  });
}
