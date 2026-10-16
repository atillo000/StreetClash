import fs from 'node:fs';
import crypto from 'node:crypto';
const files = [
  'characters/Archer Type Character.fbx', 'characters/Great Sword Type Character.fbx',
  'characters/Melee Axe Type Character.fbx', 'characters/Mutant Boss Enemy Character.fbx',
  ...['archer', 'greatsword', 'axe', 'mutant'].map(id => `characters/generated/${id}.glb`),
  'Weapons/long-bow.glb', 'Weapons/battle-axe.glb', 'Weapons/great-sword.glb', 'Weapons/generated/great-sword.glb',
  'environment/old-barrel.glb', 'environment/wooden-crate.glb',
];
const record = { date: '2026-10-16', source: 'User-supplied local files; original download URLs and licenses were not supplied.',
  licenseStatus: 'Unconfirmed; no CC0/CC-BY claim is made for these files.',
  derivatives: 'Prepared character GLBs embed their dedicated supplied animation clips. The generated sword is a simplified copy of the supplied sword.',
  assets: files.map(file => { const data = fs.readFileSync('assets/' + file); return { file, bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex') }; }) };
fs.writeFileSync('assets/USER-ASSETS.json', JSON.stringify(record, null, 2) + '\n');
const filename = 'assets/ASSET-LICENSES.md';
let text = fs.readFileSync(filename, 'utf8');
if (!text.includes('## Additional user-supplied roster assets')) text += `\n## Additional user-supplied roster assets\n\nArcher, Great Sword, Axe and Mutant models and their animation packs, the long bow,\nbattle axe, great sword, old barrel and wooden crate were supplied locally by the\nuser. Original download URLs and licenses were not supplied. These files are not\nlabeled CC0 or CC-BY. File hashes and derived runtime copies are recorded in\n[USER-ASSETS.json](USER-ASSETS.json). Existing source files are preserved.\n\nRuntime character conversion, animation fitting and sword simplification are\ndocumented in [the roster guide](../docs/expanded-roster.md). Three.quarks and\nquarks.core are MIT licensed; their licenses are included in the deployment vendor\nfolders. meshoptimizer is an MIT-licensed development-only preparation tool.\n`;
fs.writeFileSync(filename, text);
console.log('Recorded ' + record.assets.length + ' user-supplied source/runtime assets.');
