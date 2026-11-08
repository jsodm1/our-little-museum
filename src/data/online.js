import { createClient } from '@supabase/supabase-js';
import { onlineConfig } from '../config/online.js';
const configured=Boolean(onlineConfig.url&&onlineConfig.publishableKey);
export const cloud=configured?createClient(onlineConfig.url,onlineConfig.publishableKey):null;
const check=({data,error})=>{if(error)throw error;return data;};
export const currentSession=async()=>cloud?check(await cloud.auth.getSession()).session:null;
export const signIn=async(email,password)=>check(await cloud.auth.signInWithPassword({email,password}));
export const register=async(email,password)=>check(await cloud.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}));
export const signOut=async()=>{if(cloud)check(await cloud.auth.signOut());};
export const cloudWorlds=async()=>check(await cloud.from('couple_worlds').select('*').order('updated_at',{ascending:false}));
async function assetURL(path){return check(await cloud.storage.from('couple-media').createSignedUrl(path,3600)).signedUrl;}
export async function hydrate(row){
  const w=structuredClone(row.state);w.cloudId=row.id;w.revision=row.revision;
  await Promise.all(w.memories.map(async m=>{if(m.assetPath)m.image=await assetURL(m.assetPath);}));
  await Promise.all(w.couple.map(async c=>{if(c.faceAsset)c.faceTexture=await assetURL(c.faceAsset);}));
  if(w.soundtrack?.assetPath)w.soundtrack.data=await assetURL(w.soundtrack.assetPath);
  await Promise.all((w.playlist||[]).map(async t=>{if(t.assetPath)t.data=await assetURL(t.assetPath);}));
  return w;
}
export const getCloudWorld=async id=>check(await cloud.from('couple_worlds').select('*').eq('id',id).single());
async function upload(worldId,userId,data,kind){
  const blob=await (await fetch(data)).blob();
  if(blob.size>12*1024*1024)throw Error('Choose a file smaller than 12 MB.');
  const path=worldId+'/'+userId+'/'+kind+'/'+crypto.randomUUID();
  check(await cloud.storage.from('couple-media').upload(path,blob,{contentType:blob.type,upsert:false}));
  return path;
}
function stripped(world){
  const w=structuredClone(world);delete w.cloudId;delete w.revision;
  w.memories.forEach(m=>{if(m.assetPath)delete m.image;});
  w.couple.forEach(c=>{if(c.faceAsset)delete c.faceTexture;});
  if(w.soundtrack?.assetPath)delete w.soundtrack.data;
  for(const t of w.playlist||[])if(t.assetPath)delete t.data;
  return w;
}
export async function publish(world,userId){
  let id=world.cloudId,revision=world.revision;
  if(!id){
    const initial=stripped(world);
    initial.memories.forEach(m=>{delete m.image;delete m.assetPath;});initial.couple.forEach(c=>{delete c.faceTexture;delete c.faceAsset;});initial.soundtrack=null;
    const row=check(await cloud.rpc('create_couple_world',{initial_state:initial}));
    id=row.id;revision=row.revision;world.cloudId=id;world.revision=revision;
  }
  const uploaded=[];
  try{
    for(const m of world.memories)if(m.image?.startsWith('data:')){m.assetPath=await upload(id,userId,m.image,'media');uploaded.push(m.assetPath);}
    for(const c of world.couple)if(c.faceTexture?.startsWith('data:')){c.faceAsset=await upload(id,userId,c.faceTexture,'avatar');uploaded.push(c.faceAsset);}
    if(world.soundtrack?.data?.startsWith('data:')){world.soundtrack.assetPath=await upload(id,userId,world.soundtrack.data,'media');uploaded.push(world.soundtrack.assetPath);}
    for(const t of world.playlist||[])if(t.data?.startsWith('data:')){t.assetPath=await upload(id,userId,t.data,'media');uploaded.push(t.assetPath);}
    const row=check(await cloud.rpc('publish_couple_world',{world_id:id,expected_revision:revision,next_state:stripped(world)}));
    world.revision=row.revision;return row;
  }catch(e){if(uploaded.length)await cloud.storage.from('couple-media').remove(uploaded);throw e;}
}
export async function invite(id){
  const token=crypto.randomUUID()+crypto.randomUUID();check(await cloud.rpc('invite_partner',{world_id:id,invite_secret:token}));
  return location.origin+location.pathname+'#invite='+encodeURIComponent(id+'.'+token);
}
export const acceptInvite=async(value)=>{
  const [world_id,invite_secret]=value.split('.');
  return check(await cloud.rpc('accept_partner_invite',{world_id,invite_secret}));
};
export const setEditing=async(id,enabled)=>check(await cloud.rpc('set_partner_permission',{world_id:id,allow_edit:enabled}));
export const messages=async id=>check(await cloud.from('couple_messages').select('*').eq('world_id',id).order('created_at',{ascending:false}).limit(80)).reverse();
export const postMessage=async(id,user,body)=>check(await cloud.from('couple_messages').insert({world_id:id,author_id:user,body}).select().single());
export async function saveAvatar(world,index,userId){
 const c=structuredClone(world.couple[index]);
 if(c.faceTexture?.startsWith('data:'))c.faceAsset=await upload(world.cloudId,userId,c.faceTexture,'avatar');
 if(c.faceAsset)delete c.faceTexture;
 return check(await cloud.rpc('update_my_avatar',{world_id:world.cloudId,avatar:c}));
}
export async function account(action,username,password,recovery){
 const {data,error}=await cloud.functions.invoke('couple-account',{body:{action,username,password,recovery}});
 if(error){let detail;try{detail=await error.context.json();}catch{}throw Error(detail?.error||error.message);}
 if(data.error)throw Error(data.error);return data;
}
export const usernameEmail=name=>name.toLowerCase().trim()+'@accounts.ourlittleworld.invalid';

export async function prepareAssets(world,userId){
 if(!world.cloudId)throw Error('Create a private world in Together first.');
 const w=structuredClone(world),id=w.cloudId;
 for(const m of w.memories)if(m.image?.startsWith('data:')){m.assetPath=await upload(id,userId,m.image,'media');delete m.image;}
 for(const c of w.couple)if(c.faceTexture?.startsWith('data:')){c.faceAsset=await upload(id,userId,c.faceTexture,'avatar');delete c.faceTexture;}
 if(w.soundtrack?.data?.startsWith('data:')){w.soundtrack.assetPath=await upload(id,userId,w.soundtrack.data,'media');delete w.soundtrack.data;}
 for(const track of w.playlist||[])if(track.data?.startsWith('data:')){track.assetPath=await upload(id,userId,track.data,'media');delete track.data;}
 return stripped(w);
}
export const draftRead=async id=>check(await cloud.from('couple_drafts').select('*').eq('world_id',id).maybeSingle());
export async function draftSave(w,user){const state=await prepareAssets(w,user);check(await cloud.from('couple_drafts').upsert({world_id:w.cloudId,state,updated_at:new Date().toISOString()}));return state;}
export const versions=async id=>check(await cloud.from('couple_versions').select('*').eq('world_id',id).order('created_at',{ascending:false}).limit(10));
export const managePartner=async(id,remove=false)=>check(await cloud.rpc('manage_partner',{world_id:id,remove_partner:remove}));
export const readReceipts=async id=>check(await cloud.from('couple_reads').select('*').eq('world_id',id));
export const markRead=async(id,user)=>check(await cloud.from('couple_reads').upsert({world_id:id,user_id:user,read_at:new Date().toISOString()}));
export const reactMessage=async(id,user,emoji)=>check(await cloud.from('couple_reactions').upsert({message_id:id,user_id:user,emoji}));
export const messageReactions=async ids=>ids.length?check(await cloud.from('couple_reactions').select('*').in('message_id',ids)):[];
export const mediaURL=assetURL;
export async function sendAttachment(id,user,file){return upload(id,user,await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);}), 'chat');}
export const sendMessage=async(id,user,body,extra={})=>check(await cloud.from('couple_messages').insert({world_id:id,author_id:user,body,...extra}).select().single());
export const capsules=async id=>check(await cloud.from('couple_capsules').select('*').eq('world_id',id).order('unlock_at'));
export const saveCapsule=async data=>check(await cloud.from('couple_capsules').upsert(data).select().single());
export const deleteCapsule=async id=>check(await cloud.from('couple_capsules').delete().eq('id',id));
export const progress=async id=>check(await cloud.from('couple_progress').select('*').eq('world_id',id));
export const saveProgress=async(id,user,key,value)=>check(await cloud.from('couple_progress').upsert({world_id:id,user_id:user,key,value,updated_at:new Date().toISOString()}));
