import { SUPABASE_CONFIG } from './config.js';
import { PLAYABLE,shortName,topic } from './Protocol.js';

let sdk;
async function loadSDK(){
 if(globalThis.supabase?.createClient)return globalThis.supabase;
 sdk??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('../../node_modules/@supabase/supabase-js/dist/umd/supabase.js',import.meta.url).href;script.onload=()=>resolve(globalThis.supabase);script.onerror=()=>{sdk=null;script.remove();reject(Error('Supabase client could not load. Run npm install.'));};document.head.appendChild(script);});return sdk;
}
export class SupabaseRooms{
 constructor(){this.channels=new Map();this.room=null;this.members=[];this.onChange=()=>{};this.onPacket=()=>{};this.onError=()=>{};this.polling=false;this.busy=false;}
 get configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_CONFIG.url)&&SUPABASE_CONFIG.publishableKey.startsWith('sb_publishable_');}
 get host(){return !!this.room&&this.room.host_id===this.user?.id;}
 async connect(){
  if(!this.configured)throw Error('Add your project URL and publishable key in src/online/config.js first.');
  if(this.client)return;
  const {createClient}=await loadSDK();const client=createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  try{let {data:{session}}=await client.auth.getSession();if(!session){const r=await client.auth.signInAnonymously();if(r.error)throw r.error;session=r.data.session;}this.user=session.user;await client.realtime.setAuth(session.access_token);this.client=client;
   this.authListener=client.auth.onAuthStateChange((event,s)=>{if(s)client.realtime.setAuth(s.access_token).catch(e=>this.onError(e));else if(event==='SIGNED_OUT')this.onError(Error('Your guest session ended. Reconnect to play online.'));});
  }catch(e){await client.removeAllChannels();throw e;}
 }
 async rpc(name,args={}){const{data,error}=await this.client.rpc(name,args);if(error)throw Error(error.message);return data;}
 async create(name,fighter){await this.connect();await this.attach(await this.rpc('sc_create_room',{p_name:shortName(name),p_fighter:fighter}));}
 async join(code,name,fighter){await this.connect();if(!/^[A-F0-9]{10}$/.test(code.toUpperCase().trim()))throw Error('Enter the 10-character room code.');await this.attach(await this.rpc('sc_join_room',{p_code:code.trim().toUpperCase(),p_name:shortName(name),p_fighter:fighter}));}
 async attach(id){this.roomId=id;try{await this.refresh();this.timer=setInterval(()=>this.refresh().catch(e=>this.onError(e)),3000);this.heartbeat=setInterval(()=>this.rpc('sc_heartbeat',{p_room:id}).catch(e=>this.onError(e)),10000);}catch(e){await this.leave();throw e;}}
 async refresh(){
  if(this.polling||!this.roomId)return;this.polling=true;const id=this.roomId;
  try{
   const [r,m]=await Promise.all([this.client.from('sc_rooms').select('id,code,host_id,status,match_id').eq('id',id).single(),this.client.from('sc_members').select('user_id,display_name,fighter,ready,joined_at,last_seen').eq('room_id',id).order('joined_at').order('user_id')]);
   if(this.roomId!==id)return;if(r.error||m.error)throw Error('Room unavailable. The host may have left.');
   if(r.data.status==='closed')throw Error('The host closed this room.');
   if(!m.data.some(x=>x.user_id===this.user.id))throw Error('Your room membership ended. Join again.');
   this.room=r.data;this.members=m.data;await this.syncChannels();if(this.roomId===id)this.onChange();
  }finally{this.polling=false;}
 }
 async syncChannels(){
  // Guests need only their own input topic and the host snapshot topic.
  const ids=new Set(this.host?this.members.map(m=>m.user_id):[this.user.id,this.room.host_id]);
  for(const[id,ch]of this.channels)if(!ids.has(id)){this.channels.delete(id);await this.client.removeChannel(ch);}
  await Promise.all([...ids].filter(id=>!this.channels.has(id)).map(id=>new Promise((resolve,reject)=>{
   const ch=this.client.channel(topic(this.roomId,id),{config:{private:true,broadcast:{self:false,ack:false}}});this.channels.set(id,ch);
   const timer=setTimeout(()=>reject(Error('Private channel timed out. Check the SQL migration and Realtime settings.')),12000);
   ch.on('broadcast',{event:'packet'},({payload})=>{if(this.room&&payload?.v===1&&JSON.stringify(payload).length<150000)this.onPacket(id,payload);});
   ch.subscribe(status=>{if(this.channels.get(id)!==ch){clearTimeout(timer);resolve();return;}if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){clearTimeout(timer);this.channels.delete(id);const error=Error('Realtime connection interrupted. Rejoin the room.');reject(error);this.onError(error);}});
  })));
 }
 async update(fighter,ready,name){if(!this.room||this.room.status!=='lobby')return;if(!PLAYABLE.includes(fighter))throw Error('Choose a playable fighter.');await this.rpc('sc_update_member',{p_room:this.roomId,p_fighter:fighter,p_ready:ready,p_name:shortName(name)});await this.refresh();}
 async start(){await this.rpc('sc_start_match',{p_room:this.roomId});await this.refresh();}
 async finish(){if(this.host){await this.rpc('sc_finish_match',{p_room:this.roomId});await this.refresh();}}
 send(payload){const ch=this.channels.get(this.user?.id);if(!ch||ch.state!=='joined')return Promise.resolve(false);return ch.send({type:'broadcast',event:'packet',payload}).then(s=>s==='ok').catch(()=>false);}
 async leave(){const id=this.roomId;this.roomId=null;clearInterval(this.timer);clearInterval(this.heartbeat);this.room=null;this.members=[];const channels=[...this.channels.values()];this.channels.clear();if(this.client){await Promise.all(channels.map(ch=>this.client.removeChannel(ch)));if(id)await this.rpc('sc_leave_room',{p_room:id}).catch(()=>{});}this.onChange();}
}
