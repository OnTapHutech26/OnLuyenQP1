
/* App motion. Business handlers, answers and banks remain owned by the original app. */
(()=>{
  'use strict';
  const root=document.documentElement,body=document.body;
  const deck=document.getElementById('screenDeck'),home=document.getElementById('homeScreen');
  const study=document.getElementById('studyScreen'),modal=document.getElementById('homeModal');
  const sheet=modal?.querySelector('.home-modal-card');
  if(!deck||!home||!study||!sheet||root.dataset.iosMotion)return;
  root.dataset.iosMotion='complete';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>root.dataset.effects!=='off'&&!reduced.matches;
  const ease=name=>getComputedStyle(root).getPropertyValue('--ease-'+name).trim();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const moving=new Map();
  function animate(el,frames,duration=450,curve='ios'){
    if(!motion()||!el.animate)return Promise.resolve();
    el.classList.add('ios-moving');
    const a=el.animate(frames,{duration,easing:ease(curve),fill:'both'});
    let set=moving.get(el);if(!set)moving.set(el,set=new Set());set.add(a);
    return a.finished.catch(()=>{}).finally(()=>{
      a.cancel();set.delete(a);if(!set.size){moving.delete(el);el.classList.remove('ios-moving');}
    });
  }
  function cancelAnimations(el){
    if(el){for(const a of moving.get(el)||[])a.cancel();return;}
    for(const set of moving.values())for(const a of set)a.cancel();
  }
  function viewport(){
    const vv=window.visualViewport,h=vv&&Math.abs(vv.scale-1)<.01?vv.height:innerHeight;
    root.style.setProperty('--ios-vh',`${Math.round(h)}px`);
    requestAnimationFrame(()=>{if(body.classList.contains('is-studying'))layoutCoverflowStage();});
  }
  viewport();window.addEventListener('resize',viewport,{passive:true});
  window.visualViewport?.addEventListener('resize',viewport,{passive:true});
  body.append(modal);
  sheet.querySelectorAll('img').forEach(img=>img.draggable=false);
  const handle=document.createElement('button');handle.type='button';
  handle.className='ios-sheet-handle';handle.setAttribute('aria-label','Đóng bảng chọn hoặc kéo xuống');sheet.prepend(handle);
  const tint=document.createElement('div');tint.className='ios-app-tint';tint.setAttribute('aria-hidden','true');
  let sheetOpen=false,closing=false,closeToken=0,savedScroll=0,returnFocus=null;
  let navToken=0,viewTransition=null,navCleanup=null,edgeSnapshot=null;
  let edge=null,sheetDrag=null,gestureFrame=0,clickBlockedUntil=0;
  let appTile=null,appScroll=0,appRect=null,appOpening=false;
  const baseClose=closeHomePanel,baseSwitch=switchScreen;
  function lock(){root.classList.toggle('ios-scroll-locked',sheetOpen||body.classList.contains('is-studying'));}
  function cleanSheetTransform(){
    for(const el of [sheet,deck,modal,tint])el.style.removeProperty('transform');
    sheet.style.removeProperty('opacity');tint.style.removeProperty('opacity');
    modal.style.removeProperty('--ios-sheet-dim');modal.classList.remove('ios-sheet-dragging','ios-sheet-closing','ios-app-morph');
  }
  function sourceBox(){
    const r=appTile?.getBoundingClientRect();
    if(r&&r.width&&r.height&&r.bottom>0&&r.top<innerHeight){
      // The home deck retreats while an app is open. Land on the tile's final,
      // unscaled rectangle, including after a viewport resize.
      if(body.classList.contains('ios-sheet-open')){
        const style=getComputedStyle(deck),m=new DOMMatrix(style.transform==='none'?undefined:style.transform);
        const origin=style.transformOrigin.split(' ').map(parseFloat),d=deck.getBoundingClientRect();
        if(m.a>0&&m.d>0)return {left:d.left-origin[0]*(1-m.a)-m.e+(r.left-d.left)/m.a,top:d.top-origin[1]*(1-m.d)-m.f+(r.top-d.top)/m.d,width:r.width/m.a,height:r.height/m.d};
      }
      return r;
    }
    return appRect||{left:innerWidth*.35,top:innerHeight*.4,width:innerWidth*.3,height:innerHeight*.2};
  }
  function clipBox(r,radius=28){
    const h=window.visualViewport?.height||innerHeight;
    return `inset(${clamp(r.top,0,h)}px ${clamp(innerWidth-r.left-r.width,0,innerWidth)}px ${clamp(h-r.top-r.height,0,h)}px ${clamp(r.left,0,innerWidth)}px round ${radius}px)`;
  }
  function prepareApp(tile){
    if(tile){appTile=tile;appRect=tile.getBoundingClientRect();appScroll=scrollY;returnFocus=tile;}
    if(!appTile)appTile=document.querySelector(`[data-home-action="${selectedSubject}"]`);
    const color=appTile?getComputedStyle(appTile):null;
    tint.style.background=color?.backgroundImage&&color.backgroundImage!=='none'?color.backgroundImage:'var(--grad)';
    modal.classList.add('ios-subject-panel');
  }
  window.addEventListener('study:origin',e=>prepareApp(e.detail.tile));
  document.addEventListener('click',e=>{
    const tile=e.target.closest('.home-tile[data-home-action]');
    if(tile&&StudyCatalog.has(tile.dataset.homeAction))prepareApp(tile);
  },true);
  function syncSheet(){
    const open=!modal.hidden;
    if(open===sheetOpen){lock();return;}
    sheetOpen=open;deck.inert=open;
    if(open){
      closing=false;++closeToken;cancelAnimations(sheet);cancelAnimations(deck);cancelAnimations(modal);cancelAnimations(tint);cleanSheetTransform();
      savedScroll=scrollY;root.style.setProperty('--ios-scroll-top',`${-savedScroll}px`);
      body.classList.add('ios-sheet-open');sheet.scrollTop=0;
      morphWindow(sheet,appTile?.getBoundingClientRect()||sheet.getBoundingClientRect(),460);
      animate(deck,[{transform:'scale(1)'},{transform:'scale(.97)'}],320);
    }else{
      closing=false;appOpening=false;++closeToken;
      for(const el of [sheet,deck,modal,tint])cancelAnimations(el);cleanSheetTransform();
      modal.classList.remove('ios-subject-panel');body.classList.remove('ios-sheet-open');root.style.removeProperty('--ios-scroll-top');
      if(!body.classList.contains('is-studying'))window.scrollTo(0,savedScroll);
      if(returnFocus?.isConnected&&!body.classList.contains('is-studying'))returnFocus.focus({preventScroll:true});
    }
    lock();
  }
  function closeImmediately(){++closeToken;for(const el of [sheet,deck,modal,tint])cancelAnimations(el);baseClose();syncSheet();}
  function cancelCloseForNavigation(){
    ++closeToken;closing=false;appOpening=false;
    for(const el of [sheet,deck,modal,tint])cancelAnimations(el);cleanSheetTransform();
  }
  closeHomePanel=function(){
    if(modal.hidden){baseClose();syncSheet();return;}
    if(closing)return;
    if(!motion()){closeImmediately();return;}
    closing=true;const token=++closeToken;
    const from=getComputedStyle(sheet).transform,back=getComputedStyle(deck).transform;
    const sheetOpacity=getComputedStyle(sheet).opacity;
    for(const el of [sheet,deck,modal,tint])cancelAnimations(el);
    modal.classList.add('ios-sheet-closing');
    const animations=[morphWindow(sheet,appTile?.getBoundingClientRect()||sheet.getBoundingClientRect(),300,true)];
    animations.push(animate(deck,[{transform:back},{transform:'scale(1)'}],210));
    Promise.all(animations).then(()=>{if(token===closeToken)closeImmediately();});
  };
  const openSetup=openQuizSetup,openPanel=openHomePanel;
  function prepareOpen(){if(closing)closeImmediately();if(modal.hidden)returnFocus=document.activeElement;}
  openQuizSetup=function(...args){prepareOpen();prepareApp();const r=openSetup.apply(this,args);syncSheet();return r;};
  openHomePanel=function(...args){prepareOpen();modal.classList.remove('ios-subject-panel');const r=openPanel.apply(this,args);syncSheet();return r;};
  new MutationObserver(syncSheet).observe(modal,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(lock).observe(body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    if(performance.now()<clickBlockedUntil){e.preventDefault();e.stopImmediatePropagation();return;}
    if(modal.hidden){returnFocus=e.target.closest('button,a,input,select')||document.activeElement;return;}
    if(e.target===modal||e.target.closest('#closeHomeModal,.ios-sheet-handle')){
      e.preventDefault();e.stopImmediatePropagation();closeHomePanel();
    }
  },true);
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeHomePanel();return;}
    if(e.key!=='Tab')return;
    const nodes=[...sheet.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
    if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];
    if(e.shiftKey&&(document.activeElement===first||!sheet.contains(document.activeElement))){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!sheet.contains(document.activeElement))){e.preventDefault();first.focus();}
  },true);
  const classes=['enter-forward','enter-back','leave-forward','leave-back'];
  function cleanNavigation(){
    body.classList.remove('ios-navigating');root.classList.remove('ios-vt');
    document.querySelectorAll('.ios-app-flight').forEach(el=>el.remove());
    for(const el of [home,study]){el.style.removeProperty('opacity');el.classList.remove(...classes,'ios-moving');el.hidden=el!==activeScreen;el.inert=el!==activeScreen;}
    deck.inert=!modal.hidden;lock();navCleanup=null;
  }
  function cancelNavigation(){
    if(viewTransition){viewTransition.skipTransition();viewTransition=null;}
    cancelAnimations(home);cancelAnimations(study);navCleanup?.();
  }
  // Only older browsers need a brief frozen visual layer; no duplicate IDs/listeners.
  function freezeStudy(){
    const flight=document.createElement('div');flight.className='ios-app-flight';flight.inert=true;flight.setAttribute('aria-hidden','true');
    const copy=study.cloneNode(true),original=[study,...study.querySelectorAll('*')],clones=[copy,...copy.querySelectorAll('*')];
    const props=['display','position','inset','top','left','right','bottom','width','height','min-height','max-height','box-sizing','padding','margin','border','border-radius','background','color','font','line-height','letter-spacing','text-align','white-space','overflow','flex','flex-direction','flex-wrap','gap','align-items','justify-content','grid-template-columns','transform','transform-origin','opacity','z-index','box-shadow'];
    original.forEach((el,i)=>{const s=getComputedStyle(el),c=clones[i];for(const p of props)c.style.setProperty(p,s.getPropertyValue(p));c.removeAttribute('id');c.removeAttribute('autofocus');});
    const r=study.getBoundingClientRect();copy.style.position='absolute';copy.style.inset='auto';copy.style.left=r.left+'px';copy.style.top=r.top+'px';copy.style.width=r.width+'px';copy.style.height=r.height+'px';copy.style.transform='none';
    flight.append(copy);body.append(flight);return flight;
  }
  function morphWindow(el,origin,duration=480,closing=false){
    const r=el.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);
    const scale=Math.max(origin.width/w,origin.height/h,.001);
    const x=Math.max(0,(w-origin.width/scale)/2),y=Math.max(0,(h-origin.height/scale)/2);
    const dx=origin.left+origin.width/2-r.left-w/2,dy=origin.top+origin.height/2-r.top-h/2;
    const small={transform:`translate(${dx}px,${dy}px) scale(${scale})`,clipPath:`inset(${y}px ${x}px round ${Math.min(22,origin.width/4)/scale}px)`,opacity:1};
    const full={transform:'translate(0px,0px) scale(1)',clipPath:'inset(0px round 27px)',opacity:1};
    el.style.transformOrigin='center center';
    return animate(el,closing?[full,{...small,opacity:.05}]:[small,full],duration);
  }
  switchScreen=function(target,forward){
    if(!target||target===activeScreen)return;
    const id=++navToken;cancelNavigation();
    const old=activeScreen,openingRect=!modal.hidden?sheet.getBoundingClientRect():sourceBox();
    if(!modal.hidden)cancelCloseForNavigation();
    if(!appTile)prepareApp();
    const flight=motion()&&target===home?freezeStudy():null;
    if(!modal.hidden)closeImmediately();
    baseSwitch(target,forward);++screenTransitionToken;
    old.classList.remove(...classes);target.classList.remove(...classes);
    old.hidden=true;old.inert=true;target.hidden=false;target.inert=false;
    body.classList.add('ios-navigating');navCleanup=cleanNavigation;
    if(target===home)window.scrollTo(0,appScroll);
    lock();if(target===study)layoutCoverflowStage();
    if(!motion()){flight?.remove();cleanNavigation();return;}
    if(flight){
      const destination=sourceBox();
      animate(home,[{transform:'scale(.97)',opacity:.6},{transform:'scale(1)',opacity:1}],340);
      morphWindow(flight,destination,340,true).then(()=>{flight.remove();if(id===navToken)cleanNavigation();});
    }else{
      const layer=freezeStudy();study.style.opacity='0';
      morphWindow(layer,openingRect,500).then(()=>{study.style.removeProperty('opacity');layer.remove();if(id===navToken)cleanNavigation();});
    }
  };

  // Chỉ mép trái nhận back; vuốt dọc ở phần câu hỏi vẫn do code cũ xử lý.
  function releaseCapture(el,id){try{if(el.hasPointerCapture(id))el.releasePointerCapture(id);}catch{}}
  function resetEdge(){
    if(!edge)return;
    const id=edge.id;edge=null;releaseCapture(study,id);
    study.classList.remove('ios-edge-dragging','ios-moving');study.style.removeProperty('transform');
    home.classList.remove('ios-back-preview');home.style.removeProperty('transform');home.style.removeProperty('opacity');
    if(activeScreen!==home)home.hidden=true;
  }
  function paintGesture(){
    gestureFrame=0;
    if(!motion())return;
    if(edge?.axis==='x'){
      const p=clamp(edge.x/edge.width,0,1);
      study.style.transform=`translateX(${edge.x*.12}px) scale(${1-.05*p})`;
      home.style.transform=`scale(${.985+.015*p})`;home.style.opacity=String(.75+.25*p);
    }
    if(sheetDrag){
      const dy=sheetDrag.dy;
      const y=dy>=0?dy*.9:dy*.5/(1+Math.abs(dy)/150);
      sheet.style.transform=`translateY(${y}px)`;
      const exposure=clamp(1-Math.max(0,y)/Math.max(1,sheet.clientHeight),0,1);
      deck.style.transform=`scale(${1-.06*exposure})`;
      modal.style.setProperty('--ios-sheet-dim',String(exposure));
    }
  }
  function queueGesture(){if(!gestureFrame)gestureFrame=requestAnimationFrame(paintGesture);}
  document.addEventListener('pointerdown',e=>{
    if(!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
    if(!modal.hidden){
      if(modal.classList.contains('ios-subject-panel'))return;
      const box=sheet.getBoundingClientRect(),handleHit=!!e.target.closest('.ios-sheet-handle');
      const headerHit=sheet.contains(e.target)&&e.clientY<box.top+130&&!e.target.closest('button,input,select,a,textarea')&&sheet.scrollTop<=0;
      if(closing||!handleHit&&!headerHit)return;
      cancelAnimations(sheet);cancelAnimations(deck);cleanSheetTransform();
      sheetDrag={id:e.pointerId,y:e.clientY,dy:0,lastY:e.clientY,time:performance.now(),velocity:0};
      modal.classList.add('ios-sheet-dragging');sheet.setPointerCapture(e.pointerId);e.stopImmediatePropagation();return;
    }
    if(activeScreen!==study||study.hidden||transitionLocked||edge||e.clientX>24)return;
    cancelSpring();
    ++navToken;cancelNavigation();
    edge={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:0,width:Math.max(1,deck.clientWidth),axis:'pending',samples:[[e.clientX,performance.now()]]};
    study.setPointerCapture(e.pointerId);e.stopImmediatePropagation();
  },true);
  document.addEventListener('pointermove',e=>{
    if(sheetDrag?.id===e.pointerId){
      const t=performance.now(),dt=t-sheetDrag.time;
      sheetDrag.velocity=(e.clientY-sheetDrag.lastY)/Math.max(1,dt);sheetDrag.time=t;sheetDrag.lastY=e.clientY;
      sheetDrag.dy=e.clientY-sheetDrag.y;queueGesture();e.preventDefault();e.stopImmediatePropagation();return;
    }
    if(!edge||edge.id!==e.pointerId)return;
    const dx=e.clientX-edge.startX,dy=e.clientY-edge.startY,t=performance.now();
    if(edge.axis==='pending'){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)||dx< -8){resetEdge();return;}
      if(dx<8||dx<Math.abs(dy)*1.2)return;
      edge.axis='x';home.hidden=false;home.inert=true;home.classList.add('ios-back-preview');
      study.classList.add('ios-edge-dragging','ios-moving');
    }
    edge.x=clamp(dx,0,edge.width);edge.samples.push([e.clientX,t]);edge.samples=edge.samples.filter(s=>t-s[1]<120);
    queueGesture();e.preventDefault();e.stopImmediatePropagation();
  },{capture:true,passive:false});
  function endGesture(e,cancelled=false){
    if(sheetDrag?.id===e.pointerId){
      const g=sheetDrag;sheetDrag=null;releaseCapture(sheet,e.pointerId);modal.classList.remove('ios-sheet-dragging');
      if(Math.abs(g.dy)>8)clickBlockedUntil=performance.now()+350;
      const fast=performance.now()-g.time<100&&g.velocity>.65;
      if(!cancelled&&(g.dy>Math.min(160,sheet.clientHeight*.3)||g.dy>45&&fast))closeHomePanel();
      else{
        const from=getComputedStyle(sheet).transform,back=getComputedStyle(deck).transform;
        cleanSheetTransform();
        animate(sheet,[{transform:from},{transform:'translateY(0)'}],300,'spring');
        animate(deck,[{transform:back},{transform:'scale(.94)'}],300,'spring');
      }
      e.stopImmediatePropagation();return;
    }
    if(!edge||edge.id!==e.pointerId)return;
    const g=edge,p=clamp(g.x/g.width,0,1),sample=g.samples[0],elapsed=performance.now()-sample[1];
    const velocity=(e.clientX-sample[0])/Math.max(1,elapsed);
    const commit=!cancelled&&g.axis==='x'&&(p>.4||g.x>48&&velocity>.65);
    const x=g.x,width=g.width;resetEdge();study.classList.remove('ios-moving');
    if(g.axis==='x')clickBlockedUntil=performance.now()+350;
    if(commit){
      // Gọi handler cũ, kể cả khi đang làm lại câu sai.
      const back=document.getElementById('returnToMain');
      const inReview=back&&(!back.hidden||!!document.querySelector('.wrong-review-actions'));
      edgeSnapshot={x,width,progress:p};
      // Cho click lập trình đi tới handler cũ, chặn riêng click dư sau kéo.
      const block=clickBlockedUntil;clickBlockedUntil=0;
      (inReview?back:document.getElementById('backToSelection')).click();
      clickBlockedUntil=block;
      if(edgeSnapshot){edgeSnapshot=null;animate(study,[{transform:`translateX(${x*.12}px) scale(${1-.05*p})`},{transform:'translateX(0)'}],300,'spring');}
    }else if(g.axis==='x')animate(study,[{transform:`translateX(${x*.12}px) scale(${1-.05*p})`},{transform:'translateX(0)'}],300,'spring');
    e.stopImmediatePropagation();
  }
  document.addEventListener('pointerup',e=>endGesture(e),true);
  document.addEventListener('pointercancel',e=>endGesture(e,true),true);
  document.addEventListener('lostpointercapture',e=>{
    if(edge?.id===e.pointerId||sheetDrag?.id===e.pointerId)endGesture(e,true);
  },true);
  // Một thao tác không đồng thời cuộn document và chuyển câu.
  document.addEventListener('touchmove',e=>{
    if(e.touches.length!==1)return;
    if(body.classList.contains('is-studying')&&modal.hidden)e.preventDefault();
    else if(!modal.hidden&&!e.target.closest('.home-modal-card'))e.preventDefault();
  },{passive:false});
  document.addEventListener('wheel',e=>{
    if(!modal.hidden){if(!e.target.closest('.home-modal-card'))e.preventDefault();}
    else if(body.classList.contains('is-studying')&&!e.target.closest('.question-stage,.result-strip'))e.preventDefault();
  },{passive:false});


  function cancelSpring(){++transitionToken;transitionLocked=false;touchStart=null;clearTimeout(wheelTimer);}
  function preferencesChanged(){
    if(motion())return;cancelAnimations();if(edge)resetEdge();
    if(closing)closeImmediately();
  }
  new MutationObserver(preferencesChanged).observe(root,{attributes:true,attributeFilter:['data-effects']});
  reduced.addEventListener('change',preferencesChanged);
  syncSheet();lock();
})();
