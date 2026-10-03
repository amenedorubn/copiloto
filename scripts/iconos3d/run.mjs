import { chromium } from "playwright-core";
import fs from "node:fs";
// uso: node r3d/run.mjs pagina.html salida [tam=256]   -> salida.png (recortado, centrado) y salida.webp.b64
const [,, page, out, size] = process.argv; const N=+size||256;
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--enable-webgl"] });
const p = await b.newPage({ viewport:{width:800,height:800} });
p.on("console",m=>{ const t=m.text(); if(!/PCFSoftShadowMap|404/.test(t)) console.log("console:",t); }); p.on("pageerror",e=>console.log("PAGEERROR",e.message));
await p.goto("http://127.0.0.1:"+(process.env.PORT||8899)+"/scripts/iconos3d/"+page);
await p.waitForFunction(()=>window.__done===true,null,{timeout:300000});
const r=await p.evaluate((N)=>{
  const c=document.querySelector("canvas"); const w=c.width,h=c.height;
  const t=document.createElement("canvas"); t.width=w; t.height=h; const x=t.getContext("2d"); x.drawImage(c,0,0);
  const d=x.getImageData(0,0,w,h).data; let x0=w,y0=h,x1=0,y1=0;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++) if(d[(j*w+i)*4+3]>8){ if(i<x0)x0=i; if(i>x1)x1=i; if(j<y0)y0=j; if(j>y1)y1=j; }
  const bw=x1-x0+1, bh=y1-y0+1, s=Math.max(bw,bh), pad=0.04*s, S=s+2*pad;
  const o=document.createElement("canvas"); o.width=N; o.height=N; const q=o.getContext("2d"); q.imageSmoothingQuality="high";
  // reducir en dos pasos para mejor calidad
  const k=N/S; const mid=document.createElement("canvas"); mid.width=Math.round(w*k*2); mid.height=Math.round(h*k*2);
  const mq=mid.getContext("2d"); mq.imageSmoothingQuality="high"; mq.drawImage(c,0,0,mid.width,mid.height);
  q.drawImage(mid,(x0+bw/2-S/2)*k*2,(y0+bh/2-S/2)*k*2,S*k*2,S*k*2,0,0,N,N);
  return { png:o.toDataURL("image/png"), webp:o.toDataURL("image/webp",0.9) };
},N);
fs.writeFileSync(out+".png",Buffer.from(r.png.split(",")[1],"base64"));
fs.writeFileSync(out+".webp.b64",r.webp.split(",")[1]);
console.log("png",fs.statSync(out+".png").size,"webp b64",r.webp.split(",")[1].length);
await b.close();
