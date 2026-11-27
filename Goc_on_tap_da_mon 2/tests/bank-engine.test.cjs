'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const E=require('../assets/bank-engine.js'),{generateCatalog}=require('../scripts/build.cjs');
const root=path.resolve(__dirname,'..'),raw=JSON.parse(fs.readFileSync(path.join(root,'banks/ly_sinh_dien_sinh_hoc.json'))),regRaw=JSON.parse(fs.readFileSync(path.join(root,'study_modes.json'))),registry=E.normalizeRegistry(regRaw),bank=E.normalizeBank(raw,registry);
const byEngine=engine=>bank.modes.find(m=>m.engine===engine);
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(let seed=1;seed<=100;seed++){
  for(const [mode,count]of [[byEngine('all'),150],[byEngine('sample'),20],[byEngine('exam'),50]]){
    const selected=E.select(bank,mode,{},'all',rng(seed));assert.equal(selected.length,count);assert.equal(new Set(selected.map(q=>q.id)).size,count);
    for(const q of selected)assert.equal(q.options[q.answerIndex].text,raw.questions.find(x=>x.id===q.id).answerText);
    if(mode.engine!=='all'){const counts=bank.topics.map(t=>selected.filter(q=>q.topicId===t.id).length);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);}
  }
}
const previous=E.select(bank,byEngine('exam'),{},'all',rng(9)),wrong=previous.slice(0,15),correct=previous.slice(15),history={questions:{},lastExam:{wrongIds:wrong.map(q=>q.id),correctIds:correct.map(q=>q.id)}};
for(const q of previous)history.questions[q.id]={fingerprint:q.fingerprint,lastCorrect:!wrong.includes(q),lastSeen:Date.now(),attempts:1,correct:wrong.includes(q)?0:1,wrong:wrong.includes(q)?1:0,streak:wrong.includes(q)?0:1};
const next=E.select(bank,byEngine('exam'),history,'all',rng(10));
assert.ok(next.filter(q=>wrong.includes(q)).length>=10);assert.ok(next.filter(q=>correct.includes(q)).length<=3);
assert.equal(E.select(bank,byEngine('mistakes'),history).length,15);
history.questions[wrong[0].id].fingerprint='stale';assert.equal(E.select(bank,byEngine('mistakes'),history).length,14);
assert.throws(()=>E.select(bank,byEngine('exam'),{},'nguon'),/chưa đủ/);
assert.equal(E.select(bank,byEngine('sample'),{},'nguon').length,12);
assert.throws(()=>E.normalizeBank({...raw,studyModes:['UNKNOWN']},registry),/Mã dạng ôn/);
assert.throws(()=>E.normalizeBank({...raw,questions:[{...raw.questions[0],answerIndex:4}]},registry),/chỉ số/);
assert.throws(()=>E.normalizeBank({...raw,questions:[{...raw.questions[0],options:['a','a','b','c']}]},registry),/trùng/);
assert.equal(E.normalizeBank({...raw,studyModes:[{code:'A',engine:'exam'}]},registry).modes[0].engine,'all');
const extra=E.normalizeRegistry({modes:{...regRaw.modes,E:{engine:'sample',title:'Ôn siêu ngắn',questionCount:7}}});
assert.equal(E.select(E.normalizeBank({...raw,studyModes:['E']},extra),extra.E).length,7);
const changed=E.normalizeBank({...raw,studyModes:['A','B']},registry);assert.notEqual(changed.version,bank.version);
const mixBank=E.normalizeBank({...raw,questions:raw.questions.map((q,i)=>({...q,isOriginal:i<100}))},registry),mix=E.select(mixBank,{...byEngine('exam'),originalRatio:.8},{},'all',rng(1));
assert.equal(mix.filter(q=>q.isOriginal).length,40);
const orderedAll=E.select(mixBank,{...byEngine('all'),originalRatio:.8},{},'all',rng(5));assert.equal(orderedAll.length,150);assert.deepEqual(orderedAll.slice(0,5).map(q=>q.isOriginal),[true,true,true,true,false]);assert.equal(new Set(orderedAll.map(q=>q.id)).size,150);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'goc-catalog-test-'));
try{
  fs.mkdirSync(path.join(temp,'banks'));fs.writeFileSync(path.join(temp,'study_modes.json'),JSON.stringify(regRaw));
  for(let i=1;i<=12;i++)fs.writeFileSync(path.join(temp,'banks','course_'+i+'.json'),JSON.stringify({...raw,subject:{id:'course_'+i,title:'Môn '+i},studyModes:['A']}));
  const catalog=generateCatalog(temp);assert.equal(catalog.banks.length,12);
  fs.unlinkSync(path.join(temp,'banks/course_2.json'));assert.equal(generateCatalog(temp).banks.length,11);
  const stable=fs.readFileSync(path.join(temp,'banks/catalog.json'),'utf8');
  fs.writeFileSync(path.join(temp,'banks/bad.json'),'{');assert.throws(()=>generateCatalog(temp),/bad.json/);assert.equal(fs.readFileSync(path.join(temp,'banks/catalog.json'),'utf8'),stable);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS: 300 lượt bốc, chống trùng, phủ nhánh, ưu tiên lỗi cũ, giới hạn câu đúng cũ, lịch sử, tỉ lệ nguồn, mã ôn tùy chỉnh, 12 môn tự nhận/thêm/xóa và chặn ngân hàng lỗi.');
