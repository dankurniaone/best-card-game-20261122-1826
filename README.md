# Lanternfall — Duel of the Last Lantern

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/dankurniaone/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/dankurniaone/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Lanternfall** is an original duel card game: two lantern-keepers, 20 flame each, 40-card decks, four elements told apart by colour *and* shape. Spend embers to summon creatures and cast spells, break through the Warden's guardians, and snuff out their lantern before yours goes dark. Every game is deterministic — one seed replays the same game, every time.

## The game

- **Ember ▲** (red) — burn them down. **Tide ≋** (blue) — draw, control. **Thorn ✿** (green) — heal, endure. **Stone ◆** (slate) — guardians hold the line.
- 20 original card designs: 12 creatures (with Guardian, draw, heal and ping abilities) and 8 spells (burn, healing, board clear, card draw).
- Real decisions every turn: growing ember income (1 → 8), a 5-creature board, summoning sickness, guardians that must be struck first, and fatigue when a deck runs dry.
- A heuristic AI opponent — the Warden — that spends its embers on value, clears guardians first, saves burn for lethal, and goes face when the board is clear.

## Run it

```sh
node serve.ts
# open http://localhost:8080 — click a card to play it, click your creature
# then an enemy or its lantern to attack. Keys: 1–7 select a card, E ends turn.
```

Or open `game/index.html` directly from any static server. No build step, no network requests at run time.

## Layout

- `game/src/engine.js` — the rules, as pure functions over a plain state object
- `game/src/cards.js` — the 20-card pool and the four elements
- `game/src/ai.js` — the Warden's heuristic (plans on a clone, never touches live state)
- `game/src/render.js` — the DOM table: cards, lanterns, log, overlays
- `game/src/input.js` — mouse + keyboard play
- `game/src/random.js` — seeded RNG (mulberry32) and shuffle
- `game/src/main.js` — driver, Warden turns, and the `?shot=` screenshot staging
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes `dossier.json`)
- `shots.json` — the four screenshot states, all reached by playing real games

---

<sub>Entered on [make.fun](https://make.fun/?ref=dankurniaone&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
