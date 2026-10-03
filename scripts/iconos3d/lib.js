import * as THREE from "three";
import {mergeGeometries} from "three/addons/utils/BufferGeometryUtils.js";
export {THREE,mergeGeometries};
const UP=new THREE.Vector3(0,1,0);
export function beamGeo(a,b,r,seg=5){
  a=new THREE.Vector3(...a); b=new THREE.Vector3(...b);
  const d=b.clone().sub(a), L=d.length();
  const g=new THREE.CylinderGeometry(r,r,L,seg,1);
  const q=new THREE.Quaternion().setFromUnitVectors(UP,d.clone().normalize());
  const m=new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(1,1,1));
  g.applyMatrix4(m); return g;
}
export function boxGeo(cx,cy,cz,sx,sy,sz){ const g=new THREE.BoxGeometry(sx,sy,sz); g.translate(cx,cy,cz); return g; }
export function merge(list){ return mergeGeometries(list.map(g=>g.index?g.toNonIndexed():g)); }
export function mat(v,rough=.8,metal=0){ return new THREE.MeshStandardMaterial({color:new THREE.Color(v,v,v),roughness:rough,metalness:metal}); }
export function mesh(geo,m,cast=true,recv=true){ const x=new THREE.Mesh(geo,m); x.castShadow=cast; x.receiveShadow=recv; return x; }
export function ground(scene,size=2000,op=.35){ const g=new THREE.Mesh(new THREE.CircleGeometry(size/2,96),new THREE.ShadowMaterial({opacity:op})); g.rotation.x=-Math.PI/2; g.receiveShadow=true; scene.add(g); return g; }
export function interpLog(tab,y){ for(let i=0;i<tab.length-1;i++){ const [y0,v0]=tab[i],[y1,v1]=tab[i+1]; if(y>=y0&&y<=y1){ const t=(y-y0)/(y1-y0); return Math.exp(Math.log(v0)+(Math.log(v1)-Math.log(v0))*t); } } return tab[tab.length-1][1]; }
