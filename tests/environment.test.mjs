import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {constrain} from '../src/controls/navigation.js';
import {buildPlace,placeCatalog} from '../src/scenes/places.js';
import {museumConfig} from '../src/config/museumConfig.js';

test('all configured places have geometry, walkable spawns and interaction stations',()=>{
 assert.equal(new Set(placeCatalog.map(p=>p.id)).size,9);
 for(const p of placeCatalog.filter(p=>p.id!=='museum')){
  const world=buildPlace(p.id,{isCPU:true});let triangles=0;
  world.scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  assert(triangles>1000&&triangles<45000,`${p.id}: geometry budget`);
  assert(world.zones.length>=4);assert(world.hotspots.some(h=>h.kind==='letter'));assert(world.hotspots.some(h=>h.kind==='memory'));
  const spawn=new Vector3(world.spawn[0],0,world.spawn[1]);constrain(spawn,.3,world.bounds,world.obstacles);
  assert(Math.abs(spawn.x)<=world.bounds.x-.299&&Math.abs(spawn.z)<=world.bounds.z-.299,p.id);
  for(const o of world.obstacles)assert(Math.abs(spawn.x-o.x)>=o.w/2+.299||Math.abs(spawn.z-o.z)>=o.d/2+.299,`${p.id}: spawn intersects obstacle`);
 }
});
test('movement remains within walls and cannot tunnel through a bench at supported time steps',()=>{
 const bounds={x:6,z:10},obstacles=[{x:0,z:0,w:2,d:2}],p=new Vector3(0,0,4);
 for(let i=0;i<160;i++){p.z-=.1*2.7;constrain(p,.3,bounds,obstacles);assert(p.z>=1.299);}
 for(const x of [-100,100])for(const z of [-100,100]){const q=constrain(new Vector3(x,0,z),.3,bounds,obstacles);assert(Math.abs(q.x)<=5.7);assert(Math.abs(q.z)<=9.7);}
});
test('sample memories have unique IDs and valid favorite/finale references',()=>{
 const m=museumConfig.memories;assert.equal(new Set(m.map(x=>x.id)).size,m.length);assert(m.length>=8);
 for(const id of [museumConfig.favoriteId,museumConfig.finaleId])assert(m.some(x=>x.id===id));
 for(const x of m){assert(x.position.every(Number.isFinite));assert(Number.isFinite(x.rotation));assert(x.file.endsWith('.jpg'));}
});
