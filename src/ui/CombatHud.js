import { ATTACK_BINDINGS } from '../core/controls.js';
// Presentation only: read combat state; never change input, cooldowns or damage.
const paths={
  fist:'M7 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9l-3 6H9l-5-7a2 2 0 0 1 3-2Z',
  boot:'m8 3 7 1-2 10 6 3v4H5v-6l3-12Z M5 17h14',
  magic:'m12 2 2.8 6.2L22 11l-7.2 2.8L12 21l-2.8-7.2L2 11l7.2-2.8Z M19 3v4 M17 5h4',
  rifle:'M3 8h14v6H8l-2 6H3l2-7H2V8Z M17 10h5 M8 8V5h5v3',
  bow:'M7 2q19 10 0 20l8-10Z M3 12h17 M17 9l3 3-3 3',
  sword:'m14 3 7-1-1 7-9 9-5-5Z M4 12l9 9 M3 22l5-5',
  axe:'M6 22 17 3 M11 5l4-3q1 5 7 5l-3 7q-7-1-8-9Z',
  claw:'m5 21 2-17 3-2-1 18 M11 21l3-16 3-2-2 17 M17 21l3-13 2-1-1 13',
  area:'M12 4v4 M12 16v4 M4 12h4 M16 12h4 M6 6l3 3 M15 15l3 3 M18 6l-3 3 M9 15l-3 3',
  dash:'M3 7h8 M1 12h7 M3 17h8 M11 4l9 8-9 8 M19 12H9',
};
const roleIcon={capoeira:'boot',magic:'magic',soldier:'rifle',archer:'bow',greatsword:'sword',axe:'axe',mutant:'claw'};
const bindings=ATTACK_BINDINGS.map(({move,label})=>[move,label]);
const icon=name=>`<svg class="hud-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.fist}"/></svg>`;

export class CombatHud {
  constructor(){
    this.signature='';this.slots=new Map();
    for(const[id,key]of bindings){
      const el=document.getElementById('ability-'+id);el.className='skill-slot';
      el.innerHTML='<i class="cooldown-shade"></i><kbd></kbd><span class="skill-icon"></span><span class="skill-name"></span><b class="skill-time"></b>';
      el.querySelector('kbd').textContent=key;
      this.slots.set(id,{el,key,label:el.querySelector('.skill-name'),graphic:el.querySelector('.skill-icon'),time:el.querySelector('.skill-time'),shade:el.querySelector('.cooldown-shade')});
    }
  }
  update(player,enemy,match,world,lock){
    for(const[c,suffix]of [[player,'P'],[enemy,'E']]){
      const ratio=Math.max(0,Math.min(1,c.hp/c.maxHp)),panel=document.getElementById('bar'+suffix);
      document.getElementById('hp'+suffix).style.width=ratio*100+'%';
      document.getElementById('hp'+suffix+'Delay').style.width=ratio*100+'%';
      document.getElementById('hp'+suffix+'Text').textContent=`${Math.ceil(c.hp)} / ${c.maxHp}`;
      document.getElementById(suffix==='P'?'playerName':'opponentName').textContent=c.profile.name.toUpperCase();
      document.getElementById(suffix==='P'?'playerClass':'opponentClass').textContent=c.profile.role;
      const badge=document.getElementById('classBadge'+suffix);
      if(badge.dataset.fighter!==c.profile.id){badge.innerHTML=icon(roleIcon[c.profile.id]);badge.dataset.fighter=c.profile.id;}
      panel.classList.toggle('low-health',ratio>0&&ratio<=.3);
      const bar=panel.querySelector('[role="progressbar"]');bar.setAttribute('aria-valuenow',Math.ceil(c.hp));bar.setAttribute('aria-valuemax',c.maxHp);
    }
    const signature=player.profile.id+bindings.map(([id])=>player.moves[id].label).join('|');
    if(signature!==this.signature){
      this.signature=signature;
      for(const[id]of bindings){const slot=this.slots.get(id),move=player.moves[id];
        slot.label.textContent=move.label;
        const glyph=move.kind==='area'?'area':move.kind==='mobility'?'dash':id==='kick'?'boot':roleIcon[player.profile.id];
        slot.graphic.innerHTML=icon(glyph);
      }
    }
    for(const[id]of bindings){const slot=this.slots.get(id),remaining=player.cooldowns[id]||0,move=player.moves[id],cooling=remaining>.05;
      slot.el.classList.toggle('cooling',cooling);slot.time.textContent=cooling?remaining.toFixed(1):'';
      slot.shade.style.height=Math.min(100,100*remaining/(move.cooldown||1))+'%';
      slot.el.setAttribute('aria-label',`${slot.key}: ${move.label}, ${cooling?remaining.toFixed(1)+' seconds':'ready'}`);
    }
    const names={block:'GUARDING',blockEnd:'GUARDING',dodge:'EVADING',hit:'STAGGERED',down:'KNOCKED DOWN',getup:'RECOVERING',dead:'KNOCKED OUT',jump:'AIRBORNE',land:'LANDING'};
    const state=document.getElementById('phase');state.textContent=player.state==='attack'?(player.move?.label||'ATTACK').toUpperCase():names[player.state]||(player.crouching?'CROUCHING':'');
    state.hidden=!state.textContent;state.dataset.state=player.state;
    document.getElementById('lock').textContent=lock.target?'LOCKED ON':'LOCK ON';
    document.getElementById('lock').classList.toggle('engaged',!!lock.target);
    document.getElementById('dodge').textContent=player.state==='dodge'?'EVADING':player.dodgeCd>.05?player.dodgeCd.toFixed(1)+'s':'EVADE READY';
    const chain=document.getElementById('chain');chain.hidden=!(match.canFight&&player.comboRemaining>0);
    chain.textContent=chain.hidden?'':`${player.comboStage} / 3 CHAIN`;
    document.getElementById('timer').classList.toggle('urgent',match.state==='active'&&match.remaining<=15);
    document.getElementById('playerSound').textContent=world.sound.muted?'OFF':'ON';
  }
}
