import {normalizeWorld} from '../config/personalization.js';
import { museumConfig } from '../config/museumConfig.js';
import { strToU8, strFromU8, zipSync, unzipSync } from 'fflate';
const template = structuredClone(museumConfig);
export const defaultWorld = () => normalizeWorld({
  version: 2, id: crypto.randomUUID(), title: 'Our Little World',
  couple: structuredClone(template.couple).map((c,i)=>({...c,faceWidth:1,faceHeight:1,eyeSize:1,glasses:false})),
  memories: structuredClone(template.memories), favoriteId:'first-picture',finaleId:'forever',
  personalMessage: template.personalMessage, letterDate: '', anniversary: '',
  startPlace:'beach', time:'sunset', music:'piano', soundtrack:null, volume:.4,
  bucketList:[{text:'Watch a sunset together',done:false},{text:'Make a new memory',done:false}],
  updatedAt:Date.now(),
});
const opening = new Promise((resolve,reject)=>{
  const r=indexedDB.open('our-little-world',2);
  r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('worlds'))db.createObjectStore('worlds',{keyPath:'id'});if(!db.objectStoreNames.contains('preferences'))db.createObjectStore('preferences');};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
});
async function operation(store,mode,run){
  const db=await opening;return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,mode),request=run(tx.objectStore(store));
    tx.oncomplete=()=>resolve(request?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
export const saveWorld = w=>{validateWorld(w);w.updatedAt=Date.now();return operation('worlds','readwrite',s=>s.put(w));};
export const listWorlds=()=>operation('worlds','readonly',s=>s.getAll());
export const readWorld=id=>operation('worlds','readonly',s=>s.get(id));
export const removeWorld=id=>operation('worlds','readwrite',s=>s.delete(id));
export const preference=(key,value)=>value===undefined?operation('preferences','readonly',s=>s.get(key)):operation('preferences','readwrite',s=>s.put(value,key));
export function validateWorld(w){
  if(!w||w.version!==2||typeof w.id!=='string'||!Array.isArray(w.couple)||w.couple.length!==2||!Array.isArray(w.memories)||w.memories.length>30)throw Error('This file is not a supported couple world.');
  if(!w.memories.length)throw Error('Keep at least one memory in your world.');
  for(const c of w.couple){if(typeof c.name!=='string'||!c.name.trim()||c.name.length>40)throw Error('Names must be 1–40 characters.');}
  for(const m of w.memories){if(typeof m.id!=='string'||typeof m.title!=='string'||!Array.isArray(m.position)||m.position.length!==3||!m.position.every(Number.isFinite))throw Error('A memory has invalid details.');}
  if(typeof w.title!=='string'||!w.title.trim()||w.title.length>70)throw Error('World title must be 1–70 characters.');
  if(typeof w.personalMessage!=='string'||w.personalMessage.length>6000)throw Error('Keep your letter within 6,000 characters.');
  if(!['museum','park','beach','cafe','rooftop','forest','home','winter','celebration'].includes(w.startPlace))w.startPlace='beach';
  const ids=new Set();
  for(const m of w.memories){
    if(ids.has(m.id))throw Error('Every memory needs a unique ID.');ids.add(m.id);
    if(!m.title.trim()||m.title.length>100||typeof m.description!=='string'||m.description.length>2000)throw Error('Check the memory title and description.');
    if(!Number.isFinite(m.rotation)||!Number.isFinite(m.order))throw Error('Frame rotation and order must be numbers.');
    if(Math.abs(m.position[0])>6||Math.abs(m.position[2])>10||m.position[1]<.5||m.position[1]>4)throw Error('Keep frames inside the gallery walls: X −6 to 6, Z −10 to 10, height 0.5 to 4.');
    if(m.image&&!/^(data:image\/(jpeg|png|webp|avif);base64,|https:\/\/|blob:)/.test(m.image))throw Error('Unsupported photograph URL.');
  }
  w.bucketList=Array.isArray(w.bucketList)?w.bucketList.slice(0,30):[];
  w.volume=Math.max(0,Math.min(1,Number(w.volume)||0));
  normalizeWorld(w);
  for(const key of ['brand','eyebrow','heading','subheading','description','enter','edit','loading','loadMessage'])if(typeof w.screen[key]!=='string'||w.screen[key].length>600)throw Error('Homepage text is too long or invalid.');
  for(const key of ['accent','paper','highlight'])if(!/^#[0-9a-f]{6}$/i.test(w.screen[key]))throw Error('Choose valid theme colors.');
  if(w.screen.logo&&!/^data:image\/(jpeg|png|webp);base64,/.test(w.screen.logo))throw Error('Upload a supported logo image.');
  if(w.decorations.length>60||w.playlist.length>5)throw Error('Keep up to 60 decorations and 5 soundtrack tracks.');
  for(const d of w.decorations){if(!['bench','table','planter','lantern','sign','arch','rug','gift','snowman','tree'].includes(d.type)||![d.x,d.z,d.rotation,d.scale].every(Number.isFinite)||Math.abs(d.x)>12||Math.abs(d.z)>12||d.scale<.5||d.scale>2)throw Error('A decoration has invalid placement.');}
  for(const [place,s] of Object.entries(w.places)){if(s.sky&&!/^#[0-9a-f]{6}$/i.test(s.sky))throw Error('Choose a valid sky color.');if(s.light&&!/^#[0-9a-f]{6}$/i.test(s.light))throw Error('Choose a valid light color.');}
  if(w.places[w.startPlace]?.disabled)throw Error('Your starting place must stay enabled.');
  return w;
}
export function download(data,name,type){
  const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function exportWorld(w){
  const copy=structuredClone(w);
  for(const m of copy.memories){if(m.image?.startsWith('blob:')||m.assetPath){const r=await fetch(m.image);if(!r.ok)throw Error('A photograph could not be included. Try again.');m.image=await blobData(await r.blob());delete m.assetPath;}}
  for(const c of copy.couple){if(c.faceAsset){const r=await fetch(c.faceTexture);if(!r.ok)throw Error('The face image could not be included.');c.faceTexture=await blobData(await r.blob());delete c.faceAsset;}}
  if(copy.soundtrack?.assetPath){const r=await fetch(copy.soundtrack.data);if(!r.ok)throw Error('The soundtrack could not be included.');copy.soundtrack.data=await blobData(await r.blob());delete copy.soundtrack.assetPath;}
  for(const t of copy.playlist||[])if(t.assetPath){const r=await fetch(t.data);if(!r.ok)throw Error('A playlist track could not be included.');t.data=await blobData(await r.blob());delete t.assetPath;}
  delete copy.cloudId;delete copy.revision;
  const data=zipSync({'world.json':strToU8(JSON.stringify(copy))},{level:3});
  download(data,(w.title||'our-world').replace(/[^a-z0-9-]/gi,'-')+'.couple.zip','application/zip');
}
export async function importWorld(file){
  if(file.size>25*1024*1024)throw Error('Choose a world backup smaller than 25 MB.');
  const archive=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:f=>f.name==='world.json'&&f.originalSize<40*1024*1024});
  if(!archive['world.json'])throw Error('The backup needs a world.json file.');
  const w=validateWorld(JSON.parse(strFromU8(archive['world.json'])));w.id=crypto.randomUUID();delete w.cloudId;delete w.revision;
  await saveWorld(w);return w;
}
export const blobData=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
export async function imageData(file,max=1600){
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw Error('Choose a JPEG, PNG, WebP or AVIF image. Convert HEIC to JPEG first.');
  if(file.size>15*1024*1024)throw Error('Choose an image smaller than 15 MB.');
  const bitmap=await createImageBitmap(file);const ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const c=document.createElement('canvas');c.width=Math.round(bitmap.width*ratio);c.height=Math.round(bitmap.height*ratio);c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
  return c.toDataURL('image/jpeg',.86);
}
