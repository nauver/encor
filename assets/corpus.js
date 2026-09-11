/* =========================================================================
   enCoR — corpus view
   Purpose: the whole corpus as one picture, plus a full-screen mode for
   meetings. Reads the same datasets as the reading view.
   Sections: 1 state · 2 bootstrap · 3 layout · 4 tooltip · 5 detail
             6 presentation · 7 dataset loader
   ========================================================================= */

/* --- 1. state ---------------------------------------------------------- */
const SESSIONS=[];
function registerSession(s){ SESSIONS.push(s); }
const EDCOL={"EuroPCom 2024":"var(--e24)","EuroPCom 2025":"var(--e25)","EuroPCom 2026":"var(--e26)"};
let ITEMS=[], clusters=[], storyList=[], storyIdx=0, activeTheme=null;

const esc=t=>String(t||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* --- 2. bootstrap ------------------------------------------------------ */
function boot(){
  SESSIONS.forEach(s=>s.quotes.forEach(q=>ITEMS.push({s,q})));
  if(!ITEMS.length){document.getElementById("sub").textContent="No dataset loaded.";return;}

  const eds=[...new Set(SESSIONS.map(s=>s.edition))].sort();
  document.getElementById("sub").textContent =
    `${ITEMS.length} quotes · ${SESSIONS.length} sessions · ${eds.length} editions`;
  document.getElementById("legend").innerHTML =
    eds.map(e=>`<span><i style="background:${EDCOL[e]||"var(--soft)"}"></i>${esc(e)}</span>`).join("")
    + `<span><i style="border:1.5px solid var(--ink);background:none"></i>figure</span>`;

  // Un groupe par thème, ordonné du plus fourni au moins fourni.
  const by={};
  ITEMS.forEach(it=>{ const t=it.q.theme||"—"; (by[t]=by[t]||[]).push(it); });
  clusters=Object.entries(by).sort((a,b)=>b[1].length-a[1].length)
    .map(([theme,items])=>({theme,items}));

  layout();
  window.addEventListener("resize",layout);
}

/* --- 3. layout: one cluster per theme, phyllotaxis spiral inside ------- */
function layout(){
  const svg=document.getElementById("map");
  const W=svg.clientWidth, H=svg.clientHeight;
  const cols=Math.max(2,Math.min(5,Math.round(W/330)));
  const rows=Math.ceil(clusters.length/cols);
  const cw=W/cols, ch=Math.max(210,(H-90)/Math.min(rows,3));
  svg.setAttribute("viewBox",`0 0 ${W} ${Math.max(H, rows*ch+140)}`);
  svg.setAttribute("height", Math.max(H, rows*ch+140));

  let out="";
  clusters.forEach((c,ci)=>{
    const cx=(ci%cols)*cw+cw/2, cy=Math.floor(ci/cols)*ch+ch/2+90;
    out+=`<text class="cluster-count" x="${cx}" y="${cy+12}" text-anchor="middle">${c.items.length}</text>`;
    out+=`<text class="cluster-label" x="${cx}" y="${cy+ch/2-24}" text-anchor="middle">${esc(c.theme)}</text>`;
    // Placement en spirale de phyllotaxie : dense, régulier, sans chevauchement.
    c.items.forEach((it,i)=>{
      const a=i*2.3999632, r=Math.min(cw,ch)*0.055*Math.sqrt(i+1.2);
      const x=cx+r*Math.cos(a), y=cy+r*Math.sin(a);
      const col=EDCOL[it.s.edition]||"var(--soft)";
      const fig=it.q.type&&it.q.type!=="quote";
      out+=`<circle class="dot${fig?" figure":""}" data-i="${ITEMS.indexOf(it)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" `+
           `${fig?`stroke="${col}"`:`fill="${col}"`} opacity=".88"><title>${esc(it.q.speaker)} — ${esc(it.q.timecode)}</title></circle>`;
    });
  });
  svg.innerHTML=out;

  svg.querySelectorAll(".dot").forEach(el=>{
    el.onmouseenter=e=>tip(e,ITEMS[+el.dataset.i]);
    el.onmousemove=e=>moveTip(e);
    el.onmouseleave=hideTip;
    el.onclick=()=>open_(+el.dataset.i);
  });
}

/* --- 4. tooltip -------------------------------------------------------- */
const tipEl=document.getElementById("tip");
function tip(e,it){
  tipEl.innerHTML=`<b>${esc(it.q.speaker)} · ${esc(it.s.edition)}</b>${esc(it.q.quote.slice(0,180))}${it.q.quote.length>180?"…":""}`;
  tipEl.style.opacity=1; moveTip(e);
}
function moveTip(e){
  const p=12, w=tipEl.offsetWidth, h=tipEl.offsetHeight;
  tipEl.style.left=Math.min(e.clientX+p, innerWidth-w-p)+"px";
  tipEl.style.top=Math.min(e.clientY+p, innerHeight-h-p)+"px";
}
function hideTip(){ tipEl.style.opacity=0; }

/* --- 5. detail panel --------------------------------------------------- */
function open_(i){
  const {s,q}=ITEMS[i];
  document.getElementById("detailBody").innerHTML=`
    <blockquote>« ${esc(q.quote)} »</blockquote>
    ${q.translation?`<p class="tr">${esc(q.translation)}</p>`:""}
    <p class="who">${esc(q.speaker)}</p>
    <p class="role">${esc(q.role)}</p>
    <p class="src" style="margin-top:1rem">${esc(s.title)} · ${esc(q.timecode)}${q.theme?" · "+esc(q.theme):""}</p>
    <a class="watch" href="${q.seek_url}" target="_blank" rel="noopener">Watch in the video</a>`;
  document.getElementById("detail").classList.add("open");
  activeTheme=q.theme;
}
document.getElementById("closeDetail").onclick=()=>document.getElementById("detail").classList.remove("open");

/* --- 6. presentation mode --------------------------------------------- */
// --- mode présentation ---------------------------------------------------
function startStory(){
  storyList = activeTheme ? ITEMS.filter(it=>it.q.theme===activeTheme) : ITEMS.slice();
  if(!storyList.length) storyList=ITEMS.slice();
  storyList.sort((a,b)=> a.s.date.localeCompare(b.s.date) || a.q.start_sec-b.q.start_sec);
  storyIdx=0; document.getElementById("story").classList.add("on"); showStory();
}
function showStory(){
  const {s,q}=storyList[storyIdx];
  document.getElementById("sTheme").textContent=[q.theme,s.edition].filter(Boolean).join(" · ");
  document.getElementById("sQuote").textContent="« "+q.quote+" »";
  document.getElementById("sTr").textContent=q.translation||"";
  document.getElementById("sWho").innerHTML=`${esc(q.speaker)} <span>— ${esc(q.role)}</span>`;
  document.getElementById("prog").style.width=((storyIdx+1)/storyList.length*100)+"%";
}
function step(n){
  storyIdx=(storyIdx+n+storyList.length)%storyList.length; showStory();
}
document.getElementById("playBtn").onclick=startStory;
document.getElementById("story").onclick=()=>step(1);
addEventListener("keydown",e=>{
  const on=document.getElementById("story").classList.contains("on");
  if(e.key==="Escape"){ document.getElementById("story").classList.remove("on");
    document.getElementById("detail").classList.remove("open"); }
  if(!on) return;
  if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();step(1);}
  if(e.key==="ArrowLeft"){e.preventDefault();step(-1);}
});

/* --- 7. dataset loader ------------------------------------------------- */
(function(){
  const ids=window.SESSIONS_MANIFEST||[];
  let left=ids.length; if(!left){boot();return;}
  ids.forEach(id=>{const sc=document.createElement("script");sc.src=`data/${id}.js`;
    sc.onload=sc.onerror=()=>{if(--left===0) boot();};document.body.appendChild(sc);});
})();
