(async () => {
  const w = __world;
  w.setPaused(false); w.match.toLobby(); w.selectFighter('player', window.__previewFighter || 'greatsword');
  await new Promise(resolve => setTimeout(resolve, 200));
  return { fighter: __player.profile.id, equipped: __player.equipment?.id, error: document.getElementById('errmsg').textContent };
})()
