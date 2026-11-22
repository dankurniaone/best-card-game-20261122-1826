// Lanternfall's hand-in program (Node 22, standard library only).
//
// The game is plain static files under game/ — index.html plus its modules and
// stylesheet, no build step and no network at run time. This program hands it in:
// it copies game/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there with the vendored make.fun library,
// which summarises the game for the judge. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the dossier's bytes; the
// rest refuse an entry the scorer would refuse anyway (too many screenshots or
// one over 256 KiB; too many files or bytes under game/, or a path too long).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
