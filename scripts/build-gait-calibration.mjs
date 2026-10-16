import fs from 'node:fs';
const bytes = fs.readFileSync(process.argv[2]);
const report = JSON.parse(bytes.toString(bytes[0]===255&&bytes[1]===254?'utf16le':'utf8').replace(/^\uFEFF/,''));
const output = {};
for (const row of report.rows) {
  output[row.id] = {};
  for (const clip of row.clips) {
    if (/Idle/.test(clip.name) || clip.nativePlantSpeed < 0.3) continue;
    // Idle ginga keeps its authored cadence; travelling variants use measured stride.

    output[row.id][clip.name] = { stride: +(clip.nativePlantSpeed * clip.duration).toFixed(5), phase: +clip.phase.toFixed(5), direction: (row.id === 'greatsword' && ['Run','Sprint'].includes(clip.name)) || (row.id === 'capoeira' && ['CombatWalk','CombatRun','StrafeLeftWalk','StrafeLeftRun'].includes(clip.name)) ? -1 : 1 };
  }
}
fs.writeFileSync('assets/characters/generated/gait-calibration.json', JSON.stringify(output,null,2)+'\n');
console.log('Prepared gait distances and contact phases for '+Object.keys(output).length+' fighters.');
