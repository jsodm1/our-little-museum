import {cloud} from './online.js';
// Broadcast carries movement; the membership-protected heartbeat is a fallback.
export function connectTogether(worldId,userId,callbacks,realtimeKey){
 let closed=false,busy=false,payload={},seen={},ready=false,lastSent=0,dirty=true,connected=false,lastPose=0,lastBroadcast=0;
 const tabId=crypto.randomUUID();
 const channel=cloud.channel('world:'+worldId+':'+realtimeKey,{config:{private:true,presence:{key:userId},broadcast:{self:false}}});
 function receive(kind,p){if(!p||p.sender===userId)return;if(p.id&&seen[p.id])return;if(p.id)seen[p.id]=true;if(Object.keys(seen).length>500)seen={};callbacks.event(kind,p);}
 channel.on('broadcast',{event:'world'},({payload:e})=>receive(e.kind,e.data));
 channel.on('presence',{event:'sync'},()=>{const ids=Object.keys(channel.presenceState()).filter(id=>id!==userId);callbacks.presence(ids);});
 channel.subscribe(async status=>{if(closed)return;connected=status==='SUBSCRIBED';if(connected){await channel.track({user:userId,tab:tabId});callbacks.status('SUBSCRIBED');}else callbacks.status('RECONNECTING');});
 async function tick(){if(closed||busy||document.hidden)return;busy=true;try{
 if(dirty||Date.now()-lastSent>7000){const {error}=await cloud.from('couple_presence').upsert({world_id:worldId,user_id:userId,payload});if(error)throw error;dirty=false;lastSent=Date.now();}
 if(!connected||Date.now()-lastBroadcast>5000){const {data,error}=await cloud.from('couple_presence').select('user_id,payload,updated_at').eq('world_id',worldId).neq('user_id',userId);if(error)throw error;const others=data.filter(r=>Date.now()-Date.parse(r.updated_at)<18000);if(!connected)callbacks.presence(others.map(r=>r.user_id));for(const r of others){if(r.payload.pose)callbacks.event('pose',r.payload.pose);for(const [kind,e] of Object.entries(r.payload)){if(kind!=='pose'&&e?.id&&Date.now()-e.at<20000)receive(kind,e);}}}
 if(!ready){ready=true;callbacks.status(connected?'SUBSCRIBED':'FALLBACK');}
 }catch(e){ready=false;callbacks.status('CHANNEL_ERROR');callbacks.event('connection-error',{message:e.message});}finally{busy=false;}}
 const timer=setInterval(tick,connected?7000:1800);tick();
 return {send(kind,data){if(closed)return;const now=Date.now();if(kind==='pose'){const old=payload.pose;if(old&&Math.abs(old.x-data.x)+Math.abs(old.z-data.z)<.015&&old.place===data.place&&Math.abs(old.yaw-data.yaw)<.03&&old.action===data.action&&now-lastPose<4000)return;if(now-lastPose<120)return;lastPose=now;payload.pose=data;}else payload[kind]={...data,id:crypto.randomUUID(),at:now,sender:userId};dirty=true;if(connected){const e=kind==='pose'?{...data,sender:userId}:payload[kind];channel.send({type:'broadcast',event:'world',payload:{kind,data:e}}).catch(()=>{});lastBroadcast=now;}},close(){closed=true;clearInterval(timer);cloud.removeChannel(channel);}};
}
