// Explicitly run with: node tests/cloud.integration.mjs. Uses disposable QA accounts.
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {onlineConfig} from '../src/config/online.js';
import {museumConfig} from '../src/config/museumConfig.js';
import {randomUUID} from 'node:crypto';
const url=onlineConfig.url,key=onlineConfig.publishableKey;
const check=r=>{if(r.error)throw r.error;return r.data;};
const clients=[],ids=[];
const state={version:2,id:randomUUID(),title:'Disposable integration QA',couple:structuredClone(museumConfig.couple),memories:structuredClone(museumConfig.memories),personalMessage:'QA',bucketList:[],startPlace:'beach',time:'sunset',volume:.4};
try{
 for(let i=0;i<3;i++){const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),username='qa_'+Date.now().toString(36)+'_'+i,password=randomUUID()+'Aa1';check(await client.functions.invoke('couple-account',{body:{action:'register',username,password}}));const data=check(await client.auth.signInWithPassword({email:username+'@accounts.ourlittleworld.invalid',password}));ids.push(data.user.id);clients.push(client);}
 const [owner,partner,outsider]=clients;let world=check(await owner.rpc('create_couple_world',{initial_state:state}));const token=randomUUID()+randomUUID();check(await owner.rpc('invite_partner',{world_id:world.id,invite_secret:token}));check(await partner.rpc('accept_partner_invite',{world_id:world.id,invite_secret:token}));
 assert((await outsider.rpc('accept_partner_invite',{world_id:world.id,invite_secret:token})).error,'Invite must be single use');
 assert.equal(check(await outsider.from('couple_worlds').select('*').eq('id',world.id)).length,0,'Outsider cannot read');
 assert((await partner.rpc('publish_couple_world',{world_id:world.id,expected_revision:world.revision,next_state:state})).error,'Partner cannot publish');
 assert((await partner.rpc('update_my_avatar',{world_id:world.id,avatar:{name:'Forbidden'}})).error,'Partner cannot edit avatar');
 assert((await owner.rpc('set_partner_permission',{world_id:world.id,allow_edit:true})).error,'Cannot enable partner editing');
 check(await owner.from('couple_drafts').upsert({world_id:world.id,state:{...state,title:'Private draft'}}));assert.equal(check(await partner.from('couple_drafts').select('*').eq('world_id',world.id)).length,0,'Draft private');assert((await partner.from('couple_drafts').upsert({world_id:world.id,state})).error,'Partner cannot write draft');
 world=check(await owner.rpc('publish_couple_world',{world_id:world.id,expected_revision:world.revision,next_state:{...state,title:'Published QA'}}));assert.equal(check(await owner.from('couple_versions').select('*').eq('world_id',world.id)).length,1,'Previous version kept');assert.equal(check(await owner.from('couple_drafts').select('*').eq('world_id',world.id)).length,0,'Published draft removed');
 assert((await owner.rpc('publish_couple_world',{world_id:world.id,expected_revision:1,next_state:state})).error,'Stale publish rejected');
 const cap=check(await owner.from('couple_capsules').insert({world_id:world.id,title:'Future',body:'Private until tomorrow',unlock_at:new Date(Date.now()+86400000).toISOString(),published:true}).select().single());assert.equal(check(await partner.from('couple_capsules').select('*').eq('id',cap.id)).length,0,'Future letter blocked by server');check(await owner.from('couple_capsules').update({unlock_at:new Date(Date.now()-10000).toISOString()}).eq('id',cap.id));assert.equal(check(await partner.from('couple_capsules').select('*').eq('id',cap.id)).length,1,'Released letter readable');
 const m=check(await partner.from('couple_messages').insert({world_id:world.id,author_id:ids[1],body:'Disposable test message',kind:'letter'}).select().single());check(await owner.from('couple_reactions').upsert({message_id:m.id,user_id:ids[0],emoji:'❤️'}));assert.equal(check(await outsider.from('couple_messages').select('*').eq('world_id',world.id)).length,0);
 check(await partner.from('couple_reads').upsert({world_id:world.id,user_id:ids[1]}));check(await partner.from('couple_progress').upsert({world_id:world.id,user_id:ids[1],key:'wish:0',value:{done:true}}));
 const path=world.id+'/'+ids[1]+'/avatar/'+randomUUID();assert((await partner.storage.from('couple-media').upload(path,new Blob(['qa'],{type:'image/png'}))).error,'Partner avatar upload blocked');
 const channels=clients.map(c=>c.channel('world:'+world.id+':'+world.realtime_key,{config:{private:true,broadcast:{self:false}}}));let received=false;channels[1].on('broadcast',{event:'qa'},()=>received=true);
 const statuses=await Promise.all(channels.map(ch=>new Promise(resolve=>{let done=false;const t=setTimeout(()=>{if(!done){done=true;resolve('TIMEOUT');}},12000);ch.subscribe(s=>{if(!done&&['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT'].includes(s)){done=true;clearTimeout(t);resolve(s);}});})));console.log('Private realtime status:',statuses);assert.equal(statuses[0],'SUBSCRIBED');assert.equal(statuses[1],'SUBSCRIBED');assert.notEqual(statuses[2],'SUBSCRIBED');await channels[0].send({type:'broadcast',event:'qa',payload:{test:true}});await new Promise(r=>setTimeout(r,1500));assert(received,'Partner receives broadcast');
 await Promise.all(clients.map(c=>c.removeAllChannels()));check(await owner.rpc('manage_partner',{world_id:world.id,remove_partner:true}));assert.equal(check(await partner.from('couple_worlds').select('*').eq('id',world.id)).length,0,'Removed partner cannot read');
 console.log('PASS: owner-only edits, private drafts/history, invite reuse, stale revisions, scheduled letters, chat, reactions, progress, upload restrictions, private realtime and access removal.');
}finally{console.log('Disposable QA user IDs:',JSON.stringify(ids));for(const c of clients){await c.removeAllChannels();await c.auth.signOut();}}

process.exit(0);
