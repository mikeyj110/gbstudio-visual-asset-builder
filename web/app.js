let W=160,H=144; const TILE=8;
const canvas=document.getElementById('sceneCanvas'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const PIXEL_FONT={
"A":["01110","10001","10001","11111","10001","10001","10001"],"B":["11110","10001","10001","11110","10001","10001","11110"],"C":["01111","10000","10000","10000","10000","10000","01111"],"D":["11110","10001","10001","10001","10001","10001","11110"],"E":["11111","10000","10000","11110","10000","10000","11111"],"F":["11111","10000","10000","11110","10000","10000","10000"],"G":["01111","10000","10000","10111","10001","10001","01110"],"H":["10001","10001","10001","11111","10001","10001","10001"],"I":["11111","00100","00100","00100","00100","00100","11111"],"J":["00111","00010","00010","00010","00010","10010","01100"],"K":["10001","10010","10100","11000","10100","10010","10001"],"L":["10000","10000","10000","10000","10000","10000","11111"],"M":["10001","11011","10101","10101","10001","10001","10001"],"N":["10001","11001","10101","10011","10001","10001","10001"],"O":["01110","10001","10001","10001","10001","10001","01110"],"P":["11110","10001","10001","11110","10000","10000","10000"],"Q":["01110","10001","10001","10001","10101","10010","01101"],"R":["11110","10001","10001","11110","10100","10010","10001"],"S":["01111","10000","10000","01110","00001","00001","11110"],"T":["11111","00100","00100","00100","00100","00100","00100"],"U":["10001","10001","10001","10001","10001","10001","01110"],"V":["10001","10001","10001","10001","10001","01010","00100"],"W":["10001","10001","10001","10101","10101","10101","01010"],"X":["10001","10001","01010","00100","01010","10001","10001"],"Y":["10001","10001","01010","00100","00100","00100","00100"],"Z":["11111","00001","00010","00100","01000","10000","11111"],
"0":["01110","10001","10011","10101","11001","10001","01110"],"1":["00100","01100","00100","00100","00100","00100","01110"],"2":["01110","10001","00001","00010","00100","01000","11111"],"3":["11110","00001","00001","01110","00001","00001","11110"],"4":["00010","00110","01010","10010","11111","00010","00010"],"5":["11111","10000","10000","11110","00001","00001","11110"],"6":["01110","10000","10000","11110","10001","10001","01110"],"7":["11111","00001","00010","00100","01000","01000","01000"],"8":["01110","10001","10001","01110","10001","10001","01110"],"9":["01110","10001","10001","01111","00001","00001","01110"],
":":["00000","00100","00100","00000","00100","00100","00000"],".":["00000","00000","00000","00000","00000","00100","00100"],",":["00000","00000","00000","00000","00100","00100","01000"],"'":["00100","00100","00000","00000","00000","00000","00000"],"-":["00000","00000","00000","11111","00000","00000","00000"],"!":["00100","00100","00100","00100","00100","00000","00100"],"?":["01110","10001","00001","00010","00100","00000","00100"],"/":["00001","00010","00100","01000","10000","00000","00000"]," ":["00000","00000","00000","00000","00000","00000","00000"]};

let project={assetType:'scene',width:160,height:144,palette:['#0f380f','#306230','#8bac0f','#9bbc0f'],background:3,showGrid:false,showPixelGrid:false,zoom:3,tilesets:[],layers:[]};
let selectedId=null,isPainting=false;
let undoState=null,redoState=null,editStartState=null,paintStartState=null;
let stickerSelectionDrag=null;

// Paint selection / copy-paste state.
// These are editor-only values and are intentionally not stored in project JSON.
let paintSelection=null;
let paintSelectionDrag=null;
let paintClipboard=null;
let paintToolMode='paint'; // 'paint' | 'select' | 'paste' | 'shape'
let canvasPreviewPos=null;
let hideEditorOverlays=false;
const uid=()=>Math.random().toString(36).slice(2,10);
const ASSET_LABELS={scene:'Scene Background',sprite:'Sprite',stage:'Large Background / Stage Map'};
function normalizeDimension(v,fallback){v=Math.round(Number(v));return Number.isFinite(v)?Math.max(1,Math.min(2048,v)):fallback;}
function syncCanvasDimensions(){
  project.width=normalizeDimension(project.width,160);project.height=normalizeDimension(project.height,144);
  W=project.width;H=project.height;
  if(canvas.width!==W)canvas.width=W;if(canvas.height!==H)canvas.height=H;
  ctx.imageSmoothingEnabled=false;
}
function updateAssetUi(){
  document.getElementById('assetType').value=project.assetType||'scene';
  document.getElementById('canvasWidth').value=W;document.getElementById('canvasHeight').value=H;
  document.getElementById('projectSubtitle').textContent=`${ASSET_LABELS[project.assetType]||ASSET_LABELS.scene} · ${W}×${H}`;
  document.querySelectorAll('[data-scene-only]').forEach(el=>{el.hidden=project.assetType!=='scene';});
}

function baseLayer(type){const names={sticker:'Sticker from Tileset'};return {id:uid(),type,name:names[type]||type[0].toUpperCase()+type.slice(1),visible:true,x:0,y:0};}
function newLayer(type){
 let l=baseLayer(type);
 const pad=(W>=16&&H>=16)?8:0;
 if(type==='border') Object.assign(l,{style:'fancy-2',outer:0,inner:1,accent:2,ornament:0});
 if(type==='title') Object.assign(l,{text:'TITLE',color:0,scale:1,spacing:1,align:'center',width:Math.max(1,W-pad*2),height:Math.min(16,H),x:pad,y:Math.min(8,Math.max(0,H-1))});
 if(type==='text') Object.assign(l,{text:'Your text goes here.',color:0,scale:1,spacing:1,lineSpacing:2,width:Math.max(1,W-pad*2),height:Math.max(1,Math.min(40,H-pad*2)),x:pad,y:project.assetType==='scene'?Math.min(96,Math.max(0,H-40)):pad,align:'left'});
 if(type==='image'){const iw=Math.max(1,Math.min(96,W)),ih=Math.max(1,Math.min(64,H));Object.assign(l,{width:iw,height:ih,x:Math.max(0,Math.floor((W-iw)/2)),y:Math.max(0,Math.floor((H-ih)/2)),fit:'contain',border:true,borderColor:0,data:null});}
 if(type==='paint') Object.assign(l,{pixels:{},brushColor:0,brushSize:1,shapeType:'rectangle',shapeX:0,shapeY:0,shapeW:Math.max(1,Math.min(32,W)),shapeH:Math.max(1,Math.min(24,H))});
 if(type==='sticker') Object.assign(l,{x:0,y:0,tilesetId:null,tileCol:0,tileRow:0,tileCols:1,tileRows:1});
 return l;
}

function snapshot(){return JSON.stringify({project,selectedId});}
function restoreSnapshot(s){const data=JSON.parse(s);project=data.project;selectedId=data.selectedId;syncControls();render();}
function rememberAction(before){undoState=before;redoState=null;updateUndoRedoButtons();}
function performAction(fn){const before=snapshot();fn();rememberAction(before);render();}
function updateUndoRedoButtons(){
 const u=document.getElementById('undoAction'),r=document.getElementById('redoAction');
 if(u)u.disabled=!undoState;if(r)r.disabled=!redoState;
}
function undo(){if(!undoState)return;redoState=snapshot();const target=undoState;undoState=null;restoreSnapshot(target);updateUndoRedoButtons();}
function redo(){if(!redoState)return;undoState=snapshot();const target=redoState;redoState=null;restoreSnapshot(target);updateUndoRedoButtons();}

function color(i){return project.palette[Math.max(0,Math.min(3,+i||0))];}
function selected(){return project.layers.find(l=>l.id===selectedId);}
function drawPixelText(c,text,x,y,col,scale=1,spacing=1){x=Math.round(x);y=Math.round(y);for(const ch0 of text.toUpperCase()){const glyph=PIXEL_FONT[ch0]||PIXEL_FONT['?'];glyph.forEach((row,ry)=>[...row].forEach((b,rx)=>{if(b==='1'){c.fillStyle=col;c.fillRect(x+rx*scale,y+ry*scale,scale,scale);}}));x+=(5+spacing)*scale;}}
function textWidth(t,s=1,sp=1){return t.length*5*s+Math.max(0,t.length-1)*sp*s;}
function wrapText(t,max,s=1,sp=1){let lines=[],cur='';for(const word of t.toUpperCase().split(/\s+/)){const test=cur?cur+' '+word:word;if(textWidth(test,s,sp)<=max)cur=test;else{if(cur)lines.push(cur);cur=word;}}if(cur)lines.push(cur);return lines;}

function drawBorder(c,l){const x=l.x||0,y=l.y||0,w=W,h=H,o=color(l.outer),inn=color(l.inner),a=color(l.accent),orn=color(l.ornament);c.save();c.translate(x,y);if(l.style==='none'){c.restore();return;}if(l.style==='simple'){strokeRect(c,2,2,w-5,h-5,o);strokeRect(c,4,4,w-9,h-9,a);}else if(l.style==='double'){strokeRect(c,2,2,w-5,h-5,o);strokeRect(c,5,5,w-11,h-11,inn);strokeRect(c,7,7,w-15,h-15,a);}else if(l.style==='fancy-1'){strokeRect(c,1,1,w-3,h-3,o);strokeRect(c,4,4,w-9,h-9,inn);strokeRect(c,7,7,w-15,h-15,a);[[10,10,1,1],[w-11,10,-1,1],[10,h-11,1,-1],[w-11,h-11,-1,-1]].forEach(([px,py,sx,sy])=>{line(c,px,py,px+sx*8,py,orn);line(c,px,py,px,py+sy*8,orn);});}else if(l.style==='fancy-2'){strokeRect(c,1,1,w-3,h-3,o);strokeRect(c,4,4,w-9,h-9,inn);[[8,8,1,1],[w-9,8,-1,1],[8,h-9,1,-1],[w-9,h-9,-1,-1]].forEach(([px,py,sx,sy])=>{line(c,px,py,px+sx*5,py,orn);line(c,px,py,px,py+sy*5,orn);c.fillStyle=o;c.fillRect(px+sx*2,py+sy*2,1,1);});}else if(l.style==='minimal'){line(c,8,8,w-9,8,o);line(c,8,h-9,w-9,h-9,o);}c.restore();}
function strokeRect(c,x,y,w,h,col){c.strokeStyle=col;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w,h)}function line(c,x1,y1,x2,y2,col){c.strokeStyle=col;c.beginPath();c.moveTo(x1+.5,y1+.5);c.lineTo(x2+.5,y2+.5);c.stroke();}
function drawTitle(c,l){const tw=textWidth(l.text,l.scale,l.spacing);let x=l.x;if(l.align==='center')x=l.x+(l.width-tw)/2;else if(l.align==='right')x=l.x+l.width-tw;drawPixelText(c,l.text,x,l.y,color(l.color),l.scale,l.spacing);}
function drawTextLayer(c,l){const lines=wrapText(l.text,l.width,l.scale,l.spacing);let y=l.y;for(const ln of lines){if(y+7*l.scale>l.y+l.height)break;let x=l.x,tw=textWidth(ln,l.scale,l.spacing);if(l.align==='center')x=l.x+(l.width-tw)/2;else if(l.align==='right')x=l.x+l.width-tw;drawPixelText(c,ln,x,y,color(l.color),l.scale,l.spacing);y+=7*l.scale+l.lineSpacing;}}
function drawImage(c,l){c.save();if(l.border){c.strokeStyle=color(l.borderColor);c.strokeRect(l.x+.5,l.y+.5,l.width-1,l.height-1);}if(!l.data){c.strokeStyle=color(2);for(let i=-l.height;i<l.width;i+=8){c.beginPath();c.moveTo(l.x+i,l.y+l.height);c.lineTo(l.x+i+l.height,l.y);c.stroke();}c.restore();return;}const img=getCachedImage(l.data,renderCanvasView);if(img&&img.complete&&img.naturalWidth)drawImageActual(c,l,img);c.restore();}
function drawImageActual(c,l,img){let dx=l.x,dy=l.y,dw=l.width,dh=l.height;const sr=img.width/img.height,tr=dw/dh;if(l.fit==='stretch'){c.drawImage(img,dx,dy,dw,dh);return;}if(l.fit==='contain'){let w=dw,h=dh;if(sr>tr)h=dw/sr;else w=dh*sr;c.drawImage(img,dx+(dw-w)/2,dy+(dh-h)/2,w,h);}else{let sx=0,sy=0,sw=img.width,sh=img.height;if(sr>tr){sw=img.height*tr;sx=(img.width-sw)/2}else{sh=img.width/tr;sy=(img.height-sh)/2}c.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);}}
function drawPaint(c,l){for(const [k,v] of Object.entries(l.pixels)){const [x,y]=k.split(',').map(Number);c.fillStyle=color(v);c.fillRect(x,y,1,1);}}

const imageCache=new Map();
const paletteTilesetCache=new Map();
function getCachedImage(src,onload){
 if(!src)return null;
 let img=imageCache.get(src);
 if(!img){img=new Image();img.onload=()=>{if(onload)onload();};img.src=src;imageCache.set(src,img);}
 return img;
}
function getTileset(id){return (project.tilesets||[]).find(t=>t.id===id);}
function hexToRgb(hex){
 const h=String(hex||'#000000').replace('#','');
 return {r:parseInt(h.slice(0,2),16)||0,g:parseInt(h.slice(2,4),16)||0,b:parseInt(h.slice(4,6),16)||0};
}
function nearestPaletteRgb(r,g,b){
 let best=hexToRgb(project.palette[0]),bestD=Infinity;
 for(const hex of project.palette){
   const p=hexToRgb(hex),dr=r-p.r,dg=g-p.g,db=b-p.b,d=dr*dr+dg*dg+db*db;
   if(d<bestD){bestD=d;best=p;}
 }
 return best;
}
function getPalettizedTileset(ts,onload){
 if(!ts||!ts.data)return null;
 const key=`${ts.id}|${project.palette.join(',')}`;
 if(paletteTilesetCache.has(key))return paletteTilesetCache.get(key);
 const img=getCachedImage(ts.data,()=>{paletteTilesetCache.delete(key);if(onload)onload();});
 if(!img||!img.complete||!img.naturalWidth)return null;
 const sourceW=Math.floor(img.naturalWidth/8)*8,sourceH=Math.floor(img.naturalHeight/8)*8;
 if(!sourceW||!sourceH)return null;
 const off=document.createElement('canvas');off.width=sourceW;off.height=sourceH;
 const oc=off.getContext('2d',{willReadFrequently:true});oc.imageSmoothingEnabled=false;oc.drawImage(img,0,0,sourceW,sourceH,0,0,sourceW,sourceH);
 const data=oc.getImageData(0,0,sourceW,sourceH),px=data.data;
 for(let i=0;i<px.length;i+=4){
   if(px[i+3]===0)continue;
   const p=nearestPaletteRgb(px[i],px[i+1],px[i+2]);px[i]=p.r;px[i+1]=p.g;px[i+2]=p.b;
 }
 oc.putImageData(data,0,0);
 const result={canvas:off,width:sourceW,height:sourceH};paletteTilesetCache.set(key,result);return result;
}
function stickerRegion(l){
 return {
   col:Math.max(0,+l.tileCol||0),row:Math.max(0,+l.tileRow||0),
   cols:Math.max(1,+l.tileCols||1),rows:Math.max(1,+l.tileRows||1)
 };
}
function drawSticker(c,l){
 const ts=getTileset(l.tilesetId);if(!ts||!ts.data)return;
 const pal=getPalettizedTileset(ts,renderCanvasView);if(!pal)return;
 const r=stickerRegion(l),sx=r.col*8,sy=r.row*8,sw=r.cols*8,sh=r.rows*8;
 if(sx+sw>pal.width||sy+sh>pal.height)return;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(pal.canvas,sx,sy,sw,sh,Math.round(l.x||0),Math.round(l.y||0),sw,sh);c.restore();
}

function setPaintPixel(l,x,y,col){x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H)l.pixels[`${x},${y}`]=col;}
function rasterLine(l,x0,y0,x1,y1,col){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;while(true){setPaintPixel(l,x0,y0,col);if(x0===x1&&y0===y1)break;let e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy}}}
function rasterRect(l,x,y,w,h,col,filled=false){x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));if(filled){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)setPaintPixel(l,xx,yy,col);return;}rasterLine(l,x,y,x+w-1,y,col);rasterLine(l,x,y+h-1,x+w-1,y+h-1,col);rasterLine(l,x,y,x,y+h-1,col);rasterLine(l,x+w-1,y,x+w-1,y+h-1,col);}
function rasterEllipse(l,x,y,w,h,col,filled=false){x=Math.round(x);y=Math.round(y);w=Math.max(1,Math.round(w));h=Math.max(1,Math.round(h));const rx=(w-1)/2,ry=(h-1)/2,cx=x+rx,cy=y+ry;if(rx===0||ry===0){rasterRect(l,x,y,w,h,col,filled);return;}for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const nx=(xx-cx)/rx,ny=(yy-cy)/ry,d=nx*nx+ny*ny;if(filled){if(d<=1.0)setPaintPixel(l,xx,yy,col)}else if(d<=1.12&&d>=0.78)setPaintPixel(l,xx,yy,col);}}
function applyPaintShape(l){const x=+l.shapeX||0,y=+l.shapeY||0,w=Math.max(1,+l.shapeW||1),h=Math.max(1,+l.shapeH||1),col=+l.brushColor||0;if(l.shapeType==='line')rasterLine(l,x,y,x+w-1,y+h-1,col);else if(l.shapeType==='rectangle')rasterRect(l,x,y,w,h,col,false);else if(l.shapeType==='filled_rectangle')rasterRect(l,x,y,w,h,col,true);else if(l.shapeType==='ellipse')rasterEllipse(l,x,y,w,h,col,false);else if(l.shapeType==='filled_ellipse')rasterEllipse(l,x,y,w,h,col,true);}
function alignPaintShape(l,hAlign,vAlign){if(hAlign==='left')l.shapeX=0;if(hAlign==='center')l.shapeX=Math.round((W-l.shapeW)/2);if(hAlign==='right')l.shapeX=W-l.shapeW;if(vAlign==='top')l.shapeY=0;if(vAlign==='middle')l.shapeY=Math.round((H-l.shapeH)/2);if(vAlign==='bottom')l.shapeY=H-l.shapeH;}

function normalizePaintSelection(a,b,layerId){
 const x1=Math.min(a.x,b.x),y1=Math.min(a.y,b.y);
 const x2=Math.max(a.x,b.x),y2=Math.max(a.y,b.y);
 return {layerId,x:x1,y:y1,width:x2-x1+1,height:y2-y1+1};
}

function currentPaintSelection(){
 if(paintSelectionDrag){
   return normalizePaintSelection(
     paintSelectionDrag.start,
     paintSelectionDrag.current,
     paintSelectionDrag.layerId
   );
 }
 return paintSelection;
}

function copyPaintSelection(){
 const l=selected(),s=currentPaintSelection();
 if(!l||l.type!=='paint'||!s||s.layerId!==l.id)return false;

 const pixels={};
 for(const [key,colorIndex] of Object.entries(l.pixels||{})){
   const [px,py]=key.split(',').map(Number);
   if(px>=s.x&&px<s.x+s.width&&py>=s.y&&py<s.y+s.height){
     pixels[`${px-s.x},${py-s.y}`]=colorIndex;
   }
 }

 paintClipboard={width:s.width,height:s.height,pixels};
 return true;
}

function pastePaintClipboard(l,targetX,targetY){
 if(!paintClipboard||!l||l.type!=='paint')return;

 targetX=Math.round(targetX);
 targetY=Math.round(targetY);

 for(const [key,colorIndex] of Object.entries(paintClipboard.pixels)){
   const [dx,dy]=key.split(',').map(Number);
   setPaintPixel(l,targetX+dx,targetY+dy,colorIndex);
 }
}

function drawPaintSelection(c){
 if(hideEditorOverlays)return;

 const l=selected(),s=currentPaintSelection();
 if(!l||l.type!=='paint'||!s||s.layerId!==l.id)return;

 c.save();

 // Draw a high-contrast "marching ants" style outline using two passes.
 c.lineWidth=1;
 c.setLineDash([]);
 c.strokeStyle='rgba(0,0,0,.9)';
 c.strokeRect(s.x+.5,s.y+.5,s.width,s.height);

 c.setLineDash([2,2]);
 c.strokeStyle='rgba(255,255,255,.95)';
 c.strokeRect(s.x+.5,s.y+.5,s.width,s.height);

 c.restore();
}

function drawPixelMapPreview(c,pixels,alpha=.55){
 if(!pixels||hideEditorOverlays)return;
 c.save();
 c.globalAlpha=alpha;
 for(const [key,colorIndex] of Object.entries(pixels)){
   const [x,y]=key.split(',').map(Number);
   if(x<0||y<0||x>=W||y>=H)continue;
   c.fillStyle=color(colorIndex);
   c.fillRect(x,y,1,1);
 }
 c.restore();
}

function shapePreviewPixels(l,x,y){
 if(!l||l.type!=='paint')return {};
 const temp={
   pixels:{},
   brushColor:+l.brushColor||0,
   shapeType:l.shapeType,
   shapeX:x,
   shapeY:y,
   shapeW:Math.max(1,+l.shapeW||1),
   shapeH:Math.max(1,+l.shapeH||1)
 };
 applyPaintShape(temp);
 return temp.pixels;
}

function pastePreviewPixels(x,y){
 if(!paintClipboard)return {};
 const pixels={};
 for(const [key,colorIndex] of Object.entries(paintClipboard.pixels||{})){
   const [dx,dy]=key.split(',').map(Number);
   const px=x+dx,py=y+dy;
   if(px>=0&&py>=0&&px<W&&py<H)pixels[`${px},${py}`]=colorIndex;
 }
 return pixels;
}

function drawStickerPreview(c,l,x,y){
 if(hideEditorOverlays||!l||l.type!=='sticker')return;
 const ts=getTileset(l.tilesetId);
 if(!ts||!ts.data)return;
 const pal=getPalettizedTileset(ts,renderCanvasView);
 if(!pal)return;

 const r=stickerRegion(l),sx=r.col*8,sy=r.row*8,sw=r.cols*8,sh=r.rows*8;
 if(sx+sw>pal.width||sy+sh>pal.height)return;

 const px=Math.max(0,Math.min(W-sw,Math.round(x)));
 const py=Math.max(0,Math.min(H-sh,Math.round(y)));

 c.save();
 c.globalAlpha=.55;
 c.imageSmoothingEnabled=false;
 c.drawImage(pal.canvas,sx,sy,sw,sh,px,py,sw,sh);
 c.restore();

 c.save();
 c.setLineDash([2,2]);
 c.lineWidth=1;
 c.strokeStyle='rgba(255,255,255,.95)';
 c.strokeRect(px+.5,py+.5,sw,sh);
 c.restore();
}

function drawCanvasPreview(c){
 if(hideEditorOverlays||!canvasPreviewPos)return;

 const l=selected();
 if(!l)return;

 if(l.type==='paint'&&paintToolMode==='paste'&&paintClipboard){
   drawPixelMapPreview(c,pastePreviewPixels(canvasPreviewPos.x,canvasPreviewPos.y),.55);
   return;
 }

 if(l.type==='paint'&&paintToolMode==='shape'){
   drawPixelMapPreview(c,shapePreviewPixels(l,canvasPreviewPos.x,canvasPreviewPos.y),.55);
   return;
 }

 if(l.type==='sticker'){
   drawStickerPreview(c,l,canvasPreviewPos.x,canvasPreviewPos.y);
 }
}

function placementStatus(){
 const l=selected();
 if(!l)return 'Ready.';

 if(l.type==='paint'&&paintToolMode==='select')
   return 'Select: drag a rectangle on the canvas · Esc to cancel';

 if(l.type==='paint'&&paintToolMode==='paste'&&paintClipboard)
   return `Paste ${paintClipboard.width}×${paintClipboard.height}: move to preview · click to place · Esc to cancel`;

 if(l.type==='paint'&&paintToolMode==='shape')
   return `${String(l.shapeType||'shape').replaceAll('_',' ')} ${Math.max(1,+l.shapeW||1)}×${Math.max(1,+l.shapeH||1)}: move to preview · click to place · Esc to cancel`;

 if(l.type==='sticker'&&l.tilesetId){
   const r=stickerRegion(l);
   return `Sticker ${r.cols*8}×${r.rows*8}: move to preview · click to place`;
 }

 return 'Ready.';
}

function updatePlacementStatus(){
 const status=document.getElementById('statusBar');
 if(status)status.textContent=placementStatus();
}

function cancelCanvasPlacement(){
 paintSelectionDrag=null;
 canvasPreviewPos=null;
 if(paintToolMode==='select'||paintToolMode==='paste'||paintToolMode==='shape'){
   paintToolMode='paint';
 }
 updatePlacementStatus();
 render();
}

function resetPaintSelectionTools(){
 paintSelection=null;
 paintSelectionDrag=null;
 paintClipboard=null;
 paintToolMode='paint';
 canvasPreviewPos=null;
}
function drawLayer(c,l){if(!l.visible)return;if(project.assetType!=='scene'&&(l.type==='border'||l.type==='title'))return;if(l.type==='border')drawBorder(c,l);if(l.type==='title')drawTitle(c,l);if(l.type==='text')drawTextLayer(c,l);if(l.type==='image')drawImage(c,l);if(l.type==='paint')drawPaint(c,l);if(l.type==='sticker')drawSticker(c,l);}

function ensurePixelGridOverlay(){
 let overlay=document.getElementById('pixelGridOverlay');
 const frame=canvas.parentElement;

 if(!overlay){
   overlay=document.createElement('div');
   overlay.id='pixelGridOverlay';
   frame.appendChild(overlay);
 }

 // Keep this self-contained so the grid works even if index.html/styles.css
 // have not yet been updated with dedicated pixel-grid markup/styles.
 if(getComputedStyle(frame).position==='static')frame.style.position='relative';

 Object.assign(overlay.style,{
   position:'absolute',
   left:'0',
   top:'0',
   display:'none',
   pointerEvents:'none',
   zIndex:'20',
   backgroundImage:[
     'linear-gradient(to right, rgba(255,255,255,.28) 1px, transparent 1px)',
     'linear-gradient(to bottom, rgba(255,255,255,.28) 1px, transparent 1px)'
   ].join(','),
   backgroundPosition:'0 0'
 });

 return overlay;
}
function renderCanvasView(){
 syncCanvasDimensions();
 ctx.clearRect(0,0,W,H);
 ctx.fillStyle=color(project.background);
 ctx.fillRect(0,0,W,H);

 project.layers.forEach(l=>drawLayer(ctx,l));

 if(project.showGrid){
   ctx.save();
   for(let x=0;x<W;x+=8)line(ctx,x,0,x,H,'rgba(128,128,128,.35)');
   for(let y=0;y<H;y+=8)line(ctx,0,y,W,y,'rgba(128,128,128,.35)');
   ctx.restore();
 }

 // Temporary placement previews are editor-only and never mutate layer data.
 drawCanvasPreview(ctx);

 // Paint selection is an editor overlay drawn on the canvas.
 // hideEditorOverlays prevents it from being included in PNG export.
 drawPaintSelection(ctx);

 const zoom=Number(project.zoom)||1;
 canvas.style.width=(W*zoom)+'px';
 canvas.style.height=(H*zoom)+'px';

 const activeLayer=selected();
 const interactivePlacement=
   activeLayer?.type==='sticker'||
   (activeLayer?.type==='paint'&&(paintToolMode==='select'||paintToolMode==='paste'||paintToolMode==='shape'));

 canvas.classList.toggle('painting',activeLayer?.type==='paint'&&paintToolMode==='paint');
 canvas.classList.toggle('placingSticker',interactivePlacement);
 canvas.style.cursor=interactivePlacement?'crosshair':'';

 updatePlacementStatus();

 // 1-pixel editor grid.
 // This is a real DOM overlay above the canvas so the opaque canvas bitmap
 // cannot hide it. It is intentionally shown only at 5x and 10x.
 const pixelGrid=ensurePixelGridOverlay();
 const showPixelGrid=!!project.showPixelGrid&&(zoom===5||zoom===10);

 pixelGrid.style.display=showPixelGrid?'block':'none';
 pixelGrid.style.width=(W*zoom)+'px';
 pixelGrid.style.height=(H*zoom)+'px';
 pixelGrid.style.backgroundSize=`${zoom}px ${zoom}px`;
}
function render(){renderCanvasView();renderLayers();renderProps();renderPalette();}

function renderPalette(){const host=document.getElementById('paletteEditor');host.innerHTML='';project.palette.forEach((p,i)=>{const row=document.createElement('div');row.className='swatchRow';row.innerHTML=`<div class="swatch" style="background:${p}"></div><input class="paletteInput" type="color" value="${p}" data-pal="${i}">`;host.appendChild(row);});document.getElementById('backgroundColor').innerHTML=project.palette.map((_,i)=>`<option value="${i}" ${i===project.background?'selected':''}>Color ${i+1}</option>`).join('');}
function renderLayers(){const host=document.getElementById('layerList');host.innerHTML='';[...project.layers].filter(l=>project.assetType==='scene'||(l.type!=='border'&&l.type!=='title')).reverse().forEach(l=>{const d=document.createElement('div');d.className='layerItem'+(l.id===selectedId?' selected':'');d.dataset.id=l.id;d.innerHTML=`<div class="eye">${l.visible?'◉':'○'}</div><div><div class="layerName">${escapeHtml(l.name)}</div><div class="layerType">${l.type==='sticker'?'Sticker from Tileset':l.type}</div></div><div>≡</div>`;host.appendChild(d);});}
function field(label,key,type='number',extra=''){const l=selected();return `<label>${label}<input data-key="${key}" type="${type}" value="${type==='checkbox'?'':escapeAttr(l[key]??'')}" ${type==='checkbox'&&l[key]?'checked':''} ${extra}></label>`}
function selectField(label,key,opts){const l=selected();return `<label>${label}<select data-key="${key}">${opts.map(o=>`<option value="${o}" ${l[key]===o?'selected':''}>${o}</option>`).join('')}</select></label>`}
function paletteSelect(label,key){const l=selected();return `<label>${label}<select data-key="${key}">${project.palette.map((p,i)=>`<option value="${i}" ${+l[key]===i?'selected':''}>Color ${i+1} · ${p}</option>`).join('')}</select></label>`}

function tilesetSelect(l){
 const items=(project.tilesets||[]).map(t=>`<option value="${escapeAttr(t.id)}" ${l.tilesetId===t.id?'selected':''}>${escapeHtml(t.name)}</option>`).join('');
 return `<label>Tileset<select id="stickerTilesetSelect"><option value="">— Select tileset —</option>${items}</select></label>`;
}
function renderStickerPicker(){
 const l=selected();if(!l||l.type!=='sticker')return;
 const picker=document.getElementById('stickerTilesetPicker'),info=document.getElementById('stickerTileInfo');
 if(!picker)return;const pc=picker.getContext('2d');pc.imageSmoothingEnabled=false;
 const ts=getTileset(l.tilesetId);
 if(!ts||!ts.data){
   picker.width=260;picker.height=80;pc.clearRect(0,0,picker.width,picker.height);
   pc.fillStyle='#222';pc.fillRect(0,0,picker.width,picker.height);pc.fillStyle='#aaa';pc.font='12px sans-serif';
   pc.fillText('Upload or select a tileset',14,43);if(info)info.textContent='No tile selection.';return;
 }
 const pal=getPalettizedTileset(ts,renderStickerPicker);if(!pal)return;
 const sourceW=pal.width,sourceH=pal.height,maxCols=Math.floor(sourceW/8),maxRows=Math.floor(sourceH/8);
 const maxW=280,maxH=320,fitScale=Math.min(maxW/sourceW,maxH/sourceH),displayScale=Math.max(1,Math.floor(fitScale));
 picker.width=sourceW*displayScale;picker.height=sourceH*displayScale;
 pc.clearRect(0,0,picker.width,picker.height);pc.imageSmoothingEnabled=false;
 pc.drawImage(pal.canvas,0,0,sourceW,sourceH,0,0,picker.width,picker.height);

 // Use the transient drag rectangle while the user is selecting; otherwise use the saved layer region.
 let r=stickerRegion(l);
 if(stickerSelectionDrag&&stickerSelectionDrag.layerId===l.id){
   const a=stickerSelectionDrag.start,b=stickerSelectionDrag.current;
   r={col:Math.min(a.col,b.col),row:Math.min(a.row,b.row),cols:Math.abs(a.col-b.col)+1,rows:Math.abs(a.row-b.row)+1};
 }
 r.col=Math.min(Math.max(0,r.col),Math.max(0,maxCols-1));
 r.row=Math.min(Math.max(0,r.row),Math.max(0,maxRows-1));
 r.cols=Math.min(Math.max(1,r.cols),maxCols-r.col);
 r.rows=Math.min(Math.max(1,r.rows),maxRows-r.row);

 const sx=r.col*8*displayScale,sy=r.row*8*displayScale,sw=r.cols*8*displayScale,sh=r.rows*8*displayScale;
 pc.save();
 pc.fillStyle='rgba(255,204,51,.16)';pc.fillRect(sx,sy,sw,sh);
 pc.strokeStyle='#ffffff';pc.lineWidth=Math.max(3,displayScale);pc.strokeRect(sx+.5,sy+.5,sw-1,sh-1);
 pc.strokeStyle='#ffcc33';pc.lineWidth=Math.max(1,displayScale);pc.strokeRect(sx+2,sy+2,Math.max(1,sw-4),Math.max(1,sh-4));
 pc.restore();

 picker.dataset.scale=String(displayScale);picker.dataset.sourceW=String(sourceW);picker.dataset.sourceH=String(sourceH);
 if(info)info.textContent=`Selected region — column ${r.col}, row ${r.row} · ${r.cols}×${r.rows} tiles · ${r.cols*8}×${r.rows*8} px`;

 function tileAt(ev){
   const rect=picker.getBoundingClientRect();
   const px=(ev.clientX-rect.left)*(picker.width/rect.width),py=(ev.clientY-rect.top)*(picker.height/rect.height);
   return {col:Math.max(0,Math.min(maxCols-1,Math.floor(px/(8*displayScale)))),row:Math.max(0,Math.min(maxRows-1,Math.floor(py/(8*displayScale))))};
 }
 picker.onpointerdown=ev=>{
   const t=tileAt(ev);stickerSelectionDrag={layerId:l.id,start:t,current:t,before:snapshot()};
   picker.setPointerCapture(ev.pointerId);renderStickerPicker();
 };
 picker.onpointermove=ev=>{
   if(!stickerSelectionDrag||stickerSelectionDrag.layerId!==l.id)return;
   stickerSelectionDrag.current=tileAt(ev);renderStickerPicker();
 };
 picker.onpointerup=ev=>{
   if(!stickerSelectionDrag||stickerSelectionDrag.layerId!==l.id)return;
   const d=stickerSelectionDrag,a=d.start,b=d.current;
   l.tileCol=Math.min(a.col,b.col);l.tileRow=Math.min(a.row,b.row);
   l.tileCols=Math.abs(a.col-b.col)+1;l.tileRows=Math.abs(a.row-b.row)+1;
   stickerSelectionDrag=null;rememberAction(d.before);render();
 };
 picker.onpointercancel=()=>{stickerSelectionDrag=null;renderStickerPicker();};
}


function renderProps(){const host=document.getElementById('properties'),l=selected();if(!l){host.innerHTML='<p class="muted">Select a layer.</p>';return;}let h=`${field('Name','name','text')}<div class="propGrid">${field('X','x')}${field('Y','y')}</div>`;
 if(l.type==='border')h+=selectField('Style','style',['none','simple','double','fancy-1','fancy-2','minimal'])+paletteSelect('Outer','outer')+paletteSelect('Inner','inner')+paletteSelect('Accent','accent')+paletteSelect('Ornament','ornament');
 if(l.type==='title')h+=`<label>Text<textarea data-key="text">${escapeHtml(l.text)}</textarea></label><div class="propGrid">${field('Width','width')}${field('Height','height')}${field('Scale','scale','number','min="1" max="4"')}${field('Spacing','spacing','number','min="0" max="4"')}</div>`+selectField('Align','align',['left','center','right'])+paletteSelect('Color','color');
 if(l.type==='text')h+=`<label>Text<textarea data-key="text">${escapeHtml(l.text)}</textarea></label><div class="propGrid">${field('Width','width')}${field('Height','height')}${field('Scale','scale','number','min="1" max="4"')}${field('Spacing','spacing')}${field('Line spacing','lineSpacing')}</div>`+selectField('Align','align',['left','center','right'])+paletteSelect('Color','color');
 if(l.type==='image')h+=`<div class="propGrid">${field('Width','width')}${field('Height','height')}</div>`+selectField('Fit','fit',['contain','cover','stretch'])+`<label class="checkboxRow"><input data-key="border" type="checkbox" ${l.border?'checked':''}> Border</label>`+paletteSelect('Border color','borderColor')+`<label>Image<input id="imageUpload" class="fileInput" type="file" accept="image/*"></label><button id="clearImage">Clear image</button>`;
 if(l.type==='paint'){
   const selection=currentPaintSelection();
   const hasSelection=!!(selection&&selection.layerId===l.id);
   const selectionInfo=hasSelection
     ? `${selection.width}×${selection.height} px at ${selection.x}, ${selection.y}`
     : 'No selection.';
   const clipboardInfo=paintClipboard
     ? `Clipboard: ${paintClipboard.width}×${paintClipboard.height} px`
     : 'Clipboard is empty.';

   h+=paletteSelect('Brush color','brushColor')
     +field('Brush size','brushSize','number','min="1" max="8"')
     +`<div class="paintTools">
         <button id="clearPaint">Clear paint</button>
         <button id="fillPaint">Fill canvas</button>
       </div>
       <hr class="propDivider">
       <h3 class="propHeading">Selection</h3>
       <div class="paintTools">
         <button id="selectPaintArea">${paintToolMode==='select'?'Selecting…':'Select Area'}</button>
         <button id="copyPaintSelection" ${hasSelection?'':'disabled'}>Copy</button>
         <button id="pastePaintSelection" ${paintClipboard?'':'disabled'}>${paintToolMode==='paste'?'Click Canvas…':'Paste'}</button>
         <button id="cancelPaintSelection" ${hasSelection||paintToolMode!=='paint'?'':'disabled'}>Cancel</button>
       </div>
       <p class="small">${selectionInfo}<br>${clipboardInfo}</p>
       <p class="small">Choose Select Area, drag a rectangle on the canvas, Copy it, then Paste and click the canvas to place the copied pixels in this same paint layer.</p>
       <hr class="propDivider">
       <h3 class="propHeading">Shape</h3>`
     +selectField('Shape','shapeType',['line','rectangle','filled_rectangle','ellipse','filled_ellipse'])
     +`<div class="propGrid">
         ${field('Shape X','shapeX')}
         ${field('Shape Y','shapeY')}
         ${field('Shape W','shapeW','number','min="1"')}
         ${field('Shape H','shapeH','number','min="1"')}
       </div>
       <div class="alignGrid">
         <button data-align-h="left">Left</button>
         <button data-align-h="center">Center</button>
         <button data-align-h="right">Right</button>
         <button data-align-v="top">Top</button>
         <button data-align-v="middle">Middle</button>
         <button data-align-v="bottom">Bottom</button>
       </div>
       <div class="paintTools">
         <button id="applyShape">Draw at X/Y</button>
         <button id="placeShape">${paintToolMode==='shape'?'Placing…':'Place Shape'}</button>
       </div>
       <p class="small">Use Draw at X/Y for exact coordinates, or Place Shape to preview it under the cursor and click where you want it.</p>`;
 }
 if(l.type==='sticker')h+=tilesetSelect(l)+`<label>Upload tileset<input id="stickerTilesetUpload" class="fileInput" type="file" accept="image/*"></label><h3 class="propHeading">Tileset Preview</h3><div id="stickerTileInfo" class="small stickerTileInfo">No tile selection.</div><div class="tilesetPickerWrap"><canvas id="stickerTilesetPicker" class="tilesetPicker"></canvas></div><div class="propGrid">${field('Start column','tileCol','number','min="0"')}${field('Start row','tileRow','number','min="0"')}${field('Tiles wide','tileCols','number','min="1"')}${field('Tiles high','tileRows','number','min="1"')}</div><p class="small">Click and drag across the tileset to select a rectangular group of 8×8 tiles. The full highlighted region becomes one Sticker from Tileset layer. Then click the main scene canvas to place its top-left corner; X/Y remain available for precise adjustment.</p>`;
 host.innerHTML=h;if(l.type==='sticker')renderStickerPicker();}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function escapeAttr(s=''){return escapeHtml(s)}

function addLayer(type){if(project.assetType!=='scene'&&(type==='border'||type==='title'))return;performAction(()=>{const l=newLayer(type);project.layers.push(l);selectedId=l.id;});}
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>addLayer(b.dataset.add));
document.getElementById('layerList').onclick=e=>{const item=e.target.closest('.layerItem');if(!item)return;const l=project.layers.find(x=>x.id===item.dataset.id);if(e.target.classList.contains('eye')){performAction(()=>l.visible=!l.visible);}else{const oldSelected=selected();selectedId=l.id;if(oldSelected?.id!==l.id){paintSelection=null;paintSelectionDrag=null;paintToolMode='paint';canvasPreviewPos=null;}render();}};
const propertiesHost=document.getElementById('properties');
propertiesHost.addEventListener('focusin',e=>{
 if(!e.target.dataset.key)return;
 if(editStartState===null)editStartState=snapshot();
});
propertiesHost.addEventListener('input',e=>{
 const l=selected();
 if(!l||!e.target.dataset.key)return;
 const k=e.target.dataset.key;
 l[k]=e.target.type==='checkbox'?e.target.checked:(e.target.type==='number'?+e.target.value:e.target.value);
 // Redraw only what needs to change. Do not rebuild the active input element.
 renderCanvasView();
 if(k==='name')renderLayers();
});
propertiesHost.addEventListener('focusout',e=>{
 if(!e.target.dataset.key||editStartState===null)return;
 const before=editStartState;
 editStartState=null;
 if(snapshot()!==before)rememberAction(before);
});
propertiesHost.addEventListener('change',e=>{
 const l=selected();
 if(!l)return;
 // Selects and checkboxes should commit immediately, but still preserve focus behavior.
 if(e.target.dataset.key&&(e.target.tagName==='SELECT'||e.target.type==='checkbox')){
   const before=editStartState||snapshot();
   const k=e.target.dataset.key;
   l[k]=e.target.type==='checkbox'?e.target.checked:e.target.value;
   editStartState=null;
   rememberAction(before);
   renderCanvasView();
   if(k==='name')renderLayers();
 }
 if(e.target.id==='imageUpload'&&e.target.files[0]){const before=snapshot();const r=new FileReader();r.onload=()=>{l.data=r.result;rememberAction(before);render()};r.readAsDataURL(e.target.files[0]);}
 if(e.target.id==='stickerTilesetSelect'){const before=snapshot();l.tilesetId=e.target.value||null;l.tileCol=0;l.tileRow=0;l.tileCols=1;l.tileRows=1;rememberAction(before);render();}
 if(e.target.id==='stickerTilesetUpload'&&e.target.files[0]){const before=snapshot();const f=e.target.files[0],r=new FileReader();r.onload=()=>{project.tilesets=project.tilesets||[];const ts={id:uid(),name:f.name,data:r.result};project.tilesets.push(ts);l.tilesetId=ts.id;l.tileCol=0;l.tileRow=0;l.tileCols=1;l.tileRows=1;imageCache.delete(r.result);paletteTilesetCache.clear();rememberAction(before);render();};r.readAsDataURL(f);}
});

document.getElementById('properties').onclick=e=>{const l=selected();if(!l)return;
 if(e.target.id==='clearPaint')performAction(()=>{l.pixels={};});
 if(e.target.id==='fillPaint')performAction(()=>{for(let y=0;y<H;y++)for(let x=0;x<W;x++)l.pixels[`${x},${y}`]=l.brushColor;});
 if(e.target.id==='clearImage')performAction(()=>{l.data=null;});
 if(e.target.id==='applyShape'){
   canvasPreviewPos=null;
   paintToolMode='paint';
   performAction(()=>applyPaintShape(l));
 }
 if(e.target.dataset.alignH)performAction(()=>alignPaintShape(l,e.target.dataset.alignH,null));
 if(e.target.dataset.alignV)performAction(()=>alignPaintShape(l,null,e.target.dataset.alignV));

 if(e.target.id==='selectPaintArea'&&l.type==='paint'){
   paintToolMode='select';
   paintSelection=null;
   paintSelectionDrag=null;
   canvasPreviewPos=null;
   render();
 }

 if(e.target.id==='copyPaintSelection'&&l.type==='paint'){
   if(copyPaintSelection())render();
 }

 if(e.target.id==='pastePaintSelection'&&l.type==='paint'&&paintClipboard){
   paintToolMode='paste';
   canvasPreviewPos=null;
   render();
 }

 if(e.target.id==='placeShape'&&l.type==='paint'){
   paintToolMode='shape';
   canvasPreviewPos=null;
   render();
 }

 if(e.target.id==='cancelPaintSelection'&&l.type==='paint'){
   paintToolMode='paint';
   paintSelection=null;
   paintSelectionDrag=null;
   canvasPreviewPos=null;
   render();
 }
};
document.getElementById('paletteEditor').onchange=e=>{if(e.target.dataset.pal!=null){const before=snapshot();project.palette[+e.target.dataset.pal]=e.target.value;paletteTilesetCache.clear();rememberAction(before);render();}};
document.getElementById('assetType').onchange=e=>{performAction(()=>{project.assetType=e.target.value;if(project.assetType!=='scene'){const l=selected();if(l&&(l.type==='border'||l.type==='title'))selectedId=null;}});updateAssetUi();};
function commitCanvasSize(){const nw=normalizeDimension(document.getElementById('canvasWidth').value,W),nh=normalizeDimension(document.getElementById('canvasHeight').value,H);if(nw===W&&nh===H)return;performAction(()=>{project.width=nw;project.height=nh;});updateAssetUi();}
document.getElementById('canvasWidth').addEventListener('change',commitCanvasSize);
document.getElementById('canvasHeight').addEventListener('change',commitCanvasSize);
document.getElementById('backgroundColor').onchange=e=>{performAction(()=>project.background=+e.target.value)};document.getElementById('showGrid').onchange=e=>{project.showGrid=e.target.checked;render()};document.getElementById('showPixelGrid').onchange=e=>{project.showPixelGrid=e.target.checked;renderCanvasView()};document.getElementById('zoomSelect').onchange=e=>{project.zoom=+e.target.value;renderCanvasView()};
document.getElementById('duplicateLayer').onclick=()=>{const l=selected();if(!l)return;performAction(()=>{const copy=structuredClone(l);copy.id=uid();copy.name=l.name+' copy';project.layers.splice(project.layers.indexOf(l)+1,0,copy);selectedId=copy.id;});};
document.getElementById('deleteLayer').onclick=()=>{const l=selected();if(!l)return;performAction(()=>{project.layers=project.layers.filter(x=>x.id!==l.id);selectedId=null;});};
document.getElementById('moveUp').onclick=()=>moveSelected(1);document.getElementById('moveDown').onclick=()=>moveSelected(-1);function moveSelected(d){const l=selected();if(!l)return;const i=project.layers.indexOf(l),j=i+d;if(j<0||j>=project.layers.length)return;performAction(()=>{[project.layers[i],project.layers[j]]=[project.layers[j],project.layers[i]];});}

function canvasPos(ev){const r=canvas.getBoundingClientRect();return {x:Math.floor((ev.clientX-r.left)*W/r.width),y:Math.floor((ev.clientY-r.top)*H/r.height)}}function paintAt(ev){const l=selected();if(!l||l.type!=='paint')return;const p=canvasPos(ev),bs=Math.max(1,l.brushSize||1);for(let yy=0;yy<bs;yy++)for(let xx=0;xx<bs;xx++){const x=p.x+xx,y=p.y+yy;if(x>=0&&y>=0&&x<W&&y<H)l.pixels[`${x},${y}`]=l.brushColor;}render();}
canvas.onpointerdown=e=>{
 const l=selected();

 if(l?.type==='paint'){
   if(paintToolMode==='select'){
     const p=canvasPos(e);
     paintSelectionDrag={
       layerId:l.id,
       start:p,
       current:p
     };
     paintSelection=null;
     canvasPreviewPos=null;
     canvas.setPointerCapture(e.pointerId);
     renderCanvasView();
     return;
   }

   if(paintToolMode==='paste'&&paintClipboard){
     const p=canvasPos(e);
     const before=snapshot();

     pastePaintClipboard(l,p.x,p.y);

     paintSelection={
       layerId:l.id,
       x:p.x,
       y:p.y,
       width:paintClipboard.width,
       height:paintClipboard.height
     };

     rememberAction(before);
     paintToolMode='paint';
     canvasPreviewPos=null;
     render();
     return;
   }

   if(paintToolMode==='shape'){
     const p=canvasPos(e);
     const before=snapshot();

     l.shapeX=p.x;
     l.shapeY=p.y;
     applyPaintShape(l);

     rememberAction(before);
     paintToolMode='paint';
     canvasPreviewPos=null;
     render();
     return;
   }

   paintStartState=snapshot();
   isPainting=true;
   canvas.setPointerCapture(e.pointerId);
   paintAt(e);
   return;
 }

 if(l?.type==='sticker'){
   const p=canvasPos(e),r=stickerRegion(l),sw=r.cols*8,sh=r.rows*8;
   performAction(()=>{
     l.x=Math.max(0,Math.min(W-sw,p.x));
     l.y=Math.max(0,Math.min(H-sh,p.y));
   });
   canvasPreviewPos=p;
 }
};

canvas.onpointermove=e=>{
 const p=canvasPos(e);
 document.getElementById('cursorPosition').textContent=`Cursor: ${p.x}, ${p.y}`;

 const l=selected();

 if(paintSelectionDrag){
   paintSelectionDrag.current=p;
   renderCanvasView();
   return;
 }

 if(
   l?.type==='sticker'||
   (l?.type==='paint'&&(paintToolMode==='paste'||paintToolMode==='shape'))
 ){
   canvasPreviewPos=p;
   renderCanvasView();
   return;
 }

 if(isPainting)paintAt(e);
};

canvas.onpointerenter=e=>{
 const l=selected();
 if(
   l?.type==='sticker'||
   (l?.type==='paint'&&(paintToolMode==='paste'||paintToolMode==='shape'))
 ){
   canvasPreviewPos=canvasPos(e);
   renderCanvasView();
 }
};

canvas.onpointerleave=()=>{
 document.getElementById('cursorPosition').textContent='Cursor: —, —';
 if(canvasPreviewPos){
   canvasPreviewPos=null;
   renderCanvasView();
 }
};

canvas.onpointerup=e=>{
 if(paintSelectionDrag){
   paintSelection=normalizePaintSelection(
     paintSelectionDrag.start,
     paintSelectionDrag.current,
     paintSelectionDrag.layerId
   );
   paintSelectionDrag=null;
   paintToolMode='paint';
   render();
   return;
 }

 if(isPainting&&paintStartState){
   rememberAction(paintStartState);
   paintStartState=null;
 }
 isPainting=false;
};

canvas.onpointercancel=()=>{
 isPainting=false;
 paintStartState=null;
 paintSelectionDrag=null;
 canvasPreviewPos=null;
 if(paintToolMode==='select')paintToolMode='paint';
 renderCanvasView();
};

document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 const tag=document.activeElement?.tagName;
 if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')document.activeElement.blur();
 if(paintToolMode!=='paint'||paintSelectionDrag||canvasPreviewPos){
   e.preventDefault();
   cancelCanvasPlacement();
 }
});

document.getElementById('undoAction').onclick=undo;document.getElementById('redoAction').onclick=redo;

function hasNativeFileApi(){return !!(window.__TAURI__?.dialog?.save&&window.__TAURI__?.fs?.writeFile);}
async function saveBytes(bytes,name,filterName,extensions){
 if(hasNativeFileApi()){
   try{
     const path=await window.__TAURI__.dialog.save({defaultPath:name,filters:[{name:filterName,extensions}]});
     if(!path)return;
     await window.__TAURI__.fs.writeFile(path,bytes);
     return;
   }catch(err){
     console.error('Native save failed',err);
     alert(`Unable to save file: ${err}`);
     return;
   }
 }
 download(new Blob([bytes]),name);
}
async function saveBlob(blob,name,filterName,extensions){
 if(!blob){alert('Unable to create export file.');return;}
 if(hasNativeFileApi()){
   const bytes=new Uint8Array(await blob.arrayBuffer());
   await saveBytes(bytes,name,filterName,extensions);
 }else download(blob,name);
}

document.getElementById('saveProject').onclick=async()=>{
 const bytes=new TextEncoder().encode(JSON.stringify(project,null,2));
 await saveBytes(bytes,'gbstudio-visual-asset.json','GB Asset Studio Project',['json']);
};
document.getElementById('loadProject').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{project=JSON.parse(r.result);paletteTilesetCache.clear();imageCache.clear();selectedId=null;undoState=null;redoState=null;resetPaintSelectionTools();syncControls();updateUndoRedoButtons();render()}catch(err){alert('Invalid project JSON')}};r.readAsText(f)};
document.getElementById('exportPng').onclick=()=>{
 const prevGrid=project.showGrid,prevPixelGrid=project.showPixelGrid;
 project.showGrid=false;
 project.showPixelGrid=false;
 hideEditorOverlays=true;
 renderCanvasView();

 canvas.toBlob(async b=>{
   hideEditorOverlays=false;
   project.showGrid=prevGrid;
   project.showPixelGrid=prevPixelGrid;
   renderCanvasView();

   await saveBlob(b,'gbstudio-visual-asset.png','PNG Image',['png']);
 },'image/png');
};
document.getElementById('newProject').onclick=()=>{if(!confirm('Start a new project?'))return;project={assetType:'scene',width:160,height:144,palette:['#0f380f','#306230','#8bac0f','#9bbc0f'],background:3,showGrid:false,showPixelGrid:false,zoom:3,tilesets:[],layers:[]};paletteTilesetCache.clear();imageCache.clear();selectedId=null;undoState=null;redoState=null;resetPaintSelectionTools();syncControls();updateUndoRedoButtons();render()};
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}function syncControls(){project.assetType=project.assetType||'scene';project.width=normalizeDimension(project.width,160);project.height=normalizeDimension(project.height,144);syncCanvasDimensions();project.tilesets=project.tilesets||[];project.layers=(project.layers||[]).map(l=>{if(l.type==='sticker'){if(!l.tileCols)l.tileCols=1;if(!l.tileRows)l.tileRows=1;if(l.name==='Sticker')l.name='Sticker from Tileset';}return l;});project.showPixelGrid=!!project.showPixelGrid;document.getElementById('showGrid').checked=!!project.showGrid;document.getElementById('showPixelGrid').checked=!!project.showPixelGrid;document.getElementById('zoomSelect').value=String(project.zoom||3);updateAssetUi()}

// Starter layers
project.layers=[newLayer('border'),newLayer('title'),newLayer('image'),newLayer('text')];selectedId=project.layers[1].id;syncControls();updateUndoRedoButtons();render();
