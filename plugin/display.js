/* PaperContext display hosts. Moving a card never starts or cancels translation. MIT */
(function(root){
 'use strict';
 function remember(state){
  if(!state.card.isConnected || state.mode==='sidebar' || state.card.classList.contains('cl-floating'))return;
  const rect=state.card.getBoundingClientRect();
  state.popupPosition={left:rect.left,top:rect.top};
  state.popupHost=state.card.parentElement;
 }
 function applyWidth(state,override){
  const mode=state.mode || 'popup',view=state.doc.defaultView;
  const limit=Math.max(160,Math.min(720,view.innerWidth-(mode==='sidebar'?240:32)));
  const width=Math.round(Math.max(Math.min(240,limit),Math.min(limit,override ?? state.sizing.width(mode))));
  if(mode==='sidebar'){
   state.doc.body.style.setProperty('--cl-dock-width',width+'px');
   if(state.dock)state.dock.style.width=width+'px';
   state.card.style.width='100%';
  }else{
   state.doc.body.style.setProperty('--cl-popup-width',width+'px');state.card.style.width=width+'px';
   if(state.card.classList.contains('cl-floating'))state.card.style.left=Math.max(8,Math.min(parseFloat(state.card.style.left)||8,view.innerWidth-width-8))+'px';
  }
  state.resizeHandle?.setAttribute('aria-valuenow',String(width));return width;
 }
 function setup(state,sizing){
  state.sizing=sizing;const {doc}=state;
  state.dismissTargets=new Set();
  state.onOutside=event=>{
   if(state.disposed || state.mode!=='popup' || !state.card.classList.contains('cl-floating') || state.cancelResize)return;
   if(!state.card.contains(event.target))sizing.dismiss();
  };
  state.bindDismiss=()=>{
   const targets=[doc,state.reader._window?.document,...doc.querySelectorAll('iframe')].map(target=>target?.contentDocument || target);
   for(const target of targets){if(!target?.addEventListener || state.dismissTargets.has(target))continue;target.addEventListener('pointerdown',state.onOutside,true);state.dismissTargets.add(target);}
  };
  state.bindDismiss();doc.addEventListener('load',state.bindDismiss,true);
  const handle=doc.createElement('button');handle.type='button';handle.className='cl-resize';
  handle.setAttribute('aria-label','拖动调整翻译框宽度');handle.title='左右拖动调整宽度（自动记住）；方向键也可调整';
  state.resizeHandle=handle;state.card.append(handle);
  handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  handle.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();e.stopPropagation();
   state.cancelResize?.();
   // A standalone floating host can be clamped to the viewport while dragging,
   // even if Zotero dismisses its original selection popup.
   if(state.mode==='popup' && !state.card.classList.contains('cl-floating')){
    remember(state);state.popupHost=null;state.forceFloating=true;mount(state,'popup');
   }
   const mode=state.mode,startX=e.clientX,startWidth=applyWidth(state);
   // Capture keeps dragging active when the pointer crosses the PDF iframe.
   // If capture is unavailable, keep handling events delivered to the handle.
   try{handle.setPointerCapture(e.pointerId);}catch{}
   const move=ev=>{if(ev.pointerId!==e.pointerId)return;ev.preventDefault();applyWidth(state,startWidth+(ev.clientX-startX)*(mode==='sidebar'?-1:1));};
   const stop=ev=>{
    if(ev && ev.pointerId!==e.pointerId)return;
    const width=mode==='sidebar'?state.dock?.getBoundingClientRect().width:state.card.getBoundingClientRect().width;
    handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',stop);handle.removeEventListener('pointercancel',stop);handle.removeEventListener('lostpointercapture',stop);state.cancelResize=null;
    if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
    if(ev?.type==='pointerup' && !state.disposed)sizing.save(mode,width);
   };
   state.cancelResize=()=>stop();handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',stop);handle.addEventListener('pointercancel',stop);handle.addEventListener('lostpointercapture',stop);
  });
  handle.addEventListener('keydown',e=>{
   if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();
   sizing.save(state.mode,applyWidth(state)+(e.key==='ArrowRight'?20:-20)*(state.mode==='sidebar'?-1:1));
  });
  state.onResize=()=>applyWidth(state);doc.defaultView.addEventListener('resize',state.onResize);
 }
 function clearDock(state){
  state.dock?.remove();state.dock=null;
  state.doc.body.classList.remove('contextleaf-docked');
 }
 function mount(state,mode,append){
  // Reader rerenders must not reparent an already mounted independent card
  // or interrupt the pointer capture of an active resize.
  if(state.mode===mode && state.card.isConnected && (mode==='sidebar'?state.dock?.contains(state.card):state.card.classList.contains('cl-floating')))return;
  state.cancelResize?.();remember(state);
  const {doc,card}=state;
  card.style.removeProperty('left');card.style.removeProperty('top');
  card.classList.remove('cl-floating');
  if(mode==='sidebar'){
   state.forceFloating=false;
   if(!state.dock){state.dock=doc.createElement('aside');state.dock.className='contextleaf-dock';state.dock.setAttribute('aria-label','研译固定翻译框');doc.body.append(state.dock);}
   state.dock.append(card);doc.body.classList.add('contextleaf-docked');
  }else{
   // Native popups can disappear while the fixed result remains. In that case
   // keep the same result in an independent floating card until the next selection.
   if(append && !state.forceFloating)append(card);
   else if(!state.forceFloating && state.popupHost?.isConnected && state.popupHost.getClientRects().length)state.popupHost.append(card);
   else{
    const position=state.popupPosition || {left:doc.defaultView.innerWidth-380,top:64};
    card.classList.add('cl-floating');
    card.style.left=Math.max(8,Math.min(position.left,doc.defaultView.innerWidth-370))+'px';
    card.style.top=Math.max(8,Math.min(position.top,doc.defaultView.innerHeight-200))+'px';
    doc.body.append(card);
   }
   card.append(state.resizeHandle);clearDock(state);
  }
  state.mode=mode;card.dataset.mode=mode;
  if(mode==='sidebar')state.dock.append(state.resizeHandle);
  applyWidth(state);
  state.modeButton.textContent=mode==='sidebar'?'返回浮窗':'固定到侧边';
  state.modeButton.title='切换显示位置，保留当前译文，不重新调用 API';
  state.modeButton.setAttribute('aria-pressed',String(mode==='sidebar'));
 }
 function cleanup(state){
  state.cancelResize?.();state.doc.defaultView.removeEventListener('resize',state.onResize);
  state.doc.removeEventListener('load',state.bindDismiss,true);
  for(const target of state.dismissTargets || [])target.removeEventListener('pointerdown',state.onOutside,true);
  state.dismissTargets?.clear();clearDock(state);
 }
 root.ContextLeafDisplay={mount,cleanup,setup,applyWidth};
})(typeof globalThis!=='undefined'?globalThis:this);
