// Escudo nacional de Mexico dibujado en canvas (grises). Coordenadas locales: x -44..44, y -56..56 (y hacia abajo)
export function drawEscudo(ctx,cx,cy,S){
  ctx.save(); ctx.translate(cx,cy); ctx.scale(S,S); ctx.lineJoin="round"; ctx.lineCap="round";
  const INK="#1e1e1e", D="#3a3a3a", M="#6c6c6c", L="#a8a8a8", LL="#d4d4d4", L1="#9a9a9a", L2="#c4c4c4";
  const lw=(w)=>{ ctx.lineWidth=w; };
  const fillStroke=(f,s,w=.9)=>{ if(f){ ctx.fillStyle=f; ctx.fill(); } if(s){ ctx.strokeStyle=s; lw(w); ctx.stroke(); } };
  const ell=(x,y,rx,ry,rot,f,s,w)=>{ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2); fillStroke(f,s,w); };
  // ---- corona: encina (izq) y laurel (der) ----
  for(const sd of [-1,1]){
    ctx.save(); ctx.scale(sd,1);
    ctx.beginPath(); ctx.moveTo(-2,47); ctx.bezierCurveTo(-24,46,-37,31,-35,6); lw(1.8); ctx.strokeStyle=D; ctx.stroke();
    const leaves=[[-34,4,-95],[-36,11,-80],[-34,18,-66],[-31,25,-52],[-27,32,-40],[-21,38,-28],[-14,43,-16],[-7,46,-6],[-38,8,-110],[-33,14,-35],[-28,21,-25],[-22,28,-12]];
    leaves.forEach(([x,y,r],k)=>{ ctx.save(); ctx.translate(x,y); ctx.rotate(r*Math.PI/180); 
      ctx.beginPath(); ctx.moveTo(0,-6.5); ctx.quadraticCurveTo(3.8,-1,0,6.5); ctx.quadraticCurveTo(-3.8,-1,0,-6.5); fillStroke(k%3?L:M,INK,.55);
      ctx.beginPath(); ctx.moveTo(0,-5.5); ctx.lineTo(0,5.5); lw(.45); ctx.strokeStyle=INK; ctx.stroke(); ctx.restore(); });
    // bellotas (izq) / bayas (der)
    [[-37,16],[-30,30]].forEach(([x,y])=>{ ell(x,y,1.9,2.3,0,sd<0?D:INK,INK,.4); });
    ctx.restore();
  }
  // lazo tricolor (en grises) bajo la corona
  ctx.beginPath(); ctx.moveTo(0,46); ctx.bezierCurveTo(-8,40,-14,44,-11,50); ctx.bezierCurveTo(-7,52,-3,49,0,48); ctx.closePath(); fillStroke(LL,INK,.6);
  ctx.beginPath(); ctx.moveTo(0,46); ctx.bezierCurveTo(8,40,14,44,11,50); ctx.bezierCurveTo(7,52,3,49,0,48); ctx.closePath(); fillStroke(M,INK,.6);
  ctx.beginPath(); ctx.moveTo(-2,48); ctx.lineTo(-7,56); ctx.lineTo(-3,55); ctx.lineTo(0,50); ctx.closePath(); fillStroke(LL,INK,.5);
  ctx.beginPath(); ctx.moveTo(2,48); ctx.lineTo(7,56); ctx.lineTo(3,55); ctx.lineTo(0,50); ctx.closePath(); fillStroke(M,INK,.5);
  // ---- lago y roca ----
  ctx.beginPath(); ctx.moveTo(-24,41); ctx.quadraticCurveTo(-12,38,0,41); ctx.quadraticCurveTo(12,44,24,41); lw(1.2); ctx.strokeStyle=M; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-18,44); ctx.quadraticCurveTo(-9,42,0,44); ctx.quadraticCurveTo(9,46,18,44); lw(1.0); ctx.strokeStyle=L; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14,40); ctx.quadraticCurveTo(-10,31,-2,31); ctx.quadraticCurveTo(8,29,14,40); ctx.closePath(); fillStroke(L,INK,.7);
  ctx.beginPath(); ctx.moveTo(-6,38); ctx.quadraticCurveTo(-3,33,3,34); lw(.5); ctx.strokeStyle=INK; ctx.stroke();
  // ---- nopal ----
  const pad=(x,y,rx,ry,rot,f)=>{ ell(x,y,rx,ry,rot*Math.PI/180,f,INK,.7); for(let i=0;i<7;i++){ const a=i/7*Math.PI*2; const px=x+Math.cos(a+rot)*rx*.5, py=y+Math.sin(a+rot)*ry*.5; ctx.fillStyle=INK; ctx.fillRect(px-.3,py-.3,.6,.6); } };
  pad(-9,26,5.6,8.4,-28,M); pad(9,26,5.6,8.4,28,M); pad(0,22,6,9,0,L);
  [[-13,19],[13,20],[0,13]].forEach(([x,y])=>ell(x,y,2.1,2.8,0,D,INK,.5));
  // ---- cola ----
  for(const [x1,y1,x2,y2,w] of [[9,6,27,17,5],[7,7,19,26,4.8],[5,9,10,28,4.4]]){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2-w/2,y2); ctx.lineTo(x2+w/2,y2+1); ctx.closePath(); fillStroke(M,INK,.6); }
  // ---- alas con plumas ----
  function wing(sd,k){
    ctx.save(); ctx.scale(sd,1);
    const sx=-8, sy=-15;
    const feather=(L,phi,w,f)=>{ const a=phi*Math.PI/180; const tx=sx+L*Math.cos(a), ty=sy-L*Math.sin(a); const ang=Math.atan2(ty-sy,tx-sx); const nx=-Math.sin(ang)*w, ny=Math.cos(ang)*w; const mx=(sx+tx)/2, my=(sy+ty)/2;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.quadraticCurveTo(mx+nx,my+ny,tx,ty); ctx.quadraticCurveTo(mx-nx,my-ny,sx,sy); ctx.closePath(); fillStroke(f,INK,.6);
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(tx,ty); lw(.35); ctx.strokeStyle=M; ctx.stroke(); };
    for(let i=0;i<9;i++){ const phi=96+i*9.5; const L=(33+7*Math.sin(i/8*Math.PI))*k; feather(L,phi,4.6,i%2?L1:L2); }
    for(let i=0;i<7;i++){ const phi=102+i*11; feather((19+4*Math.sin(i/6*Math.PI))*k,phi,4.4,i%2?M:L1); }
    ell(-17,-17,9,6.4,-.7,D,INK,.6);
    ctx.restore();
  }
  wing(-1,1); wing(1,1.08);
  // ---- cuerpo ----
  ctx.beginPath(); ctx.moveTo(-12,-22); ctx.bezierCurveTo(-19,-8,-15,6,-4,14); ctx.lineTo(6,12); ctx.bezierCurveTo(13,2,12,-12,5,-24); ctx.bezierCurveTo(-1,-29,-8,-27,-12,-22); ctx.closePath();
  const gr=ctx.createLinearGradient(-16,-20,12,12); gr.addColorStop(0,L); gr.addColorStop(.5,M); gr.addColorStop(1,D); fillStroke(gr,INK,.9);
  // plumaje del pecho (escamas)
  ctx.strokeStyle=INK; lw(.45); for(let r=0;r<6;r++) for(let c=0;c<4-(r>3?1:0);c++){ const x=-12+c*5+(r%2)*2.5+r*0.6, y=-15+r*4.6; ctx.beginPath(); ctx.arc(x,y,2.1,0.1,Math.PI-0.1); ctx.stroke(); }
  // ---- patas y garras ----
  ctx.strokeStyle=D; lw(2.4); ctx.beginPath(); ctx.moveTo(-5,13); ctx.lineTo(-7,21); ctx.moveTo(3,13); ctx.lineTo(5,21); ctx.stroke();
  ctx.strokeStyle=INK; lw(1.1); for(const [x,y] of [[-7,21],[5,21]]){ for(const d of [-1,0,1]){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+d*3.4,y+3.2); ctx.stroke(); } }
  // ---- cabeza, cresta y pico ----
  ctx.beginPath(); ctx.moveTo(-6,-33); ctx.lineTo(-2,-40); ctx.lineTo(-1,-33); ctx.closePath(); fillStroke(M,INK,.6);
  ell(-9,-28,6.2,6.6,0,M,INK,.9); ctx.beginPath(); ctx.arc(-9,-27,5,Math.PI*1.1,Math.PI*1.9); lw(.4); ctx.strokeStyle=L; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14.5,-31); ctx.quadraticCurveTo(-25,-30,-26,-23); ctx.quadraticCurveTo(-22,-26,-14.5,-23.5); ctx.closePath(); fillStroke(L,INK,.8);
  ell(-11,-29.4,1.5,1.5,0,LL,INK,.4); ell(-11,-29.4,.7,.7,0,INK,null);
  // ---- serpiente (del pico, en S, hasta la garra) ----
  ctx.beginPath(); ctx.moveTo(-23,-24); ctx.bezierCurveTo(-35,-20,-22,-12,-29,-5); ctx.bezierCurveTo(-36,2,-26,7,-31,14); ctx.bezierCurveTo(-33,18,-25,20,-18,20);
  ctx.strokeStyle=INK; lw(4.2); ctx.stroke(); ctx.strokeStyle=M; lw(2.6); ctx.stroke();
  ctx.setLineDash([.7,1.6]); ctx.strokeStyle=INK; lw(2.4); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
