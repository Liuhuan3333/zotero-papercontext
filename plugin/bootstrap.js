/* PaperContext — Zotero 10 bootstrap integration. MIT */
var ContextLeaf;
function install() {}
function uninstall() {}
async function startup({id,rootURI}) {
  await Zotero.initializationPromise;
  Services.scriptloader.loadSubScript(rootURI+'core.js',this);
  Services.scriptloader.loadSubScript(rootURI+'reader-context.js',this);
  Services.scriptloader.loadSubScript(rootURI+'providers.js',this);
  Services.scriptloader.loadSubScript(rootURI+'display.js',this);
  const D=this.ContextLeafDisplay;
  const C=this.ContextLeafCore;
  const R=this.ContextLeafReaderContext;
  const P=this.ContextLeafProviders;
  ContextLeaf={
    id,rootURI,store:null,engine:null,cards:new Map(),styles:new Set(),listeners:new Set(),probes:new Map(),pending:new Map(),sequence:0,lastRecord:new Map(),lastWrite:Promise.resolve(),loadError:null,saveError:null,
    dir:PathUtils.join(Zotero.Profile.dir,'contextleaf'),
    pref(name,fallback) { const v=Zotero.Prefs.get('extensions.contextleaf.'+name,true);return v===undefined?fallback:v; },
    providers() { return P.list(); },
    provider() { const id=this.pref('provider','deepseek');try{return P.get(id).id;}catch{return 'deepseek';} },
    providerInfo(id=this.provider()) { return P.get(id); },
    model(id=this.provider()) { const fallback=id==='deepseek'?this.pref('model',P.get(id).model):P.get(id).model;return C.normalize(this.pref('providers.'+id+'.model',fallback)) || P.get(id).model; },
    workspace(id=this.provider()) { return id==='qwen'?String(this.pref('providers.qwen.workspace','')).trim():''; },
    snapshot(id=this.provider()) { return {provider:id,model:this.model(id),endpoint:P.endpoint(id,this.workspace(id)),revision:this.pref('providers.'+id+'.keyRevision',0)}; },
    connection(id=this.provider()) {
      try {
        const config=this.snapshot(id);let record=null;
        try{record=JSON.parse(this.pref('providers.'+id+'.connection','null'));}catch{}
        return {...P.connectionState(this.hasKey(id),config,record,this.pending.get(id)),...config,name:P.get(id).name};
      }catch{return {kind:'invalid',label:'配置需要检查',tone:'error',name:P.get(id).name,model:this.model(id),time:null};}
    },
    subscribe(callback) { this.listeners.add(callback);return ()=>this.listeners.delete(callback); },
    notify() {
      for(const state of this.cards.values())this.updateConnection(state);
      for(const listener of this.listeners){try{listener();}catch{}}
    },
    updateConnection(state) {
      const c=this.connection();
      state.connection.textContent=c.name+' · '+c.model+' · '+c.label;
      state.connection.dataset.tone=c.tone;
      state.connection.title=(c.endpoint || '')+(c.time?'\n上次检查：'+new Date(c.time).toLocaleString(): '');
    },
    cancelCards() { for(const state of [...this.cards.values()])this.dispose(state); },
    setProvider(id) { P.get(id);this.cancelCards();Zotero.Prefs.set('extensions.contextleaf.provider',id,true);this.notify(); },
    saveSettings(model,workspace,enabled) {
      const id=this.provider();model=String(model).trim();workspace=String(workspace || '').trim();
      if(!/^[a-zA-Z0-9._:/-]{1,160}$/.test(model))throw new Error('模型名称不正确，请填写 API 使用的模型标识。');
      P.endpoint(id,workspace);this.cancelCards();this.cancelProbe(id);
      Zotero.Prefs.set('extensions.contextleaf.providers.'+id+'.model',model,true);
      if(id==='qwen')Zotero.Prefs.set('extensions.contextleaf.providers.qwen.workspace',workspace,true);
      Zotero.Prefs.set('extensions.contextleaf.enabled',!!enabled,true);this.notify();
    },
    enabled() { return this.pref('enabled',true); },
    displayMode() { return this.pref('displayMode','popup')==='sidebar'?'sidebar':'popup'; },
    setDisplayMode(mode) {
      if(!['popup','sidebar'].includes(mode))throw new Error('不支持的显示模式。');
      for(const state of this.cards.values())D.mount(state,mode);
      Zotero.Prefs.set('extensions.contextleaf.displayMode',mode,true);this.notify();
    },
    displayWidth(mode) {
      if(!['popup','sidebar'].includes(mode))throw new Error('不支持的显示模式。');
      const fallback=mode==='popup'?340:360,value=Number(this.pref(mode+'Width',fallback));
      return Number.isFinite(value)?Math.round(Math.max(240,Math.min(720,value))):fallback;
    },
    saveDisplayWidth(mode,width) {
      if(!['popup','sidebar'].includes(mode) || !Number.isFinite(width))throw new Error('宽度不正确。');
      Zotero.Prefs.set('extensions.contextleaf.'+mode+'Width',Math.round(Math.max(240,Math.min(720,width))),true);
      for(const state of this.cards.values())D.applyWidth(state);
    },
    fontSize() { return C.fontSize(this.pref('fontSize',16)); },
    applyFont(state) {
      const size=this.fontSize();state.card.style.setProperty('--cl-translation-font-size',size+'px');
      state.card.querySelector('.cl-font-value').textContent=String(size);
      state.card.querySelector('.cl-font-minus').disabled=size<=12;
      state.card.querySelector('.cl-font-plus').disabled=size>=28;
    },
    changeFont(delta) {
      Zotero.Prefs.set('extensions.contextleaf.fontSize',C.fontSize(this.fontSize()+delta),true);
      for(const state of this.cards.values())this.applyFont(state);
    },
    openSettings() { Zotero.Utilities.Internal.openPreferences('contextleaf-preferences'); },
    logins(id=this.provider()) { const p=P.get(id);return Services.logins.findLogins(p.origin,null,p.realm); },
    hasKey(id=this.provider()) { return this.logins(id).length>0; },
    cancelProbe(id) { const token=this.probes.get(id);if(token){token.cancelled=true;token.abort?.();this.probes.delete(id);}this.pending.delete(id); },
    credentialsChanged(id) {
      this.cancelCards();this.cancelProbe(id);
      const key='extensions.contextleaf.providers.'+id+'.keyRevision';
      Zotero.Prefs.set(key,this.pref('providers.'+id+'.keyRevision',0)+1,true);this.notify();
    },
    async setKey(secret,id=this.provider()) {
      secret=String(secret).trim();
      if(secret.length<8 || /\s/.test(secret))throw new Error('请输入完整的 API Key，不要包含空格。');
      const Login=Components.Constructor('@mozilla.org/login-manager/loginInfo;1','nsILoginInfo','init');
      const p=P.get(id),info=new Login(p.origin,null,p.realm,id,secret,'','');
      const old=this.logins(id)[0];
      if(old)await Services.logins.modifyLogin(old,info);
      else await Services.logins.addLoginAsync(info);
      this.credentialsChanged(id);
    },
    deleteKey(id=this.provider()) { for(const login of this.logins(id))Services.logins.removeLogin(login);this.credentialsChanged(id); },
    async init() {
      await IOUtils.makeDirectory(this.dir,{ignoreExisting:true,permissions:0o700});
      this.path=PathUtils.join(this.dir,'state.json');
      try { this.store=new C.Store(await IOUtils.exists(this.path)?await IOUtils.readJSON(this.path):undefined); }
      catch { this.store=new C.Store();this.loadError='本地术语文件无法读取，已暂停翻译以保护原文件。请备份 profile/contextleaf/state.json 后检查。'; }
      this.store.onChange=()=>{this.persist().catch(()=>{});};
      this.engine=new C.Engine(this.store,(body,token,config)=>this.request(body,token,config));
      await Zotero.PreferencePanes.register({id:'contextleaf-preferences',pluginID:id,src:rootURI+'prefs.xhtml',scripts:[rootURI+'prefs.js'],stylesheets:[rootURI+'prefs.css'],label:'研译'});
      this.handler=event=>{try{this.popup(event);}catch(error){Zotero.logError(new Error('PaperContext popup: '+error.message));}};
      Zotero.Reader.registerEventListener('renderTextSelectionPopup',this.handler,id);
    },
    persist() {
      if(this.loadError)return Promise.reject(new Error(this.loadError));
      const snapshot=JSON.stringify(this.store.toJSON());
      this.lastWrite=this.lastWrite.catch(()=>{}).then(async()=>{
        try { await IOUtils.writeUTF8(this.path,snapshot,{tmpPath:this.path+'.tmp'});await IOUtils.setPermissions(this.path,0o600);this.saveError=null; }
        catch { this.saveError='本地术语或缓存保存失败，请检查磁盘空间和目录权限。';throw new Error(this.saveError); }
      });
      return this.lastWrite;
    },
    record(config,order,ok,message='') {
      if(P.fingerprint(config)!==P.fingerprint(this.snapshot(config.provider)) || order<(this.lastRecord.get(config.provider) || 0))return;
      this.lastRecord.set(config.provider,order);
      Zotero.Prefs.set('extensions.contextleaf.providers.'+config.provider+'.connection',JSON.stringify({fingerprint:P.fingerprint(config),ok,time:Date.now(),message}),true);this.notify();
    },
    async request(body,token,config=this.snapshot()) {
      if(token?.cancelled)throw new Error('已取消');
      if(P.fingerprint(config)!==P.fingerprint(this.snapshot(config.provider)))throw new Error('配置已变化，请重新翻译。');
      const provider=P.get(config.provider),order=++this.sequence;
      let key;
      try { key=this.logins(config.provider)[0]?.password; }
      catch { throw new Error('无法读取已保存的密钥，请在设置中重新保存。'); }
      if(!key)throw new Error('请点击“设置”，填写 '+provider.name+' API Key。');
      let response;
      try {
        response=await Zotero.HTTP.request('POST',config.endpoint,{
          body:JSON.stringify(P.requestBody(config.provider,{...body,model:config.model})),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
          responseType:'json',successCodes:false,timeout:45000,anon:true,logBodyLength:0,errorDelayIntervals:[],
          cancellerReceiver:cancel=>{if(token){token.abort=cancel;if(token.cancelled)cancel();}}
        });
      } catch(error) {
        if(token?.cancelled)throw new Error('已取消');
        const message=error?.name==='TimeoutException'?'请求超时，请稍后手动重试。':'连接 '+provider.name+' 失败，请检查网络后手动重试。';
        this.record(config,order,false,message);throw new Error(message);
      } finally { if(token)token.abort=null;key=null; }
      if(token?.cancelled)throw new Error('已取消');
      try{const result=C.parseResponse(response.status,response.response);this.record(config,order,true);return result;}
      catch(error){this.record(config,order,false,error.message);throw error;}
    },
    async testConnection() {
      const config=this.snapshot(),id=config.provider;this.cancelProbe(id);
      const token={cancelled:false};this.probes.set(id,token);this.pending.set(id,P.fingerprint(config));this.notify();
      try{return await this.request({model:config.model,messages:[{role:'user',content:'Reply OK.'}],max_tokens:8,stream:false},token,config);}
      finally{if(this.probes.get(id)===token){this.probes.delete(id);this.pending.delete(id);this.notify();}}
    },
    identity(reader) {
      const attachment=Zotero.Items.get(reader.itemID || reader._item?.id);
      const parent=attachment?.parentID?Zotero.Items.get(attachment.parentID):attachment;
      if(!parent)throw new Error('无法识别当前论文。');
      return {paper:String(parent.libraryID)+':'+parent.key,title:parent.getField('title') || ''};
    },
    dispose(state) {
      state.disposed=true;state.token.cancelled=true;state.token.abort?.();
      clearTimeout(state.timer);state.observer?.disconnect();
      state.doc.defaultView.removeEventListener('pagehide',state.onUnload);
      D.cleanup(state);state.card.remove();
      if(this.cards.get(state.reader)===state)this.cards.delete(state.reader);
    },
    popup({reader,doc,params,append}) {
      const annotation=params.annotation;
      const selection=C.normalize(annotation?.text);
      if(!selection || !this.enabled())return;
      const identity=this.identity(reader);
      const signature=JSON.stringify([identity.paper,selection,annotation.position]);
      let state=this.cards.get(reader);
      if(state && state.signature===signature && !state.disposed) { D.mount(state,this.displayMode(),this.displayMode()==='popup'?append:null);return; }
      if(state)this.dispose(state);
      this.addStyle(doc);
      const card=doc.createElement('div');card.className='contextleaf-root';card.lang='zh-CN';
      const header=doc.createElement('div');header.className='cl-header';
      const name=doc.createElement('strong');name.textContent='研译';header.append(name);
      const smaller=this.button(doc,'A−',()=>this.changeFont(-2));smaller.className='cl-font-minus';smaller.title='缩小译文字号';smaller.setAttribute('aria-label','缩小译文字号');
      const fontValue=doc.createElement('span');fontValue.className='cl-font-value';fontValue.title='当前译文字号（像素）';
      const larger=this.button(doc,'A＋',()=>this.changeFont(2));larger.className='cl-font-plus';larger.title='放大译文字号';larger.setAttribute('aria-label','放大译文字号');
      header.append(smaller,fontValue,larger);
      const modeButton=this.button(doc,'固定到侧边',()=>this.setDisplayMode(state.mode==='sidebar'?'popup':'sidebar'));modeButton.className='cl-mode';header.append(modeButton);
      const settings=this.button(doc,'设置',()=>this.openSettings());header.append(settings);
      const close=this.button(doc,'×',()=>this.dispose(state));close.setAttribute('aria-label','关闭译文');header.append(close);
      const output=doc.createElement('div');output.className='cl-output';output.setAttribute('role','status');output.setAttribute('aria-live','polite');output.textContent='正在准备翻译…';
      const source=doc.createElement('div');source.className='cl-source';source.textContent=selection;source.setAttribute('aria-label','选中的原文');
      const meta=doc.createElement('div');meta.className='cl-meta';
      const connection=this.button(doc,'',()=>this.openSettings());connection.className='cl-connection';
      const actions=doc.createElement('div');actions.className='cl-actions';
      card.append(header,connection,source,output,meta,actions);
      state={reader,doc,card,modeButton,output,meta,connection,actions,identity,annotation,selection,signature,token:{cancelled:false},disposed:false};
      D.setup(state,{dismiss:()=>this.dispose(state),width:mode=>this.displayWidth(mode),save:(mode,width)=>this.saveDisplayWidth(mode,width)});
      this.cards.set(reader,state);this.applyFont(state);this.updateConnection(state);
      actions.append(this.button(doc,'更多上下文重译',()=>this.run(state,true)),this.button(doc,'纠正术语',()=>this.editor(state)),this.button(doc,'论文术语表',()=>this.terms(state)));
      card.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();this.dispose(state);}});
      // Native selection gestures should not consume typing/clicks inside the editor.
      card.addEventListener('pointerdown',e=>e.stopPropagation());
      D.mount(state,this.displayMode(),this.displayMode()==='popup'?append:null);
      state.onUnload=()=>this.dispose(state);doc.defaultView.addEventListener('pagehide',state.onUnload,{once:true});
      state.observer=new (Zotero.getMainWindow().MutationObserver)(()=>{if(!card.isConnected)this.dispose(state);});
      state.observer.observe(doc.body,{childList:true,subtree:true});
      state.timer=setTimeout(()=>this.run(state,false),450);
    },
    button(doc,text,handler) {
      const b=doc.createElement('button');b.type='button';b.textContent=text;
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handler();});return b;
    },
    async run(state,expanded) {
      if(state.disposed)return;
      clearTimeout(state.timer);state.token.cancelled=true;state.token.abort?.();
      const token=state.token={cancelled:false};
      state.output.textContent=expanded?'正在结合更多上下文翻译…':'正在翻译…';state.meta.textContent='';
      try {
        if(this.loadError)throw new Error(this.loadError);
        if(state.selection.length>3500)throw new Error('一次最多翻译3500字符，请缩小选区。');
        const config=this.snapshot(),context=await R.extract(state.reader,state.annotation,expanded);
        if(token.cancelled || state.disposed)return;
        const result=await this.engine.translate({...state.identity,selection:state.selection,context,expanded,model:config.model,provider:config.provider,endpoint:config.endpoint,connection:config},token);
        if(token.cancelled || state.disposed)return;
        state.output.textContent=result.text;
        if(result.source==='term')state.meta.textContent='论文术语表 · 本次未调用 API';
        else if(result.source==='cache')state.meta.textContent='本地缓存 · 本次未调用 API';
        else {
          const u=result.usage;
          state.meta.textContent=C.formatUsage(u)+` · 附加上下文 ${result.contextChars} 字符`;
          if(context.quality!=='paragraph')state.meta.textContent+=' · '+(context.quality==='nearby'?'附近文本上下文':'仅选中文字');
        }
        if(this.saveError)state.meta.textContent+=' · '+this.saveError;
      } catch(error) { if(!token.cancelled && !state.disposed)state.output.textContent=error.message || '翻译失败，请手动重试。'; }
    },
    editor(state,source='',target='') {
      state.card.querySelector('.cl-editor')?.remove();
      const doc=state.doc,box=doc.createElement('form');box.className='cl-editor';
      const title=doc.createElement('div');title.textContent='纠正当前论文中的术语';
      const src=doc.createElement('input');src.type='text';src.maxLength=120;src.placeholder='原词，例如 LLM';src.setAttribute('aria-label','原词');src.value=source || (state.selection.length<=120?state.selection:'');
      const dst=doc.createElement('input');dst.type='text';dst.maxLength=240;dst.placeholder='正确译法，例如 大语言模型';dst.setAttribute('aria-label','正确译法');dst.value=target;
      const message=doc.createElement('div');message.className='cl-meta';
      const save=async()=>{
        try {
          if(this.loadError)throw new Error(this.loadError);
          state.token.cancelled=true;state.token.abort?.();clearTimeout(state.timer);
          this.store.setTerm(state.identity.paper,src.value,dst.value);await this.lastWrite;
          message.textContent='已保存，仅用于当前论文；旧缓存已失效。';
          const exact=this.store.exactTerm(state.identity.paper,state.selection);
          if(exact){state.output.textContent=exact;state.meta.textContent='已纠正 · 本次未调用 API';}
          else {state.meta.textContent='术语已保存；点击重译以更新当前句子。';}
        } catch(error){message.textContent=error.message;}
      };
      box.addEventListener('submit',e=>{e.preventDefault();save();});
      const row=doc.createElement('div');row.className='cl-actions';
      row.append(this.button(doc,'保存术语',save),this.button(doc,'应用术语重译',()=>this.run(state,false)),this.button(doc,'收起',()=>box.remove()));
      box.append(title,src,dst,row,message);state.card.append(box);src.focus();
    },
    terms(state) {
      state.card.querySelector('.cl-editor')?.remove();
      const doc=state.doc,box=doc.createElement('div');box.className='cl-editor';
      const title=doc.createElement('strong');title.textContent='当前论文术语表';box.append(title);
      const terms=this.store.terms(state.identity.paper);
      if(!terms.length){const p=doc.createElement('p');p.textContent='尚无术语，使用“纠正术语”添加。';box.append(p);}
      for(const t of terms){
        const row=doc.createElement('div');row.className='cl-term';
        const text=doc.createElement('span');text.textContent=t.source+' → '+t.target;
        row.append(text,this.button(doc,'修改',()=>this.editor(state,t.source,t.target)),this.button(doc,'删除',async()=>{
          try {if(this.loadError)throw new Error(this.loadError);state.token.cancelled=true;state.token.abort?.();this.store.deleteTerm(state.identity.paper,t.source);await this.lastWrite;state.meta.textContent='术语已删除；旧缓存已失效。';this.terms(state);}
          catch(error){state.meta.textContent=error.message;}
        }));box.append(row);
      }
      box.append(this.button(doc,'收起',()=>box.remove()));state.card.append(box);
    },
    addStyle(doc) {
      if(doc.getElementById('contextleaf-style'))return;
      const style=doc.createElement('style');style.id='contextleaf-style';
      style.textContent=`
.selection-popup:has(.contextleaf-root){flex-wrap:wrap;max-width:min(calc(var(--cl-popup-width,340px) + 32px),calc(100vw - 28px));}
.selection-popup .custom-sections:has(.contextleaf-root){flex-basis:100%;min-width:0;width:100%;}
.contextleaf-root{position:relative;box-sizing:border-box;width:340px;max-width:calc(100vw - 54px);padding:10px 5px 3px;font:13px/1.65 system-ui,sans-serif;color:var(--fill-primary,#202b34);white-space:normal;text-align:left;}
.contextleaf-root *{box-sizing:border-box;}
.contextleaf-root .cl-header{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:7px;border-bottom:1px solid #80808033;padding-bottom:6px;}
.contextleaf-root .cl-mode{font-size:11px;}
.contextleaf-root .cl-source{display:none;}
body.contextleaf-docked{--cl-dock-width:min(360px,45vw);}
body.contextleaf-docked #split-view{inset-inline-end:var(--cl-dock-width);}
.contextleaf-dock{box-sizing:border-box;position:fixed;inset-inline-end:0;top:41px;bottom:var(--bottom-placeholder-height,0px);width:var(--cl-dock-width);overflow:auto;background:var(--material-background,#fff);border-inline-start:1px solid #80808044;z-index:40;padding:10px;}
.contextleaf-dock .contextleaf-root{width:100%;max-width:none;padding:0;}
.contextleaf-dock .cl-source{display:block;font-size:12px;opacity:.7;max-height:16vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;border-bottom:1px solid #80808033;margin-bottom:10px;padding-bottom:8px;}
.contextleaf-dock .cl-output{max-height:none;}
.contextleaf-root.cl-floating{position:fixed;z-index:1000;max-height:80vh;overflow:auto;max-width:calc(100vw - 16px);padding:12px;border:1px solid #80808044;border-radius:8px;background:var(--material-background,#fff);box-shadow:0 4px 20px #0003;}
.cl-resize{touch-action:none;user-select:none;cursor:ew-resize;z-index:1100;}
.contextleaf-root button.cl-resize{position:absolute;right:0;bottom:0;width:20px;height:16px;min-height:0;padding:0;border:0;border-radius:3px;background:linear-gradient(135deg,transparent 50%,#80808088 52%,transparent 58%,#80808088 62%,transparent 68%);}
.contextleaf-root[data-mode=popup]{padding-bottom:20px;}
.contextleaf-dock>button.cl-resize{position:absolute;top:0;bottom:0;left:0;width:8px;border:0;padding:0;background:transparent;}
.contextleaf-dock>button.cl-resize:hover,.contextleaf-dock>button.cl-resize:focus-visible{background:#327b8880;}
@media print{.contextleaf-dock,.contextleaf-root.cl-floating{display:none;}body.contextleaf-docked #split-view{inset-inline-end:0;}}
.contextleaf-root .cl-font-value{font-variant-numeric:tabular-nums;font-size:12px;min-width:16px;text-align:center;}
.contextleaf-root button:disabled{opacity:.4;cursor:default;}
.contextleaf-root .cl-header strong{flex:1;color:var(--accent-blue,#327b88);}
.contextleaf-root button{appearance:none;-moz-appearance:none;display:inline-flex;align-items:center;justify-content:center;height:auto;min-height:26px;max-height:none;margin:0;font:inherit;line-height:1.4;cursor:pointer;padding:3px 6px;border-radius:5px;border:1px solid #80808044;background:transparent;color:inherit;}
.contextleaf-root button:hover{background:#80808020;}
.contextleaf-root .cl-output{font-size:var(--cl-translation-font-size,16px);line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere;max-height:32vh;overflow-y:auto;user-select:text;}
.contextleaf-root button.cl-connection{display:block;width:100%;text-align:left;font-size:12px;white-space:normal;overflow-wrap:anywhere;border:0;padding:0 0 8px;line-height:1.6;min-height:0;opacity:.85;}
.contextleaf-root .cl-connection[data-tone=success]{color:var(--accent-green,#278348);}
.contextleaf-root .cl-connection[data-tone=error]{color:var(--accent-red,#c34c42);}
.contextleaf-root .cl-meta{font-size:11px;opacity:.72;margin-top:7px;overflow-wrap:anywhere;}
.contextleaf-root .cl-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;font-size:11px;}
.contextleaf-root .cl-editor{margin-top:10px;padding-top:9px;border-top:1px solid #80808033;max-height:27vh;overflow-y:auto;}
.contextleaf-root input{width:100%;padding:6px;margin-top:6px;border:1px solid #80808066;border-radius:5px;font:inherit;background:var(--material-background,#fff);color:inherit;}
.contextleaf-root .cl-term{display:flex;gap:5px;align-items:center;margin:6px 0;}
.contextleaf-root .cl-term span{flex:1;overflow-wrap:anywhere;}
`;
      (doc.head || doc.documentElement).append(style);this.styles.add(style);
    },
    async stop() {
      Zotero.Reader.unregisterEventListener('renderTextSelectionPopup',this.handler);
      for(const state of [...this.cards.values()])this.dispose(state);
      for(const style of this.styles)style.remove();this.styles.clear();
      for(const id of this.probes.keys())this.cancelProbe(id);this.listeners.clear();
      await this.lastWrite.catch(()=>{});
      delete Zotero.ContextLeaf;
    }
  };
  Zotero.ContextLeaf=ContextLeaf;
  await ContextLeaf.init();
  // Personal build: updates are installed manually; no hosted update service.
  const {AddonManager}=ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
  const addon=await AddonManager.getAddonByID(id);
  if(addon)addon.applyBackgroundUpdates=AddonManager.AUTOUPDATE_DISABLE;
}
async function shutdown() { if(ContextLeaf)await ContextLeaf.stop();ContextLeaf=null; }
