import * as T from 'three';
import {createAvatar} from '../characters/avatars.js';
import {compatibilityRenderer} from '../scenes/compatibilityRenderer.js';
export function avatarPreview(host,config){
 let renderer;try{const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2');if(!context)throw Error('WebGL unavailable');renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:true});}catch{renderer=compatibilityRenderer();}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);
 const scene=new T.Scene();scene.background=new T.Color('#e5e8da');scene.add(new T.HemisphereLight('#fff9ed','#b5baa1',2.5));const light=new T.DirectionalLight('#fff1d5',3);light.position.set(2,4,5);scene.add(light);
 const camera=new T.PerspectiveCamera(35,1,.05,20);camera.position.set(0,1.1,3.3);camera.lookAt(0,.92,0);
 let avatar=createAvatar(config);scene.add(avatar.group);let yaw=.12,drag=false,x=0;
 const canvas=renderer.domElement;canvas.onpointerdown=e=>{drag=true;x=e.clientX;canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(drag){yaw+=(e.clientX-x)*.014;x=e.clientX;}};canvas.onpointerup=canvas.onpointercancel=()=>drag=false;
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(host);resize();
 let last=0;renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;avatar.group.rotation.y=yaw;avatar.animate(dt,now/1000,0,false,1);renderer.render(scene,camera);});
 function dispose(a){a.group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}});a.group.removeFromParent();}
 return{update(c){dispose(avatar);avatar=createAvatar(c);scene.add(avatar.group);},dispose(){renderer.setAnimationLoop(null);ro.disconnect();dispose(avatar);renderer.dispose?.();canvas.remove();}};
}
