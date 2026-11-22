// Lanternfall's driver: builds the state, wires input to the engine, runs the
// Warden's turns with a human pace, and stages the four screenshot states from
// real simulated games (?shot=start|play|win|loss&seed=N).

import { takeTurn } from './ai.js';
import { attack, endTurn, newGame, playCard, startGame } from './engine.js';
import { bindInput, freshUi } from './input.js';
import { seedFromUrl } from './random.js';
import { render } from './render.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let state = null;
let ui = freshUi();
let aiRunning = false;

function redraw() {
  render(state, ui);
}

function currentState() {
  return state;
}

// Play out a whole game with the AI on both sides, deterministically.
function simulateGame(seed, maxTurns) {
  const sim = newGame(seed);
  startGame(sim);
  let turns = 0;
  while (sim.phase === 'play' && turns < maxTurns) {
    const moves = takeTurn(sim, sim.active);
    for (const move of moves) {
      if (sim.phase !== 'play') break;
      if (move.kind === 'play') playCard(sim, sim.active, move.handIndex, move.target);
      else attack(sim, sim.active, move.attackerUid, move.target);
    }
    if (sim.phase !== 'play') break;
    endTurn(sim);
    turns += 1;
  }
  return sim;
}

// The four staged states are all real engine states, reached by playing:
// start is the title screen, play is a mid-game after real turns, win and loss
// are finished games found by replaying seeds until one side wins.
function stageShot(shot, seed) {
  if (shot === 'play') {
    // Six rounds of real play ends the simulation on your turn, with a full
    // table: both boards staffed, both hands full, both lanterns hurt.
    return simulateGame(seed, 6);
  }
  if (shot === 'win' || shot === 'loss') {
    for (let extra = 0; extra < 40; extra += 1) {
      const sim = simulateGame(seed + extra, 60);
      if (shot === 'win' && sim.phase === 'won') return sim;
      if (shot === 'loss' && sim.phase === 'lost') return sim;
    }
    return simulateGame(seed, 60);
  }
  return newGame(seed);
}

async function runWardenTurn() {
  if (aiRunning || !state || state.phase !== 'play' || state.active !== 'foe') return;
  aiRunning = true;
  await sleep(650);
  const moves = takeTurn(state, 'foe');
  for (const move of moves) {
    if (state.phase !== 'play' || state.active !== 'foe') break;
    if (move.kind === 'play') playCard(state, 'foe', move.handIndex, move.target);
    else attack(state, 'foe', move.attackerUid, move.target);
    redraw();
    await sleep(420);
  }
  if (state.phase === 'play' && state.active === 'foe') {
    endTurn(state);
    redraw();
  }
  aiRunning = false;
}

function afterYourTurn() {
  void runWardenTurn();
}

function start() {
  state = newGame(seedFromUrl());
  ui = freshUi();
  startGame(state);
  redraw();
}

function restart() {
  start();
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = seedFromUrl();
  if (shot && shot !== 'start') {
    state = stageShot(shot, seed);
  } else {
    state = newGame(seed);
  }
  ui = freshUi();
  bindInput(document.getElementById('game'), currentState, ui, {
    redraw,
    start,
    restart,
    afterYourTurn,
  });
  redraw();
  // A staged mid-game hands the move to the player; a finished game stays put.
  if (shot === 'play') {
    // The simulated game already ends on your turn.
  }
}

boot();
