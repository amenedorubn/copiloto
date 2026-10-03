import * as THREE from "three";
import {RoomEnvironment} from "three/addons/environments/RoomEnvironment.js";
export async function render(build, opts={}){
  const S=opts.size||768;
  const canvas=document.createElement("canvas"); canvas.width=S; canvas.height=S; document.body.appendChild(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.setSize(S,S,false); renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=opts.exposure||1.05;
  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(opts.fov||28,1,0.1,2000);
  const hemi=new THREE.HemisphereLight(0xffffff,0x5a5a5a,opts.hemi??1.15); scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff,opts.sun??2.6);
  const sp=opts.sunPos||[-60,90,70]; sun.position.set(...sp);
  sun.castShadow=true; sun.shadow.mapSize.set(4096,4096);
  const sc=opts.shadowBox||80; Object.assign(sun.shadow.camera,{left:-sc,right:sc,top:sc,bottom:-sc,near:1,far:600});
  sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.04; sun.shadow.radius=3;
  scene.add(sun);
  const fill=new THREE.DirectionalLight(0xffffff,opts.fill??0.5); fill.position.set(80,30,40); scene.add(fill);
  if(opts.env){ const pm=new THREE.PMREMGenerator(renderer); scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture; scene.environmentIntensity=opts.env; }
  const api={THREE,scene,cam,renderer,sun};
  await build(api);
  renderer.render(scene,cam);
  return canvas;
}
export const grey=(v,rough=0.8,metal=0.0)=>new THREE.MeshStandardMaterial({color:new THREE.Color(v,v,v),roughness:rough,metalness:metal});
