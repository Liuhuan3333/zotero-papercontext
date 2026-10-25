const test = require('node:test');
const assert = require('node:assert/strict');
let C;
try { C = require('../plugin/core.js'); } catch { C = {}; }
// Dropping context caps, paper isolation, invalidation or local short-circuits must fail these tests.
test('short abbreviation gets sentence, long selections do not repeat their context', () => {
  assert.equal(typeof C.buildContext, 'function');
  const ctx = {before:'Earlier unrelated sentence. We use ', after:' to review code. Another sentence.\n\nNext paragraph.'};
  const small = C.buildContext('LLM',ctx,false);
  assert.equal(small.before,'We use');
  assert.equal(small.after,'to review code.');
  assert.deepEqual(C.buildContext('x'.repeat(500),ctx,false),{before:'',after:''});
});
test('context is bounded; enhanced context is explicit', () => {
  const ctx={before:'A'.repeat(5000),after:'B'.repeat(5000)};
  for(const expanded of [false,true]) {
    const c=C.buildContext('This is a short selected sentence.',ctx,expanded);
    assert.ok(c.before.length+c.after.length <= (expanded?2400:900));
  }
  assert.ok(C.buildContext('LLM',ctx,true).before.length > C.buildContext('LLM',ctx,false).before.length);
});
test('matching respects acronym case, word boundaries, and punctuation', () => {
  assert.equal(C.containsTerm('An LLM-based agent.', 'LLM'),true);
  assert.equal(C.containsTerm('small models', 'LLM'),false);
  assert.equal(C.containsTerm('llm', 'LLM'),false);
  assert.equal(C.containsTerm('A C++ program.', 'C++'),true);
});
test('paper glossary saves exact translation locally and invalidates only that paper', async () => {
  let calls=0;
  const store=new C.Store();
  const engine=new C.Engine(store,async()=>{calls++;return {text:'模型译文',usage:{prompt_tokens:30,completion_tokens:5}};});
  const a={paper:'1:AAA',selection:'LLM',title:'AI',context:{before:'We use ',after:' to review.'},model:'deepseek-flash'};
  await engine.translate(a);await engine.translate(a);assert.equal(calls,1);
  await engine.translate({...a,paper:'1:BBB'});assert.equal(calls,2);
  store.setTerm(a.paper,'LLM','大语言模型');
  const local=await engine.translate(a);assert.equal(local.text,'大语言模型');assert.equal(local.source,'term');assert.equal(calls,2);
  const other=await engine.translate({...a,paper:'1:BBB'});assert.equal(other.source,'cache');
  store.deleteTerm(a.paper,'LLM');await engine.translate(a);assert.equal(calls,3);
});
test('only relevant terms are sent and corrections change sentence requests', async () => {
  const store=new C.Store();store.setTerm('A','LLM','大语言模型');store.setTerm('A','GPU','图形处理器');
  let bodies=[];const e=new C.Engine(store,async body=>{bodies.push(body);return {text:'译文'};});
  const input={paper:'A',selection:'The LLM is effective.',model:'deepseek-flash',context:{before:'',after:''}};
  await e.translate(input);
  assert.match(bodies[0].messages[1].content,/大语言模型/);assert.doesNotMatch(bodies[0].messages[1].content,/图形处理器/);
  assert.equal(bodies[0].thinking.type,'disabled');assert.equal(bodies[0].stream,false);
  store.setTerm('A','LLM','大型语言模型');await e.translate(input);assert.equal(bodies.length,2);
  assert.match(bodies[1].messages[1].content,/大型语言模型/);
});
test('cache keys distinguish model, title, position context, and expanded mode', async () => {
  const store=new C.Store();let calls=0;const e=new C.Engine(store,async()=>({text:String(++calls)}));
  const a={paper:'A',selection:'LLM',title:'A',model:'deepseek-flash',context:{before:'We use',after:'in code.'}};
  for(const x of [a,{...a,model:'other'},{...a,title:'B'},{...a,context:{before:'The lawyer has',after:'degree.'}},{...a,expanded:true}])await e.translate(x);
  assert.equal(calls,5);
});
test('bounded cache and serialized glossary survive reload', () => {
  const s=new C.Store();s.setTerm('A','LLM','大语言模型');
  for(let i=0;i<105;i++)s.cachePut(String(i),{paper:'A',text:String(i)});
  const restored=new C.Store(JSON.parse(JSON.stringify(s.toJSON())));
  assert.equal(restored.cache.size,100);assert.equal(restored.exactTerm('A','LLM'),'大语言模型');
  assert.throws(()=>new C.Store({version:99}),/版本|格式/);
});
test('invalid/empty and cancelled responses are never cached; large selections do not send', async () => {
  const s=new C.Store();let calls=0;const token={cancelled:false};
  const e=new C.Engine(s,async()=>{calls++;token.cancelled=true;return {text:'late'};});
  await assert.rejects(e.translate({paper:'A',selection:'hello',context:{},model:'x'},token),/取消/);
  assert.equal(s.cache.size,0);
  await assert.rejects(e.translate({paper:'A',selection:'x'.repeat(3501),context:{},model:'x'}),/3500/);
  assert.equal(calls,1);
  const empty=new C.Engine(s,async()=>({text:''}));
  await assert.rejects(empty.translate({paper:'A',selection:'hello',context:{},model:'x'}),/空/);
});
test('API parser flags authentication, balance, truncation and empty completions', () => {
  assert.throws(()=>C.parseResponse(401,{}),/密钥/);
  assert.throws(()=>C.parseResponse(402,{}),/余额/);
  assert.throws(()=>C.parseResponse(200,{choices:[{finish_reason:'length',message:{content:'partial'}}]}),/截断/);
  assert.throws(()=>C.parseResponse(200,{choices:[{finish_reason:'stop',message:{content:''}}]}),/空/);
  assert.equal(C.parseResponse(200,{choices:[{finish_reason:'stop',message:{content:'译文'}}]}).text,'译文');
});

test('short selections in one sentence share a stable context prefix', () => {
  const e=new C.Engine(new C.Store(),async()=>({text:'unused'}));
  const base={paper:'A',title:'Code Review',model:'deepseek-flash'};
  const a=e.prepare({...base,selection:'LLM',context:{before:'An ',after:' reviews a patch.'}}).body;
  const b=e.prepare({...base,selection:'patch',context:{before:'An LLM reviews a ',after:'.'}}).body;
  const first=JSON.parse(a.messages[1].content),second=JSON.parse(b.messages[1].content);
  assert.equal(first.context.text,second.context.text);
  assert.equal(first.context.text,'An LLM reviews a patch.');
  assert.deepEqual(Object.keys(first),['title','context','glossary','selection']);
  assert.equal(a.messages[0].content,b.messages[0].content);
  assert.equal(first.selection,'LLM');assert.equal(second.selection,'patch');
});
test('font controls default to 16px and stay between 12 and 28', () => {
  assert.equal(typeof C.fontSize,'function');
  assert.equal(C.fontSize(undefined),16);assert.equal(C.fontSize(100),28);assert.equal(C.fontSize(4),12);assert.equal(C.fontSize(18),18);
});
test('usage shows real server cache counts and never invents a zero miss rate', () => {
  assert.equal(typeof C.formatUsage,'function');
  assert.match(C.formatUsage({prompt_tokens:180,completion_tokens:20,prompt_cache_hit_tokens:128,prompt_cache_miss_tokens:52}),/缓存命中 128.*未命中 52/);
  assert.match(C.formatUsage({prompt_tokens:180,completion_tokens:20}),/缓存数据未提供/);
  assert.match(C.formatUsage({prompt_tokens:180,completion_tokens:20,prompt_tokens_details:{cached_tokens:0}}),/缓存命中 0.*未命中 180/);
});

test('upgrade reuses existing 0.1.0 local translations without another API request', async () => {
  const store=new C.Store();let calls=0;
  const engine=new C.Engine(store,async()=>{calls++;return {text:'新请求'};});
  const input={paper:'A',selection:'LLM',title:'AI',context:{before:'We use',after:'to review.'},model:'deepseek-flash'};
  const prepared=engine.prepare(input);
  const oldPayload={title:'AI',glossary:[],context:C.buildContext(input.selection,input.context,false),selection:'LLM'};
  const oldBody={...prepared.body,messages:[prepared.body.messages[0],{role:'user',content:JSON.stringify(oldPayload)}]};
  store.cachePut(JSON.stringify([1,'A',0,false,oldBody]),{paper:'A',text:'旧版本已缓存的正确译文'});
  const result=await engine.translate(input);
  assert.equal(result.text,'旧版本已缓存的正确译文');assert.equal(result.source,'cache');assert.equal(calls,0);
});
