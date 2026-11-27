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
