import { cp, mkdir, readFile, writeFile, rm, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid output directory');
const previous = await lstat(output).catch(error => { if (error.code !== 'ENOENT') throw error; });
if (previous?.isSymbolicLink()) throw new Error('Refusing to replace a linked output directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Preserve runtime paths; FBX sources, development tools and unused models stay local.
for (const entry of ['src', 'assets/characters/generated', 'assets/environment/factory',
  'assets/environment/old-barrel.glb', 'assets/environment/wooden-crate.glb',
  'assets/Weapons/long-bow.glb', 'assets/Weapons/battle-axe.glb', 'assets/Weapons/generated/great-sword.glb',
  'assets/Weapons/realistic',
  'assets/textures', 'assets/audio/kenney-impact', 'assets/ASSET-LICENSES.md', 'assets/USER-ASSETS.json']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
await mkdir(path.join(output, 'vendor/three/build'), { recursive: true });
await cp(path.join(root, 'node_modules/three/build/three.module.js'), path.join(output, 'vendor/three/build/three.module.js'));
await cp(path.join(root, 'node_modules/three/examples/jsm'), path.join(output, 'vendor/three/examples/jsm'), { recursive: true });
await cp(path.join(root, 'node_modules/three/LICENSE'), path.join(output, 'vendor/three/LICENSE'));
for (const [pkg, file] of [['three.quarks', 'three.quarks.esm.js'], ['quarks.core', 'quarks.core.esm.js']]) {
  await mkdir(path.join(output, 'vendor', pkg, 'dist'), { recursive: true });
  await cp(path.join(root, 'node_modules', pkg, 'dist', file), path.join(output, 'vendor', pkg, 'dist', file));
  await cp(path.join(root, 'node_modules', pkg, 'LICENSE'), path.join(output, 'vendor', pkg, 'LICENSE'));
}
// Compatibility build embeds WASM, so the browser needs only this module.
await mkdir(path.join(output,'vendor/@dimforge/rapier3d-compat/dist'),{recursive:true});
await cp(path.join(root,'node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs'),path.join(output,'vendor/@dimforge/rapier3d-compat/dist/rapier.mjs'));
await cp(path.join(root,'node_modules/@dimforge/rapier3d-compat/LICENSE'),path.join(output,'vendor/@dimforge/rapier3d-compat/LICENSE'));
// Supabase loads lazily as a self-contained browser bundle; no bundler required.
await mkdir(path.join(output,'vendor/@supabase/supabase-js/dist/umd'),{recursive:true});
await cp(path.join(root,'node_modules/@supabase/supabase-js/dist/umd/supabase.js'),path.join(output,'vendor/@supabase/supabase-js/dist/umd/supabase.js'));
await cp(path.join(root,'node_modules/@supabase/supabase-js/LICENSE'),path.join(output,'vendor/@supabase/supabase-js/LICENSE'));
const onlineClient=path.join(output,'src/online/SupabaseRooms.js');
await writeFile(onlineClient,(await readFile(onlineClient,'utf8')).replace('../../node_modules/','../../vendor/'));
const html = (await readFile(path.join(root, 'index.html'), 'utf8')).replaceAll('./node_modules/', './vendor/');
await writeFile(path.join(output, 'index.html'), html);

async function size(dir) {
  let total = 0;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    total += item.isDirectory() ? await size(file) : (await lstat(file)).size;
  }
  return total;
}
console.log(`Static game ready in dist (${((await size(output)) / 1e6).toFixed(1)} MB).`);
