const test=require('node:test'),assert=require('node:assert/strict');
let P;try{P=require('../plugin/providers.js');}catch{P={};}
const C=require('../plugin/core.js');
test('six fixed official providers expose a model and HTTPS endpoint',()=>{
 assert.equal(typeof P.list,'function');
 assert.deepEqual(P.list().map(p=>p.id),['deepseek','qwen','glm','kimi','siliconflow','volcengine']);
 for(const p of P.list()){assert.ok(p.model);assert.match(P.endpoint(p.id),/^https:\/\//);}
 assert.throws(()=>P.get('unknown'),/不支持/);
});
test('provider-specific nonthinking parameters are not mixed; Kimi gets its required temperature',()=>{
 const body={model:'x',messages:[{role:'user',content:'test'}],thinking:{type:'disabled'},temperature:0.1,max_tokens:8,stream:false};
 for(const id of ['qwen','siliconflow']){const b=P.requestBody(id,body);assert.equal(b.enable_thinking,false);assert.ok(!('thinking'in b));}
 for(const id of ['deepseek','glm','kimi','volcengine']){assert.equal(P.requestBody(id,body).thinking.type,'disabled');}
 assert.equal(P.requestBody('kimi',body).temperature,0.6);assert.equal(body.temperature,0.1);
});
test('workspace ID generates only official Qwen endpoints and rejects arbitrary URLs',()=>{
 assert.equal(P.endpoint('qwen','workspace-123'),'https://workspace-123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions');
 assert.throws(()=>P.endpoint('qwen','evil.com/path'),/业务空间/);
 assert.equal(P.endpoint('deepseek'),'https://api.deepseek.com/chat/completions');
});
test('saved credentials do not imply connectivity; stale checks do not imply validation',()=>{
 const config={provider:'deepseek',model:'deepseek-flash',endpoint:'https://api.deepseek.com/chat/completions',revision:1};
 assert.equal(P.connectionState(false,config,null).kind,'unconfigured');
 assert.equal(P.connectionState(true,config,null).kind,'configured');
 const record={fingerprint:P.fingerprint(config),ok:true,time:1234};
 assert.equal(P.connectionState(true,config,record).kind,'verified');
 assert.equal(P.connectionState(true,{...config,revision:2},record).kind,'configured');
 assert.equal(P.connectionState(true,{...config,model:'another'},record).kind,'configured');
 assert.equal(P.connectionState(true,config,{...record,ok:false}).kind,'failed');
});
test('provider and endpoint isolate local cache, while existing DeepSeek cache stays reusable',async()=>{
 const store=new C.Store();let calls=0;const e=new C.Engine(store,async()=>({text:String(++calls)}));
 const base={paper:'A',selection:'LLM',model:'same',context:{before:'An',after:'reviews code.'}};
 await e.translate({...base,provider:'deepseek',endpoint:'one'});
 await e.translate({...base,provider:'qwen',endpoint:'two'});
 await e.translate({...base,provider:'qwen',endpoint:'three'});
 assert.equal(calls,3);
 await e.translate({...base,provider:'qwen',endpoint:'two'});assert.equal(calls,3);
});

test('0.1.1 cache falls back only for the original DeepSeek service',async()=>{
 const store=new C.Store();let calls=0;const engine=new C.Engine(store,async()=>({text:String(++calls)}));
 const base={paper:'A',selection:'model',model:'same',context:{before:'This',after:'works.'}};
 const p=engine.prepare(base);
 store.cachePut(JSON.stringify([2,'A',0,false,p.body]),{paper:'A',text:'DeepSeek cached translation'});
 assert.equal((await engine.translate({...base,provider:'deepseek',endpoint:P.endpoint('deepseek')})).text,'DeepSeek cached translation');assert.equal(calls,0);
 assert.notEqual((await engine.translate({...base,provider:'qwen',endpoint:P.endpoint('qwen')})).text,'DeepSeek cached translation');assert.equal(calls,1);
});
