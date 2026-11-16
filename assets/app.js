
const mascotImages = {"happy": "assets/mascot-happy.webp", "encouraging": "assets/mascot-encouraging.webp", "cheering": "assets/mascot-cheering.webp", "thinking": "assets/mascot-thinking.webp", "sad": "assets/mascot-sad.webp", "tired": "assets/mascot-tired.webp", "angry": "assets/mascot-angry.webp", "studying": "assets/mascot-studying.webp"};
let OLD_LESSONS = [];
let NEW_LESSONS = [];
let MERGED_LESSONS = [];
const QP_BANK_TITLES = {new:'Đề mới',old:'Đề cũ',merged:'Bộ gộp không trùng'};
function qpLessonsForBank(id=bankSelect.value){return id==='merged'?MERGED_LESSONS:id==='old'?OLD_LESSONS:NEW_LESSONS;}
function qpBankTitle(id=bankSelect.value){return QP_BANK_TITLES[id]||'Quốc phòng';}
let LESSONS = NEW_LESSONS;
let selectedSubject = 'qp';
const SUBJECT_NAMES = { qp: 'Quốc phòng & An ninh', philosophy: 'Triết học', example:'Example · thử giao diện' };
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

(()=>{
  const HISTORY_KEY='triet2000_adaptive_v3';
  const ATTEMPT_KEY='triet2000_attempt_v3';
  const QP_ATTEMPT_KEY='qp_attempt_v1';
  let qpLoading=null, qpLoaded=false;
  function isStudySubject(){return selectedSubject==='philosophy'||selectedSubject==='qp';}
  let cachedLessons=null, loading=null, tierCounts={}, tierLessons=[];
  let examDeadline=0, examTimerId=0, examExpired=false;
  let wrongReviewContext=null;
  function stopExamTimer(){if(examTimerId){clearInterval(examTimerId);examTimerId=0}}
  function remainingExamSeconds(){return examDeadline?Math.max(0,Math.ceil((examDeadline-Date.now())/1000)):0}
  function paintExamTimer(){
    const el=document.querySelector('.exam-clock');if(!el)return;
    const left=remainingExamSeconds(),mm=String(Math.floor(left/60)).padStart(2,'0'),ss=String(left%60).padStart(2,'0');
    el.textContent=examExpired?'⏱ 00:00 · Hết giờ':`${wrongReviewContext?'⏱ Đề chính':'⏱'} ${mm}:${ss}`;
    el.classList.toggle('urgent',left<=300&&!examExpired);
  }
  async function loadQpBank(){
    if(qpLoaded)return;
    if(!qpLoading)qpLoading=(async()=>{
      const bank=await StudyCatalog.get('qp');
      if(bank.subject!=='qp'||!Array.isArray(bank.banks))throw new Error('Sai định dạng ngân hàng QP');
      const loaded={};
      for(const id of ['new','old','merged']){
        const entry=bank.banks.find(b=>b.id===id);
        if(!entry||!Array.isArray(entry.lessons)||entry.lessons.length!==11)throw new Error('Ngân hàng QP cần đủ 11 bài');
        const ids=new Set();
        loaded[id]=entry.lessons.map(l=>{
          if(!Array.isArray(l.questions)||l.questions.length<4)throw new Error('Mỗi bài QP cần ít nhất 4 câu');
          return {...l,questions:l.questions.map(q=>{
            if(ids.has(q.id)||typeof q.text!=='string'||!Array.isArray(q.options)||!Number.isInteger(q.answerIndex)||q.answerIndex<0||q.answerIndex>=q.options.length)throw new Error('Câu QP không hợp lệ');
            ids.add(q.id);return {...q,lessonId:l.id,lessonTitle:l.title,bankId:id};
          })};
        });
        if(new Set(loaded[id].map(l=>l.id)).size!==11)throw new Error('Mã bài QP bị trùng');
      }
      NEW_LESSONS=loaded.new;OLD_LESSONS=loaded.old;MERGED_LESSONS=loaded.merged;qpLoaded=true;
      for(const id of ['new','old','merged']){
        const option=bankSelect.querySelector(`option[value="${id}"]`);
        if(option)option.textContent=({new:'📘',old:'📗',merged:'📚'}[id])+' '+qpBankTitle(id)+' · '+loaded[id].reduce((n,l)=>n+l.questions.length,0)+' câu';
      }
    })().catch(error=>{qpLoading=null;throw error});
    return qpLoading;
  }
  const tile=document.querySelector('[data-home-action="philosophy"]');
  const badge=tile?.querySelector('.subject-badge');
  const tierStep=document.getElementById('philosophyTierStep');
  const methodStep=document.getElementById('philosophyMethodStep');
  const tierSummary=document.getElementById('philosophyTierSummary');
  const topicSelect=document.getElementById('philosophyTopicSelect');
  const tierTitles={binh_thuong:'Bình thường',sieu_nhan:'Siêu nhân'};
  const stepElements=homeQuizSetup.querySelectorAll('.setup,.mode-row,.begin-button');
  const oldPopulate=populateLessons;
  const safeRead=()=>{try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}')}catch{return {}}};
  const safeWrite=value=>{try{localStorage.setItem(HISTORY_KEY,JSON.stringify(value))}catch{}};
  const now=()=>Date.now();
  const daysSince=t=>t?Math.max(0,(now()-t)/86400000):999;
  const shuffle=items=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const history=safeRead();
  let recordedThisAttempt=new Set();
  history.questions ||= {};
  history.recentExamIds ||= [];
  history.lastExams ||= {};
  function questionWeight(q){
    const h=history.questions[q.id];
    if(!h||!h.attempts)return 2.8;
    const accuracy=h.correct/h.attempts;
    const age=daysSince(h.lastSeen);
    let w=1.15+(1-accuracy)*5.4+Math.min(h.wrong||0,5)*.32;
    if(age>=7)w+=1.8;else if(age>=3)w+=1.1;else if(age>=1)w+=.55;
    if((h.streak||0)>=3&&age<3)w*=.52;
    return Math.max(.3,w);
  }
  function weightedPick(pool,count,excluded=new Set()){
    let candidates=pool.slice(),picked=[];const families=new Set();
    while(picked.length<count&&candidates.length){
      let available=candidates.filter(q=>!excluded.has(q.id)&&!families.has(q.familyId||q.id));
      if(available.length<count-picked.length)available=candidates.filter(q=>!families.has(q.familyId||q.id));
      if(available.length<count-picked.length)available=candidates;
      const total=available.reduce((n,q)=>n+questionWeight(q),0);
      let cursor=Math.random()*total, chosen=available[available.length-1];
      for(const q of available){cursor-=questionWeight(q);if(cursor<=0){chosen=q;break}}
      picked.push(chosen);families.add(chosen.familyId||chosen.id);candidates=candidates.filter(q=>q.id!==chosen.id);
    }
    return picked;
  }
  function proportionalQuotas(lessons,total){
    const n=lessons.length, quotas=Array(n).fill(0);
    const minimum=Math.min(4,Math.floor(total/n)); quotas.fill(minimum);
    let remaining=total-minimum*n;
    const pools=lessons.map(l=>l.questions.length), sum=pools.reduce((a,b)=>a+b,0)||1;
    const exact=pools.map(size=>remaining*size/sum), floors=exact.map(Math.floor);
    floors.forEach((v,i)=>quotas[i]+=v);remaining-=floors.reduce((a,b)=>a+b,0);
    const order=exact.map((v,i)=>({i,f:v-Math.floor(v)})).sort((a,b)=>b.f-a.f);
    for(let k=0;k<remaining;k++)quotas[order[k%order.length].i]++;
    return quotas;
  }
  function isOriginalQuestion(q){
    return typeof q.isOriginal==='boolean'?q.isOriginal:!!(q.number<=451&&q.sourceNumber&&!String(q.sourceTag||'').startsWith('REVISED'));
  }
  function sourceMixPlan(pool,total){
    total=Math.min(total,pool.length);
    if(pool[0]?.tier!=='binh_thuong')return {original:0,added:total,enforced:false};
    const originals=pool.filter(isOriginalQuestion).length,added=pool.length-originals;
    const original=Math.max(total-added,Math.min(Math.round(total*.8),originals));
    return {original,added:total-original,enforced:true};
  }
  function orderFullPractice(pool){
    if(pool[0]?.tier!=='binh_thuong')return shuffle(pool);
    const originals=shuffle(pool.filter(isOriginalQuestion)),added=shuffle(pool.filter(q=>!isOriginalQuestion(q))),ordered=[];
    let i=0,j=0;
    while(i<originals.length&&j<added.length){
      for(let n=0;n<4&&i<originals.length;n++)ordered.push(originals[i++]);
      ordered.push(added[j++]);
    }
    return ordered.concat(originals.slice(i),added.slice(j));
  }
  function examTierKey(){return selectedSubject==='qp'?'qp-'+bankSelect.value:(LESSONS.flatMap(l=>l.questions)[0]?.tier||'philosophy');}
  function rememberExamResult(){
    history.lastExams[examTierKey()]={
      finishedAt:now(),
      wrongIds:questionQueue.filter(q=>selectedAnswers.get(q.id)!==q.answerIndex).map(q=>q.id),
      correctIds:questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).map(q=>q.id)
    };
  }
  function selectExamQuestions(){
    const lmsOnly=typeof selectedPhilosophyExamSource!=='undefined'&&selectedPhilosophyExamSource==='lms'&&LESSONS.flatMap(l=>l.questions)[0]?.tier==='binh_thuong';
    const lessons=LESSONS.map(l=>({...l,questions:l.questions.filter(q=>(q.tier!=='sieu_nhan'||!isStatementQuestion(q))&&(!lmsOnly||isOriginalQuestion(q)))})).filter(l=>l.questions.length),pool=lessons.flatMap(l=>l.questions);
    if(lmsOnly&&pool.length<50)throw new Error('Chưa đủ 50 câu gốc trong nhánh đã chọn.');
    const total=Math.min(50,pool.length),previous=history.lastExams[examTierKey()]||{};
    const wrong=new Set(previous.wrongIds||[]),correct=new Set(previous.correctIds||[]);
    const recent=new Set(history.recentExamIds),selected=[],used=new Set(),families=new Set();
    const mix=lmsOnly?{original:total,added:0,enforced:true}:sourceMixPlan(pool,total),sourceCounts={original:0,added:0};
    const sourceKey=q=>isOriginalQuestion(q)?'original':'added';
    const allowed=q=>!mix.enforced||sourceCounts[sourceKey(q)]<mix[sourceKey(q)];
    const quotas=proportionalQuotas(lessons,total),minimum=Math.min(4,Math.floor(total/lessons.length));
    const lessonIndex=new Map(lessons.flatMap((l,i)=>l.questions.map(q=>[q.id,i]))),selectedCounts=Array(lessons.length).fill(0);
    const counts=()=>selectedCounts;
    function take(candidates,count){
      let remaining=candidates.filter(q=>!used.has(q.id));
      while(count>0&&remaining.length){
        const eligible=remaining.filter(allowed);if(!eligible.length)break;
        let choices=eligible.filter(q=>!families.has(q.familyId||q.id));
        if(!choices.length)choices=eligible;
        const fresh=choices.filter(q=>!recent.has(q.id));
        if(fresh.length)choices=fresh;
        const q=weightedPick(choices,1)[0];
        selected.push(q);sourceCounts[sourceKey(q)]++;selectedCounts[lessonIndex.get(q.id)]++;used.add(q.id);families.add(q.familyId||q.id);
        remaining=remaining.filter(x=>x.id!==q.id);count--;
      }
    }
    // Revisit actual errors; keep a small check on previously correct answers.
    take(pool.filter(q=>wrong.has(q.id)),Math.min(15,total));
    take(pool.filter(q=>correct.has(q.id)&&!wrong.has(q.id)),Math.min(3,total-selected.length));
    // Preserve coverage even when most errors come from one branch.
    lessons.forEach((lesson,i)=>take(lesson.questions.filter(q=>!correct.has(q.id)&&!wrong.has(q.id)),Math.max(0,minimum-counts()[i])));
    while(selected.length<total){
      const sizes=counts();
      const eligible=lessons.map((lesson,i)=>({lesson,i,items:lesson.questions.filter(q=>!used.has(q.id)&&allowed(q)&&!correct.has(q.id)&&!wrong.has(q.id))})).filter(x=>x.items.length);
      if(!eligible.length)break;
      const diverse=eligible.filter(x=>x.items.some(q=>!families.has(q.familyId||q.id)));
      const available=diverse.length?diverse:eligible;
      available.sort((a,b)=>(quotas[b.i]-sizes[b.i])-(quotas[a.i]-sizes[a.i]));
      take(available[0].items,1);
    }
    // Only for a small custom pool; the supplied bank has >=140 per branch/tier.
    if(selected.length<total)take(pool.filter(q=>!correct.has(q.id)),total-selected.length);
    if(selected.length<total)take(pool,total-selected.length);
    history.recentExamIds=[...selected.map(q=>q.id),...history.recentExamIds].filter((id,i,a)=>a.indexOf(id)===i).slice(0,200);
    safeWrite(history);
    return shuffle(selected);
  }
  function selectQpExamQuestions(){
    const lessons=LESSONS.filter(l=>l.questions.length);
    if(lessons.length!==11||lessons.some(l=>l.questions.length<4))throw new Error('Cần đủ 11 bài QP để lấy 50 câu');
    const quotas=new Map(lessons.map(l=>[l.id,4]));
    const extra=shuffle(lessons.filter(l=>l.questions.length>=5)).slice(0,6);
    if(extra.length!==6)throw new Error('Ngân hàng QP chưa đủ 50 câu theo cơ cấu11 bài');
    for(const l of extra)quotas.set(l.id,5);
    const pool=lessons.flatMap(l=>l.questions),byId=new Map(lessons.flatMap(l=>l.questions.map(q=>[q.id,l.id])));
    const previous=history.lastExams[examTierKey()]||{},wrong=new Set(previous.wrongIds||[]),correct=new Set(previous.correctIds||[]),recent=new Set(history.recentExamIds);
    const selected=[],used=new Set(),counts=new Map(lessons.map(l=>[l.id,0]));
    function take(candidates,count){
      while(count-->0){
        let available=candidates.filter(q=>!used.has(q.id)&&counts.get(byId.get(q.id))<quotas.get(byId.get(q.id)));
        if(!available.length)break;
        const fresh=available.filter(q=>!recent.has(q.id));if(fresh.length)available=fresh;
        const q=weightedPick(available,1)[0],lid=byId.get(q.id);
        selected.push(q);used.add(q.id);counts.set(lid,counts.get(lid)+1);
      }
    }
    take(pool.filter(q=>wrong.has(q.id)),15);
    take(pool.filter(q=>correct.has(q.id)),3);
    for(const l of lessons){
      take(l.questions.filter(q=>!wrong.has(q.id)&&!correct.has(q.id)),quotas.get(l.id)-counts.get(l.id));
      take(l.questions.filter(q=>wrong.has(q.id)),quotas.get(l.id)-counts.get(l.id));
      take(l.questions,quotas.get(l.id)-counts.get(l.id));
    }
    if(selected.length!==50)throw new Error('Không chọn đủ 50 câu QP');
    history.recentExamIds=[...selected.map(q=>q.id),...history.recentExamIds].filter((id,i,a)=>a.indexOf(id)===i).slice(0,200);safeWrite(history);
    return shuffle(selected);
  }
  function selectPracticeQuestions(){
    const pool=LESSONS.flatMap(lesson=>lesson.questions),total=Math.min(20,pool.length),mix=sourceMixPlan(pool,total);
    if(!mix.enforced)return weightedPick(pool,total);
    return shuffle([...weightedPick(pool.filter(isOriginalQuestion),mix.original),...weightedPick(pool.filter(q=>!isOriginalQuestion(q)),mix.added)]);
  }
  function showPhilosophyStep(step){
    homeModal.classList.remove('about-open');
    homeQuizSetup.hidden=false;
    document.getElementById('qpResumeAttempt').hidden=true;
    stepElements.forEach(element=>element.hidden=true);
    tierStep.hidden=step!=='tiers';
    methodStep.hidden=step!=='methods';
    document.getElementById('philosophyExamSourceStep').hidden=step!=='exam-sources';
    document.getElementById('homeModalText').hidden=true;
    document.getElementById('homeModalAction').hidden=true;
    document.getElementById('homeModalKicker').textContent=step==='tiers'?'TRIẾT HỌC':step==='exam-sources'?'THI THỬ BÌNH THƯỜNG':'CHỌN CÁCH ÔN';
    document.getElementById('homeModalTitle').textContent=step==='tiers'?'Chọn mức câu hỏi':step==='exam-sources'?'Chọn nguồn đề thi thử':'Chọn cách ôn '+tierTitles[selectedPhilosophyTier];
    setMascotExpression(step==='tiers'?'encouraging':'studying');
    homeModal.hidden=false;
    if(step==='tiers')document.querySelector('[data-philosophy-tier="binh_thuong"]')?.focus();
    else if(step==='exam-sources')document.querySelector('[data-philosophy-exam-source]:not(:disabled)')?.focus();
    else document.querySelector('[data-philosophy-method="all"]')?.focus();
  }
  function updateTierCounts(){
    document.querySelectorAll('[data-tier-count]').forEach(element=>{
      element.textContent=(tierCounts[element.dataset.tierCount]||0).toLocaleString('vi-VN');
    });
  }
  function populatePhilosophyTopics(){
    topicSelect.replaceChildren();
    const all=document.createElement('option');all.value='all';all.textContent='Tất cả 7 nhánh';topicSelect.append(all);
    tierLessons.forEach(lesson=>{
      const option=document.createElement('option');option.value=String(lesson.id);
      option.textContent=lesson.title;
      topicSelect.append(option);
    });
    topicSelect.value='all';
  }
  function isStatementQuestion(q){
    return ['statement_pair','statement_set'].includes(q.type)||/\((?:I|II|III)\)/.test(q.text);
  }
  function superSingleLessons(){
    return cachedLessons.map(l=>({...l,questions:l.questions.filter(q=>q.tier==='sieu_nhan'&&q.type==='advanced_case')})).filter(l=>l.questions.length);
  }
  function applyPhilosophyTopicScope(){
    selectedPhilosophyTopic=topicSelect.value||'all';
    const studying=selectedPhilosophyTier==='sieu_nhan'?tierLessons.map(l=>({...l,questions:l.questions.filter(isStatementQuestion)})):tierLessons;
    const studyLessons=selectedPhilosophyTopic==='all'?studying:studying.filter(l=>String(l.id)===selectedPhilosophyTopic);
    const singles=selectedPhilosophyTier==='sieu_nhan'?superSingleLessons().filter(l=>selectedPhilosophyTopic==='all'||String(l.id)===selectedPhilosophyTopic):[];
    const lessons=selectedPhilosophyTier==='sieu_nhan'&&selectedPhilosophyMethod==='exam'?singles:studyLessons;
    if(!lessons.length)return;
    activateSubject('philosophy',lessons);
    const count=studyLessons.reduce((sum,lesson)=>sum+lesson.questions.length,0);
    const scopeTitle=selectedPhilosophyTopic==='all'?'Tất cả 7 nhánh':lessons[0].title;
    tierSummary.textContent=`${tierTitles[selectedPhilosophyTier]} · ${scopeTitle} · ${count.toLocaleString('vi-VN')} câu`;
    document.querySelector('[data-method-count="all"]').textContent=`${count.toLocaleString('vi-VN')} câu · mỗi câu một lần${selectedPhilosophyTier==='binh_thuong'?' · xen 4 gốc + 1 bổ sung đến khi hết câu gốc':' · xáo trộn'}`;
    document.querySelector('[data-philosophy-method="quick"] .philosophy-pick-sub').textContent='20 câu · ưu tiên câu cần ôn lại';
    const pool=lessons.flatMap(l=>l.questions),quickMix=sourceMixPlan(pool,20),examMix=sourceMixPlan(pool,50);
    if(quickMix.enforced)document.querySelector('[data-philosophy-method="quick"] .philosophy-pick-sub').textContent=`20 câu · ${quickMix.original} gốc + ${quickMix.added} bổ sung · ưu tiên câu cần ôn`;
    const examScope=selectedPhilosophyTopic==='all'?'7 nhánh':lessons[0].title;
    document.querySelector('[data-philosophy-method="exam"] .philosophy-pick-sub').textContent=`50 câu · 60 phút · ${examScope}${examMix.enforced?' · '+examMix.original+' gốc + '+examMix.added+' bổ sung':''} · ưu tiên phần yếu`;
    const superMode=selectedPhilosophyTier==='sieu_nhan';
    document.querySelector('[data-philosophy-method="all"] .philosophy-pick-title').textContent=superMode?'Ôn nhận định I–II–III':'Ôn hết';
    document.querySelector('[data-philosophy-method="quick"] .philosophy-pick-title').textContent=superMode?'Ôn nhanh nhận định':'Ôn nhanh';
    document.querySelector('[data-philosophy-method="exam"] .philosophy-pick-title').textContent=superMode?'Thi thử nâng cao':'Thi thử';
    if(!superMode)document.querySelector('[data-philosophy-method="exam"] .philosophy-pick-sub').textContent='50 câu · 60 phút · chọn LMS 100% hoặc thêm nguồn bên ngoài';
    if(superMode){
      document.querySelector('[data-method-count="all"]').textContent=`${count.toLocaleString('vi-VN')} câu · chỉ dạng xét nhận định · mỗi câu một lần`;
      document.querySelector('[data-philosophy-method="quick"] .philosophy-pick-sub').textContent='20 câu · chỉ dạng xét nhận định';
      const available=singles.reduce((n,l)=>n+l.questions.length,0);
      document.querySelector('[data-philosophy-method="exam"] .philosophy-pick-sub').textContent=`50 câu · 60 phút · ${available} câu đơn nâng cao riêng · không có I–II–III`;
    }

  }
  function choosePhilosophyTier(tier){
    tierLessons=cachedLessons.map(lesson=>({...lesson,questions:lesson.questions.filter(q=>q.tier===tier)})).filter(lesson=>lesson.questions.length);
    if(tierLessons.length!==7){alert('Ngân hàng chưa đủ câu ở cả 7 nhánh cho mức này.');return}
    selectedPhilosophyTier=tier;
    selectedPhilosophyExamSource='mixed';
    selectedPhilosophyMethod='';
    selectedPhilosophyTopic='all';
    sessionConfig=null;
    populatePhilosophyTopics();
    applyPhilosophyTopicScope();
    setMode('practice');
    updateResume();showPhilosophyStep('methods');
  }
  function showExamSourceChoices(){
    const pool=LESSONS.flatMap(l=>l.questions),originals=pool.filter(isOriginalQuestion).length;
    const scope=selectedPhilosophyTopic==='all'?'Tất cả 7 nhánh':LESSONS[0]?.title||'';
    document.getElementById('philosophyExamSourceSummary').textContent=scope+' · 50 câu · 60 phút';
    const lms=document.querySelector('[data-philosophy-exam-source="lms"]');lms.disabled=originals<50;
    document.getElementById('lmsExamDescription').textContent=originals>=50?'50 câu · 100% từ ngân hàng gốc bạn gửi':`Nhánh này có ${originals} câu gốc, chưa đủ 50. Chọn Tất cả 7 nhánh để thi LMS.`;
    const mix=sourceMixPlan(pool,50);
    document.getElementById('mixedExamDescription').textContent=`50 câu · ${mix.original} câu gốc + ${mix.added} câu bổ sung${mix.original===40?' · tỉ lệ 80/20':''}`;
    showPhilosophyStep('exam-sources');
  }
  function choosePhilosophyMethod(method,sourceConfirmed=false){
    if(selectedPhilosophyTier==='binh_thuong'&&method==='exam'&&!sourceConfirmed){showExamSourceChoices();return;}
    selectedPhilosophyMethod=method;
    applyPhilosophyTopicScope();
    setMode(method==='exam'?'exam':'practice');
    sessionConfig=null;
    beginOrContinue();
  }
  async function readPhilosophyBank(){return StudyCatalog.get('philosophy');}

  async function loadBank(){
    if(cachedLessons)return cachedLessons;
    if(!loading)loading=readPhilosophyBank().then(bank=>{
      if(!Array.isArray(bank.questions)||bank.questions.length!==2000)throw new Error('File JSON không có đủ 2.000 câu');
      if(!Array.isArray(bank.topicMap)||!Array.isArray(bank.tierMap))throw new Error('File JSON thiếu danh sách nhánh hoặc mức ôn');
      tierCounts=Object.fromEntries(bank.tierMap.map(tier=>[tier.id,tier.questionCount]));
      const actualTierCounts=Object.fromEntries(bank.tierMap.map(tier=>[tier.id,bank.questions.filter(q=>q.tier===tier.id).length]));
      if(bank.tierMap.some(tier=>actualTierCounts[tier.id]!==tier.questionCount))throw new Error('Số câu theo mức trong JSON không khớp');
      if(actualTierCounts.binh_thuong!==1000||actualTierCounts.sieu_nhan!==1000)throw new Error('JSON cần có 1.000 câu cho mỗi mức');
      if(bank.topicMap.some(topic=>bank.tierMap.some(tier=>bank.questions.filter(q=>q.topicId===topic.id&&q.tier===tier.id).length<50)))throw new Error('Mỗi nhánh và mức cần có ít nhất 50 câu để ôn nhanh và thi thử');
      const titles=new Map(bank.topicMap.map(t=>[t.id,t.title]));
      cachedLessons=bank.topicMap.map((topic,index)=>({
        id:index+1,title:topic.title,
        questions:bank.questions.filter(q=>q.topicId===topic.id).map(q=>({
          id:`triethoc-${q.number}`,text:q.text,
          options:q.options.map(o=>({label:o.label,text:o.text,correctMarked:o.correctMarked})),
          answerIndex:q.answerIndex,topicId:q.topicId,topicTitle:titles.get(q.topicId),
          rationale:q.rationale||'',group:q.group||null,tier:q.tier,tierTitle:q.tierTitle,number:q.number,type:q.type,isOriginal:isOriginalQuestion(q),conceptId:q.conceptId,familyId:q.familyId||q.id,focus:q.focus||'',memoryTip:q.memoryTip||''
        }))
      }));
      if(cachedLessons.some(l=>!l.questions.length))throw new Error('Có nhánh kiến thức không có câu hỏi');
      if(history.superContentVersion!=='2026-11-09-r3'){
        for(const q of cachedLessons.flatMap(l=>l.questions).filter(q=>q.type==='advanced_case'))delete history.questions[q.id];
        const freshIds=new Set(cachedLessons.flatMap(l=>l.questions).filter(q=>q.type==='advanced_case').map(q=>q.id));
        history.recentExamIds=history.recentExamIds.filter(id=>!freshIds.has(id));
        delete history.lastExams.sieu_nhan;
        history.superContentVersion='2026-11-09-r3';safeWrite(history);
      }

      return cachedLessons;
    }).catch(err=>{loading=null;throw err});
    return loading;
  }
  populateLessons=function(){oldPopulate()};
  const originalStartQuiz=startQuiz;
  startQuiz=function(){
    wrongReviewContext=null;
    if(!isStudySubject())return originalStartQuiz();
    if(selectedSubject==='qp')selectedPhilosophyMethod=mode==='exam'?'exam':'all';
    stopExamTimer();examDeadline=0;examExpired=false;
    transitionLocked=false;transitionToken++;touchStart=null;gestureProgress=0;wheelAccum=0;wheelCooldownUntil=0;clearTimeout(wheelTimer);
    const all=selectedSubject==='qp'?(mode==='exam'?LESSONS.flatMap(l=>l.questions):selectedQuestions()):(selectedPhilosophyMethod==='review'?questionQueue:LESSONS.flatMap(lesson=>lesson.questions));
    const selected=selectedSubject==='qp'?(mode==='exam'?selectQpExamQuestions():shuffle(all)):(selectedPhilosophyMethod==='exam'?selectExamQuestions():selectedPhilosophyMethod==='quick'?selectPracticeQuestions():orderFullPractice(all));
    if(mode==='exam'){examDeadline=Date.now()+60*60*1000;examTimerId=setInterval(()=>{paintExamTimer();if(remainingExamSeconds()===0)endTimedExam()},1000)}
    questionQueue=selectedPhilosophyMethod==='all'?selected:shuffleKeepingGroups(selected);
    current=0;selectedAnswers=new Map();optionOrders=new Map();activeQuestionIndex=0;points=0;finished=false;recordedThisAttempt=new Set();
    optionOrders=buildOptionOrders(questionQueue);
    render();window.scrollTo({top:0,behavior:'auto'});
  };
  const originalUpdateDashboard=updateDashboard;
  updateDashboard=function(){
    if(isStudySubject()&&questionQueue.length)points=questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length*10/questionQueue.length;
    originalUpdateDashboard();
    if(isStudySubject()){saveAttempt();syncStudyControls();}
    const progress=document.querySelector('#stickyDashboard .progress-copy');if(!progress)return;
    if(selectedSubject==='philosophy'){
      const heading=progress.querySelector('strong');
      const methodTitle=wrongReviewContext?`Ôn ${wrongReviewContext.ids.length} câu sai của đề chính`:selectedPhilosophyMethod==='exam'?(selectedPhilosophyTier==='binh_thuong'?`Thi thử 50 câu · ${selectedPhilosophyExamSource==='lms'?'LMS 100%':'Thêm Nguồn bên ngoài'}`:'Thi thử 50 câu'):selectedPhilosophyMethod==='quick'?(selectedPhilosophyTier==='sieu_nhan'?'Ôn nhanh nhận định 20 câu':'Ôn nhanh 20 câu'):selectedPhilosophyMethod==='review'?'Ôn lại câu sai':`${selectedPhilosophyTier==='sieu_nhan'?'Ôn nhận định':'Ôn hết'} ${questionQueue.length.toLocaleString('vi-VN')} câu`;
      const topicTitle=selectedPhilosophyTopic==='all'?'7 nhánh':(LESSONS[0]?.title||'');
      if(heading)heading.textContent=`${tierTitles[selectedPhilosophyTier]} · ${topicTitle} · ${methodTitle}${selectedPhilosophyTier==='sieu_nhan'&&mode==='exam'?' · Câu đơn nâng cao':''}`;
      const score=document.querySelector('#stickyDashboard .score');if(score&&score.lastChild)score.lastChild.textContent=' / 10 điểm';

    }
    if(selectedSubject==='qp'){
      const heading=progress.querySelector('strong'),bankTitle=qpBankTitle();
      if(heading)heading.textContent=`QP · ${bankTitle} · ${wrongReviewContext?'Ôn '+wrongReviewContext.ids.length+' câu sai của đề chính':mode==='exam'?'Thi thử 50 câu · 11 bài':(getQuestionLesson(questionQueue[activeQuestionIndex])?.title||'Ôn tập')}`;
      const score=document.querySelector('#stickyDashboard .score');if(score&&score.lastChild)score.lastChild.textContent=' / 10 điểm';
    }
    let clock=progress.querySelector('.exam-clock');
    if(isStudySubject()&&(mode==='exam'||(wrongReviewContext&&wrongReviewContext.main.mode==='exam'&&!wrongReviewContext.main.finished))){
      if(!clock){clock=document.createElement('span');clock.className='exam-clock';clock.setAttribute('aria-label','Thời gian còn lại');progress.append(clock)}
      paintExamTimer();
    }else if(clock)clock.remove();
  };
  const originalShowCompletion=showCompletion;
  showCompletion=function(force=false){
    if(isStudySubject()&&mode==='exam'&&!finished&&!force)return;
    if(!wrongReviewContext&&selectedAnswers.size===questionQueue.length)stopExamTimer();
    originalShowCompletion();
    if(isStudySubject()){
      const heading=quiz.querySelector('.result-strip strong');
      if(heading)heading.textContent=`🎉 Hoàn thành! ${points.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')} / 10 điểm`;
      addWrongReviewCompletion();
    }
  };
  const originalPointsPerCorrectAnswer=pointsPerCorrectAnswer;
  pointsPerCorrectAnswer=function(){return isStudySubject()&&questionQueue.length?10/questionQueue.length:originalPointsPerCorrectAnswer()};
  function endTimedExam(){if(wrongReviewContext){returnToMainAttempt();return}gradeExam(true)}
  const oldCreateCard=createQuestionCard;
  createQuestionCard=function(q,qIndex,focused=true){
    const card=oldCreateCard(q,qIndex,focused);
    if(selectedSubject==='philosophy'){
      const meta=card.querySelector('.question-meta');if(meta){meta.textContent=isOriginalQuestion(q)?'Đề gốc':'Đề Tham khảo';meta.dataset.source=isOriginalQuestion(q)?'original':'reference';}
      if(selectedAnswers.has(q.id))decorateFeedback(card,q);
    }else if(selectedAnswers.has(q.id)&&q.rationale){const f=card.querySelector('.feedback');if(f)f.textContent+=' '+q.rationale;}
    return card;
  };
  quiz.addEventListener('click',event=>{
    const button=event.target.closest('button.option');if(!button)return;
    const q=questionQueue.find(item=>item.id===button.dataset.questionId);if(!q||!selectedAnswers.has(q.id))return;
    const prior=history.questions[q.id]||{attempts:0,correct:0,wrong:0,streak:0};
    if(recordedThisAttempt.has(q.id)) return;
    recordedThisAttempt.add(q.id);
    const correct=selectedAnswers.get(q.id)===q.answerIndex;
    const feedback=button.closest('.question-card')?.querySelector('.feedback');
    if(isStudySubject()){if(selectedSubject==='philosophy')decorateFeedback(button.closest('.question-card'),q);layoutCoverflowStage();syncStudyControls();saveAttempt();}else if(feedback&&q.rationale&&!feedback.dataset.rationaleAdded){feedback.textContent+=' '+q.rationale;feedback.dataset.rationaleAdded='1'}
    prior.attempts++;prior.lastSeen=now();
    if(correct){prior.correct++;prior.streak=(prior.streak||0)+1}else{prior.wrong++;prior.streak=0}
    history.questions[q.id]=prior;safeWrite(history);
  });
  if(tile)tile.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();saveAttempt();
    if(wrongReviewContext){saveAttempt();wrongReviewContext=null;}
    stopExamTimer();examDeadline=0;examExpired=false;
    if(badge)badge.textContent='Đang tải…';
    try{
      await loadBank();
      if(badge)badge.textContent='Sẵn sàng';
      selectedPhilosophyTier='';selectedPhilosophyMethod='';sessionConfig=null;
      updateTierCounts();showPhilosophyStep('tiers');
    }catch(error){
      if(badge)badge.textContent='Thử lại';
      console.error(error);alert('Không tải được ngân hàng Triết học. Hãy đặt index.html và ngan_hang_triet_hoc_2000.json cạnh nhau trên GitHub.');
    }
  },true);
  document.querySelectorAll('[data-philosophy-tier]').forEach(button=>button.addEventListener('click',()=>choosePhilosophyTier(button.dataset.philosophyTier)));
  document.querySelectorAll('[data-philosophy-method]').forEach(button=>button.addEventListener('click',()=>choosePhilosophyMethod(button.dataset.philosophyMethod)));
  topicSelect.addEventListener('change',applyPhilosophyTopicScope);
  document.getElementById('philosophyBackToTiers').addEventListener('click',()=>showPhilosophyStep('tiers'));
  document.querySelectorAll('[data-philosophy-exam-source]').forEach(button=>button.addEventListener('click',()=>{
    if(button.disabled)return;selectedPhilosophyExamSource=button.dataset.philosophyExamSource;choosePhilosophyMethod('exam',true);
  }));
  document.getElementById('philosophyBackToMethods').onclick=()=>showPhilosophyStep('methods');

  if(tile){const desc=tile.querySelector('p');if(desc)desc.textContent='Bình thường · Siêu nhân'}

  function captureAttemptState(){
    return {questionQueue,selectedAnswers,optionOrders,activeQuestionIndex,current,points,finished,recordedThisAttempt,mode,method:selectedPhilosophyMethod,examSource:selectedPhilosophyExamSource,sessionConfig,examDeadline,examExpired};
  }
  function resetQuestionGesture(){
    transitionLocked=false;transitionToken++;touchStart=null;gestureProgress=0;wheelAccum=0;wheelCooldownUntil=0;clearTimeout(wheelTimer);suppressClickUntil=0;
  }
  function restoreAttemptState(a){
    questionQueue=a.questionQueue;selectedAnswers=a.selectedAnswers;optionOrders=a.optionOrders;activeQuestionIndex=a.activeQuestionIndex;current=a.current;points=a.points;finished=a.finished;recordedThisAttempt=a.recordedThisAttempt;mode=a.mode;selectedPhilosophyMethod=a.method;selectedPhilosophyExamSource=a.examSource||'mixed';sessionConfig=a.sessionConfig;examDeadline=a.examDeadline;examExpired=a.examExpired;resetQuestionGesture();
  }
  function serializedOrders(orders){return [...orders].map(([id,items])=>[id,items.map(item=>item.originalIndex)]);}
  function saveAttempt(){
    if(!isStudySubject()||!questionQueue.length)return;
    if(selectedSubject==='qp'&&questionQueue[0].bankId!==bankSelect.value)return;
    if(selectedSubject==='philosophy'&&questionQueue[0].tier!==selectedPhilosophyTier)return;
    const main=wrongReviewContext?wrongReviewContext.main:captureAttemptState();
    if(!main.method)return;
    const attemptKey=selectedSubject==='qp'?QP_ATTEMPT_KEY:ATTEMPT_KEY;
    try{
      if(main.finished&&!wrongReviewContext){localStorage.removeItem(attemptKey);return}
      const review=wrongReviewContext?{ids:questionQueue.map(q=>q.id),answers:[...selectedAnswers],optionOrders:serializedOrders(optionOrders),active:activeQuestionIndex,finished}:null;
      localStorage.setItem(attemptKey,JSON.stringify({subject:selectedSubject,bank:bankSelect.value,scope:scopeSelect.value,version:'2026-11-09-r2',tier:selectedPhilosophyTier,topic:selectedPhilosophyTopic,method:main.method,examSource:main.examSource,ids:main.questionQueue.map(q=>q.id),answers:[...main.selectedAnswers],optionOrders:serializedOrders(main.optionOrders),superBankVersion:'2026-11-09-r3',bankMode:selectedPhilosophyTier==='sieu_nhan'&&main.method==='exam'?'single-super-v1':'standard',active:main.activeQuestionIndex,deadline:main.examDeadline,finished:main.finished,wrongReview:review}));
    }catch{}
  }
  function beginWrongReview(saved=null){
    if(!wrongReviewContext){
      const wrong=questionQueue.filter(q=>selectedAnswers.has(q.id)&&selectedAnswers.get(q.id)!==q.answerIndex);
      if(!wrong.length)return;
      const valid=new Set(wrong.map(q=>q.id));
      const ids=saved&&Array.isArray(saved.ids)?saved.ids.filter(id=>valid.has(id)):wrong.map(q=>q.id);
      if(!ids.length)return;
      wrongReviewContext={main:captureAttemptState(),ids};
    }
    const lookup=new Map(wrongReviewContext.main.questionQueue.map(q=>[q.id,q]));
    questionQueue=wrongReviewContext.ids.map(id=>lookup.get(id));
    if(!saved)questionQueue=shuffle(questionQueue);
    selectedAnswers=new Map(saved?(saved.answers||[]).filter(([id])=>wrongReviewContext.ids.includes(id)):[]);
    optionOrders=buildOptionOrders(questionQueue,saved?.optionOrders);
    activeQuestionIndex=Math.max(0,Math.min(saved?.active||0,questionQueue.length-1));current=0;points=0;
    mode='practice';selectedPhilosophyMethod='wrong-review';finished=selectedAnswers.size===questionQueue.length;
    recordedThisAttempt=new Set(selectedAnswers.keys());resetQuestionGesture();render();
  }
  function returnToMainAttempt(){
    if(!wrongReviewContext)return;
    const main=wrongReviewContext.main;wrongReviewContext=null;restoreAttemptState(main);render();
    if(mode==='exam'&&!finished&&remainingExamSeconds()===0)gradeExam(true);
  }
  function addWrongReviewCompletion(){
    if(!wrongReviewContext)return;
    const result=quiz.querySelector('.result-strip');if(!result||result.querySelector('.wrong-review-actions'))return;
    result.querySelectorAll('button').forEach(b=>b.remove());
    const actions=document.createElement('div');actions.className='wrong-review-actions';
    const retry=document.createElement('button');retry.type='button';retry.className='button';retry.textContent=`Làm lại ${wrongReviewContext.ids.length} câu Sai`;retry.onclick=()=>beginWrongReview();
    const back=document.createElement('button');back.type='button';back.className='button secondary';back.textContent='Tiếp tục đề';back.onclick=returnToMainAttempt;
    actions.append(retry,back);result.append(actions);
  }
  function savedAttempt(){try{const a=JSON.parse(localStorage.getItem(ATTEMPT_KEY)||'null');return a&&a.version==='2026-11-09-r2'&&!(a.tier==='sieu_nhan'&&a.superBankVersion!=='2026-11-09-r3')&&!(a.tier==='sieu_nhan'&&a.method==='exam'&&a.bankMode!=='single-super-v1')?a:null}catch{return null}}
  function updateResume(){const el=document.getElementById('resumeAttempt'),a=savedAttempt();el.hidden=!(a&&a.tier===selectedPhilosophyTier);if(!el.hidden)el.querySelector('span').textContent=`Lượt trước: đã làm ${a.answers.length}/${a.ids.length} câu. Có thể tiếp tục sau khi đóng hoặc tải lại trang.`;}
  const baseRender=render;
  function syncStudyControls(){
    const philosophy=isStudySubject();
    document.getElementById('submitExam').hidden=!philosophy||!!wrongReviewContext||mode!=='exam'||finished||selectedAnswers.size!==questionQueue.length;
    const wrong=questionQueue.filter(q=>selectedAnswers.has(q.id)&&selectedAnswers.get(q.id)!==q.answerIndex).length;
    const review=document.getElementById('reviewWrong');
    review.hidden=!philosophy||!!wrongReviewContext;review.disabled=!wrong;review.textContent=`Làm lại ${wrong} câu Sai`;
    const back=document.getElementById('returnToMain');back.hidden=!philosophy||!wrongReviewContext||finished;
    document.querySelector('.study-controls').hidden=review.hidden&&back.hidden&&document.getElementById('submitExam').hidden;
  }
  render=function(){
    document.body.classList.toggle('philosophy-session',selectedSubject==='philosophy');
    baseRender();
    if(isStudySubject()&&finished){finished=false;showCompletion(true);}
    syncStudyControls();
    saveAttempt();
  };
  function moveQuestion(delta){
    if(transitionLocked||!questionStage)return;
    if(activeQuestionIndex+delta<0||activeQuestionIndex+delta>=questionQueue.length)return;
    settleCoverflow(delta,0);
  }
  document.addEventListener('keydown',e=>{
    if(activeScreen!==studyScreen||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();moveQuestion(1)}
    else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();moveQuestion(-1)}
  });
  function decorateFeedback(card,q){const feedback=card.querySelector('.feedback');if(!feedback)return;const right=selectedAnswers.get(q.id)===q.answerIndex;const a=q.options[q.answerIndex].text.replace(/^[A-D]\.\s*/,'');feedback.textContent=(right?'Đúng. ':'Chưa đúng. ')+'Đáp án: '+a+'\n\n'+q.rationale;feedback.dataset.rationaleAdded='1';}
  function gradeExam(expired=false){
    if(!isStudySubject()||mode!=='exam'||finished)return;
    if(!expired&&selectedAnswers.size!==questionQueue.length)return;
    examExpired=expired;stopExamTimer();
    for(const q of questionQueue){if(!selectedAnswers.has(q.id))selectedAnswers.set(q.id,-1);if(recordedThisAttempt.has(q.id))continue;recordedThisAttempt.add(q.id);const h=history.questions[q.id]||{attempts:0,correct:0,wrong:0,streak:0};h.attempts++;h.lastSeen=now();if(selectedAnswers.get(q.id)===q.answerIndex){h.correct++;h.streak++}else{h.wrong++;h.streak=0}history.questions[q.id]=h;}
    rememberExamResult();safeWrite(history);finished=true;render();if(expired){const el=quiz.querySelector('.result-strip strong');if(el)el.textContent='Hết 60 phút · '+formatPoints(points)+' / 10 điểm';}
  }
  document.getElementById('submitExam').onclick=()=>{const missing=questionQueue.length-selectedAnswers.size;if(missing&&!confirm(`Còn ${missing} câu chưa làm. Nộp bài và tính các câu đó là sai?`))return;gradeExam(false)};
  document.getElementById('reviewWrong').onclick=()=>beginWrongReview();
  document.getElementById('returnToMain').onclick=returnToMainAttempt;
  document.querySelector('#resumeAttempt button').onclick=()=>{
    const a=savedAttempt();if(!a)return;wrongReviewContext=null;topicSelect.value=a.topic||'all';selectedPhilosophyExamSource=a.examSource||'mixed';selectedPhilosophyMethod=a.method;applyPhilosophyTopicScope();mode=a.method==='exam'?'exam':'practice';const map=new Map((a.tier==='sieu_nhan'&&a.method==='exam'?LESSONS:cachedLessons).flatMap(l=>l.questions).map(q=>[q.id,q]));questionQueue=a.ids.map(id=>map.get(id)).filter(Boolean);selectedAnswers=new Map(a.answers.filter(([id])=>map.has(id)));activeQuestionIndex=Math.min(a.active||0,questionQueue.length-1);points=0;finished=!!a.finished;recordedThisAttempt=new Set(a.answers.map(([id])=>id));optionOrders=new Map();optionOrders=buildOptionOrders(questionQueue,a.optionOrders);examDeadline=a.deadline||0;stopExamTimer();if(mode==='exam'&&!finished){examTimerId=setInterval(()=>{paintExamTimer();if(remainingExamSeconds()===0)endTimedExam()},1000)}closeHomePanel();switchScreen(studyScreen,true);render();if(mode==='exam'&&!finished&&remainingExamSeconds()===0)gradeExam(true);else if(a.wrongReview)beginWrongReview(a.wrongReview);
  };
  function savedQpAttempt(){
    try{const a=JSON.parse(localStorage.getItem(QP_ATTEMPT_KEY)||'null');return a&&a.subject==='qp'&&Array.isArray(a.ids)&&a.ids.length?a:null}catch{return null}
  }
  function updateQpResume(){
    const el=document.getElementById('qpResumeAttempt'),a=savedQpAttempt();
    el.hidden=selectedSubject!=='qp'||!a||a.bank!==bankSelect.value;
    if(!el.hidden)el.querySelector('span').textContent=`Lượt QP trước: đã làm ${a.answers.length}/${a.ids.length} câu.`;
  }
  document.querySelector('#qpResumeAttempt button').onclick=async()=>{
    const a=savedQpAttempt();if(!a)return;
    await loadQpBank();wrongReviewContext=null;stopExamTimer();
    bankSelect.value=Object.hasOwn(QP_BANK_TITLES,a.bank)?a.bank:'new';activateSubject('qp',qpLessonsForBank());
    scopeSelect.value=a.scope||'all';mode=a.method==='exam'?'exam':'practice';selectedPhilosophyMethod=a.method;
    const lookup=new Map(LESSONS.flatMap(l=>l.questions).map(q=>[q.id,q]));
    questionQueue=a.ids.map(id=>lookup.get(id)).filter(Boolean);if(!questionQueue.length)return;
    const valid=new Set(questionQueue.map(q=>q.id));selectedAnswers=new Map(a.answers.filter(([id])=>valid.has(id)));
    optionOrders=buildOptionOrders(questionQueue,a.optionOrders);activeQuestionIndex=Math.max(0,Math.min(a.active||0,questionQueue.length-1));current=0;points=0;finished=!!a.finished;recordedThisAttempt=new Set(selectedAnswers.keys());examDeadline=a.deadline||0;examExpired=false;sessionConfig=getSessionConfig();resetQuestionGesture();
    if(mode==='exam'&&!finished)examTimerId=setInterval(()=>{paintExamTimer();if(remainingExamSeconds()===0)endTimedExam()},1000);
    closeHomePanel();switchScreen(studyScreen,true);render();
    if(mode==='exam'&&!finished&&remainingExamSeconds()===0)gradeExam(true);else if(a.wrongReview)beginWrongReview(a.wrongReview);
  };
  const qpTile=document.querySelector('[data-home-action="qp"]');
  qpTile?.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();saveAttempt();wrongReviewContext=null;stopExamTimer();
    const status=qpTile.querySelector('.subject-badge');if(status)status.textContent='Đang tải…';
    try{
      await loadQpBank();if(status)status.textContent='Sẵn sàng';
      activateSubject('qp',qpLessonsForBank());openQuizSetup('practice');updateQpResume();
    }catch(error){
      if(status)status.textContent='Thử lại';console.error(error);
      alert('Không tải được ngân hàng QP. Hãy đặt ngan_hang_quoc_phong.json cạnh index.html và mở web qua GitHub Pages.');
    }
  },true);
  bankSelect.addEventListener('change',()=>{if(selectedSubject==='qp')updateQpResume();});
  window.addEventListener('beforeunload',saveAttempt);

  const oldSetMode=setMode;
  setMode=function(next){
    oldSetMode(next);
    const isPhilosophy=selectedSubject==='philosophy';
    examMode.querySelector('.mode-title').textContent=isPhilosophy?'Thi thử 50 câu':'Thi thử 50 câu';
    const es=examMode.querySelector('.mode-sub');if(es)es.textContent=isPhilosophy?'7 nhánh · 60 phút · ưu tiên phần yếu':'11 bài · 60 phút · 4–5 câu mỗi bài';
    const ps=practiceMode.querySelector('.mode-sub');if(ps)ps.textContent=isPhilosophy?'Ôn nhanh · 20 câu':'Tự chọn phạm vi ôn';
  };
  setMode(mode);
  // UI shortcuts call the same quiz, resume and wrong-review handlers.
  window.StudyActions={
    checkpoint(){saveAttempt();wrongReviewContext=null;stopExamTimer();},
    async ready(subject){return subject==='qp'?loadQpBank():loadBank();},
    saved(subject){return subject==='qp'?savedQpAttempt():savedAttempt();},
    summary(subject){
      const saved=subject==='qp'?savedQpAttempt():savedAttempt();
      const live=selectedSubject===subject&&questionQueue.length&&(subject==='qp'?!!questionQueue[0].bankId:!!questionQueue[0].tier);
      const state=live?(wrongReviewContext?wrongReviewContext.main:{questionQueue,selectedAnswers,activeQuestionIndex,finished}):null;
      const pool=subject==='qp'?[...NEW_LESSONS,...OLD_LESSONS,...MERGED_LESSONS].flatMap(l=>l.questions):(cachedLessons||[]).flatMap(l=>l.questions);
      const lookup=new Map(pool.map(q=>[q.id,q]));
      const answers=state?state.selectedAnswers:new Map(saved?.answers||[]);
      const ids=state?state.questionQueue.map(q=>q.id):(saved?.ids||[]);
      const valid=ids.filter(id=>lookup.has(id));
      const wrong=valid.filter(id=>answers.has(id)&&answers.get(id)!==lookup.get(id).answerIndex).length;
      const correct=valid.filter(id=>answers.get(id)===lookup.get(id).answerIndex).length;
      return {subject,total:valid.length,done:valid.filter(id=>answers.has(id)).length,wrong,correct,active:state?state.activeQuestionIndex:(saved?.active||0),canResume:!!valid.length&&!(state?.finished||saved?.finished)};
    },
    async resume(subject){
      await this.ready(subject);
      const saved=this.saved(subject);
      if(!saved&&selectedSubject===subject&&questionQueue.length&&(subject==='qp'?!!questionQueue[0].bankId:!!questionQueue[0].tier)){
        closeHomePanel();switchScreen(studyScreen,true);return true;
      }
      if(!saved)return false;
      if(subject==='qp')await document.querySelector('#qpResumeAttempt button').onclick();
      else{choosePhilosophyTier(saved.tier);document.querySelector('#resumeAttempt button').onclick();}
      return true;
    },
    async review(subject){if(await this.resume(subject))beginWrongReview();},
    async exam(subject){
      await this.ready(subject);
      if(subject==='qp'){activateSubject('qp',qpLessonsForBank());openQuizSetup('exam');updateQpResume();}
      else{choosePhilosophyTier(this.saved(subject)?.tier||'binh_thuong');choosePhilosophyMethod('exam');}
    },
    history(){return {questions:history.questions,lastExams:history.lastExams};}
  };

})();

;

/* ===== TT skin: XP / combo / hiệu ứng. Điểm thi /10 vẫn do code gốc tính, file này KHÔNG chạm vào. Hiệu ứng có thể bật/tắt cho mọi cách ôn; Sound điều khiển tiếng riêng. ===== */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const K='tt_skin_v1';
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const S={xp:0,best:0,sound:false,effects:true};
try{Object.assign(S,JSON.parse(ls.get(K)||'{}'))}catch(e){}
S.effects=S.effects!==false;
const save=()=>ls.set(K,JSON.stringify(S));
function syncEffectsScope(){document.documentElement.dataset.effects=document.body.classList.contains('is-studying')?(S.effects?'on':'off'):'on';}
function applyEffects(){
  document.documentElement.dataset.studyEffects=S.effects?'on':'off';
  syncEffectsScope();
  if(!S.effects){
    document.querySelectorAll('.tt-confetti,.tt-float,.tt-banner,.tt-vig,.tt-reward-ring,.tt-xp-star').forEach(el=>{
      if(el.getAnimations)el.getAnimations().forEach(a=>a.cancel());
      el.remove();
    });
    document.querySelectorAll('.tt-pop,.tt-shake,.bump').forEach(el=>el.classList.remove('tt-pop','tt-shake','bump'));
    try{navigator.vibrate&&navigator.vibrate(0)}catch(e){}
  }
  document.querySelectorAll('[data-effects-toggle]').forEach(btn=>{
    btn.setAttribute('aria-pressed',String(S.effects));
    btn.setAttribute('aria-label','Hiệu ứng: '+(S.effects?'đang bật, bấm để tắt':'đang tắt, bấm để bật'));
    btn.querySelector('.tt-lbl').textContent='Hiệu ứng: '+(S.effects?'Bật':'Tắt');
  });
}
applyEffects();
new MutationObserver(syncEffectsScope).observe(document.body,{attributes:true,attributeFilter:['class']});
const quiz=$('quiz');
if(!quiz)return;
document.body.classList.add('tt-on');

/* ---------- cấp độ: mỗi cấp cần 100 + 50*(cấp-1) XP ---------- */
const need=l=>100+50*(l-1);
function lvInfo(xp){let l=1,r=xp;while(r>=need(l)){r-=need(l);l++}return{l,cur:r,max:need(l)}}

/* ---------- phiên hiện tại (tự reset khi code gốc tạo Map đáp án mới) ---------- */
let sess=null,mapRef=null;
function ensureSess(){
  if(mapRef!==selectedAnswers){mapRef=selectedAnswers;sess={combo:0,best:0,xp:0,answered:0,newRecord:false}}
  return sess;
}

/* ---------- âm thanh (mặc định tắt) ---------- */
let ac=null;
function beep(f,d=.12,type='sine',v=.07,when=0){
  if(!S.sound)return;
  try{
    ac=ac||new(window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    const t=ac.currentTime+when,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d+.02);
  }catch(e){}
}
const ding=c=>{const f=523.25*Math.pow(1.0595,Math.min(c,12));beep(f,.12);beep(f*1.5,.18,'sine',.06,.09)};
const bop=()=>{beep(190,.2,'triangle',.09);beep(140,.26,'triangle',.07,.11)};
const fanfare=()=>[523,659,784,1047].forEach((f,i)=>beep(f,.2,'sine',.07,i*.09));
const buzz=p=>{if(!S.effects)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

/* ---------- hiệu ứng ---------- */
function burst(x,y,n,big){
  if(!S.effects||reduce)return;
  const cols=['#58cc02','#ffd23f','#49a8e8','#ff6b9d','#ff9f1c','#8b5cf6'];
  for(let i=0;i<n;i++){
    const s=document.createElement('span');
    s.className='tt-confetti';
    s.style.left=x+'px';s.style.top=y+'px';s.style.background=cols[i%cols.length];
    if(i%3===0)s.style.borderRadius='50%';
    document.body.appendChild(s);
    const a=Math.random()*Math.PI*2,v=(big?240:140)+Math.random()*(big?260:140);
    const dx=Math.cos(a)*v,dy=Math.sin(a)*v-(big?170:90);
    s.animate([
      {transform:'translate(0,0) rotate(0deg)',opacity:1},
      {transform:`translate(${dx}px,${dy+280}px) rotate(${Math.round(Math.random()*720-360)}deg)`,opacity:0}
    ],{duration:900+Math.random()*600,easing:'cubic-bezier(.15,.7,.3,1)'}).onfinish=()=>s.remove();
  }
}
function floatText(txt,x,y,cls){
  if(!S.effects)return;
  const e=document.createElement('div');
  e.className='tt-float '+(cls||'');e.textContent=txt;
  e.style.left=x+'px';e.style.top=y+'px';
  document.body.appendChild(e);
  e.animate(reduce?[{opacity:1},{opacity:0}]:[
    {transform:'translate(-50%,0) scale(.6)',opacity:0},
    {transform:'translate(-50%,-26px) scale(1.15)',opacity:1,offset:.25},
    {transform:'translate(-50%,-96px) scale(1)',opacity:0}
  ],{duration:reduce?350:1150,easing:'ease-out'}).onfinish=()=>e.remove();
}
function banner(txt,cls,ms){
  if(!S.effects)return;
  const e=document.createElement('div');
  e.className='tt-banner '+(cls||'');e.textContent=txt;
  document.body.appendChild(e);
  e.animate(reduce?[{opacity:1},{opacity:0}]:[
    {transform:'translate(-50%,20px) scale(.7)',opacity:0},
    {transform:'translate(-50%,0) scale(1.06)',opacity:1,offset:.18},
    {transform:'translate(-50%,0) scale(1)',opacity:1,offset:.75},
    {transform:'translate(-50%,-14px) scale(.96)',opacity:0}
  ],{duration:reduce?350:(ms||1500),easing:'ease-out'}).onfinish=()=>e.remove();
}
function vig(kind){
  if(!S.effects||reduce)return;
  const e=document.createElement('div');
  e.className='tt-vig '+kind;document.body.appendChild(e);
  e.animate([{opacity:0},{opacity:1,offset:.25},{opacity:0}],{duration:620,easing:'ease-out'}).onfinish=()=>e.remove();
}
function rewardFlight(x,y,count){
  if(!S.effects||reduce||document.hidden)return;
  const target=$('ttLv')||$('ttXp');if(!target)return;
  const r=target.getBoundingClientRect();if(!r.width)return;
  const dx=r.left+r.width/2-x,dy=r.top+r.height/2-y;
  const ring=document.createElement('i');ring.className='tt-reward-ring';ring.style.left=x+'px';ring.style.top=y+'px';document.body.appendChild(ring);
  ring.animate([{transform:'scale(.45)',opacity:.9},{transform:'scale(3.5)',opacity:0}],{duration:600,easing:'ease-out'}).onfinish=()=>ring.remove();
  for(let i=0;i<Math.min(5,count);i++){
    const star=document.createElement('span');star.className='tt-xp-star';star.textContent='✦';star.style.left=x+'px';star.style.top=y+'px';document.body.appendChild(star);
    star.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:`translate(${(i-2)*22}px,-44px) scale(1.25)`,opacity:1,offset:.22},{transform:`translate(${dx}px,${dy}px) scale(.3)`,opacity:0}],{duration:750+i*60,delay:i*45,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'}).onfinish=()=>{star.remove();bump(target)};
  }
}
function center(el){
  const r=el&&el.getBoundingClientRect?el.getBoundingClientRect():null;
  return r&&r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:innerWidth/2,y:innerHeight/2};
}

/* ---------- vẽ lại HUD ---------- */
function paintHud(){
  const L=lvInfo(S.xp);
  const hud=$('ttHud');
  if(hud){
    const b=hud.querySelector('.tt-lv b');if(b)b.textContent=L.l;
    const u=hud.querySelector('.tt-bar u');if(u)u.style.width=Math.round(L.cur/L.max*100)+'%';
    const c=$('ttCombo');
    if(c){
      const n=(sess&&mapRef===selectedAnswers)?sess.combo:0;
      c.hidden=n<2;c.querySelector('b').textContent='x'+n;
      c.dataset.t=n>=15?3:n>=10?2:n>=5?1:0;
    }
  }
}
function paintHome(){
  const L=lvInfo(S.xp),chip=$('ttXp');
  if(chip){
    chip.querySelector('b').textContent=L.l;
    chip.querySelector('.tt-xpn').textContent=S.xp.toLocaleString('vi-VN');
    chip.querySelector('.tt-bar u').style.width=Math.round(L.cur/L.max*100)+'%';
  }
  const sb=$('ttSound');
  if(sb){sb.setAttribute('aria-pressed',String(S.sound));const ic=sb.querySelector('.tt-ico');if(ic)ic.textContent=S.sound?'🔊':'🔇'}
}
function bump(el){if(!S.effects||!el)return;el.classList.remove('bump');void el.offsetWidth;el.classList.add('bump')}

/* ---------- dựng HUD + chip + nút (không đụng phần HTML cũ) ---------- */
(function build(){
  const right=document.querySelector('.study-header-right');
  if(right&&!$('ttHud')){
    right.insertAdjacentHTML('afterbegin',
      '<span class="tt-hud" id="ttHud"><span class="tt-chip tt-combo" id="ttCombo" hidden>🔥 <b>x0</b></span>'+
      '<span class="tt-chip tt-lv" id="ttLv">Lv <b>1</b><em class="tt-bar"><u></u></em></span></span>');
  }
  const goal=$('mmGoal');
  if(goal&&!$('ttXp')){
    goal.insertAdjacentHTML('afterend',
      '<span class="mm-chip tt-xp-chip" id="ttXp" title="Kinh nghiệm tích lũy khi ôn tập (không ảnh hưởng điểm thi)">⭐ Lv <b>1</b> · <span class="tt-xpn">0</span> XP<em class="tt-bar"><u></u></em></span>');
  }
  const theme=$('mmTheme');
  if(theme&&!$('ttSound')){
    theme.insertAdjacentHTML('beforebegin',
      '<button class="mm-btn tt-toggle tt-sound" id="ttSound" type="button" aria-pressed="false" aria-label="Sound: bật hoặc tắt âm thanh hiệu ứng" title="Bật/tắt âm thanh"><span class="tt-ico">🔇</span><span class="tt-lbl">Sound</span></button>');
    $('ttSound').onclick=()=>{S.sound=!S.sound;save();paintHome();if(S.sound)ding(3)};
  }
  const effectsButton=id=>'<button class="mm-btn tt-effects" id="'+id+'" data-effects-toggle type="button" aria-pressed="true"><span aria-hidden="true">✨</span><span class="tt-lbl">Hiệu ứng: Bật</span></button>';
  if(right&&!$('ttStudyEffects'))right.insertAdjacentHTML('beforeend',effectsButton('ttStudyEffects'));
  document.querySelectorAll('[data-effects-toggle]').forEach(btn=>btn.onclick=()=>{S.effects=!S.effects;save();applyEffects()});
  applyEffects();paintHome();paintHud();
})();

/* ---------- XP ---------- */
function addXP(n){
  const before=lvInfo(S.xp).l;
  S.xp+=n;
  const after=lvInfo(S.xp).l;
  ensureSess().xp+=n;
  save();paintHome();paintHud();
  return after>before?after:0;
}

/* ---------- xử lý sau mỗi lần chọn đáp án ---------- */
const findQ=id=>questionQueue.find(q=>String(q.id)===String(id));
let pre=null,pending=0;
quiz.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('button.option'):null;
  if(!b){pre=null;return}
  const q=findQ(b.dataset.questionId);
  if(!q){pre=null;return}
  pre={q,btn:b,had:selectedAnswers.has(q.id),idx:activeQuestionIndex};
  const snap=pre;pending++;
  setTimeout(()=>{try{afterAnswer(snap)}catch(err){console.warn('tt-skin',err)}finally{pending--;check()}},0);
},true);

function afterAnswer(p){
  if(selectedSubject==='example')return;
  if(!p||p.had||!selectedAnswers.has(p.q.id))return;
  const q=p.q,chosen=selectedAnswers.get(q.id),right=chosen===q.answerIndex;
  const s=ensureSess();
  const pos=center(p.btn);
  const card=p.btn.closest('.coverflow-card');

  s.answered++;
  const remaining=questionQueue.length-selectedAnswers.size;

  if(right){
    s.combo++;
    if(s.combo>s.best)s.best=s.combo;
    if(s.combo>S.best){if(S.best>0)s.newRecord=true;S.best=s.combo;save()}
    const x2=s.combo>=2&&Math.random()<.12;
    const milestone=s.combo>=5&&s.combo%5===0;
    let gain=10+Math.min(s.combo-1,10)*2;
    if(x2)gain*=2;
    if(milestone)gain+=20;
    const up=addXP(gain);

    if(S.effects){p.btn.classList.remove('tt-pop');void p.btn.offsetWidth;p.btn.classList.add('tt-pop');}
    burst(pos.x,pos.y,milestone?30:14,milestone);
    rewardFlight(pos.x,pos.y,milestone?5:3);
    floatText(x2?`✨ x2  +${gain} XP`:`+${gain} XP`,pos.x,pos.y-8,x2?'x2':'');
    bump($('ttCombo'));
    ding(s.combo);buzz(milestone?[20,30,20,30,60]:12);

    if(up){
      banner(`LEVEL UP! Lv ${up}`,'lvl',1900);vig('gold');
      burst(innerWidth/2,innerHeight*.35,44,true);fanfare();
    }else if(milestone){
      const t={5:'Combo x5! 🔥',10:'Combo x10! ⚡',15:'Combo x15! 💥',20:'Huyền thoại x20! 👑'}[s.combo]||`Combo x${s.combo}! 🚀`;
      banner(t,'',1500);vig('gold');
    }else if(s.combo===3){
      banner('Đang nóng! 🔥','',1100);
    }else if(s.answered%10===0&&remaining>0){
      banner(`Xong ${s.answered} câu · còn ${remaining} 🎯`,'info',1500);
    }
  }else{
    const lost=s.combo;
    s.combo=0;
    if(S.effects&&card){card.classList.remove('tt-shake');void card.offsetWidth;card.classList.add('tt-shake');setTimeout(()=>card.classList.remove('tt-shake'),520)}
    vig('red');bop();buzz([30,40,30]);
    if(lost>=3)banner(`Mất combo x${lost} 💔`,'lose',1300);
  }
  if(s.answered%5===0){
    addXP(10);
    floatText(`Mốc ${s.answered} câu · +10 XP`,innerWidth/2,Math.min(innerHeight-70,120),'x2');
    if(!right)ding(1);
  }
  paintHud();
}

/* ---------- phím tắt: 1-4 / A-D chọn đáp án, Enter/Space câu tiếp ---------- */
document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('is-studying'))return;
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const tag=e.target&&e.target.tagName;
  if(/INPUT|SELECT|TEXTAREA/.test(tag||''))return;
  const card=quiz.querySelector('.current-question-card');
  if(!card)return;
  const k=e.key.toLowerCase();
  const map={'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3};
  if(k in map){
    if(card.classList.contains('answered'))return;
    const opt=card.querySelectorAll('button.option')[map[k]];
    if(opt){e.preventDefault();opt.click()}
    return;
  }
  if(k==='enter'||k===' '){
    const onOption=e.target&&e.target.classList&&e.target.classList.contains('option');
    if(tag==='BUTTON'&&!onOption)return;
    if(!card.classList.contains('answered'))return;
    if(transitionLocked||!questionStage||activeQuestionIndex+1>=questionQueue.length)return;
    e.preventDefault();
    try{settleCoverflow(1,0)}catch(err){}
  }
});

/* ---------- tổng kết cuối lượt (chỉ chế độ ôn tập) + vẽ lại HUD khi DOM đổi ---------- */
let raf=0;
function check(){
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(()=>{
    try{
      paintHud();
      const rs=quiz.querySelector('.result-strip');
      /* chờ xử lý xong đáp án cuối rồi mới dựng tổng kết, tránh số liệu thiếu 1 câu */
      if(rs&&!rs.dataset.tt&&!pending&&mapRef===selectedAnswers&&sess&&sess.answered>0){
        rs.dataset.tt='1';
        const total=questionQueue.length;
        const right=questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length;
        const acc=total?Math.round(right/total*100):0;
        const box=document.createElement('div');box.className='tt-recap';
        box.innerHTML=
          `<span class="tt-chip">⭐ +${sess.xp} XP</span>`+
          `<span class="tt-chip">🔥 Combo cao nhất x${sess.best}</span>`+
          `<span class="tt-chip">🎯 Chính xác ${acc}%</span>`+
          (sess.newRecord?'<span class="tt-chip record">🏅 Kỷ lục combo mới!</span>':'');
        rs.appendChild(box);
        const r=rs.getBoundingClientRect();
        burst(r.left+r.width/2,Math.max(120,r.top),acc>=80?46:24,true);
        if(acc>=80)fanfare();
      }
    }catch(err){}
  });
}
new MutationObserver(check).observe(quiz,{childList:true,subtree:true});

window.addEventListener('storage',ev=>{if(ev.key===K){try{Object.assign(S,{effects:true},JSON.parse(ev.newValue||'{}'));S.effects=S.effects!==false;applyEffects();paintHome();paintHud()}catch(e){}}});
})();

;
/* Temporary UI exercise; its questions exist only in example_demo.json. */
(()=>{
  let lessons=null;
  const api=window.StudyActions,prior={};
  for(const name of ['ready','saved','summary','resume','review','exam'])prior[name]=api[name].bind(api);
  async function load(){
    if(!lessons){const bank=await StudyCatalog.get('example');lessons=[{id:1,title:'Example · chỉ thử giao diện',questions:bank.questions}];}
    return lessons;
  }
  api.ready=subject=>subject==='example'?load():prior.ready(subject);
  api.saved=subject=>subject==='example'?null:prior.saved(subject);
  api.summary=subject=>{
    if(subject!=='example')return prior.summary(subject);
    const live=selectedSubject==='example'&&questionQueue[0]?.id.startsWith('example-');
    const qs=live?questionQueue:[],done=qs.filter(q=>selectedAnswers.has(q.id)),correct=done.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length;
    return {subject,total:qs.length,done:done.length,correct,wrong:0,active:live?activeQuestionIndex:0,canResume:live&&!finished};
  };
  async function open(){
    api.checkpoint();activateSubject('example',await load());
    openQuizSetup('practice');
    document.getElementById('homeModalTitle').textContent='Example · thử giao diện';
    document.getElementById('homeModalKicker').textContent='BẢN DEMO · KHÔNG PHẢI MÔN THI';
    homeQuizSetup.querySelector('.setup').hidden=true;homeQuizSetup.querySelector('.mode-row').hidden=true;
    document.getElementById('qpResumeAttempt').hidden=true;
    beginQuizButton.querySelector('span').textContent='Thử giao diện với 60 câu mẫu';
  }
  api.resume=subject=>subject!=='example'?prior.resume(subject):(selectedSubject==='example'&&questionQueue[0]?.id.startsWith('example-')?(switchScreen(studyScreen,true),Promise.resolve(true)):open());
  api.review=subject=>subject==='example'?Promise.resolve():prior.review(subject);
  api.exam=subject=>subject==='example'?open():prior.exam(subject);
  const pointsFunction=pointsPerCorrectAnswer;
  pointsPerCorrectAnswer=function(){return selectedSubject==='example'&&questionQueue.length?10/questionQueue.length:pointsFunction();};
  document.querySelector('[data-home-action="example"]').addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();await open();},true);
})();
