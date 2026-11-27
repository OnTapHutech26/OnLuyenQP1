
const mascotImages = {"happy": "assets/mascot-happy.webp", "encouraging": "assets/mascot-encouraging.webp", "cheering": "assets/mascot-cheering.webp", "thinking": "assets/mascot-thinking.webp", "sad": "assets/mascot-sad.webp", "tired": "assets/mascot-tired.webp", "angry": "assets/mascot-angry.webp", "studying": "assets/mascot-studying.webp"};
let OLD_LESSONS = [];
let NEW_LESSONS = [];
let MERGED_LESSONS = [];
const QP_BANK_TITLES = {new:'Đề mới',old:'Đề cũ',merged:'Bộ gộp không trùng'};
function qpLessonsForBank(id=bankSelect.value){return id==='merged'?MERGED_LESSONS:id==='old'?OLD_LESSONS:NEW_LESSONS;}
function qpBankTitle(id=bankSelect.value){return QP_BANK_TITLES[id]||'Quốc phòng';}
let LESSONS = NEW_LESSONS;
let selectedSubject = ''; 
const SUBJECT_NAMES = Object.create(null);
const bankSelect = document.getElementById('bank');
const scopeSelect = document.getElementById('scope');
const scopeWrap = document.getElementById('scope-wrap');
const quiz = document.getElementById('quiz');
const practiceMode = document.getElementById('practiceMode');
const examMode = document.getElementById('examMode');
const homeScreen = document.getElementById('homeScreen');
const studyScreen = document.getElementById('studyScreen');
const beginQuizButton = document.getElementById('beginQuiz');
const backToSelectionButton = document.getElementById('backToSelection');
const homeMascot = document.getElementById('homeMascot');
const studyMascot = document.getElementById('studyMascot');
const modalMascot = document.getElementById('modalMascot');
const homeModal = document.getElementById('homeModal');
const homeQuizSetup = document.getElementById('homeQuizSetup');
const homeSearch = document.getElementById('homeSearch');
const clearSearchButton = document.getElementById('clearSearch');
let lastMascotExpression = 'happy';
let mode = 'practice';
let selectedPhilosophyTier = '';
let selectedPhilosophyMethod = '';
let selectedPhilosophyExamSource = 'mixed';
let selectedPhilosophyTopic = 'all';
let questionQueue = [];
let current = 0;
let selectedAnswers = new Map();
let optionOrders = new Map();
let activeQuestionIndex = 0;
let points = 0;
let finished = false;
let sessionConfig = null;
let activeScreen = homeScreen;
let screenTransitionToken = 0;
let questionStage = null;

function setMascotExpression(expression='happy') {
  const name=mascotImages[expression]?expression:'happy';
  lastMascotExpression=name;
  [homeMascot,studyMascot,modalMascot,...document.querySelectorAll('.tile-mascot')].forEach(image=>{
    if(!image)return;
    image.src=mascotImages[name];
    image.classList.remove('mascot-react');
    void image.offsetWidth;
    image.classList.add('mascot-react');
  });
}
function openQuizSetup(nextMode) {
  setMode(nextMode);
  document.querySelectorAll('.philosophy-step').forEach(step=>step.hidden=true);
  homeQuizSetup.querySelectorAll('.setup,.mode-row,.begin-button').forEach(element=>element.hidden=false);
  homeModal.classList.remove('about-open');
  homeQuizSetup.hidden=false;
  document.getElementById('homeModalText').hidden=true;
  document.getElementById('homeModalAction').hidden=true;
  document.getElementById('homeModalKicker').textContent=nextMode==='exam'?'THI THỬ':'ÔN TẬP';
  document.getElementById('homeModalTitle').textContent=nextMode==='exam'?`Thi thử ${SUBJECT_NAMES[selectedSubject]}`:`Chọn cách ôn ${SUBJECT_NAMES[selectedSubject]}`;
  setMascotExpression(nextMode==='exam'?'encouraging':'studying');
  homeModal.hidden=false;
  (selectedSubject==='qp'?bankSelect:scopeSelect).focus();
}
function openHomePanel(kind) {
  const title=document.getElementById('homeModalTitle'), kicker=document.getElementById('homeModalKicker'), copy=document.getElementById('homeModalText'), action=document.getElementById('homeModalAction');
  const total=questionQueue.length, done=selectedAnswers.size;
  const panels={
    tips:['MẸO HỌC','Ôn theo chặng ngắn','Chia nhỏ bài ôn, rồi nghỉ một chút để đầu óc nhẹ nhàng hơn.','tired'],
    philosophy:['SẴN SÀNG','Triết học','Ôn theo 7 nhánh kiến thức hoặc làm đề thi thử 50 câu.','encouraging'],
    moreSubjects:['THƯ VIỆN MÔN HỌC','Sắp có thêm môn','Các môn học mới sẽ được thêm vào thư viện khi có nội dung ôn tập.','thinking'],
    progress:['HÀNH TRÌNH CỦA BẠN',total?`Đã làm ${done}/${total} câu`: 'Chặng đầu tiên đang chờ bạn','Bắt đầu một lượt ôn tập để theo dõi số câu đã làm và điểm hiện tại ngay tại đây. Tiến độ được giữ khi bạn chuyển qua lại giữa các màn hình.',total&&done===total?'cheering':'thinking'],
    profile:['HỒ SƠ HỌC TẬP','Học viên của Góc ôn tập','Không cần tài khoản. Chọn môn học và bắt đầu theo tốc độ của riêng bạn.','happy'],
    about:['Người tạo web','Quốc Minh','Sinh viên Y khoa HUTECH · Chúc bạn ôn vui, thi tốt!','happy']
  };
  const [label,heading,description,pose]=panels[kind]||panels.about;
  homeQuizSetup.hidden=true; document.getElementById('homeModalText').hidden=false; action.hidden=false;
  kicker.textContent=label; title.textContent=heading; copy.textContent=description; action.textContent=kind==='progress'&&!total?'Bắt đầu ôn tập':'Đã hiểu';
  action.dataset.modalAction=kind==='progress'&&!total?'practice':'close';
  homeModal.classList.toggle('about-open',kind==='about');
  setMascotExpression(pose); homeModal.hidden=false;
  document.getElementById('closeHomeModal').focus();
}
function closeHomePanel() { homeModal.hidden=true; homeModal.classList.remove('about-open'); homeQuizSetup.hidden=true; homeQuizSetup.querySelectorAll('.setup,.mode-row,.begin-button').forEach(element=>element.hidden=false); document.querySelectorAll('.philosophy-step').forEach(step=>step.hidden=true); document.getElementById('homeModalText').hidden=false; document.getElementById('homeModalAction').hidden=false; }
function searchKey(value) { return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'); }
function filterHomeTiles() {
  const term=searchKey(homeSearch.value.trim());let shown=0;
  document.querySelectorAll('.home-tile[data-home-action]').forEach(tile=>{
    const haystack=searchKey(tile.dataset.search+' '+tile.textContent);
    const match=StudyCatalog.has(tile.dataset.homeAction)&&(!term||haystack.includes(term)||(/^bai(?:\s+\d+)?$/.test(term)&&tile.dataset.homeAction==='qp'));
    tile.hidden=!match;const slot=tile.closest('.course-slot');if(slot)slot.hidden=!match;if(match)shown++;
  });
  document.getElementById('homeNoResults').hidden=shown>0||!term;
  clearSearchButton.hidden=!term;
}

function activateSubject(subject, lessons) {
  selectedSubject = subject;
  LESSONS = lessons || [];
  const bankWrap = bankSelect.closest('.select-wrap');
  if (bankWrap) bankWrap.hidden = subject !== 'qp';
  bankSelect.disabled = subject !== 'qp';
  const setup = homeQuizSetup.querySelector('.setup');
  if (setup) setup.style.gridTemplateColumns = subject === 'qp' ? '' : '1fr';
  populateLessons();
  scopeSelect.value = 'all';
  refreshBeginButton();
}
function handleHomeAction(action) {
  if (action === 'qp') {
    activateSubject('qp', qpLessonsForBank());
    setMode('practice');
    openQuizSetup('practice');
    return;
  }
  if (action === 'practice' || action === 'exam') { openQuizSetup(action); return; }
  openHomePanel(action);
}
function populateLessons() {
  scopeSelect.replaceChildren();
  const all = document.createElement('option'); all.value = 'all'; all.textContent = 'Ôn toàn bộ câu hỏi'; scopeSelect.append(all);
  for (const lesson of LESSONS) {
    const option = document.createElement('option'); option.value = `lesson-${lesson.id}`; option.textContent = lesson.title; scopeSelect.append(option);
  }
}
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
const OPTION_HISTORY_KEY='study_option_positions_v1';
let lastOptionPositions={};
try{lastOptionPositions=JSON.parse(localStorage.getItem(OPTION_HISTORY_KEY)||'{}')||{}}catch{}
function optionPositionKey(q){
  let h=0;for(const c of q.text)h=(Math.imul(h,31)+c.charCodeAt(0))|0;
  return q.id+':'+h;
}
function buildOptionOrders(questions,savedOrders){
  const saved=new Map(Array.isArray(savedOrders)?savedOrders:[]),orders=new Map();
  for(const q of questions){
    const key=optionPositionKey(q),previous=lastOptionPositions[key];
    const restored=saved.get(q.id),n=q.options.length;
    let indices;
    if(Array.isArray(restored)&&restored.length===n&&new Set(restored).size===n&&restored.every(i=>Number.isInteger(i)&&i>=0&&i<n))indices=restored.slice();
    else{
      indices=shuffleArray(q.options.map((_,i)=>i));
      const at=indices.indexOf(q.answerIndex);
      if(n>1&&Array.isArray(previous)&&at===previous.indexOf(q.answerIndex)){
        const others=indices.map((_,i)=>i).filter(i=>i!==at),swap=others[Math.floor(Math.random()*others.length)];
        [indices[at],indices[swap]]=[indices[swap],indices[at]];
      }
    }
    orders.set(q.id,indices.map(originalIndex=>({opt:q.options[originalIndex],originalIndex})));
    lastOptionPositions[key]=indices;
  }
  try{localStorage.setItem(OPTION_HISTORY_KEY,JSON.stringify(lastOptionPositions))}catch{}
  return orders;
}
function selectedQuestions() {
  if (scopeSelect.value === 'all') return LESSONS.flatMap(lesson => lesson.questions);
  const id = Number(scopeSelect.value.replace('lesson-', ''));
  return LESSONS.find(lesson => lesson.id === id)?.questions || [];
}
function setMode(next) {
  mode = next;
  practiceMode.classList.toggle('active', mode === 'practice');
  examMode.classList.toggle('active', mode === 'exam');
  practiceMode.setAttribute('aria-pressed',String(mode==='practice'));
  examMode.setAttribute('aria-pressed',String(mode==='exam'));
  examMode.querySelector('.mode-title').textContent = 'Thi thử 50 câu';
  scopeWrap.classList.toggle('hidden', mode === 'exam');
  refreshBeginButton();
}
function getSessionConfig() {
  return {subject:selectedSubject,bank:selectedSubject==='qp'?bankSelect.value:null,scope:scopeSelect.value,mode,tier:selectedSubject==='philosophy'?selectedPhilosophyTier:null,examSource:selectedSubject==='philosophy'?selectedPhilosophyExamSource:null,philosophyMethod:selectedSubject==='philosophy'?selectedPhilosophyMethod:null,topic:selectedSubject==='philosophy'?selectedPhilosophyTopic:null};
}
function isSameSession(a,b) {
  return !!a&&!!b&&a.subject===b.subject&&a.bank===b.bank&&a.scope===b.scope&&a.mode===b.mode&&a.tier===b.tier&&a.philosophyMethod===b.philosophyMethod&&a.topic===b.topic&&a.examSource===b.examSource;
}
function refreshBeginButton() {
  const continuing=questionQueue.length>0&&isSameSession(sessionConfig,getSessionConfig());
  beginQuizButton.querySelector('span:first-child').textContent=continuing?'Tiếp tục ôn tập':'Bắt đầu ôn tập';
}
function switchScreen(target,forward) {
  if(!target||target===activeScreen)return;
  if(selectedSubject==='philosophy'){
    ++screenTransitionToken;activeScreen.hidden=true;activeScreen.classList.remove('enter-forward','enter-back','leave-forward','leave-back');target.hidden=false;target.classList.remove('enter-forward','enter-back','leave-forward','leave-back');activeScreen=target;document.body.classList.toggle('is-studying',target===studyScreen);window.scrollTo({top:0,behavior:'auto'});if(target===studyScreen){layoutCoverflowStage();requestAnimationFrame(layoutCoverflowStage);}return;
  }
  if(activeScreen===studyScreen&&target!==studyScreen&&typeof stopQuestionAudio==='function')stopQuestionAudio();
  const currentScreen=activeScreen;
  const token=++screenTransitionToken;
  activeScreen=target;
  window.scrollTo({top:0,behavior:'auto'});
  document.body.classList.toggle('is-studying',target===studyScreen);
  target.hidden=false;
  currentScreen.classList.remove('enter-forward','enter-back','leave-forward','leave-back');
  target.classList.remove('enter-forward','enter-back','leave-forward','leave-back');
  target.classList.add(forward?'enter-forward':'enter-back');
  currentScreen.classList.add(forward?'leave-forward':'leave-back');
  setTimeout(()=>{
    if(token!==screenTransitionToken)return;
    currentScreen.hidden=true;
    currentScreen.classList.remove('enter-forward','enter-back','leave-forward','leave-back');
    target.classList.remove('enter-forward','enter-back','leave-forward','leave-back');
    if(target===studyScreen)layoutCoverflowStage();
    window.scrollTo({top:0,behavior:'auto'});
  },500);
  requestAnimationFrame(()=>{if(target===studyScreen)layoutCoverflowStage();});
}
function beginOrContinue() {
  const chosenConfig=getSessionConfig();
  if(!questionQueue.length||!isSameSession(sessionConfig,chosenConfig)) {
    startQuiz();
    sessionConfig=chosenConfig;
  }
  refreshBeginButton();
  closeHomePanel();
  switchScreen(studyScreen,true);
}
// Shuffle but keep questions that share a script/passage (q.group) together; other questions shuffle normally.
function shuffleKeepingGroups(list) {
  const groups = new Map();
  for (const q of list) {
    const key = q.group || ('single:' + q.id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }
  return shuffleArray([...groups.values()]).flat();
}
function startQuiz() {
  transitionLocked=false; transitionToken++; touchStart=null; gestureProgress=0; wheelAccum=0; wheelCooldownUntil=0; clearTimeout(wheelTimer);
  const source = mode === 'exam' ? LESSONS.flatMap(lesson => lesson.questions) : selectedQuestions();
  const limit = mode !== 'exam' ? source.length : Math.min(50, source.length);
  questionQueue = shuffleKeepingGroups(source).slice(0, limit);
  current = 0; selectedAnswers = new Map(); optionOrders = new Map(); activeQuestionIndex = 0; points = 0; finished = false;
  optionOrders=buildOptionOrders(questionQueue);
  render();
  window.scrollTo({top:0,behavior:'auto'});
}
function getQuestionLesson(q) { return LESSONS.find(l => l.questions.some(item => String(item.id) === String(q.id))); }
function pointsPerCorrectAnswer() {
  if (questionQueue.length === 50) return 0.2;
  if (mode === 'exam' && questionQueue.length) return 10 / questionQueue.length;
  return 0.25;
}
function formatPoints(value) { return value.toLocaleString('vi-VN',{maximumFractionDigits:2}); }
function updateDashboard() {
  const dashboard=document.getElementById('stickyDashboard'); if(!dashboard) return;
  const count=selectedAnswers.size, total=questionQueue.length;
  const activeQ=questionQueue[Math.min(activeQuestionIndex,Math.max(0,total-1))]; const activeLesson=activeQ?getQuestionLesson(activeQ):null;
  const title=mode==='exam'?`Thi thử ${total} câu`:(activeLesson?activeLesson.title:(scopeSelect.value==='all'?'Ôn toàn bộ đề':scopeSelect.options[scopeSelect.selectedIndex].text));
  dashboard.querySelector('.progress-copy').innerHTML=`<strong>${title}</strong><div style="font-size:12px;font-weight:650;margin-top:2px">Câu ${Math.min(activeQuestionIndex+1,total)}/${total} · Đã làm ${count}/${total}</div>`;
  dashboard.querySelector('#points').textContent=points.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
  const scoreLabel=dashboard.querySelector('.score'); scoreLabel.lastChild.textContent=mode==='exam'?' / 10 điểm':' điểm';
  dashboard.querySelector('.progress span').style.width=`${total?Math.round(count/total*100):0}%`;
}
let transitionLocked=false;
let transitionToken=0;
let touchStart=null;
let wheelAccum=0;
let wheelTimer=null;
let gestureProgress=0;
let wheelCooldownUntil=0;
function applyCoverflow(progress,settling=false) {
  const stage=questionStage;
  if(!stage)return;
  stage.classList.toggle('is-dragging',!settling);
  stage.classList.toggle('is-settling',settling);
  const maxCardHeight=Number(stage.dataset.cardHeight)||300;
  const stageHeight=Math.max(1,stage.clientHeight);
  const maxCardWidth=Number(stage.dataset.cardWidth)||stage.clientWidth*.94;
  const sideGutter=stage.clientWidth<600?12:28;
  const fitScale=Math.min(1,stageHeight*.86/(maxCardHeight*1.16),Math.max(1,stage.clientWidth-2*sideGutter)/(maxCardWidth*1.16));
  const slot=Math.max(64,stageHeight/2-maxCardHeight*fitScale*.43-12);
  stage.querySelectorAll('.coverflow-card').forEach(card=>{
    const cardIndex=Number(card.dataset.questionIndex);
    const relative=cardIndex-activeQuestionIndex-progress;
    const distance=Math.abs(relative);
    const scale=(distance<=1?1.16-.44*distance:Math.max(.42,.72-.27*(distance-1)))*fitScale;
    const opacity=distance<=1?1-.3*distance:Math.max(0,.7-.75*(distance-1));
    const focus=Math.max(0,1-distance);
    const target=card.classList.contains('answered')?[70,163,2]:[120,217,87];
    const channel=(start,end)=>Math.round(start+(end-start)*focus);
    card.style.borderColor=`rgb(${channel(216,target[0])},${channel(216,target[1])},${channel(216,target[2])})`;
    card.style.boxShadow=`0 ${4+6*focus}px 0 rgba(223,244,213,${focus}),0 ${22*focus}px ${44*focus}px rgba(45,117,23,${.18*focus})`;
    const y=relative*slot;
    const rotate=Math.max(-18,Math.min(18,relative*9));
    card.style.transform=`translate3d(-50%,calc(-50% + ${y}px),0) perspective(900px) rotateX(${rotate}deg) scale(${scale})`;
    card.style.opacity=String(opacity);
    card.style.zIndex=String(Math.round(20-distance*4)+(relative>0?1:0));
    card.style.filter=distance<.5?'blur(0)':`blur(${Math.min(1.4,(distance-.5)*.6)}px)`;
    card.style.pointerEvents=distance<1.55?'auto':'none';
  });
}
function layoutCoverflowStage() {
  const stage=questionStage;
  const currentCard=stage?.querySelector('.current-question-card');
  if(!stage||!currentCard)return;
  const maxCardHeight=Math.max(...Array.from(stage.querySelectorAll('.coverflow-card:not(.preview-empty)'),card=>card.offsetHeight),currentCard.offsetHeight);
  stage.dataset.cardHeight=String(maxCardHeight);
  stage.dataset.cardWidth=String(Math.max(...Array.from(stage.querySelectorAll('.coverflow-card:not(.preview-empty)'),card=>card.offsetWidth),currentCard.offsetWidth));
  stage.style.removeProperty('height');
  applyCoverflow(0,false);
  requestAnimationFrame(()=>stage.classList.remove('is-dragging'));
}
function settleCoverflow(direction,progress) {
  const canMove=direction!==0&&activeQuestionIndex+direction>=0&&activeQuestionIndex+direction<questionQueue.length;
  if(canMove&&typeof stopQuestionAudio==='function')stopQuestionAudio();
  const token=++transitionToken;
  transitionLocked=true;
  applyCoverflow(canMove?direction:0,true);
  setTimeout(()=>{
    if(token!==transitionToken)return;
    if(canMove){activeQuestionIndex+=direction;rebaseCoverflow(direction);updateDashboard();layoutCoverflowStage();}
    else {applyCoverflow(0,false);requestAnimationFrame(()=>questionStage?.classList.remove('is-dragging'));}
    transitionLocked=false;
  },390);
}
function updateCardRoles() {
  if(!questionStage)return;
  questionStage.querySelectorAll('.coverflow-card').forEach(card=>{
    const index=Number(card.dataset.questionIndex),focused=index===activeQuestionIndex,empty=card.classList.contains('preview-empty');
    card.classList.toggle('current-question-card',focused&&!empty);
    card.classList.toggle('question-card-preview',!focused||empty);
    if(focused&&!empty){card.removeAttribute('aria-hidden');card.setAttribute('aria-current','step');}
    else{card.removeAttribute('aria-current');card.setAttribute('aria-hidden','true');}
    card.querySelectorAll('button.option').forEach(button=>{
      button.tabIndex=focused?0:-1;
      button.setAttribute('aria-disabled',String(selectedAnswers.has(String(button.dataset.questionId))));
    });
  });
}
function rebaseCoverflow(direction) {
  if(!questionStage)return;
  const recycledIndex=activeQuestionIndex-3*direction;
  const incomingIndex=activeQuestionIndex+2*direction;
  const recycled=Array.from(questionStage.querySelectorAll('.coverflow-card')).find(card=>Number(card.dataset.questionIndex)===recycledIndex);
  if(recycled)recycled.replaceWith(createQuestionPreview(questionQueue[incomingIndex],incomingIndex));
  updateCardRoles();
  applyCoverflow(0,false);
  requestAnimationFrame(()=>questionStage?.classList.remove('is-dragging'));
}
function createQuestionCard(q,qIndex,focused=true) {
  const chosen=selectedAnswers.get(q.id), answered=chosen!==undefined, right=answered&&chosen===q.answerIndex;
  const card=document.createElement('article'); card.className='coverflow-card question-card '+(focused?'current-question-card':'question-card-preview')+(answered?' answered':''); card.dataset.questionIndex=String(qIndex); card.setAttribute(focused?'aria-current':'aria-hidden',focused?'step':'true');
  const meta=document.createElement('div'); meta.className='question-meta';
  const lesson=getQuestionLesson(q); meta.textContent=`${lesson?lesson.title:'Câu hỏi'} · Câu ${qIndex+1}`;
  const heading=document.createElement('h2'); heading.className='question-text'; heading.textContent=`${qIndex+1}. ${q.text}`;
  const headingRow=document.createElement('div'); headingRow.className='question-heading-row';
  headingRow.append(heading);
  const options=document.createElement('div'); options.className='options'; options.setAttribute('role','group'); options.setAttribute('aria-label','Các phương án trả lời');
  const shuffled=optionOrders.get(q.id) || q.options.map((opt, originalIndex)=>({opt,originalIndex}));
  shuffled.forEach(({opt,originalIndex}, displayIndex)=>{
    const btn=document.createElement('button');btn.type='button';btn.dataset.questionId=q.id;btn.dataset.optionIndex=String(originalIndex);btn.tabIndex=focused?0:-1;btn.setAttribute('aria-disabled',String(answered));btn.className='option';
    const letter=document.createElement('span'); letter.className='choice-letter'; letter.textContent='ABCD'[displayIndex]||String(displayIndex+1);
    const copy=document.createElement('span'); copy.className='option-copy'; copy.textContent=opt.text.replace(/^[A-E]\.\s*/, '').replace(/^[A-E]\s*[.)、]\s*/, ''); btn.append(letter,copy);
    if(answered&&originalIndex===q.answerIndex) btn.classList.add('correct');
    if(answered&&originalIndex===chosen&&!right) btn.classList.add('incorrect');
    if(answered&&originalIndex===chosen) btn.classList.add('selected');
    options.append(btn);
  });
  card.append(meta);
  card.append(headingRow,options);
  if(answered){const feedback=document.createElement('div');feedback.className='feedback show '+(right?'good':'bad');const correctPos=shuffled.findIndex(item=>item.originalIndex===q.answerIndex);feedback.textContent=right?`Chính xác! +${formatPoints(pointsPerCorrectAnswer())} điểm 🎉`:`Chưa đúng. Đáp án đúng: ${'ABCD'[correctPos]||''}.`;card.append(feedback);}
  return card;
}
function createQuestionPreview(q,qIndex) {
  if(q)return createQuestionCard(q,qIndex,false);
  const preview=document.createElement('article'); preview.className='coverflow-card question-card question-card-preview preview-empty'; preview.dataset.questionIndex=String(qIndex); preview.setAttribute('aria-hidden','true'); return preview;
}
function render() {
  quiz.replaceChildren();
  questionStage=null;
  if (!questionQueue.length) { quiz.innerHTML = '<div class="empty">Không có câu hỏi trong phạm vi này.</div>'; return; }
  const dashboard=document.createElement('div'); dashboard.id='stickyDashboard'; dashboard.className='sticky-dashboard';
  dashboard.innerHTML=`<div class="stats"><div class="progress-copy"></div><div class="score">⭐ <span id="points">0</span> điểm</div></div><div class="progress"><span style="width:0%"></span></div>`;
  quiz.append(dashboard);
  const stage=document.createElement('div'); stage.className='question-stage is-dragging'; stage.setAttribute('aria-live','polite'); stage.setAttribute('aria-atomic','true'); questionStage=stage;
  const qIndex=Math.min(activeQuestionIndex,questionQueue.length-1);
  for(let offset=-2;offset<=2;offset++){
    const cardIndex=qIndex+offset;
    const item=cardIndex===qIndex?createQuestionCard(questionQueue[cardIndex],cardIndex):createQuestionPreview(questionQueue[cardIndex],cardIndex);
    stage.append(item);
  }
  quiz.append(stage);
  updateCardRoles();
  layoutCoverflowStage();
  updateDashboard();
}
function showCompletion() {
  if(finished||selectedAnswers.size!==questionQueue.length)return;
  finished=true;
  setMascotExpression('cheering');
  const right=questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length,total=questionQueue.length;
  const result=document.createElement('div');result.className='result-strip';result.style.marginTop='14px';
  result.innerHTML=`<strong>🎉 Hoàn thành! ${points.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}${mode==='exam'?' / 10 điểm':' điểm'}</strong><p>${right}/${total} câu đúng · ${total-right} câu sai</p>`;
  const again=document.createElement('button');again.className='button';again.type='button';again.textContent=mode==='exam'?'Thi thử lại':'Làm lại lượt này';again.style.marginTop='12px';again.addEventListener('click',()=>{startQuiz();sessionConfig=getSessionConfig();refreshBeginButton();});result.append(again);quiz.append(result);
}
let suppressClickUntil=0;
quiz.addEventListener('click', event => {
  const optionButton=event.target.closest('button.option');
  const card=optionButton?.closest('.coverflow-card');
  if(!optionButton||!card||transitionLocked||Date.now()<suppressClickUntil||Number(card.dataset.questionIndex)!==activeQuestionIndex)return;
  const q=questionQueue.find(item=>String(item.id)===optionButton.dataset.questionId);
  if(!q||selectedAnswers.has(q.id)) return;
  const idx=Number(optionButton.dataset.optionIndex);selectedAnswers.set(q.id,idx);
  if(idx===q.answerIndex) points=Math.round((points+pointsPerCorrectAnswer())*100)/100;
  card.classList.add('answered');
  card.querySelectorAll('button.option').forEach(button=>{
    const optionIndex=Number(button.dataset.optionIndex);
    button.classList.toggle('correct',optionIndex===q.answerIndex);
    button.classList.toggle('incorrect',optionIndex===idx&&idx!==q.answerIndex);
    button.classList.toggle('selected',optionIndex===idx);
    button.setAttribute('aria-disabled','true');
  });
  const shuffled=optionOrders.get(q.id)||[];
  const correctPos=shuffled.findIndex(item=>item.originalIndex===q.answerIndex);
  const feedback=document.createElement('div');feedback.className='feedback show '+(idx===q.answerIndex?'good':'bad');
  feedback.textContent=idx===q.answerIndex?`Chính xác! +${formatPoints(pointsPerCorrectAnswer())} điểm 🎉`:`Chưa đúng. Đáp án đúng: ${'ABCD'[correctPos]||''}.`;card.append(feedback);
  applyCoverflow(0,false);requestAnimationFrame(()=>questionStage?.classList.remove('is-dragging'));
  layoutCoverflowStage();
  updateCardRoles();updateDashboard();showCompletion();layoutCoverflowStage();
  setMascotExpression(idx===q.answerIndex?'cheering':'sad');
  const score=document.querySelector('.score');if(score){score.classList.remove('bump');void score.offsetWidth;score.classList.add('bump');}
});
quiz.addEventListener('pointerdown', event => {
  if((event.pointerType==='mouse'&&event.button!==0)||transitionLocked||touchStart||!event.target.closest('.coverflow-card'))return;
  clearTimeout(wheelTimer);wheelTimer=null;wheelAccum=0;
  const stage=event.target.closest('.question-stage');
  touchStart={pointerId:event.pointerId,x:event.clientX,y:event.clientY,stage};gestureProgress=0;
  applyCoverflow(0,false);
});
quiz.addEventListener('pointermove', event => {
  if(!touchStart||event.pointerId!==touchStart.pointerId||transitionLocked)return;
  const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;
  if(Math.abs(dy)<4||Math.abs(dx)>Math.abs(dy)*1.25)return;
  const travel=Math.max(120,touchStart.stage.clientHeight*.42);
  let progress=Math.max(-1,Math.min(1,-dy/travel));
  if(activeQuestionIndex===questionQueue.length-1)progress=Math.min(0,progress);
  if(activeQuestionIndex===0)progress=Math.max(0,progress);
  gestureProgress=progress;applyCoverflow(progress,false);
});
window.addEventListener('pointerup', event => {
  if(!touchStart||event.pointerId!==touchStart.pointerId)return;
  const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=null;
  if(Math.abs(dy)>=82&&Math.abs(dy)>Math.abs(dx)*1.25){
    const direction=dy<0?1:-1;
    suppressClickUntil=Date.now()+500;
    settleCoverflow(activeQuestionIndex+direction>=0&&activeQuestionIndex+direction<questionQueue.length?direction:0,gestureProgress);
  }else if(Math.abs(dy)>12){suppressClickUntil=Date.now()+500;settleCoverflow(0,gestureProgress);}
  else questionStage?.classList.remove('is-dragging');
  gestureProgress=0;
});
window.addEventListener('pointercancel',event=>{if(touchStart&&event.pointerId===touchStart.pointerId){touchStart=null;gestureProgress=0;settleCoverflow(0,0);}});
quiz.addEventListener('wheel', event => {
  if(!event.target.closest('.question-stage')||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  if(Math.abs(event.deltaY)<1)return;
  event.preventDefault();
  clearTimeout(wheelTimer);
  if(transitionLocked||touchStart||Date.now()<wheelCooldownUntil)return;
  const multiplier=event.deltaMode===1?32:event.deltaMode===2?(questionStage?.clientHeight||500):1;
  wheelAccum=Math.max(-160,Math.min(160,wheelAccum+event.deltaY*multiplier));
  const progress=wheelAccum>0?.18:-.18;
  if(Math.abs(wheelAccum)>=24)applyCoverflow(progress,false);
  wheelTimer=setTimeout(()=>{
    const amount=wheelAccum;wheelAccum=0;
    if(transitionLocked||touchStart)return;
    if(Math.abs(amount)>=24){
      const direction=amount>0?1:-1;
      wheelCooldownUntil=Date.now()+760;
      settleCoverflow(activeQuestionIndex+direction>=0&&activeQuestionIndex+direction<questionQueue.length?direction:0,progress);
    }else settleCoverflow(0,0);
  },145);
},{passive:false});
window.addEventListener('resize',()=>{if(!transitionLocked&&activeScreen===studyScreen&&!studyScreen.hidden)layoutCoverflowStage();},{passive:true});
bankSelect.addEventListener('change',()=>{if(selectedSubject!=='qp')return;LESSONS=qpLessonsForBank();populateLessons();refreshBeginButton();});
scopeSelect.addEventListener('change',refreshBeginButton);
practiceMode.addEventListener('click',()=>setMode('practice'));
examMode.addEventListener('click',()=>setMode('exam'));
beginQuizButton.addEventListener('click',beginOrContinue);
backToSelectionButton.addEventListener('click',()=>switchScreen(homeScreen,false));
setMascotExpression('happy');
document.getElementById('homeTiles').addEventListener('pointerover',event=>{
  const tile=event.target.closest('.home-tile');
  if(!tile||tile.dataset.mascotSeen)return;
  tile.dataset.mascotSeen='true';
  setMascotExpression(tile.dataset.homeAction==='qp'?'encouraging':tile.dataset.homeAction==='philosophy'?'angry':tile.dataset.homePanel==='tips'?'tired':tile.dataset.homePanel==='progress'?'thinking':'happy');
});
document.getElementById('homeTiles').addEventListener('click',event=>{
  const tile=event.target.closest('.home-tile'); if(!tile)return;
  if(tile.dataset.homeAction)handleHomeAction(tile.dataset.homeAction);
  else if(tile.dataset.homePanel)openHomePanel(tile.dataset.homePanel);
});
document.querySelectorAll('[data-home-nav]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-home-nav]').forEach(item=>item.classList.toggle('selected',item===button));
  const action=button.dataset.homeNav;
  if(action==='home'){homeSearch.value='';filterHomeTiles();setMascotExpression('happy');}
  else openHomePanel(action);
}));
document.getElementById('aboutButton').addEventListener('click',()=>openHomePanel('about'));
document.getElementById('closeHomeModal').addEventListener('click',closeHomePanel);
document.getElementById('homeModalAction').addEventListener('click',event=>{if(event.currentTarget.dataset.modalAction==='practice'){closeHomePanel();handleHomeAction('practice');}else closeHomePanel();});
homeModal.addEventListener('click',event=>{if(event.target===homeModal)closeHomePanel();});
homeModal.addEventListener('keydown',event=>{if(event.key==='Escape')closeHomePanel();});
homeSearch.addEventListener('focus',()=>setMascotExpression('thinking'));
homeSearch.addEventListener('input',filterHomeTiles);
homeSearch.addEventListener('keydown',event=>{if(event.key==='Escape'){homeSearch.value='';filterHomeTiles();homeSearch.blur();setMascotExpression('happy');}});
clearSearchButton.addEventListener('click',()=>{homeSearch.value='';filterHomeTiles();homeSearch.focus();setMascotExpression('happy');});
let mascotCycle=0;setInterval(()=>{if(activeScreen===homeScreen&&!homeModal.hidden)return;if(activeScreen===homeScreen){const poses=['happy','studying','encouraging'];mascotCycle=(mascotCycle+1)%poses.length;setMascotExpression(poses[mascotCycle]);}},4600);
populateLessons();
refreshBeginButton();

;

(()=>{const $=id=>document.getElementById(id),K='mm_stats',G=20,R=document.documentElement;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const toast=m=>{let t=$('mmToast');if(!t){t=document.createElement('div');t.id='mmToast';t.className='mm-toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400)};
const meta=document.querySelector('meta[name=theme-color]');
const theme=t=>{R.dataset.theme=t;if(meta)meta.content=t==='dark'?'#0a0d1a':'#f4f6fb'};
theme(R.dataset.theme||'light');
$('mmTheme').onclick=()=>{const t=R.dataset.theme==='dark'?'light':'dark';ls.set('mm_theme',t);theme(t)};
$('mmShare').onclick=async()=>{const u=location.href.split('#')[0];try{if(navigator.share)await navigator.share({title:document.title,text:'Ôn trắc nghiệm miễn phí, học ngay trên điện thoại!',url:u});else{await navigator.clipboard.writeText(u);toast('Đã sao chép liên kết')}}catch(e){}};
const d=x=>x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate(),now=()=>d(new Date()),prev=()=>{const x=new Date();x.setDate(x.getDate()-1);return d(x)};
let S={streak:0,last:'',total:0,day:'',n:0,seen:[]};try{Object.assign(S,JSON.parse(ls.get(K)||'{}'))}catch(e){}
const roll=()=>{if(S.day!==now()){S.day=now();S.n=0;S.seen=[]}if(S.last&&S.last!==now()&&S.last!==prev())S.streak=0};
const draw=()=>{roll();$('mmStreak').querySelector('b').textContent=S.streak;const g=$('mmGoal');g.querySelector('b').textContent=S.n;g.style.setProperty('--p',Math.min(100,S.n/G*100)+'%');g.classList.toggle('done',S.n>=G)};
const hash=t=>{let h=0;for(let i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return h};
const rec=()=>{if(selectedSubject==='example')return;const c=document.querySelector('.question-card.current-question-card.answered'),q=c&&c.querySelector('.question-text');if(!q)return;roll();const k=hash(q.textContent);if(S.seen.includes(k))return;S.seen.push(k);S.n++;S.total++;if(S.last!==now()){S.streak=S.last===prev()?S.streak+1:1;S.last=now()}ls.set(K,JSON.stringify(S));draw();if(S.n===G)toast('Đạt mục tiêu hôm nay! 🎉')};
const qz=$('quiz');let raf=0;if(qz)new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(rec)}).observe(qz,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
draw();
const pn=document.querySelector('[data-home-nav=progress]');
if(pn)pn.addEventListener('click',()=>{roll();const s=(i,v)=>{const e=$(i);if(e)e.textContent=v};s('homeModalKicker','Tiến độ của bạn');s('homeModalTitle',S.streak+' ngày học liên tiếp');s('homeModalText','Hôm nay bạn đã làm '+S.n+'/'+G+' câu. Tổng cộng '+S.total+' câu. Học đều mỗi ngày để giữ chuỗi nhé!')});
})();

;

