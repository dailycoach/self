(() => {
    const { ITEMS, DOMAINS } = window.SELF_INC_DATA;
    const KEYS = {
      draft:"selfinc_check_v9_draft",
      history:"selfinc_check_v9_history",
      order:"selfinc_check_v9_order",
      tracker:"selfinc_check_v9_tracker"
    };
    const $ = s => document.querySelector(s);
    const screens = [...document.querySelectorAll(".screen")];
    const state = {answers:Array(ITEMS.length).fill(null), order:[], current:0, result:null};

    function showScreen(id){
      screens.forEach(s=>s.classList.toggle("active",s.id===id));
      window.scrollTo({top:0,behavior:"smooth"});
    }
    function toast(msg){
      const el=$("#toast"); el.textContent=msg; el.classList.add("show");
      clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove("show"),1500);
    }
    function shuffleOrder(){
      const a=Array.from({length:ITEMS.length},(_,i)=>i);
      for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
      return a;
    }
    function loadOrder(){
      try{const a=JSON.parse(localStorage.getItem(KEYS.order));if(Array.isArray(a)&&a.length===ITEMS.length&&new Set(a).size===a.length)return a}catch{}
      const a=shuffleOrder(); localStorage.setItem(KEYS.order,JSON.stringify(a)); return a;
    }
    function saveDraft(){
      const payload={answers:state.answers,current:state.current,order:state.order,company:$("#companyInput").value.trim(),name:$("#nameInput").value.trim(),savedAt:Date.now()};
      localStorage.setItem(KEYS.draft,JSON.stringify(payload));
    }
    function loadDraft(){
      let loaded=false;
      try{
        const p=JSON.parse(localStorage.getItem(KEYS.draft));
        if(p&&Array.isArray(p.answers)&&p.answers.length===ITEMS.length){
          state.answers=p.answers.map(v=>(Number.isInteger(v)&&v>=1&&v<=7)?v:null);
          state.current=Math.min(Math.max(Number(p.current)||0,0),ITEMS.length-1);
          if(Array.isArray(p.order)&&p.order.length===ITEMS.length)state.order=p.order;
          if(typeof p.company==="string")$("#companyInput").value=p.company;
          if(typeof p.name==="string")$("#nameInput").value=p.name;
          loaded=state.answers.some(v=>v!==null);
        }
      }catch{}
      if(!loaded){
        try{
          const old=JSON.parse(localStorage.getItem("selfinc_ceo_check_v7"));
          if(old&&Array.isArray(old.answers)&&old.answers.length===ITEMS.length){
            state.answers=old.answers.map(v=>(Number.isInteger(v)&&v>=1&&v<=7)?v:null);
            if(typeof old.company==="string")$("#companyInput").value=old.company;
            if(typeof old.ceo==="string")$("#nameInput").value=old.ceo;
            loaded=state.answers.some(v=>v!==null);
          }
        }catch{}
      }
      $("#startBtn").textContent=loaded?"이어서 점검하기 →":"점검 시작하기 →";
      $("#clearDraftBtn").hidden=!loaded;
      return loaded;
    }
    function clearDraft(){
      localStorage.removeItem(KEYS.draft); localStorage.removeItem(KEYS.order);
      state.answers=Array(ITEMS.length).fill(null); state.current=0; state.order=shuffleOrder();
      localStorage.setItem(KEYS.order,JSON.stringify(state.order));
      $("#startBtn").textContent="점검 시작하기 →"; $("#clearDraftBtn").hidden=true;
      toast("저장된 답변을 지웠습니다.");
    }
    function answeredCount(){return state.answers.filter(v=>v!==null).length}
    function firstUnanswered(){const i=state.order.findIndex(itemIdx=>state.answers[itemIdx]===null);return i<0?0:i}

    function renderQuestion(){
      const itemIdx=state.order[state.current]; const item=ITEMS[itemIdx];
      $("#counter").textContent=`${state.current+1} / ${ITEMS.length}`;
      $("#progressBar").style.width=`${(answeredCount()/ITEMS.length)*100}%`;
      $("#qNo").textContent=`QUESTION ${String(state.current+1).padStart(2,"0")}`;
      $("#qText").textContent=item.t;
      $("#prevBtn").disabled=state.current===0;
      const scale=$("#scale"); scale.innerHTML="";
      for(let n=1;n<=7;n++){
        const b=document.createElement("button"); b.type="button"; b.textContent=n; b.setAttribute("aria-label",`${n}점`);
        if(state.answers[itemIdx]===n)b.classList.add("selected");
        b.addEventListener("click",()=>selectAnswer(n,b)); scale.appendChild(b);
      }
    }
    function selectAnswer(value,button){
      const itemIdx=state.order[state.current]; state.answers[itemIdx]=value;
      [...$("#scale").children].forEach(b=>b.classList.toggle("selected",b===button));
      saveDraft(); $("#progressBar").style.width=`${(answeredCount()/ITEMS.length)*100}%`;
      setTimeout(()=>{
        if(state.current<ITEMS.length-1){state.current++;renderQuestion()}
        else if(answeredCount()===ITEMS.length){finishTest()}
      },180);
    }
    function startTest(){
      state.order=state.order.length?state.order:loadOrder();
      if(answeredCount()<ITEMS.length) state.current=firstUnanswered();
      else { finishTest(); return; }
      renderQuestion(); showScreen("testScreen");
    }
    function scoreItem(index,value){return ITEMS[index].r?8-value:value}
    function compute(){
      const keys=Object.keys(DOMAINS); const domains={}; let total=0;
      keys.forEach(k=>{
        const indexes=ITEMS.map((x,i)=>x.d===k?i:-1).filter(i=>i>=0);
        const sum=indexes.reduce((acc,i)=>acc+scoreItem(i,state.answers[i]),0);
        domains[k]=Math.round(((sum-indexes.length)/(indexes.length*6))*100);
        total+=sum;
      });
      const overall=Math.round(((total-ITEMS.length)/(ITEMS.length*6))*100);
      const sorted=keys.map(k=>({key:k,score:domains[k]})).sort((a,b)=>a.score-b.score);
      return {overall,domains,focus:sorted[0].key,strong:sorted[sorted.length-1].key,raw:total};
    }
    function bandFor(score){
      if(score<45)return {title:"정비가 먼저 필요한 시기",copy:"지금은 더 밀어붙이기보다 나를 소모시키는 방식부터 줄이는 편이 좋습니다."};
      if(score<70)return {title:"균형을 조정하는 시기",copy:"기본 힘은 있으나 상황에 따라 흔들리는 지점이 있습니다. 작은 규칙 하나가 체감을 바꿀 수 있습니다."};
      return {title:"안정적으로 운영 중",copy:"다섯 힘이 비교적 안정적으로 작동합니다. 잘되는 방식을 무리 없이 오래 유지하는 것이 중요합니다."};
    }
    function levelCopy(key,score){const d=DOMAINS[key];return score<45?d.low:score<70?d.mid:d.high}
    function finishTest(){
      if(answeredCount()!==ITEMS.length){toast("아직 답하지 않은 문항이 있습니다.");state.current=firstUnanswered();renderQuestion();return}
      showScreen("loadingScreen");
      const copies=["점수보다 먼저, 영역 사이의 균형을 살펴봅니다.","강점과 부족함보다 지금 필요한 순서를 정리합니다.","이번 주에 해볼 가장 작은 실험을 고르고 있습니다."];
      let i=0; const timer=setInterval(()=>{$("#loadingCopy").textContent=copies[++i%copies.length]},480);
      setTimeout(()=>{clearInterval(timer);state.result=compute();saveResult();renderResult();showScreen("resultScreen");localStorage.removeItem(KEYS.draft);$("#startBtn").textContent="점검 시작하기 →";$("#clearDraftBtn").hidden=true},1300);
    }
    function saveResult(){
      const r=state.result; let list=[];
      try{list=JSON.parse(localStorage.getItem(KEYS.history))||[]}catch{}
      const entry={id:Date.now(),date:new Date().toLocaleString("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}),overall:r.overall,domains:r.domains,focus:r.focus,strong:r.strong,company:$("#companyInput").value.trim(),name:$("#nameInput").value.trim()};
      list.unshift(entry); localStorage.setItem(KEYS.history,JSON.stringify(list.slice(0,8)));
      localStorage.setItem(KEYS.tracker,JSON.stringify({resultId:entry.id,days:Array(7).fill(false)}));
    }
    function renderResult(){
      const r=state.result, band=bandFor(r.overall), focus=DOMAINS[r.focus], strong=DOMAINS[r.strong];
      $("#totalScore").textContent=r.overall; $("#bandTitle").textContent=band.title; $("#bandCopy").textContent=band.copy;
      $("#strongName").textContent=strong.name; $("#strongCopy").textContent=levelCopy(r.strong,r.domains[r.strong]);
      $("#focusName").textContent=focus.name; $("#focusCopy").textContent=levelCopy(r.focus,r.domains[r.focus]);
      const list=$("#domainList"); list.innerHTML="";
      Object.keys(DOMAINS).forEach(k=>{
        const d=DOMAINS[k],score=r.domains[k],el=document.createElement("div"); el.className="domain";
        el.innerHTML=`<div class="domain-head"><div class="domain-name">${d.name}</div><div class="domain-bar"><span style="width:${score}%"></span></div><div class="domain-score">${score}</div></div><details><summary>이 점수가 말해주는 것</summary><div class="domain-copy">${d.desc}<br>${levelCopy(k,score)}</div></details>`;
        list.appendChild(el);
      });
      $("#experimentTitle").textContent=focus.action; $("#experimentCopy").textContent=`${focus.name}을 한 번에 바꾸려 하지 말고, 같은 행동을 7일 동안 작게 반복해봅니다.`;
      $("#reflectionQuestion").textContent=focus.reflect;
      renderTracker(); renderHistory();
    }
    function renderTracker(){
      let t={days:Array(7).fill(false)}; try{t=JSON.parse(localStorage.getItem(KEYS.tracker))||t}catch{}
      if(!Array.isArray(t.days)||t.days.length!==7)t.days=Array(7).fill(false);
      const w=$("#weekTracker"); w.innerHTML="";
      t.days.forEach((done,i)=>{const b=document.createElement("button");b.type="button";b.className="day"+(done?" done":"");b.textContent=`${i+1}일`;b.setAttribute("aria-pressed",String(done));b.addEventListener("click",()=>{t.days[i]=!t.days[i];localStorage.setItem(KEYS.tracker,JSON.stringify(t));renderTracker()});w.appendChild(b)});
    }
    function renderHistory(){
      let list=[];try{list=JSON.parse(localStorage.getItem(KEYS.history))||[]}catch{}
      const wrap=$("#historyList");wrap.innerHTML="";
      if(!list.length){wrap.innerHTML='<div class="history-item">아직 저장된 기록이 없습니다.</div>';return}
      list.forEach(h=>{const d=document.createElement("div");d.className="history-item";d.innerHTML=`<span>${h.date}<br>${DOMAINS[h.focus]?.name||"—"} 먼저 돌보기</span><b>${h.overall}</b>`;wrap.appendChild(d)});
    }
    function resultShareText(){
      const r=state.result,focus=DOMAINS[r.focus],strong=DOMAINS[r.strong],band=bandFor(r.overall);
      const company=$("#companyInput").value.trim()||"SELF INC.";
      return [`SELF INC. 자존감 운영 점검`,`${company} · ${r.overall}점 · ${band.title}`,`잘 작동하는 힘: ${strong.name}`,`먼저 돌볼 흐름: ${focus.name}`,`7일 실험: ${focus.action}`,`돌아볼 질문: ${focus.reflect}`].join("\n");
    }
    async function shareResult(){
      const text=resultShareText();
      if(navigator.share){try{await navigator.share({title:"SELF INC. 자존감 운영 점검",text,url:location.href});return}catch{}}
      try{await navigator.clipboard.writeText(text);toast("결과 요약을 복사했습니다.")}catch{toast("공유 기능을 사용할 수 없습니다.")}
    }
    function restart(){
      state.answers=Array(ITEMS.length).fill(null);state.current=0;state.result=null;state.order=shuffleOrder();
      localStorage.setItem(KEYS.order,JSON.stringify(state.order));localStorage.removeItem(KEYS.draft);
      $("#startBtn").textContent="점검 시작하기 →";$("#clearDraftBtn").hidden=true;startTest();
    }

    $("#startBtn").addEventListener("click",startTest);
    $("#clearDraftBtn").addEventListener("click",clearDraft);
    $("#prevBtn").addEventListener("click",()=>{if(state.current>0){state.current--;renderQuestion();saveDraft()}});
    $("#exitBtn").addEventListener("click",()=>{saveDraft();loadDraft();showScreen("introScreen");toast("현재 위치까지 저장했습니다.")});
    $("#companyInput").addEventListener("input",saveDraft);$("#nameInput").addEventListener("input",saveDraft);
    $("#shareBtn").addEventListener("click",shareResult);$("#printBtn").addEventListener("click",()=>window.print());
    $("#restartBtn").addEventListener("click",restart);$("#homeBtn").addEventListener("click",()=>showScreen("introScreen"));
    $("#clearHistoryBtn").addEventListener("click",()=>{localStorage.removeItem(KEYS.history);renderHistory();toast("이전 기록을 지웠습니다.")});

    state.order=loadOrder(); loadDraft(); renderHistory();
  })();
