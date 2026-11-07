import {cloud} from './online.js';
// Membership-protected heartbeat works without enabling public Realtime channels.
export function connectTogether(worldId,userId,callbacks){
 let closed=false,busy=false,payload={},seen={},ready=false,lastSent=0,dirty=true;
 async function tick(){
  if(closed||busy||document.hidden)return;busy=true;
  try{
   if(dirty||Date.now()-lastSent>6000){
    const {error}=await cloud.from('couple_presence').upsert({world_id:worldId,user_id:userId,payload});if(error)throw error;lastSent=Date.now();dirty=false;
   }
   const {data,error}=await cloud.from('couple_presence').select('user_id,payload,updated_at').eq('world_id',worldId).neq('user_id',userId);if(error)throw error;
   if(!ready){ready=true;callbacks.status('SUBSCRIBED');}
   const others=data.filter(r=>Date.now()-Date.parse(r.updated_at)<18000);callbacks.presence(others.map(r=>r.user_id));
   for(const r of others){if(r.payload.pose)callbacks.event('pose',r.payload.pose);for(const kind of ['reaction','chat','view','travel','music']){const e=r.payload[kind];if(e&&seen[kind]!==e.id){seen[kind]=e.id;if(Date.now()-e.at<20000)callbacks.event(kind,e);}}}
  }catch(e){ready=false;callbacks.status('CHANNEL_ERROR');}finally{busy=false;}
 }
 const timer=setInterval(tick,900);tick();
 return{send(kind,data){if(kind==='pose'){const old=payload.pose;if(old&&Math.abs(old.x-data.x)+Math.abs(old.z-data.z)<.015&&old.place===data.place&&Math.abs(old.yaw-data.yaw)<.03)return;payload.pose=data;}else payload[kind]={...data,id:crypto.randomUUID(),at:Date.now()};dirty=true;},close(){closed=true;clearInterval(timer);}};
}
