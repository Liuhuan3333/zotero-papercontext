const test=require('node:test');const assert=require('node:assert/strict');
let R;try{R=require('../plugin/reader-context.js');}catch{R={};}
function chars(text){return [...text].map((c,i)=>({c,rect:[i,0,i+1,10],paragraphBreakAfter:c==='\n'}));}
test('PDF offsets choose the selected occurrence instead of an earlier identical word',async()=>{
  assert.equal(typeof R.extract,'function');
  const c=chars('Law LLM degree.\n\nAI LLM model.');
  const begin=20; // second LLM begins here
  assert.equal(c.slice(begin,begin+3).map(x=>x.c).join(''),'LLM');
  const view={_pdfPages:{0:{chars:c}},_selectionRanges:[{pageIndex:0,anchorOffset:begin,headOffset:begin+3,collapsed:false}]};
  const ctx=await R.extract({_internalReader:{_primaryView:view}},{text:'LLM',position:{pageIndex:0,rects:[[begin,0,begin+3,10]]}},false);
  assert.match(ctx.before,/AI/);assert.match(ctx.after,/model/);assert.equal(ctx.quality,'paragraph');
});
test('missing PDF text returns an explicit selection-only fallback',async()=>{
  const c=await R.extract({_internalReader:{}},{text:'LLM',position:{pageIndex:0}},false);
  assert.equal(c.quality,'selection');assert.equal(c.before,'');
});
test('enhanced request includes adjacent pages locally; default does not fetch them',async()=>{
  let fetched=[];const view={_pdfPages:{1:{chars:chars('We use LLM here.')}},_selectionRanges:[{pageIndex:1,anchorOffset:7,headOffset:10}],_iframeWindow:{PDFViewerApplication:{pdfDocument:{numPages:3,async getPageData({pageIndex}){fetched.push(pageIndex);return {chars:chars(pageIndex===0?'Prior paragraph.':'Later paragraph.')};}}}}};
  const r={_internalReader:{_primaryView:view}},a={text:'LLM',position:{pageIndex:1}};
  await R.extract(r,a,false);assert.deepEqual(fetched,[]);
  const expanded=await R.extract(r,a,true);assert.match(expanded.before,/Prior paragraph/);assert.match(expanded.after,/Later paragraph/);
  assert.deepEqual(fetched,[0,2]);
});
