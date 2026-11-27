/* A subject-independent adapter around the retained cards, gestures and motion. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id),E=BankEngine,banks=new Map(),histories=new Map();
  const storage={get(key,fallback=null){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
  let bank=null,studyCode='',recorded=new Set(),reviewContext=null,deadline=0,timer=null,expired=false;
  const historyKey=id=>'goc_subject_history_v2:'+id,attemptKey=id=>'goc_subject_attempt_v2:'+id;
  const selectedMode=()=>bank?.modes.find(m=>m.code===studyCode)||bank?.modes[0];
  const scopeTopic=()=>scopeSelect.value==='all'?'all':LESSONS.find(l=>'lesson-'+l.id===scopeSelect.value)?.topicId||'all';
  function history(id=selectedSubject){
    const b=banks.get(id);if(!b)return {questions:{},lastExam:null};
    if(!histories.has(id)){
      const h=storage.get(historyKey(id),{questions:{},lastExam:null});
      if(!h.questions||typeof h.questions!=='object'||Array.isArray(h.questions))h.questions={};
      const valid=new Set(b.questions.filter(q=>E.historyFor(h,q)).map(q=>q.id));
      if(h.lastExam){h.lastExam.wrongIds=(h.lastExam.wrongIds||[]).filter(id=>valid.has(id));h.lastExam.correctIds=(h.lastExam.correctIds||[]).filter(id=>valid.has(id));}
      histories.set(id,h);
    }
    return histories.get(id);
  }
  function validSaved(id){const b=banks.get(id),a=storage.get(attemptKey(id));return b&&a?.version===b.version&&Array.isArray(a.ids)&&a.ids.length?a:null;}
  function toast(message){let el=$('genericToast');if(!el){el=document.createElement('div');el.id='genericToast';el.className='mm-toast';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),4000);}
  function resetGestures(){transitionToken++;transitionLocked=false;touchStart=null;gestureProgress=0;wheelAccum=0;wheelCooldownUntil=0;suppressClickUntil=0;clearTimeout(wheelTimer);}
  function config(){const m=selectedMode();return {subject:selectedSubject,code:m?.code,scope:scopeTopic(),version:bank?.version};}
  getSessionConfig=config;
  isSameSession=(a,b)=>!!a&&!!b&&a.subject===b.subject&&a.code===b.code&&a.scope===b.scope&&a.version===b.version;
  function snapshot(){return {questionQueue,selectedAnswers,optionOrders,activeQuestionIndex,current,points,finished,recorded,mode,sessionConfig,deadline,studyCode,expired};}
  function restore(state){({questionQueue,selectedAnswers,optionOrders,activeQuestionIndex,current,points,finished,recorded,mode,sessionConfig,deadline,studyCode,expired}=state);resetGestures();}
  function serialize(state){return {ids:state.questionQueue.map(q=>q.id),answers:[...state.selectedAnswers],orders:[...state.optionOrders].map(([id,items])=>[id,items.map(x=>x.originalIndex)]),active:state.activeQuestionIndex,finished:state.finished,mode:state.mode,deadline:state.deadline,studyCode:state.studyCode,config:state.sessionConfig,expired:state.expired};}
  function checkpoint(){
    if(!bank||!questionQueue.length||sessionConfig?.subject!==selectedSubject)return;
    const main=reviewContext?.main||snapshot();
    const a={version:bank.version,...serialize(main),review:reviewContext?serialize(snapshot()):null};
    storage.set(attemptKey(selectedSubject),a);storage.set(historyKey(selectedSubject),history());
  }
  function recordAnswers(){
    if(!bank||!questionQueue.length)return;
    const h=history();let changed=false;
    for(const q of questionQueue){
      if(!selectedAnswers.has(q.id)||recorded.has(q.id))continue;
      const prior=E.historyFor(h,q)||{fingerprint:q.fingerprint,attempts:0,correct:0,wrong:0,streak:0};
      const right=selectedAnswers.get(q.id)===q.answerIndex;
      prior.attempts++;prior.lastSeen=Date.now();prior.lastCorrect=right;
      if(right){prior.correct++;prior.streak++;}else{prior.wrong++;prior.streak=0;}
      h.questions[q.id]=prior;recorded.add(q.id);changed=true;
    }
    if(changed)storage.set(historyKey(selectedSubject),h);
  }
  function mainTimerState(){return reviewContext?.main||{mode,deadline,finished};}
  function stopTimer(){clearInterval(timer);timer=null;}
  function clockText(seconds){return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
  function paintClock(){
    const state=mainTimerState(),copy=document.querySelector('#stickyDashboard .progress-copy');if(!copy)return;
    let el=copy.querySelector('.exam-clock');
    if(state.mode!=='exam'){el?.remove();return;}
    if(!el){el=document.createElement('span');el.className='exam-clock';el.setAttribute('aria-label','Thời gian còn lại');copy.append(el);}
    const seconds=Math.max(0,Math.ceil((state.deadline-Date.now())/1000));el.textContent='⏱ '+clockText(seconds);el.dataset.urgent=String(seconds<=300);
  }
  function runTimer(){stopTimer();if(mainTimerState().mode!=='exam'||mainTimerState().finished)return;const tick=()=>{paintClock();if(Date.now()>=mainTimerState().deadline){if(reviewContext){const main=reviewContext.main;reviewContext=null;restore(main);}finishRun(true);}};timer=setInterval(tick,1000);tick();}
  function syncControls(){
    const wrong=questionQueue.filter(q=>selectedAnswers.has(q.id)&&selectedAnswers.get(q.id)!==q.answerIndex).length;
    const review=$('reviewWrong');review.hidden=!!reviewContext||!questionQueue.length;review.disabled=!wrong;review.textContent=`Làm lại ${wrong} câu Sai`;
    $('returnToMain').hidden=!reviewContext;
    $('submitExam').hidden=!!reviewContext||mode!=='exam'||finished||selectedAnswers.size!==questionQueue.length;
    document.querySelector('.study-controls').hidden=review.hidden&&$('returnToMain').hidden&&$('submitExam').hidden;
  }
  updateDashboard=function(){
    const dashboard=$('stickyDashboard');if(!dashboard)return;
    recordAnswers();points=questionQueue.length?questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length*10/questionQueue.length:0;
    const copy=dashboard.querySelector('.progress-copy'),name=document.createElement('strong'),progress=document.createElement('div');
    const m=selectedMode(),topic=scopeTopic()==='all'?'Tất cả kiến thức':LESSONS.find(l=>l.topicId===scopeTopic())?.title||'';
    name.textContent=reviewContext?`Làm lại ${reviewContext.ids.length} câu sai · ${bank.title}`:`${bank?.title||''} · ${m?.title||'Ôn tập'} · ${topic}`;
    progress.style.cssText='font-size:12px;font-weight:650;margin-top:2px';progress.textContent=`Câu ${activeQuestionIndex+1}/${questionQueue.length} · Đã làm ${selectedAnswers.size}/${questionQueue.length}`;
    copy.replaceChildren(name,progress);dashboard.querySelector('#points').textContent=formatPoints(points);
    dashboard.querySelector('.score').lastChild.textContent=' / 10 điểm';
    dashboard.querySelector('.progress span').style.width=(questionQueue.length?selectedAnswers.size/questionQueue.length*100:0)+'%';
    paintClock();syncControls();checkpoint();
  };
  pointsPerCorrectAnswer=()=>questionQueue.length?10/questionQueue.length:0;
  function explain(card,q){
    const feedback=card.querySelector('.feedback');if(feedback){const order=optionOrders.get(q.id)||[],at=order.findIndex(x=>x.originalIndex===q.answerIndex);feedback.textContent=selectedAnswers.get(q.id)===q.answerIndex?'Đúng.':`Chưa đúng · Đáp án ${'ABCD'[at]||''}.`;}
    if(!q.rationale||card.querySelector('.question-explanation'))return;
    const detail=document.createElement('details');detail.className='question-explanation';
    const summary=document.createElement('summary');summary.textContent='Xem giải thích';const p=document.createElement('p');p.textContent=q.rationale;detail.append(summary,p);
    const pages=[...new Set(q.sourceRefs.flatMap(s=>s.pdfPages||[]))];
    if(pages.length){const note=document.createElement('p');note.className='question-source-note';note.textContent='Tham chiếu: trang '+(pages.length>1?pages[0]+'–'+pages.at(-1):pages[0]);detail.append(note);}
    detail.addEventListener('toggle',()=>requestAnimationFrame(layoutCoverflowStage));card.append(detail);
  }
  const baseCard=createQuestionCard;
  createQuestionCard=function(q,index,focused=true){const card=baseCard(q,index,focused),meta=card.querySelector('.question-meta');meta.textContent=q.isOriginal?'Đề gốc':'Đề Tham khảo';meta.dataset.source=q.isOriginal?'original':'reference';if(selectedAnswers.has(q.id))explain(card,q);return card;};
  function appendResult(){
    if(quiz.querySelector('.result-strip')||!questionQueue.length)return;
    const right=questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length,result=document.createElement('div');result.className='result-strip';
    const title=document.createElement('strong');title.textContent=(expired?'Hết giờ · ':'Hoàn thành · ')+formatPoints(points)+' / 10 điểm';
    const info=document.createElement('p');info.textContent=`${right}/${questionQueue.length} câu đúng · ${questionQueue.length-right} câu sai`;result.append(title,info);
    const again=document.createElement('button');again.type='button';again.className='button';again.textContent=reviewContext?`Làm lại ${reviewContext.ids.length} câu Sai`:mode==='exam'?'Làm đề thi thử tiếp':'Làm lại lượt này';
    again.onclick=()=>{if(reviewContext)beginReview(true);else if(mode==='exam')startFresh();else {const m=selectedMode(),ordered=m.engine==='all'?E.select({...bank,questions:questionQueue},m,history(),scopeTopic()):E.shuffle(questionQueue);initialize(ordered,m,config());}};result.append(again);
    if(reviewContext){const back=document.createElement('button');back.type='button';back.className='button secondary';back.textContent='Tiếp tục đề';back.onclick=returnMain;result.append(back);}
    quiz.append(result);
  }
  function finishRun(timedOut=false){
    if(finished)return;
    if(!timedOut&&selectedAnswers.size!==questionQueue.length)return;
    if(timedOut)for(const q of questionQueue)if(!selectedAnswers.has(q.id))selectedAnswers.set(q.id,-1);
    recordAnswers();finished=true;expired=timedOut;
    if(!reviewContext){stopTimer();if(mode==='exam'){history().lastExam={finishedAt:Date.now(),wrongIds:questionQueue.filter(q=>selectedAnswers.get(q.id)!==q.answerIndex).map(q=>q.id),correctIds:questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).map(q=>q.id)};storage.set(historyKey(selectedSubject),history());}}
    points=questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length*10/questionQueue.length;
    setMascotExpression('cheering');render();checkpoint();
  }
  showCompletion=function(){if(mode==='exam'&&!reviewContext&&!finished)return;if(selectedAnswers.size===questionQueue.length&&!finished)finishRun();else if(finished)appendResult();};
  const baseRender=render;
  render=function(){document.body.classList.add('generic-session');baseRender();syncControls();if(finished)appendResult();checkpoint();};
  function initialize(questions,m,cfg,{keepParent=false}={}){
    if(!keepParent)reviewContext=null;
    // Selection already randomizes the queue, including deliberate source blocks.
    resetGestures();questionQueue=[...questions];selectedAnswers=new Map();recorded=new Set();activeQuestionIndex=0;current=0;points=0;finished=false;expired=false;
    optionOrders=buildOptionOrders(questionQueue);sessionConfig=cfg;mode=keepParent?'practice':m.engine==='exam'?'exam':'practice';
    if(!keepParent)deadline=mode==='exam'?Date.now()+m.durationMinutes*60000:0;
    render();runTimer();
  }
  function startFresh(){const m=selectedMode();const qs=E.select(bank,m,history(),scopeTopic());initialize(qs,m,config());closeHomePanel();switchScreen(studyScreen,true);}
  startQuiz=startFresh;
  function beginReview(retry=false){
    if(!reviewContext){const wrong=questionQueue.filter(q=>selectedAnswers.has(q.id)&&selectedAnswers.get(q.id)!==q.answerIndex);if(!wrong.length)return;reviewContext={main:snapshot(),ids:wrong.map(q=>q.id)};}
    const lookup=new Map(reviewContext.main.questionQueue.map(q=>[q.id,q])),qs=reviewContext.ids.map(id=>lookup.get(id));
    initialize(E.shuffle(qs),selectedMode(),sessionConfig,{keepParent:true});
  }
  function returnMain(){if(!reviewContext)return;const main=reviewContext.main;reviewContext=null;restore(main);render();runTimer();}
  $('reviewWrong').onclick=()=>beginReview();$('returnToMain').onclick=returnMain;$('submitExam').onclick=()=>finishRun();
  function deserialize(a){
    const lookup=new Map(bank.questions.map(q=>[q.id,q])),qs=a.ids.map(id=>lookup.get(id)).filter(Boolean),ids=new Set(qs.map(q=>q.id));
    const answers=new Map((a.answers||[]).filter(([id,i])=>ids.has(id)&&Number.isInteger(i)&&i>=-1&&i<4));
    return {questionQueue:qs,selectedAnswers:answers,optionOrders:buildOptionOrders(qs,a.orders),activeQuestionIndex:Math.max(0,Math.min(a.active||0,qs.length-1)),current:0,points:0,finished:!!a.finished,recorded:new Set(answers.keys()),mode:a.mode==='exam'?'exam':'practice',sessionConfig:a.config,deadline:Number(a.deadline)||0,studyCode:a.studyCode,expired:!!a.expired};
  }
  async function resume(id){
    const a=validSaved(id);if(!a||a.finished)return false;
    await activate(id);const m=bank.modes.find(x=>x.code===a.studyCode);if(!m)return false;studyCode=m.code;
    scopeSelect.value=a.config?.scope==='all'?'all':'lesson-'+LESSONS.find(l=>l.topicId===a.config?.scope)?.id;
    if(!scopeSelect.value)scopeSelect.value='all';reviewContext=null;restore(deserialize(a));
    if(a.review){const main=snapshot(),ids=a.review.ids.filter(id=>main.questionQueue.some(q=>q.id===id));if(ids.length){reviewContext={main,ids};restore(deserialize({...a.review,ids}));}}
    closeHomePanel();switchScreen(studyScreen,true);render();runTimer();return true;
  }
  async function activate(id){
    checkpoint();stopTimer();reviewContext=null;bank=await StudyCatalog.get(id);selectedSubject=id;
    LESSONS=bank.topics.map((t,i)=>({id:i+1,topicId:t.id,title:t.title,questions:bank.questions.filter(q=>q.topicId===t.id)}));
    populateLessons();scopeSelect.value='all';bankSelect.closest('.select-wrap').hidden=true;bankSelect.disabled=true;homeQuizSetup.querySelector('.setup').style.gridTemplateColumns='1fr';
    studyCode=bank.modes[0].code;return bank;
  }
  activateSubject=function(id){if(banks.has(id))return activate(id);};
  function availableCount(m){const pool=E.poolFor(bank,m,scopeTopic());return m.engine==='mistakes'?E.mistakes(bank,history(),m,scopeTopic()).length:pool.length;}
  function setupInfo(){
    const m=selectedMode(),count=availableCount(m),note=$('genericSetupNote');let description=m.description||'';
    const insufficient=m.engine==='exam'&&count<m.questionCount,empty=!count;
    if(insufficient)description=`Phần đã chọn có ${count} câu, chưa đủ ${m.questionCount} câu để thi thử. Chọn phạm vi rộng hơn.`;
    if(empty&&m.engine==='mistakes')description='Chưa có câu sai cần ôn ở phần này. Hãy làm một lượt ôn trước.';
    note.textContent=description;note.classList.toggle('is-error',insufficient||empty);beginQuizButton.disabled=insufficient||empty;
    const saved=validSaved(selectedSubject),continuing=saved&&!saved.finished&&isSameSession(saved.config,config());
    beginQuizButton.querySelector('span:first-child').textContent=continuing?'Tiếp tục lượt đang làm':'Bắt đầu '+m.title.toLocaleLowerCase('vi');
    const box=$('genericResume');box.hidden=!saved||saved.finished;if(!box.hidden){box.querySelector('span').textContent=`Lượt đang lưu: ${saved.answers.length}/${saved.ids.length} câu · ${bank.modes.find(x=>x.code===saved.studyCode)?.title||'Ôn tập'}`;box.querySelector('button').onclick=()=>resume(selectedSubject);}
    $('genericModeList').querySelectorAll('[data-mode-code]').forEach(button=>{
      const item=bank.modes.find(x=>x.code===button.dataset.modeCode),n=availableCount(item);button.setAttribute('aria-pressed',String(item.code===studyCode));
      const sub=button.querySelector('small');sub.textContent=item.engine==='exam'?`${item.questionCount} câu · ${item.durationMinutes} phút`:item.engine==='sample'?`${Math.min(item.questionCount,n)} câu / lượt`:item.engine==='mistakes'?`${n} câu cần ôn`:`${n} câu · xáo trộn toàn bộ`;
    });
  }
  refreshBeginButton=function(){if(bank)setupInfo();};
  openQuizSetup=function(){
    if(!bank)return;
    homeQuizSetup.hidden=false;homeQuizSetup.querySelector('.mode-row').hidden=true;homeQuizSetup.querySelector('.setup').hidden=false;beginQuizButton.hidden=false;
    $('homeModalText').hidden=true;$('homeModalAction').hidden=true;homeModal.classList.remove('about-open');
    $('homeModalKicker').textContent='ÔN TẬP';$('homeModalTitle').textContent=bank.title;
    const list=$('genericModeList');list.replaceChildren();
    for(const m of bank.modes){
      const button=document.createElement('button');button.type='button';button.className='generic-mode';button.dataset.modeCode=m.code;
      const icon=document.createElement('span');icon.className='generic-mode-icon';icon.textContent=m.icon;
      const copy=document.createElement('span');copy.className='generic-mode-copy';const title=document.createElement('strong');title.textContent=m.title;copy.append(title,document.createElement('small'));button.append(icon,copy);
      button.onclick=()=>{studyCode=m.code;setupInfo();};list.append(button);
    }
    setMascotExpression('studying');homeModal.hidden=false;setupInfo();list.querySelector('button')?.focus();
  };
  async function openSelection(id,code){await activate(id);if(code){const m=bank.modes.find(x=>x.code===code||'@'+x.engine===code);if(!m){toast('Môn này không bật dạng ôn đó.');return;}studyCode=m.code;}openQuizSetup();}
  handleHomeAction=function(action){if(StudyCatalog.has(action))openSelection(action).catch(e=>toast(e.message));else openHomePanel(action);};
  beginQuizButton.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();if(beginQuizButton.disabled)return;
    try{const saved=validSaved(selectedSubject);if(saved&&!saved.finished&&isSameSession(saved.config,config()))await resume(selectedSubject);else startFresh();}catch(error){toast(error.message);}
  },true);
  backToSelectionButton.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();checkpoint();stopTimer();switchScreen(homeScreen,false);},true);
  scopeSelect.addEventListener('change',()=>{if(bank)setupInfo();});
  quiz.addEventListener('click',event=>{const option=event.target.closest('button.option');if(!option)return;const q=questionQueue.find(q=>q.id===option.dataset.questionId);if(!q||!selectedAnswers.has(q.id))return;explain(option.closest('.question-card'),q);recordAnswers();syncControls();checkpoint();requestAnimationFrame(layoutCoverflowStage);});
  document.addEventListener('keydown',event=>{if(activeScreen!==studyScreen||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||event.ctrlKey||event.metaKey||event.altKey)return;const delta={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[event.key];if(delta&&questionQueue.length&&!transitionLocked&&activeQuestionIndex+delta>=0&&activeQuestionIndex+delta<questionQueue.length){event.preventDefault();settleCoverflow(delta,0);}});
  window.addEventListener('pagehide',checkpoint);window.addEventListener('beforeunload',checkpoint);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&activeScreen===studyScreen)runTimer();});
  window.StudyActions={
    checkpoint(){checkpoint();stopTimer();},
    async ready(id){const b=await StudyCatalog.get(id);banks.set(id,b);SUBJECT_NAMES[id]=b.title;return b;},
    saved:validSaved,
    summary(id){const b=banks.get(id);if(!b)return {total:0,done:0,correct:0,wrong:0,canResume:false};const h=history(id),seen=b.questions.filter(q=>E.historyFor(h,q)),wrong=seen.filter(q=>!E.historyFor(h,q).lastCorrect).length,a=validSaved(id);return {subject:id,total:b.questions.length,done:seen.length,correct:seen.length-wrong,wrong,canResume:!!a&&!a.finished,active:a?.active||0,canExam:b.modes.some(m=>m.engine==='exam'),canReview:b.modes.some(m=>m.engine==='mistakes')};},
    resume,
    review:id=>openSelection(id,'@mistakes'),
    exam:id=>openSelection(id,'@exam'),
    history:()=>history(),
    open:openSelection
  };
  window.SubjectUIReady=StudyCatalog.ready.then(async()=>{
    for(const id of StudyCatalog.ids())await StudyActions.ready(id);
    const grid=$('homeTiles');grid.replaceChildren();
    for(const id of StudyCatalog.ids()){
      const b=banks.get(id),tile=document.createElement('button');tile.type='button';tile.className='home-tile tile-generic';tile.dataset.homeAction=id;tile.dataset.search=b.title+' '+b.subtitle;tile.dataset.theme=['blue','green','rose','amber','violet'].includes(b.theme)?b.theme:'violet';
      const icon=document.createElement('span');icon.className='tile-icon subject-icon';icon.setAttribute('aria-hidden','true');icon.textContent=b.icon;
      const title=document.createElement('h3');title.textContent=b.title;const detail=document.createElement('p');detail.textContent=b.questions.length.toLocaleString('vi-VN')+' câu'+(b.subtitle?' · '+b.subtitle:'');detail.className='subject-count';
      tile.append(icon,title,detail);grid.append(tile);
    }
    const problem=StudyCatalog.error(),invalid=Object.keys(StudyCatalog.errors()).length;
    if(problem){$('catalogStatus').textContent='Chưa tải được danh sách môn. Hãy kiểm tra quá trình cập nhật GitHub Pages rồi tải lại trang.';}
    if(invalid){const message=document.createElement('p');message.className='generic-bank-warning';message.textContent=`Có ${invalid} ngân hàng chưa tải được hoặc chưa đúng định dạng. Các môn còn lại vẫn dùng được.`;grid.after(message);}
    filterHomeTiles();
  });
})();
