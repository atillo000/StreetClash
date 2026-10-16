(async () => {
  const files = ['vendor/three/build/three.module.js', 'vendor/three.quarks/dist/three.quarks.esm.js',
    'vendor/quarks.core/dist/quarks.core.esm.js', 'src/combat/QuarksEffects.js',
    ...['capoeira', 'magic', 'soldier', 'archer', 'greatsword', 'axe', 'mutant'].map(id => `assets/characters/generated/${id}.glb`),
    'assets/Weapons/long-bow.glb', 'assets/Weapons/battle-axe.glb', 'assets/Weapons/generated/great-sword.glb',
    'assets/Weapons/kenney/blaster-n-runtime.glb', 'assets/characters/generated/gait-calibration.json',
    ...['spark_01','magic_01','muzzle_01','smoke_01'].map(name => "assets/textures/kenney/" + name + '.png'),
    'assets/environment/old-barrel.glb', 'assets/environment/wooden-crate.glb'];
  const checks = await Promise.all(files.map(async file => ({ file, passed: (await fetch(new URL(file, location.href))).ok })));
  const fighters = [...__world.library.models.keys()];
  return { passed: checks.every(c => c.passed) && fighters.length === 7 && !!__effects.quarks
    && !document.getElementById('classChoices') && !document.getElementById('errmsg').textContent,
    fighters, checks };
})()
