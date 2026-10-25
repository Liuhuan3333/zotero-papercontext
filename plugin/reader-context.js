/* PDF context adapter for Zotero 10. Internal PDF structure is isolated here. MIT */
(function(root){
  'use strict';
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
  const fallback=()=>({before:'',after:'',quality:'selection'});
  function textFrom(chars,start=0,end=chars.length){
    let out='';
    for(let i=start;i<end;i++){
      const c=chars[i];if(!c || c.ignorable)continue;
      out+=c.c || '';
      if(c.paragraphBreakAfter)out+='\n\n';
      else if(c.spaceAfter || c.lineBreakAfter)out+=' ';
    }
    return out;
  }
  function offsets(view,chars,annotation){
    const page=annotation.position?.pageIndex;
    for(const range of view._selectionRanges || []){
      if(range.pageIndex!==page || range.collapsed)continue;
      const start=Math.min(range.anchorOffset,range.headOffset),end=Math.max(range.anchorOffset,range.headOffset);
      if(Number.isInteger(start) && Number.isInteger(end) && start>=0 && end<=chars.length && clean(textFrom(chars,start,end))===clean(annotation.text))return {start,end};
    }
    // Native-text-selection mode may not populate _selectionRanges. Locate
    // selected characters from the annotation's PDF coordinates, not first text match.
    const rects=annotation.position?.rects || [];
    const hits=[];
    for(let i=0;i<chars.length;i++){
      const r=chars[i].rect;if(!r || chars[i].ignorable)continue;
      const x=(r[0]+r[2])/2,y=(r[1]+r[3])/2;
      if(rects.some(a=>x>=a[0]-.15 && x<=a[2]+.15 && y>=a[1]-.15 && y<=a[3]+.15))hits.push(i);
    }
    if(hits.length)return {start:hits[0],end:hits.at(-1)+1};
    return null;
  }
  async function pageData(view,index){
    if(view._pdfPages?.[index]?.chars)return view._pdfPages[index];
    const pdf=view._iframeWindow?.PDFViewerApplication?.pdfDocument;
    if(pdf && index>=0 && index<pdf.numPages)return pdf.getPageData({pageIndex:index});
    return null;
  }
  async function extract(reader,annotation,expanded=false){
    try{
      const internal=reader._internalReader;
      const page=annotation.position?.pageIndex;
      if(!internal || !Number.isInteger(page))return fallback();
      const views=[internal._primaryView,internal._secondaryView].filter(Boolean);
      let match;
      for(const view of views){
        const data=await pageData(view,page);
        if(!data?.chars)continue;
        const span=offsets(view,data.chars,annotation);
        if(span){match={view,chars:data.chars,...span};break;}
      }
      if(!match)return fallback();
      const {view,chars,start,end}=match;
      // Limit source work as well as transmitted context. Paragraph delimiters
      // are retained for the pure policy layer to choose the closest paragraph.
      let before=textFrom(chars,Math.max(0,start-4000),start);
      let after=textFrom(chars,end,Math.min(chars.length,end+4000));
      if(annotation.position.nextPageRects){
        const next=await pageData(view,page+1);
        const hits=next?.chars && offsets(view,next.chars,{text:'',position:{pageIndex:page+1,rects:annotation.position.nextPageRects}});
        if(hits)after=textFrom(next.chars,hits.end,Math.min(next.chars.length,hits.end+4000));
        else after=''; // Do not re-send part of a cross-page selection as context.
      }
      if(expanded){
        if(before.length<2400){const previous=await pageData(view,page-1);if(previous?.chars)before=textFrom(previous.chars).slice(-2400)+'\n\n'+before;}
        if(after.length<2400){const nextIndex=page+(annotation.position.nextPageRects?2:1);const next=await pageData(view,nextIndex);if(next?.chars)after+='\n\n'+textFrom(next.chars).slice(0,2400);}
      }
      const hasBreak=chars.some(c=>c.paragraphBreakAfter);
      return {before,after,quality:hasBreak?'paragraph':'nearby'};
    }catch{return fallback();}
  }
  const api={extract,textFrom};root.ContextLeafReaderContext=api;
  if(typeof module!=='undefined' && module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
