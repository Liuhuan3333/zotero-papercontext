const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
async function load(saved={}){
 const prefs=new Map(Object.entries(saved));
 const context=vm.createContext({console,URL,setTimeout,clearTimeout,Map,Set,JSON,Date,PathUtils:{join:(...p)=>p.join('/')},IOUtils:{makeDirectory:async()=>{},exists:async()=>false},ChromeUtils:{importESModule:()=>({AddonManager:{getAddonByID:async()=>null}})},Zotero:{initializationPromise:Promise.resolve(),Profile:{dir:'/isolated'},Prefs:{get:k=>prefs.get(k),set:(k,v)=>prefs.set(k,v)},PreferencePanes:{register:async()=>{}},Reader:{registerEventListener:()=>{}},logError:()=>{}},Services:{scriptloader:{loadSubScript:uri=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../plugin',uri),'utf8'),context)}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../plugin/bootstrap.js'),'utf8'),context);
 await context.startup({id:'contextleaf@local.tools',rootURI:''});
 return {api:context.Zotero.ContextLeaf,prefs};
}
test('fresh installation defaults to popup and remembers a changed mode on restart',async()=>{
 const {api,prefs}=await load();assert.equal(api.displayMode(),'popup');
 api.setDisplayMode('sidebar');assert.equal(api.displayMode(),'sidebar');
 const restarted=await load(Object.fromEntries(prefs));assert.equal(restarted.api.displayMode(),'sidebar');
 restarted.api.setDisplayMode('popup');assert.equal(restarted.api.displayMode(),'popup');
});
test('unrecognized saved mode falls back to popup; invalid choices cannot change preferences',async()=>{
 const {api,prefs}=await load({'extensions.contextleaf.displayMode':'invalid'});
 assert.equal(api.displayMode(),'popup');assert.throws(()=>api.setDisplayMode('invalid'));
 assert.equal(prefs.get('extensions.contextleaf.displayMode'),'invalid');
});
test('popup and sidebar widths are independent, bounded, and remembered after restart',async()=>{
 const {api,prefs}=await load();assert.equal(api.displayWidth('popup'),340);assert.equal(api.displayWidth('sidebar'),360);
 api.saveDisplayWidth('popup',480);api.saveDisplayWidth('sidebar',420);
 const restarted=await load(Object.fromEntries(prefs));assert.equal(restarted.api.displayWidth('popup'),480);assert.equal(restarted.api.displayWidth('sidebar'),420);
 restarted.api.saveDisplayWidth('popup',10);assert.equal(restarted.api.displayWidth('popup'),240);
 restarted.api.saveDisplayWidth('sidebar',9999);assert.equal(restarted.api.displayWidth('sidebar'),720);
 assert.throws(()=>api.saveDisplayWidth('bad',350));assert.throws(()=>api.saveDisplayWidth('popup',NaN));
});
