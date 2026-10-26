/* PaperContext display hosts. Moving a card never starts or cancels translation. MIT */
(function(root){
 'use strict';
 function remember(state){
  if(!state.card.isConnected || state.mode==='sidebar' || state.card.classList.contains('cl-floating'))return;
  const rect=state.card.getBoundingClientRect();
  state.popupPosition={left:rect.left,top:rect.top};
  state.popupHost=state.card.parentElement;
 }
 function clearDock(state){
  state.dock?.remove();state.dock=null;
  state.doc.body.classList.remove('contextleaf-docked');
 }
 function mount(state,mode,append){
  remember(state);
  const {doc,card}=state;
  card.classList.remove('cl-floating');
  if(mode==='sidebar'){
   if(!state.dock){state.dock=doc.createElement('aside');state.dock.className='contextleaf-dock';state.dock.setAttribute('aria-label','研译固定翻译框');doc.body.append(state.dock);}
   state.dock.append(card);doc.body.classList.add('contextleaf-docked');
  }else{
   // Native popups can disappear while the fixed result remains. In that case
   // keep the same result in an independent floating card until the next selection.
   if(append)append(card);
   else if(state.popupHost?.isConnected && state.popupHost.getClientRects().length)state.popupHost.append(card);
   else{
    const position=state.popupPosition || {left:doc.defaultView.innerWidth-380,top:64};
    card.classList.add('cl-floating');
    card.style.left=Math.max(8,Math.min(position.left,doc.defaultView.innerWidth-370))+'px';
    card.style.top=Math.max(8,Math.min(position.top,doc.defaultView.innerHeight-200))+'px';
    doc.body.append(card);
   }
   clearDock(state);
  }
  state.mode=mode;card.dataset.mode=mode;
  state.modeButton.textContent=mode==='sidebar'?'返回浮窗':'固定到侧边';
  state.modeButton.title='切换显示位置，保留当前译文，不重新调用 API';
  state.modeButton.setAttribute('aria-pressed',String(mode==='sidebar'));
 }
 function cleanup(state){clearDock(state);}
 root.ContextLeafDisplay={mount,cleanup};
})(typeof globalThis!=='undefined'?globalThis:this);
