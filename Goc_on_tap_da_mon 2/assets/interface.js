(()=>{
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canMove=()=>root.dataset.effects!=='off'&&!reduced.matches;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const storage={read(k,f=null){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
  let last=storage.read('goc_last_subject_v1','qp'),ready=false;
  const homeStatus=$('#catalogStatus'),resumeCopy=$('#currentStudy');
  function subject(){return StudyCatalog.has(last)?last:StudyCatalog.ids()[0];}
  function stats(id){return id?StudyActions.summary(id):{total:0,done:0,wrong:0,correct:0,canResume:false};}
  function updateDock(){
    const id=subject(),s=stats(id);
    $('[data-dock-action=resume]').disabled=!ready||!s.canResume;
    $('[data-dock-action=wrong]').disabled=!ready||!s.wrong||s.canReview===false;
    $('[data-dock-action=wrong] .study-dock-label').textContent='Ôn câu sai'+(s.wrong?' · '+s.wrong:'');
    $('[data-dock-action=exam]').disabled=!ready||!id||s.canExam===false;
    resumeCopy.textContent=s.total?`${SUBJECT_NAMES[id]} · Đã làm ${s.done}/${s.total} câu · ${s.wrong} câu cần ôn lại`:'';
    resumeCopy.hidden=!s.total;
  }
  function remember(id){last=id;storage.write('goc_last_subject_v1',id);updateDock();}
  document.addEventListener('click',e=>{const tile=e.target.closest('.home-tile[data-home-action]');if(tile&&!tile.hidden&&StudyCatalog.has(tile.dataset.homeAction))remember(tile.dataset.homeAction);},true);
  $$('.study-dock-item').forEach(b=>b.addEventListener('click',async()=>{
    const id=subject(),action=b.dataset.dockAction;
    if(action==='progress'){
      openHomePanel('progress');
      const rows=StudyCatalog.ids().map(key=>{const s=stats(key);return `${SUBJECT_NAMES[key]}: ${s.total?'đã làm '+s.done+'/'+s.total+' câu · đúng '+s.correct+' · sai '+s.wrong:'chưa có lượt đang ôn'}`;});
      $('#homeModalTitle').textContent='Tiến độ ôn tập';$('#homeModalText').textContent=rows.join('\n\n')||'Chưa có môn học để ôn.';$('#homeModalAction').dataset.modalAction='close';$('#homeModalAction').textContent='Đã hiểu';return;
    }
    if(!id||!StudyCatalog.has(id))return;
    try{
      const tile=$(`[data-home-action="${id}"]`);window.dispatchEvent(new CustomEvent('study:origin',{detail:{tile}}));
      if(action==='resume')await StudyActions.resume(id);
      if(action==='wrong')await StudyActions.review(id);
      if(action==='exam')await StudyActions.exam(id);
    }catch{StudyCatalog.disable(id);filterHomeTiles();updateDock();}
  }));
  StudyCatalog.ready.then(async()=>{
    await window.SubjectUIReady;
    await Promise.all(StudyCatalog.ids().map(async id=>{try{await StudyActions.ready(id);}catch{StudyCatalog.disable(id);}}));
    ready=true;root.dataset.catalogReady='true';
    homeStatus.hidden=!!StudyCatalog.ids().length;
    homeStatus.textContent=location.protocol==='file:'?'Mở web qua GitHub Pages hoặc dùng tệp Mở web trong thư mục đã tải.':'Chưa có môn học để ôn.';
    filterHomeTiles();updateDock();
  });
  // Hover springs run only while settling, using untransformed hit areas.
  function proximity(area,buttons,visuals,axis='x',dock=false,strength=.025,lift=6){
    const weights=buttons.map(()=>({x:0,v:0}));let point=null,cross=null,raf=0,lastTime=0,touch=null,touchTimer=0;
    function frame(t){
      raf=0;const dt=Math.min(.024,Math.max(.001,lastTime?(t-lastTime)/1000:.016));lastTime=t;let moving=false;
      const rects=buttons.map(b=>b.getBoundingClientRect());
      weights.forEach((s,i)=>{
        const r=rects[i],center=axis==='x'?r.left+r.width/2:r.top+r.height/2;
        const crossCenter=axis==='x'?r.top+r.height/2:r.left+r.width/2;
        const distance=point===null||buttons[i].hidden?Infinity:Math.hypot(point-center,(cross===null?0:cross-crossCenter)*1.5);
        const radius=dock?76:axis==='y'?52:90,target=canMove()?Math.exp(-.5*(distance/radius)**2):0;
        if(!canMove()){s.x=0;s.v=0;}else{s.v+=(320*(target-s.x)-32*s.v)*dt;s.x+=s.v*dt;}
        if(Math.abs(target-s.x)<.001&&Math.abs(s.v)<.01){s.x=target;s.v=0;}else moving=true;
      });
      const gap=dock&&rects.length>1?rects[1].left-rects[0].right:0;
      let gain=dock?.38:strength;
      if(dock){const base=rects.reduce((sum,r)=>sum+r.width,0)+gap*(rects.length-1),extra=weights.reduce((sum,s,i)=>sum+rects[i].width*gain*Math.max(0,s.x),0);gain*=Math.min(1,Math.max(0,area.clientWidth-base-12)/Math.max(1,extra));}
      const sizes=rects.map((r,i)=>r.width*(1+(dock?gain:0)*Math.max(0,weights[i].x)));
      let cursor=dock?-(sizes.reduce((a,b)=>a+b,0)+gap*(rects.length-1))/2:0;
      const outer=area.getBoundingClientRect();
      weights.forEach((s,i)=>{
        const p=Math.max(0,s.x),shift=dock?cursor+sizes[i]/2-(rects[i].left+rects[i].width/2-outer.left-outer.width/2):0;
        visuals[i].style.transform=axis==='y'?`translateX(${8*p}px) scale(${1+.2*p})`:`translate(${shift}px,${-(dock?19:lift)*p}px) scale(${1+gain*p})`;
        if(dock){const tip=buttons[i].querySelector('.study-dock-tip');tip.style.opacity=point!==null&&Math.abs(point-rects[i].left-rects[i].width/2)<30?'1':'0';tip.style.transform=`translate(calc(-50% + ${shift}px),${-19*p}px)`;cursor+=sizes[i]+gap;}
      });
      if(moving)raf=requestAnimationFrame(frame);else{lastTime=0;visuals.forEach(v=>v.style.willChange='auto');}
    }
    function wake(){visuals.forEach(v=>v.style.willChange='transform');if(!raf)raf=requestAnimationFrame(frame);}
    function clearTouch(){clearTimeout(touchTimer);touchTimer=0;touch=null;point=null;cross=null;visuals.forEach(v=>v.classList.remove('touch-lit'));wake();}
    area.addEventListener('pointerdown',e=>{
      if(!['touch','pen'].includes(e.pointerType)||e.isPrimary===false)return;
      const index=buttons.findIndex(b=>b.contains(e.target));if(index<0||buttons[index].hidden||buttons[index].disabled)return;
      clearTimeout(touchTimer);visuals.forEach(v=>v.classList.remove('touch-lit'));
      touch={id:e.pointerId,x:e.clientX,y:e.clientY};
      const r=buttons[index].getBoundingClientRect();point=axis==='x'?r.left+r.width/2:r.top+r.height/2;cross=axis==='x'?r.top+r.height/2:r.left+r.width/2;
      visuals[index].classList.add('touch-lit');wake();
    },{passive:true});
    area.addEventListener('pointermove',e=>{
      if(touch?.id===e.pointerId){if(Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>12)clearTouch();return;}
      if(e.pointerType==='touch'||e.pointerType==='pen')return;
      point=axis==='x'?e.clientX:e.clientY;cross=axis==='x'?e.clientY:e.clientX;wake();
    },{passive:true});
    area.addEventListener('pointerleave',()=>{if(touch)return;point=null;cross=null;wake();});
    window.addEventListener('pointerup',e=>{if(touch?.id===e.pointerId)touchTimer=setTimeout(clearTouch,180);},{passive:true});
    window.addEventListener('pointercancel',e=>{if(touch?.id===e.pointerId)clearTouch();},{passive:true});
    window.addEventListener('blur',()=>{if(touch)clearTouch();});
    buttons.forEach((b,i)=>{b.addEventListener('focus',()=>{if(!b.matches(':focus-visible'))return;const r=b.getBoundingClientRect();point=axis==='x'?r.left+r.width/2:r.top+r.height/2;cross=axis==='x'?r.top+r.height/2:r.left+r.width/2;wake();});b.addEventListener('blur',()=>{point=null;cross=null;wake();});});
    new MutationObserver(wake).observe(root,{attributes:true,attributeFilter:['data-effects']});reduced.addEventListener('change',wake);
    window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearTimeout(touchTimer);});
  }
  const dockButtons=$$('.study-dock-item');proximity($('.study-dock-stage'),dockButtons,dockButtons.map(b=>b.querySelector('.study-dock-icon')),'x',true);
  StudyCatalog.ready.then(()=>window.SubjectUIReady).then(()=>{
  const tileButtons=$$('.home-tile'),tileSlots=[];
  tileButtons.forEach(b=>{const slot=document.createElement('div');slot.className='course-slot';b.before(slot);slot.append(b);tileSlots.push(slot);});
  // Cards themselves retain stable geometry; their wrappers are the hit areas.
  proximity($('#homeTiles'),tileSlots,tileButtons);
  });
  const chipCards=$$('#mmStreak,#mmGoal,#ttXp'),chipSlots=chipCards.map(chip=>{const slot=document.createElement('span');slot.className='stat-hover-slot';chip.before(slot);slot.append(chip);return slot;});
  proximity($('#mmTools'),chipSlots,chipCards,'x',false,.065,9);
  const rail=document.createElement('nav');rail.className='question-rail';rail.id='questionRail';rail.setAttribute('aria-label','Chọn nhanh câu hỏi');
  const railHeader=document.createElement('div');railHeader.className='question-nav-header';rail.append(railHeader);
  const heading=document.createElement('button');heading.type='button';heading.className='question-rail-title';railHeader.append(heading);
  const closeNavButton=document.createElement('button');closeNavButton.type='button';closeNavButton.className='question-nav-close';closeNavButton.textContent='×';closeNavButton.setAttribute('aria-label','Đóng danh sách câu hỏi');railHeader.append(closeNavButton);
  const scroller=document.createElement('div');scroller.className='question-rail-scroll';rail.append(scroller);
  const list=document.createElement('div');list.className='question-rail-list';scroller.append(list);
  const legend=document.createElement('div');legend.className='question-nav-legend';
  for(const [state,text]of [['','Chưa làm'],['right','Đúng'],['wrong','Sai']]){const item=document.createElement('span');item.dataset.result=state;item.textContent=text;legend.append(item);}rail.append(legend);
  const navBackdrop=document.createElement('div');navBackdrop.className='question-nav-backdrop';navBackdrop.hidden=true;document.body.append(navBackdrop);
  let railButtons=[],railQueue=null,lastActive=-1,railRaf=0,railTime=0,railPoint=null,railCross=null,railTouch=null,railTouchTimer=0,priorVisible=new Set();
  let navAnimation=null,navToken=0;
  const mobileRail=matchMedia('(max-width:959px)');
  document.body.append(rail);
  function visibleRail(){const columns=mobileRail.matches?(parseInt(getComputedStyle(list).getPropertyValue('--question-nav-columns'))||5):1,stride=mobileRail.matches?58:50,first=Math.max(0,Math.floor(scroller.scrollTop/stride)-1)*columns,count=(Math.ceil(scroller.clientHeight/stride)+3)*columns;return railButtons.slice(first,first+count);}
  const railWeights=new WeakMap();
  function railFrame(t){
    railRaf=0;const dt=Math.min(.024,Math.max(.001,railTime?(t-railTime)/1000:.016));railTime=t;let moving=false;
    const visible=visibleRail(),current=new Set(visible);
    priorVisible.forEach(b=>{if(!current.has(b)){b.firstElementChild.style.transform='';railWeights.delete(b);}});priorVisible=current;
    visible.forEach(b=>{
      const r=b.getBoundingClientRect(),active=b.getAttribute('aria-current')==='step';
      const distance=mobileRail.matches?Math.hypot((railCross??r.left+r.width/2)-r.left-r.width/2,(railPoint??r.top+r.height/2)-r.top-r.height/2):Math.abs((railPoint??r.top+r.height/2)-r.top-r.height/2);
      const hover=canMove()&&railPoint!==null?Math.exp(-.5*(distance/52)**2):0,target=Math.max(active?1:0,hover);
      let s=railWeights.get(b);if(!s){s={x:active?1:0,v:0};railWeights.set(b,s);}
      if(!canMove()){s.x=target;s.v=0;}else{s.v+=(320*(target-s.x)-32*s.v)*dt;s.x+=s.v*dt;}
      if(Math.abs(target-s.x)<.001&&Math.abs(s.v)<.01){s.x=target;s.v=0;}else moving=true;
      b.firstElementChild.style.transform=mobileRail.matches?`translateY(${-2*s.x}px) scale(${1+.15*s.x})`:`translateX(${7*s.x}px) scale(${1+.2*s.x})`;
      b.firstElementChild.style.willChange=moving?'transform':'auto';
    });
    if(moving)railRaf=requestAnimationFrame(railFrame);else railTime=0;
  }
  function wakeRail(){if(!railRaf)railRaf=requestAnimationFrame(railFrame);}
  scroller.addEventListener('pointermove',e=>{if(railTouch?.id===e.pointerId){if(Math.hypot(e.clientX-railTouch.x,e.clientY-railTouch.y)>10){railTouch=null;railPoint=null;railCross=null;wakeRail();}return;}if(e.pointerType==='touch')return;railPoint=e.clientY;railCross=e.clientX;wakeRail();},{passive:true});
  scroller.addEventListener('pointerleave',()=>{if(railTouch)return;railPoint=null;railCross=null;wakeRail();});
  scroller.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!e.target.closest('.question-rail-button'))return;clearTimeout(railTouchTimer);railTouch={id:e.pointerId,x:e.clientX,y:e.clientY};railPoint=e.clientY;railCross=e.clientX;wakeRail();},{passive:true});
  function releaseRailTouch(e){if(railTouch?.id!==e.pointerId)return;railTouchTimer=setTimeout(()=>{railTouch=null;railPoint=null;railCross=null;wakeRail();},140);}
  window.addEventListener('pointerup',releaseRailTouch,{passive:true});window.addEventListener('pointercancel',releaseRailTouch,{passive:true});
  scroller.addEventListener('scroll',()=>{if(railTouch){railTouch=null;railPoint=null;railCross=null;}wakeRail();},{passive:true});
  scroller.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
  scroller.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
  scroller.addEventListener('click',e=>{const b=e.target.closest('.question-rail-button');if(!b||transitionLocked)return;const index=Number(b.dataset.index);if(index!==activeQuestionIndex){++transitionToken;touchStart=null;clearTimeout(wheelTimer);wheelAccum=0;activeQuestionIndex=index;render();}if(mobileRail.matches)closeNavigator();});
  function centerActive(){const b=railButtons[activeQuestionIndex];if(b)scroller.scrollTo({top:Math.max(0,b.offsetTop-scroller.clientHeight/2+b.offsetHeight/2),behavior:canMove()?'smooth':'auto'});}
  heading.onclick=centerActive;
  function navExpanded(){return document.body.classList.contains('question-nav-open');}
  function navA11y(open){const trigger=$('.question-nav-trigger');if(trigger)trigger.setAttribute('aria-expanded',String(open));if(open){rail.setAttribute('role','dialog');rail.setAttribute('aria-modal','true');rail.setAttribute('aria-label','Danh sách câu hỏi');}else{rail.removeAttribute('role');rail.removeAttribute('aria-modal');rail.setAttribute('aria-label','Chọn nhanh câu hỏi');}}
  function openNavigator(){
    if(!mobileRail.matches){centerActive();return;}
    ++navToken;navAnimation?.cancel();document.body.classList.add('question-nav-open');navBackdrop.hidden=false;studyScreen.inert=true;navA11y(true);
    paintRail();centerActive();(railButtons[activeQuestionIndex]||closeNavButton).focus({preventScroll:true});
    if(canMove())navAnimation=rail.animate([{transform:'translateY(24px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:260,easing:'cubic-bezier(.32,.72,0,1)'});
  }
  function closeNavigator(immediate=false,restoreFocus=true){
    if(!navExpanded())return;const token=++navToken;navAnimation?.cancel();
    const finish=()=>{if(token!==navToken)return;document.body.classList.remove('question-nav-open');navBackdrop.hidden=true;navA11y(false);studyScreen.inert=activeScreen!==studyScreen||!homeModal.hidden;railPoint=null;railCross=null;railTouch=null;wakeRail();if(restoreFocus&&activeScreen===studyScreen&&homeModal.hidden)$('.question-nav-trigger')?.focus({preventScroll:true});};
    if(!immediate&&canMove()&&mobileRail.matches){navAnimation=rail.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(20px)',opacity:0}],{duration:160,easing:'cubic-bezier(.32,.72,0,1)'});navAnimation.finished.catch(()=>{}).then(finish);}else finish();
  }
  closeNavButton.onclick=()=>closeNavigator();navBackdrop.onclick=()=>closeNavigator();
  rail.addEventListener('keydown',e=>{
    if(!navExpanded())return;e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();closeNavigator();return;}
    const columns=parseInt(getComputedStyle(list).getPropertyValue('--question-nav-columns'))||5,b=e.target.closest('.question-rail-button');
    const delta={ArrowDown:columns,ArrowUp:-columns,ArrowLeft:-1,ArrowRight:1}[e.key];
    if(b&&delta){e.preventDefault();const next=railButtons[Math.max(0,Math.min(railButtons.length-1,Number(b.dataset.index)+delta))];next?.focus({preventScroll:true});next?.scrollIntoView({block:'nearest'});}
    if(e.key==='Tab'){const nodes=[heading,closeNavButton,...railButtons],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  });
  function paintQuestionTrigger(){
    const line=$('#stickyDashboard .progress-copy>div');if(!line||!questionQueue.length)return;
    const trigger=document.createElement('button');trigger.type='button';trigger.className='question-nav-trigger';trigger.setAttribute('aria-controls','questionRail');trigger.setAttribute('aria-expanded',String(navExpanded()));trigger.setAttribute('aria-label',`Mở danh sách câu hỏi, đang ở câu ${activeQuestionIndex+1} trên ${questionQueue.length}`);trigger.textContent=`☷ Câu ${activeQuestionIndex+1}/${questionQueue.length}`;trigger.onclick=openNavigator;
    const done=document.createElement('span');done.textContent=`Đã làm ${selectedAnswers.size}/${questionQueue.length}`;line.classList.add('question-progress-row');line.replaceChildren(trigger,done);
  }
  function paintRail(){
    const count=innerHeight<600?5:innerHeight<760?7:9,total=questionQueue.length;
    scroller.style.height=(Math.min(count,total)*50+16)+'px';
    heading.textContent=total?`${activeQuestionIndex+1} / ${total}`:'Câu hỏi';
    heading.setAttribute('aria-label','Về vị trí câu đang làm: '+(activeQuestionIndex+1));
    if(railQueue!==questionQueue){
      railQueue=questionQueue;lastActive=-1;railButtons=questionQueue.map((q,index)=>{const b=document.createElement('button');b.type='button';b.className='question-rail-button';b.dataset.index=index;const n=document.createElement('span');n.className='question-rail-number';n.textContent=index+1;b.append(n);return b;});list.replaceChildren(...railButtons);priorVisible.clear();
    }
    railButtons.forEach((b,i)=>{
      const index=i,q=questionQueue[index];
      const result=selectedAnswers.has(q.id)?selectedAnswers.get(q.id)===q.answerIndex?'right':'wrong':'';
      b.dataset.result=result;b.setAttribute('aria-current',index===activeQuestionIndex?'step':'false');
      b.setAttribute('aria-label',`Đến câu ${index+1} · ${result==='right'?'Đúng':result==='wrong'?'Sai':'Chưa làm'}`);
    });
    if(lastActive!==activeQuestionIndex){lastActive=activeQuestionIndex;centerActive();}
    wakeRail();
  }
  const dashboard=updateDashboard;
  updateDashboard=function(...args){if(selectedSubject==='example'&&questionQueue.length)points=questionQueue.filter(q=>selectedAnswers.get(q.id)===q.answerIndex).length*10/questionQueue.length;const result=dashboard(...args);const bar=$('#stickyDashboard .progress span');if(bar)bar.style.setProperty('--ios-progress',String(questionQueue.length?selectedAnswers.size/questionQueue.length:0));paintRail();paintQuestionTrigger();updateDock();return result;};
  const xpBars=$$('.tt-bar u');
  function paintXpBars(){xpBars.forEach(bar=>{const value=String(Math.max(0,Math.min(1,parseFloat(bar.style.width||'0')/100)));if(bar.style.getPropertyValue('--ios-progress')!==value)bar.style.setProperty('--ios-progress',value);});}
  const xpObserver=new MutationObserver(paintXpBars);xpBars.forEach(bar=>xpObserver.observe(bar,{attributes:true,attributeFilter:['style']}));paintXpBars();
  window.addEventListener('resize',()=>{if(!mobileRail.matches)closeNavigator(true,false);paintRail();},{passive:true});
  new MutationObserver(()=>{if(!document.body.classList.contains('is-studying'))closeNavigator(true,false);}).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(wakeRail).observe(root,{attributes:true,attributeFilter:['data-effects']});reduced.addEventListener('change',wakeRail);window.addEventListener('pagehide',()=>{cancelAnimationFrame(railRaf);clearTimeout(railTouchTimer);navAnimation?.cancel();});
  updateDock();
})();
