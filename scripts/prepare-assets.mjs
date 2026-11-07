import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('public/mediapipe',{recursive:true});await mkdir('public/models',{recursive:true});
for(const f of ['vision_wasm_internal.js','vision_wasm_internal.wasm','vision_wasm_nosimd_internal.js','vision_wasm_nosimd_internal.wasm'])await copyFile('node_modules/@mediapipe/tasks-vision/wasm/'+f,'public/mediapipe/'+f);
const path='public/models/face_landmarker.task';let data;try{data=await readFile(path);}catch{}
if(!data){const r=await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');if(!r.ok)throw Error('Face model download failed: '+r.status);data=Buffer.from(await r.arrayBuffer());}
const expected='64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff';if(createHash('sha256').update(data).digest('hex')!==expected)throw Error('Face model checksum does not match.');await writeFile(path,data);
