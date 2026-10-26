var ContextLeafPreferences={
 init(win){
  const doc=win.document,$=id=>doc.getElementById(id);
  if(!$('cl-api-key') || $('cl-api-key').dataset.ready)return;
  $('cl-api-key').dataset.ready='true';const api=Zotero.ContextLeaf;
  const status=(text,error=false)=>{$('cl-status').textContent=text;$('cl-status').classList.toggle('cl-error',error);};
  for(const p of api.providers()){
   const option=doc.createElementNS('http://www.w3.org/1999/xhtml','option');option.value=p.id;option.textContent=p.name;$('cl-provider').append(option);
  }
  const refresh=()=>{
   $('cl-display-mode').value=api.displayMode();
   const c=api.connection();
   $('cl-provider-state').textContent=c.name+' · '+c.label;$('cl-connection-card').dataset.tone=c.tone;
   $('cl-current-model').textContent='当前模型：'+c.model;
   $('cl-last-check').textContent=c.time?'上次验证／请求：'+new Date(c.time).toLocaleString():'尚无当前配置的验证记录。';
   $('cl-endpoint').textContent=c.endpoint || '请检查业务空间或模型配置';
   $('cl-key-state').textContent=c.kind==='unconfigured'?'当前服务尚未保存密钥。':'当前服务已保存密钥；留空不会覆盖，也不会回显。';
   $('cl-test').disabled=c.kind==='checking';
  };
  const loadProvider=()=>{
   const p=api.providerInfo();$('cl-provider').value=p.id;$('cl-model').value=api.model();$('cl-workspace').value=api.workspace();
   $('cl-workspace-row').hidden=p.id!=='qwen';$('cl-enabled').checked=api.enabled();$('cl-api-key').value='';
   $('cl-provider-hint').textContent=p.hint;$('cl-provider-help').href=p.help;refresh();
  };
  $('cl-display-mode').addEventListener('change',()=>{api.setDisplayMode($('cl-display-mode').value);status('显示模式已记住；切换不会重新调用 API。');});
  loadProvider();const unsubscribe=api.subscribe(refresh);win.addEventListener('unload',unsubscribe,{once:true});
  $('cl-provider-help').addEventListener('click',e=>{e.preventDefault();Zotero.launchURL(api.providerInfo().help);});
  $('cl-provider').addEventListener('change',()=>{api.setProvider($('cl-provider').value);loadProvider();status('已切换为 '+api.providerInfo().name+'；此操作不会调用 API。');});
  $('cl-save-key').addEventListener('click',async()=>{
   const id=api.provider();
   try{
    if(!$('cl-api-key').value.trim()){status('请输入密钥后再保存；已有密钥保持不变。');return;}
    await api.setKey($('cl-api-key').value,id);
    if(api.provider()!==id)return;
    $('cl-api-key').value='';refresh();status('密钥已保存，状态为“已配置”；点击检查连接可验证。');
   }catch{if(api.provider()===id)status('密钥未能保存，请确认填写完整，并允许 Zotero 访问登录凭据管理器。',true);}
  });
  $('cl-delete-key').addEventListener('click',()=>{try{api.deleteKey();$('cl-api-key').value='';refresh();status('当前服务的密钥已删除，其他服务不受影响。');}catch{status('密钥删除失败，请稍后重试。',true);}});
  $('cl-test').addEventListener('click',async()=>{
   if($('cl-api-key').value.trim()){status('请先点击“保存密钥”，再检查连接。',true);return;}
   if($('cl-model').value.trim()!==api.model() || $('cl-workspace').value.trim()!==api.workspace()){status('请先保存高级设置，再检查连接。',true);return;}
   const config=api.snapshot();status('正在检查 '+api.providerInfo().name+' 连接…');
   try{
    const r=await api.testConnection();
    const current=api.snapshot();if(JSON.stringify(current)!==JSON.stringify(config) || api.provider()!==config.provider)return;
    status('验证成功 · '+api.providerInfo().name+' · '+config.model+(r.usage?` · 输入 ${r.usage.prompt_tokens} / 输出 ${r.usage.completion_tokens} Token`:''));
   }catch(e){if(api.provider()===config.provider && JSON.stringify(api.snapshot())===JSON.stringify(config))status(e.message || '连接检查失败。',true);}
   finally{refresh();}
  });
  $('cl-save-settings').addEventListener('click',()=>{
   try{api.saveSettings($('cl-model').value,$('cl-workspace').value,$('cl-enabled').checked);refresh();status('设置已保存。'+(api.enabled()?'下一次划词生效。':'自动翻译已暂停。'));}
   catch(e){status(e.message,true);}
  });
  $('cl-clear-cache').addEventListener('click',async()=>{try{if(api.loadError)throw new Error(api.loadError);api.store.clearCache();await api.lastWrite;status('译文缓存已清除，论文术语已保留。');}catch(e){status(e.message,true);}});
  if(api.loadError)status(api.loadError,true);
 }
};
