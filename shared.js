// ── Shared utilities ─────────────────────────────────────────────────────────
const TIER_COLORS = {'<20':'#8A1F1F','20-40':'#7A4A00','40-60':'#1B4B8A','60+':'#2D6A10'};

function tierKey(t){
  if(t==='<20') return 'u20';
  if(t==='20-40') return '2040';
  if(t==='40-60') return '4060';
  return '60p';
}

function gapClass(g){
  if(g==null) return '';
  if(g>=-5) return 'gap-pos';
  if(g>=-15) return 'gap-mild';
  return 'gap-strong';
}

function safe(v){ return (v===null||v===undefined) ? null : v; }

function renderSchoolSub(s){
  const tk = tierKey(s.tier);
  const typeTag = s.type==='DCPS'?'<span class="tag tag-dcps">DCPS</span>':'<span class="tag tag-charter">Charter</span>';
  const fwClass = s.fw_key==='elem'?'tag-elem':s.fw_key==='middle'?'tag-middle':'tag-high';
  const fwTag = `<span class="tag ${fwClass}">${s.fw}</span>`;
  const multiTag = s.multi_fw?'<span class="tag tag-multi">multi-fw</span>':'';
  const tierBadge = `<span class="tier-badge tb-${tk}">${s.tier}</span>`;
  const wardStr = s.ward?`<span>Ward ${s.ward}</span>`:'';
  const edStr = s.ed_pct!=null?`<span>${s.ed_pct}% at-risk</span>`:'';
  const enrStr = s.enrollment?`<span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-tertiary)">${s.enrollment.toLocaleString()} enrolled</span>`:'';
  return `${tierBadge}${typeTag}${fwTag}${multiTag}${wardStr}${edStr}${enrStr}`;
}

function renderBar(label, score, state, color, maxVal=100){
  if(score==null) return '';
  const sw = Math.min(100, Math.max(0, score/maxVal*100)).toFixed(1);
  const stw = Math.min(100, Math.max(0, state/maxVal*100)).toFixed(1);
  const gap = score - state;
  const gStr = gap>=0?`+${gap.toFixed(0)}`:gap.toFixed(0);
  const shortLabel = label.replace('Growth to Proficiency - ','GtP ').replace('Median Growth Percentile - ','MGP ').replace('Approaching, Meeting or Exceeding','AME').replace('Meeting or Exceeding','M/E').replace('Advanced Coursework ','Adv. C/').replace('Four-Year ','4-yr ').replace('Five-Year ','5-yr ').replace('CLASS - Pre-K ','').replace('Graduation Rate','Grad Rate').replace('Enrollment','Enroll').replace('Out-of-school Suspension Rate','OSS Rate').replace('In-school Suspensions Rate','ISS Rate').replace('Incidents of Violence Rate','Violence Rate').replace('Expulsions Rate','Expulsions').replace('School-Arrests Rate','Arrests').replace('Bullying Rate','Bullying').replace('Harassment Rate','Harassment');
  return `<div class="cat-row">
    <span class="cat-label" title="${label}">${shortLabel}</span>
    <div class="bar-container">
      <div class="bar-state" style="width:${stw}%;background:${color}"></div>
      <div class="bar-school" style="width:${sw}%;background:${color}"></div>
      <div class="bar-marker" style="left:${stw}%"></div>
    </div>
    <span class="gap-label ${gapClass(gap)}">${gStr}</span>
  </div>`;
}

function renderDetailRow(label, score, state){
  if(score==null) return '';
  const gap = score - state;
  const gStr = gap>=0?`+${gap.toFixed(1)}`:gap.toFixed(1);
  return `<div class="detail-row">
    <span class="detail-cat">${label}</span>
    <div class="detail-vals">
      <span>${score.toFixed(1)}</span>
      <span class="detail-state">vs ${state.toFixed(1)} state</span>
      <span class="${gapClass(gap)}">${gStr}</span>
    </div>
  </div>`;
}

// Common filter state + wiring
function makeFilters(opts){
  // opts: {tiers, onRender}
  let activeTiers = new Set(['60+','40-60','20-40','<20']);
  let activeFw='all', activeTy='all', activeWd='all', minED=0;
  const extra = opts.extra||{};

  function getBase(s){
    if(!activeTiers.has(s.tier)) return false;
    if(activeFw!=='all' && s.fw_key!==activeFw) return false;
    if(activeTy!=='all' && s.type!==activeTy) return false;
    if(activeWd!=='all' && s.ward!==parseInt(activeWd)) return false;
    if(minED>0 && (s.ed_pct==null||s.ed_pct<minED)) return false;
    return true;
  }

  document.querySelectorAll('[data-tier]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const t=btn.dataset.tier;
      if(activeTiers.has(t)){if(activeTiers.size===1)return;activeTiers.delete(t);btn.classList.remove('active');}
      else{activeTiers.add(t);btn.classList.add('active');}
      opts.onRender(getBase);
    });
  });

  function single(attr,setter){
    document.querySelectorAll(`[${attr}]`).forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll(`[${attr}]`).forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        setter(btn.dataset[attr.replace('data-','')]);
        opts.onRender(getBase);
      });
    });
  }
  single('data-fw',v=>activeFw=v);
  single('data-ty',v=>activeTy=v);
  single('data-wd',v=>activeWd=v);

  const slider=document.getElementById('ed-slider');
  if(slider){
    slider.addEventListener('input',()=>{
      minED=parseInt(slider.value);
      document.getElementById('ed-val').textContent=minED+'%';
      opts.onRender(getBase);
    });
  }

  return getBase;
}

function renderSummaryStrip(schools){
  const n=schools.length;
  const avgScore=n?(schools.reduce((a,b)=>a+b.score,0)/n).toFixed(1):'—';
  const edS=schools.filter(s=>s.ed_pct!=null);
  const avgED=edS.length?(edS.reduce((a,b)=>a+b.ed_pct,0)/edS.length).toFixed(1)+'%':'—';
  const enrS=schools.filter(s=>s.enrollment!=null);
  const totalEnr=enrS.reduce((a,b)=>a+b.enrollment,0).toLocaleString();
  document.getElementById('summary-strip').innerHTML=[
    {label:'Schools shown',val:n},
    {label:'Avg accountability score',val:avgScore},
    {label:'Avg at-risk enrollment',val:avgED},
    {label:'Total enrollment',val:totalEnr},
  ].map(c=>`<div class="sum-cell"><span class="sum-num">${c.val}</span><span class="sum-lbl">${c.label}</span></div>`).join('');
}
