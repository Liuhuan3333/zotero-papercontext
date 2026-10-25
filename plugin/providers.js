/* Fixed official provider presets and honest configuration status. MIT */
(function(root){
 'use strict';
 const presets=[
  {id:'deepseek',name:'DeepSeek',model:'deepseek-flash',base:'https://api.deepseek.com',help:'https://api-docs.deepseek.com/',hint:'使用 DeepSeek 开放平台 API Key。'},
  {id:'qwen',name:'通义千问',model:'qwen3.8-flash',base:'https://dashscope.aliyuncs.com/compatible-mode/v1',help:'https://help.aliyun.com/zh/model-studio/first-api-call-to-qwen',hint:'默认百炼中国区通用接口；若控制台提供业务空间专用地址，请在高级设置填写业务空间 ID。'},
  {id:'glm',name:'智谱 GLM',model:'glm-4.7-flash',base:'https://open.bigmodel.cn/api/paas/v4',help:'https://docs.bigmodel.cn/cn/guide/models/free/glm-4.7-flash',hint:'使用智谱开放平台标准 API Key，非 Coding Plan 专用接口。'},
  {id:'kimi',name:'Kimi',model:'kimi-k2.6',base:'https://api.moonshot.cn/v1',help:'https://platform.kimi.com/docs/get-api-key',hint:'使用 Kimi 开放平台 API Key，非 Kimi Code 订阅密钥。'},
  {id:'siliconflow',name:'硅基流动',model:'deepseek-ai/DeepSeek-V4-Flash',base:'https://api.siliconflow.cn/v1',help:'https://docs.siliconflow.cn/docs/api/chat-completions-post',hint:'使用硅基流动中国站 API Key；高级设置可改为账号可调用的模型。'},
  {id:'volcengine',name:'火山方舟',model:'doubao-seed-2-0-mini-260428',base:'https://ark.cn-beijing.volces.com/api/v3',help:'https://docs.volcengine.com/docs/ark/model-list?lang=zh',hint:'使用方舟 API Key，并在控制台开通默认模型；也可在高级设置填已开通的模型 ID 或 ep- 接入点 ID。'}
 ].map(p=>Object.freeze({...p,origin:new URL(p.base).origin,realm:p.id==='deepseek'?'ContextLeaf DeepSeek API':'ContextLeaf '+p.id+' API'}));
 function list(){return presets.slice();}
 function get(id){const p=presets.find(p=>p.id===id);if(!p)throw new Error('不支持的模型提供商。');return p;}
 function endpoint(id,workspace=''){
  const p=get(id);
  if(id==='qwen' && workspace){
   if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/.test(workspace))throw new Error('业务空间 ID 格式不正确，请只填写 ID，不要填写网址。');
   return 'https://'+workspace.toLowerCase()+'.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions';
  }
  return p.base+'/chat/completions';
 }
 function requestBody(id,body){
  get(id);const b={...body};delete b.enable_thinking;delete b.reasoning_effort;
  if(id==='qwen' || id==='siliconflow'){delete b.thinking;b.enable_thinking=false;}
  else b.thinking={type:'disabled'};
  if(id==='kimi')b.temperature=0.6;
  return b;
 }
 function fingerprint(config){return JSON.stringify([config.provider,config.model,config.endpoint,config.revision || 0]);}
 function connectionState(configured,config,record,pending){
  if(!configured)return {kind:'unconfigured',label:'未配置 API',tone:'muted',time:null};
  const fp=fingerprint(config);
  if(pending===fp)return {kind:'checking',label:'正在检查连接…',tone:'waiting',time:null};
  if(!record || record.fingerprint!==fp)return {kind:'configured',label:'已配置 · 尚未验证',tone:'waiting',time:null};
  return record.ok?{kind:'verified',label:'已配置 · 上次验证成功',tone:'success',time:record.time}
   :{kind:'failed',label:'已配置 · 最近请求失败',tone:'error',time:record.time};
 }
 const api={list,get,endpoint,requestBody,fingerprint,connectionState};root.ContextLeafProviders=api;
 if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
