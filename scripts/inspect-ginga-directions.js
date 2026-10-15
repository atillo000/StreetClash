(async () => {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
  const root = './assets/animations/Capoeira Character Animation Pack/Capoeira Locomotion Pack/';
  const report = [];
  for (const name of ['ginga forward','ginga backward','ginga sideways 1','ginga sideways 2']) {
    const model = await new FBXLoader().loadAsync(encodeURI(root + name + '.fbx'));
    const track = model.animations[0].tracks.find(t => /Hips.position$/.test(t.name));
    const first = Array.from(track.values.slice(0, 3)), last = Array.from(track.values.slice(-3));
    report.push({ name, first, delta: last.map((v, i) => v - first[i]) });
  }
  return report;
})()
