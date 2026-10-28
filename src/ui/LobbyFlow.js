const STORIES={
 capoeira:['RHYTHM UNDER PRESSURE','Raised around the freight yards, Roda learned to turn narrow escapes into flowing footwork. He enters the circuit to keep his neighbourhood independent.','Close-range combinations · mobile pressure'],
 magic:['THE LAST NIGHT SHIFT','Vesper once maintained the district’s experimental power grid. After its collapse, she learned to shape the energy everyone else abandoned.','Ranged casting · area control'],
 soldier:['NO ONE LEFT BEHIND','Rook escorted the last evacuation convoy through Dock 09. He returned when a distress call arrived on a frequency that should have been silent.','Rifle and pistol · measured ranged pressure'],
 archer:['EYES ABOVE THE ROOFTOPS','The district courier learned every roof and service lane before the streets closed. Now a bow and a clear escape route are the only credentials that matter.','Precision shots · movement and spacing'],
 greatsword:['A DEBT IN STEEL','A former gatekeeper carries a blade reforged from the gates he failed to defend. Every contract funds the rebuilding of his old home.','Heavy reach · committed finishers'],
 axe:['THE BREAKER’S PROMISE','A demolition worker became the circuit’s most stubborn contender. The axe once cleared ruined buildings; now it clears a path for the people still inside.','Wide cleaves · crowd pressure'],
 paladin:['KEEP THE LIGHT','When the district lost power, this guardian kept the shelter doors open. The armour is scarred, the oath simple: hold the line until everyone is safe.','Guarding · close-range protection'],
 avatar:['YOUR STREET. YOUR STORY.','Carl steps into the circuit with no borrowed legend. Every hard-earned combination, comeback and narrow victory becomes another part of his own story.','Kickboxing · pressure and counters'],
};

export class LobbyFlow {
 constructor(world){
  this.world=world;this.step='hero';const card=document.querySelector('.menu-card');
  const title=card.querySelector('h1');title.innerHTML='STREET <span>CLASH</span>';card.querySelector('.menu-intro').textContent='01 / CHOOSE YOUR HERO';
  this.story=document.createElement('article');this.story.id='heroStory';this.story.innerHTML='<small>HERO PROFILE</small><h2></h2><strong></strong><details id="heroLore"><summary>Background</summary><h3></h3><p></p></details><details id="heroMoves"><summary>Skills & controls</summary><dl></dl></details>';
  document.querySelector('.fighter-select').appendChild(this.story);
  this.next=document.createElement('button');this.next.type='button';this.next.className='primary';this.next.textContent='Choose hero →';card.appendChild(this.next);this.next.onclick=()=>this.show('match');
  this.setup=document.createElement('section');this.setup.id='matchSetup';this.setup.hidden=true;
  const rival=document.createElement('div');rival.className='rival-choice';for(const e of [document.querySelector('label[for="opponentChoice"]'),document.getElementById('opponentChoice')])rival.appendChild(e);
  this.setup.appendChild(rival);
  for(const e of [...card.children])if(e!==this.setup&&e!==this.next&&e!==card.querySelector('.fighter-select')&&!['H1'].includes(e.tagName)&&!e.classList.contains('eyebrow')&&!e.classList.contains('menu-intro'))this.setup.appendChild(e);
  const picker=document.createElement('label');picker.className='arena-picker';picker.innerHTML='LOCATION<select id="arenaChoice"><option value="street">Freight Quarter / street</option><option value="factory">Ironworks / factory</option><option value="foundry">Cinder Works / foundry</option></select>';
  this.setup.querySelector('.arena-card').before(picker);
  picker.querySelector('select').onchange=e=>{if(world.match.state==='lobby'&&!world.online?.rooms.room)world.arena.setTheme(e.target.value);};
  this.back=document.createElement('button');this.back.type='button';this.back.className='secondary';this.back.textContent='← Change hero';this.back.onclick=()=>this.show('hero');this.setup.appendChild(this.back);card.appendChild(this.setup);
  const guide=document.createElement('details');guide.className='setup-guide';guide.innerHTML='<summary>Controls & graphics</summary>';for(const e of [...this.setup.querySelectorAll('.menu-controls,.graphics-option')])guide.appendChild(e);this.setup.querySelector('.credits').before(guide);
  this.show('hero');this.update();document.getElementById('lobby').classList.add('selection-ready');
 }
 show(step){this.step=step;this.setup.hidden=step!=='match';document.querySelector('.fighter-select').hidden=step!=='hero';this.next.hidden=step!=='hero';document.querySelector('.menu-intro').textContent=step==='hero'?'01 / CHOOSE YOUR HERO':'02 / CHOOSE YOUR ENCOUNTER';}
 update(){const p=this.world.combatants[0];if(this.id===p.profile.id)return;this.id=p.profile.id;
  const story=STORIES[this.id]||['A NEW CONTENDER',p.profile.description,''];this.story.querySelector('h2').textContent=p.profile.name+' / '+p.profile.role;this.story.querySelector('h3').textContent=story[0];this.story.querySelectorAll('details').forEach(d=>d.open=false);this.story.querySelector('p').textContent=story[1];this.story.querySelector('strong').textContent=story[2];
  const dl=this.story.querySelector('dl');dl.replaceChildren();for(const[id,key]of [['punch','LMB'],['heavy','RMB'],['kick','1'],['skill1','2'],['skill2','3'],['ultimate','4']]){const move=p.moves[id];if(!move||move.sequenceOnly)continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=move.label;dl.append(dt,dd);}
 }
}
