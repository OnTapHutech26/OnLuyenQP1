/* Pure data/selection logic. The same module runs in the page and Node checks. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BankEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const ENGINES=new Set(['all','sample','exam','mistakes']);
  const idPattern=/^[a-z0-9][a-z0-9_-]{0,63}$/i;
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
  function hash(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  function text(v,fallback=''){return typeof v==='string'?v.trim():fallback;}
  function shuffle(input,rng=Math.random){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function normalizeRegistry(input){
    const registry=input?.modes;if(!registry||Array.isArray(registry)||typeof registry!=='object')throw Error('Thiếu danh sách dạng ôn.');
    const result=Object.create(null);
    for(const [code,r]of Object.entries(registry)){
      if(!/^[A-Z][A-Z0-9_-]{0,11}$/.test(code)||!ENGINES.has(r?.engine)||!text(r.title))throw Error('Dạng ôn không hợp lệ: '+code);
      const m={...r,code,title:text(r.title),description:text(r.description),icon:text(r.icon,'📚')};
      checkMode(m);result[code]=m;
    }
    if(!Object.keys(result).length)throw Error('Danh sách dạng ôn trống.');return result;
  }
  function checkMode(m){
    if(!ENGINES.has(m.engine))throw Error('Quy tắc bốc câu không được hỗ trợ.');
    if(['sample','exam'].includes(m.engine)&&(!Number.isInteger(m.questionCount)||!finite(m.questionCount,1,10000)))throw Error('Số câu của '+m.code+' không hợp lệ.');
    if(m.engine==='exam'&&!finite(m.durationMinutes,1,1440))throw Error('Thời gian thi không hợp lệ.');
    if(m.balance&&!['equal','proportional','none'].includes(m.balance))throw Error('Cách phân bố câu không hợp lệ.');
    for(const key of ['repeatWrongLimit','repeatCorrectLimit'])if(m[key]!==undefined&&(!Number.isInteger(m[key])||!finite(m[key],0,10000)))throw Error('Giới hạn lặp câu không hợp lệ.');
  }
  function normalizeBank(raw,registry){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ngân hàng phải là một đối tượng JSON.');
    const subject=raw.subject&&typeof raw.subject==='object'?raw.subject:{};
    const id=text(subject.id||raw.subjectId||raw.id),title=text(subject.title||raw.title);
    if(!idPattern.test(id)||!title)throw Error('Thiếu mã môn hoặc tên môn hợp lệ.');
    const qs=raw.questions;if(!Array.isArray(qs)||!qs.length)throw Error('Ngân hàng chưa có câu hỏi.');
    const definitions=Array.isArray(raw.topics)?raw.topics:[];
    const topics=[],topicMap=new Map();
    for(const t of definitions){const tid=text(t.id),name=text(t.title);if(!tid||!name||topicMap.has(tid))throw Error('Nhánh kiến thức không hợp lệ.');const entry={id:tid,title:name};topics.push(entry);topicMap.set(tid,entry);}
    const used=new Set(),questions=[];
    for(let n=0;n<qs.length;n++){
      const q=qs[n];if(q.eligibleForPractice===false)continue;
      const qid=text(q.id),stem=text(q.question||q.text),options=Array.isArray(q.options)?q.options.map(o=>typeof o==='string'?o:text(o?.text)):[];
      if(!qid||used.has(qid)||!stem||options.length!==4||options.some(o=>!text(o))||new Set(options.map(o=>o.trim().toLowerCase())).size!==4||!Number.isInteger(q.answerIndex)||q.answerIndex<0||q.answerIndex>=4)throw Error('Câu '+(n+1)+' thiếu nội dung, trùng đáp án hoặc sai chỉ số đáp án.');
      used.add(qid);
      const tid=text(q.topicId,'general');
      if(!topicMap.has(tid)){const t={id:tid,title:text(q.topic||q.topicTitle,'Kiến thức tổng hợp')};topics.push(t);topicMap.set(tid,t);}
      const fingerprint=hash(JSON.stringify([stem,options,q.answerIndex]));
      questions.push({...q,id:qid,text:stem,topicId:tid,topicTitle:topicMap.get(tid).title,options:options.map((t,i)=>({label:'ABCD'[i],text:t})),rationale:text(q.explanation||q.rationale),fingerprint,isOriginal:q.isOriginal===true||['teacher_original','lms_original','original'].includes(q.origin),sourceRefs:Array.isArray(q.sourceRefs)?q.sourceRefs:[]});
    }
    if(!questions.length)throw Error('Không có câu hợp lệ để ôn.');
    const declared=raw.studyModes??['A','B','C','D'];if(!Array.isArray(declared)||!declared.length)throw Error('Ngân hàng cần ít nhất một dạng ôn.');
    const seenCodes=new Set(),modes=declared.map(entry=>{
      const config=typeof entry==='string'?{code:entry}:entry;if(!config||!own(registry,config.code)||seenCodes.has(config.code))throw Error('Mã dạng ôn chưa có hoặc bị lặp: '+config?.code);
      seenCodes.add(config.code);const base=registry[config.code];
      // Files contain settings, never executable handlers. Only registry chooses engine.
      const mode={...base};for(const key of ['title','description','icon','questionCount','durationMinutes','balance','repeatWrongLimit','repeatCorrectLimit','topicIds','originalRatio'])if(config[key]!==undefined)mode[key]=config[key];
      checkMode(mode);if(mode.topicIds&&(!Array.isArray(mode.topicIds)||mode.topicIds.some(t=>!topicMap.has(t))))throw Error('Dạng ôn trỏ tới nhánh không tồn tại.');
      if(mode.originalRatio!==undefined&&!finite(mode.originalRatio,0,1))throw Error('Tỉ lệ nguồn phải nằm từ 0 đến 1.');
      return mode;
    });
    return {id,title,subtitle:text(subject.subtitle||raw.subtitle||raw.description),icon:text(subject.icon||raw.icon,'📘').slice(0,12),theme:text(subject.theme||raw.theme,'violet'),version:hash(JSON.stringify({questions:questions.map(q=>[q.id,q.fingerprint]),modes})),questions,topics:topics.filter(t=>questions.some(q=>q.topicId===t.id)),modes};
  }
  function historyFor(history,q){const h=history?.questions;if(!h||!own(h,q.id))return null;const item=h[q.id];return item?.fingerprint===q.fingerprint?item:null;}
  function poolFor(bank,mode,topic='all'){return bank.questions.filter(q=>(topic==='all'||q.topicId===topic)&&(!mode.topicIds||mode.topicIds.includes(q.topicId)));}
  function mistakes(bank,history,mode=bank.modes[0],topic='all'){return poolFor(bank,mode,topic).filter(q=>historyFor(history,q)?.lastCorrect===false);}
  function weight(q,h,now=Date.now()){
    const s=historyFor(h,q);if(!s)return 5;
    const age=Math.min(3,Math.max(0,(now-(s.lastSeen||now))/86400000));
    return (s.lastCorrect===false?8:1/(1+(s.streak||0)))+age;
  }
  function pick(items,h,rng){let total=0;const weights=items.map(q=>{const w=weight(q,h);total+=w;return w;});let r=rng()*total;for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i];}return items.at(-1);}
  function quotas(pool,n,balance,rng){
    const groups=new Map();for(const q of pool){if(!groups.has(q.topicId))groups.set(q.topicId,[]);groups.get(q.topicId).push(q);}
    const keys=shuffle([...groups.keys()],rng),quota=new Map(keys.map(k=>[k,0]));
    if(balance==='none')return {groups,quota:null};
    if(balance==='proportional'){
      let left=n;const remainder=[];for(const k of keys){const exact=n*groups.get(k).length/pool.length,floor=Math.floor(exact);quota.set(k,floor);left-=floor;remainder.push({k,fraction:exact-floor});}
      remainder.sort((a,b)=>b.fraction-a.fraction);for(let i=0;i<left;i++)quota.set(remainder[i].k,quota.get(remainder[i].k)+1);
    }else{
      let left=n;while(left){let progress=false;for(const k of keys){if(!left)break;if(quota.get(k)<groups.get(k).length){quota.set(k,quota.get(k)+1);left--;progress=true;}}if(!progress)break;}
    }
    return {groups,quota};
  }
  function select(bank,mode,history={},topic='all',rng=Math.random){
    let pool=poolFor(bank,mode,topic);if(mode.engine==='mistakes')pool=pool.filter(q=>historyFor(history,q)?.lastCorrect===false);
    if(!pool.length)throw Error(mode.engine==='mistakes'?'Chưa có câu sai cần ôn trong phần này.':'Phần này chưa có câu hỏi.');
    if(mode.engine==='all'&&mode.originalRatio!==undefined){
      const originals=shuffle(pool.filter(q=>q.isOriginal),rng),others=shuffle(pool.filter(q=>!q.isOriginal),rng),ordered=[];
      const numerator=Math.round(mode.originalRatio*100),gcd=(a,b)=>b?gcd(b,a%b):a;
      if(numerator===0)return [...others,...originals];if(numerator===100)return [...originals,...others];
      const factor=gcd(numerator,100-numerator),a=numerator/factor,b=(100-numerator)/factor;
      while(originals.length&&others.length){ordered.push(...originals.splice(0,a),...others.splice(0,b));}
      return [...ordered,...originals,...others];
    }
    if(mode.engine==='all'||mode.engine==='mistakes')return shuffle(pool,rng);
    const n=mode.engine==='exam'?mode.questionCount:Math.min(mode.questionCount,pool.length);
    if(n>pool.length)throw Error(`Phần này có ${pool.length} câu; chưa đủ ${n} câu để thi thử. Hãy chọn phạm vi rộng hơn.`);
    const {quota}=quotas(pool,n,mode.balance||'equal',rng),counts=new Map(),used=new Set(),result=[];
    const previous=history.lastExam||{},wrong=new Set(previous.wrongIds||[]),correct=new Set(previous.correctIds||[]);
    const maxCorrect=mode.repeatCorrectLimit??(mode.engine==='exam'?3:2),maxWrong=mode.repeatWrongLimit??Math.ceil(n*.4);
    let originalCount=0;const originalTarget=mode.originalRatio===undefined?null:Math.max(n-pool.filter(q=>!q.isOriginal).length,Math.min(Math.round(n*mode.originalRatio),pool.filter(q=>q.isOriginal).length));
    function allowed(q,enforcePrevious=true){
      if(used.has(q.id)||quota&&((counts.get(q.topicId)||0)>=quota.get(q.topicId)))return false;
      if(originalTarget!==null&&(q.isOriginal?originalCount>=originalTarget:result.length-originalCount>=n-originalTarget))return false;
      if(enforcePrevious&&correct.has(q.id)&&!wrong.has(q.id)&&result.filter(x=>correct.has(x.id)&&!wrong.has(x.id)).length>=maxCorrect)return false;
      return true;
    }
    function take(candidates,limit,enforce=true){while(limit-->0&&result.length<n){const available=candidates.filter(q=>allowed(q,enforce));if(!available.length)break;const q=pick(available,history,rng);result.push(q);used.add(q.id);counts.set(q.topicId,(counts.get(q.topicId)||0)+1);if(q.isOriginal)originalCount++;}}
    take(pool.filter(q=>wrong.has(q.id)),maxWrong);
    take(pool.filter(q=>!wrong.has(q.id)&&!correct.has(q.id)),n-result.length);
    take(pool.filter(q=>correct.has(q.id)&&!wrong.has(q.id)),maxCorrect);
    take(pool,n-result.length);
    // Only relax repeat preference for a limited pool; uniqueness and topic quotas stay intact.
    take(pool,n-result.length,false);
    // A source-ratio constraint can conflict with exact per-topic quotas. Preserve count,
    // uniqueness and source ratio, relaxing quota only for remaining slots.
    if(result.length<n&&originalTarget!==null){for(const q of shuffle(pool,rng)){if(result.length===n)break;if(used.has(q.id))continue;if(q.isOriginal?originalCount>=originalTarget:result.length-originalCount>=n-originalTarget)continue;result.push(q);used.add(q.id);if(q.isOriginal)originalCount++;}}
    if(result.length!==n)throw Error('Không bốc đủ câu theo cấu hình; cần kiểm tra lại ngân hàng.');
    return shuffle(result,rng);
  }
  return {normalizeRegistry,normalizeBank,shuffle,hash,historyFor,poolFor,mistakes,select};
});
