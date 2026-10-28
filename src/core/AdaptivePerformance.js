// Graphics only. Never changes simulation rate, skill speed or network authority.
export class AdaptivePerformance{
 constructor({renderer,apply}){this.renderer=renderer;this.apply=apply;this.mode='auto';this.scale=1;this.average=20;this.window=0;this.cooldown=0;this.profile='medium';try{const saved=localStorage.getItem('sc-graphics-mode');if(['auto','low','medium','high'].includes(saved))this.mode=saved;}catch{}this.setMode(this.mode);}
 setMode(mode){if(!['auto','low','medium','high'].includes(mode))return;this.mode=mode;this.scale=1;this.average=20;this.window=0;this.cooldown=4;this.profile=mode==='auto'?'medium':mode;this.apply(this.profile);try{localStorage.setItem('sc-graphics-mode',mode);}catch{}document.querySelectorAll('[data-graphics-mode]').forEach(el=>el.value=mode);}
 update(dt,active=true){if(this.mode!=='auto'||!active||!(dt>0))return;const frame=Math.min(dt,.25);this.average+=(frame*1000-this.average)*Math.min(1,dt*2);this.cooldown=Math.max(0,this.cooldown-dt);if(this.cooldown)return;this.window+=dt;if(this.window<2)return;this.window=0;
  if(this.average>40&&this.profile!=='low'){this.profile='low';this.apply('low');this.scale=1;this.cooldown=5;return;}
  const next=this.average>25?Math.max(.65,this.scale-.08):this.average<18?Math.min(1,this.scale+.04):this.scale;
  if(Math.abs(next-this.scale)>.001){this.scale=next;const base=this.profile==='low'?.75:1;this.renderer.setPixelRatio(base*this.scale);this.cooldown=this.average<18?8:3;}
 }
}
