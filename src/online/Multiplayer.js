import { SupabaseRooms } from './SupabaseRooms.js';
import { OnlineMatch } from './OnlineMatch.js';
import { shortName } from './Protocol.js';

export class Multiplayer{
 constructor(options){
  Object.assign(this,options);this.rooms=new SupabaseRooms();this.session=new OnlineMatch({...options,rooms:this.rooms});options.world.online=this;this.busy=false;this.lastMatch=null;
  const el=this.el=document.createElement('details');el.id='onlineLobby';el.innerHTML='<summary>PLAY WITH FRIENDS / ONLINE</summary><p>2–4 players · Host stays connected · Private testing</p><label>PLAYER NAME<input id="onlineName" maxlength="20" autocomplete="nickname" placeholder="Your name"></label><div class="online-join"><input id="onlineCode" maxlength="10" autocomplete="off" placeholder="ROOM CODE" aria-label="Room code"><button type="button" id="joinRoom">Join</button><button type="button" id="createRoom">Create</button></div><p id="onlineMessage" role="status"></p><div id="onlineRoom" hidden><strong id="roomCode"></strong><button type="button" id="copyRoom">Copy code</button><ul id="roomMembers"></ul><div class="online-actions"><button type="button" id="readyRoom">Ready</button><button type="button" id="startOnline">Start match</button><button type="button" id="leaveRoom">Leave room</button></div></div>';
  document.getElementById('practice').after(el);this.name=el.querySelector('#onlineName');try{this.name.value=localStorage.getItem('sc-online-name')||'';}catch{}
  const overlay=this.overlay=document.createElement('aside');overlay.id='onlineOverlay';overlay.hidden=true;overlay.innerHTML='<small>FRIENDS / HOSTED MATCH</small><strong id="onlineRoundStatus"></strong><ol id="onlineScores"></ol><button type="button" id="onlineBack">Return everyone to room</button><button type="button" id="onlineExit">Leave online match</button>';document.body.appendChild(overlay);
  this.session.onMessage=message=>{this.message(message);document.getElementById('onlineRoundStatus').textContent=message;};this.session.onEnd=()=>this.draw();
  this.rooms.onChange=()=>this.changed();this.rooms.onPacket=(id,p)=>this.session.packet(id,p);this.rooms.onError=e=>{this.session.stop(e.message);this.message(e.message);this.rooms.leave().catch(()=>{});};
  const run=fn=>this.run(fn);
  el.querySelector('#createRoom').onclick=()=>run(()=>this.rooms.create(this.playerName,this.player.profile.id));el.querySelector('#joinRoom').onclick=()=>run(()=>this.rooms.join(el.querySelector('#onlineCode').value,this.playerName,this.player.profile.id));
  el.querySelector('#readyRoom').onclick=()=>run(()=>this.rooms.update(this.player.profile.id,!this.me?.ready,this.playerName));el.querySelector('#startOnline').onclick=()=>run(()=>this.rooms.start());
  el.querySelector('#leaveRoom').onclick=()=>run(()=>this.leave());overlay.querySelector('#onlineExit').onclick=()=>run(()=>this.leave());overlay.querySelector('#onlineBack').onclick=()=>run(()=>this.rooms.finish());
  el.querySelector('#copyRoom').onclick=()=>run(async()=>{await navigator.clipboard.writeText(this.rooms.room.code);this.message('Room code copied.');});
  this.name.addEventListener('change',()=>{try{localStorage.setItem('sc-online-name',this.playerName);}catch{}if(this.rooms.room)run(()=>this.rooms.update(this.player.profile.id,false,this.playerName));});
  // A selected hero becomes a room choice and clears ready, never a mid-match swap.
  const select=this.world.selectFighter;this.world.selectFighter=(side,id)=>{if(this.playing||this.busy&&this.rooms.room)return false;const ok=select(side,id);if(ok&&side==='player'&&this.rooms.room)run(()=>this.rooms.update(id,false,this.playerName));return ok;};
  this.message(this.rooms.configured?'Create a room or enter a friend’s code.':'Online setup: add Supabase settings in src/online/config.js, then run the SQL in supabase/migrations.');this.draw();
 }
 get playing(){return this.session.playing;}
 get me(){return this.rooms.members.find(m=>m.user_id===this.rooms.user?.id);}
 get playerName(){return shortName(this.name.value);}
 message(text){document.getElementById('onlineMessage').textContent=text;}
 async run(fn){if(this.busy)return;this.busy=true;this.draw();try{await fn();}catch(e){this.message(e.message);}finally{this.busy=false;this.draw();}}
 async leave(){this.session.stop('Left the online room.');await this.rooms.leave();this.lastMatch=null;this.message('Left the online room.');}
 changed(){
  const r=this.rooms.room;
  if(this.playing&&(!r||r.status!=='playing'||this.session.roster.some(m=>!this.rooms.members.some(n=>n.user_id===m.user_id)))){
   const wasPlaying=r?.status==='playing';this.session.stop(wasPlaying?'A player left. This round ended without saving results.':'Round ended. Ready up to play again.');if(wasPlaying&&this.rooms.host)this.rooms.finish().catch(e=>this.message(e.message));
  }
  if(r?.status==='playing'&&!this.playing&&r.match_id!==this.lastMatch){this.lastMatch=r.match_id;this.session.begin(r,this.rooms.members);}
  this.draw();
 }
 draw(){
  const room=this.rooms.room,joined=!!room;document.body.classList.toggle('online-room',joined);this.overlay.hidden=!this.playing;
  document.getElementById('onlineRoom').hidden=!joined;for(const id of ['createRoom','joinRoom','onlineCode'])document.getElementById(id).disabled=this.busy||joined;
  for(const id of ['startMatch','practice','arenaMode','opponentChoice']){const el=document.getElementById(id);if(el)el.disabled=joined;}
  if(room){document.getElementById('roomCode').textContent='ROOM '+room.code;const list=document.getElementById('roomMembers');list.replaceChildren();for(const m of this.rooms.members){const li=document.createElement('li');li.textContent=m.display_name+(m.user_id===room.host_id?' · HOST':'')+' / '+m.fighter+' / '+(m.ready?'READY':'CHOOSING');list.appendChild(li);}document.getElementById('readyRoom').textContent=this.me?.ready?'Not ready':'Ready';document.getElementById('readyRoom').disabled=this.busy||room.status!=='lobby';document.getElementById('startOnline').hidden=!this.rooms.host;document.getElementById('startOnline').disabled=this.busy||this.rooms.members.length<2||!this.rooms.members.every(m=>m.ready)||room.status!=='lobby';}
  document.getElementById('onlineBack').hidden=!this.rooms.host||!this.session.finished;document.getElementById('onlineExit').disabled=this.busy;
 }
 beforeStep(dt){return this.session.beforeStep(dt);}
 afterStep(dt){this.session.afterStep(dt);}
 render(camera){
  if(!this.playing)return;this.session.render(camera);this.overlay.hidden=false;document.getElementById('onlineBack').hidden=!this.rooms.host||!this.session.finished;
  if(performance.now()-(this.scoresAt||0)<200)return;this.scoresAt=performance.now();const list=document.getElementById('onlineScores');list.replaceChildren();for(const[id,c]of [...this.session.actors].sort((a,b)=>b[1].hp-a[1].hp)){const li=document.createElement('li');li.textContent=c.name+' / '+(c.alive?Math.ceil(c.hp)+' HP':'OUT');if(id===this.rooms.user.id)li.className='you';list.appendChild(li);}
 }
}
