import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import {createAvatar} from '../src/characters/avatars.js';
import {wardrobe,setOutfit,normalizeWorld} from '../src/config/personalization.js';
import {decoration,customizeScene} from '../src/scenes/decorations.js';
import {buildPlace} from '../src/scenes/places.js';
test('every wardrobe builds finite geometry and performs articulated poses',()=>{
 for(const style of ['masculine','feminine'])for(const [id] of wardrobe[style]){const c={style,name:'Test',height:1};setOutfit(c,id);const a=createAvatar(c);for(const action of ['idle','sit','hug','dance','pose']){a.group.userData.action=action;a.animate(.016,2,.7,true,1);}let vertices=0;a.group.traverse(o=>{assert(o.position.toArray().every(Number.isFinite));if(o.geometry){const pos=o.geometry.attributes.position.array;assert([...pos].every(Number.isFinite),id);vertices+=pos.length/3;}});assert(vertices>1000);}
});
test('personalization preserves edits while migrating the original demo couple',()=>{
 const w={couple:[{name:'Jayson',style:'masculine'},{name:'Jamie',style:'feminine'}]};normalizeWorld(w);assert.equal(w.couple[1].name,'Joana');assert.equal(w.couple[1].garment,'dress');w.screen.heading='Only ours';normalizeWorld(w);assert.equal(w.screen.heading,'Only ours');
});
test('custom decorations have geometry and obstacles are added to walking boundaries',()=>{
 for(const type of ['bench','table','planter','lantern','arch','rug','gift','snowman','tree']){const o=decoration({type,color:'#aabbcc',x:2,z:3,scale:1,rotation:90});assert(o.children.length);assert.equal(o.position.x,2);assert(Math.abs(o.rotation.y-Math.PI/2)<.0001);}
 const data=buildPlace('beach',{isCPU:true});const count=data.obstacles.length;customizeScene(data,'beach',{places:{beach:{spawnX:1,spawnZ:2}},decorations:[{type:'bench',place:'beach',x:3,z:4,scale:1}]});assert.equal(data.obstacles.length,count+1);assert.deepEqual(data.spawn,[1,2]);
});
test('QR generation supports full private invitation URLs without truncation',async()=>{
 const url='https://jsodm1.github.io/our-little-museum/#invite='+crypto.randomUUID()+'.'+crypto.randomUUID()+crypto.randomUUID();const code=QRCode.create(url,{errorCorrectionLevel:'M'});assert(code.modules.size>=45);const png=await QRCode.toBuffer(url,{width:640,margin:4});assert.equal(png[1],80);assert(png.length>1000);
});
