import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#EEF1F5", forest:"#186132", emerald:"#148C59", mint:"#14D571",
  violet:"#5B61F4", navy:"#0B1C48", muted:"#6B7280", dim:"#9CA3AF",
  red:"#DC2626", amber:"#F59E0B", border:"rgba(0,0,0,0.07)",
};
const glass = {
  background:"rgba(255,255,255,0.5)", backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
  borderRadius:14, border:"1px solid rgba(255,255,255,0.65)",
  boxShadow:"0 4px 20px rgba(0,0,0,0.03),0 1px 3px rgba(0,0,0,0.02),inset 0 1px 0 rgba(255,255,255,0.7)",
};
const cardBgs = [
  { background:"rgba(255,255,255,0.65)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.7)", boxShadow:"0 8px 32px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.7)" },
  { background:"linear-gradient(160deg,rgba(20,213,113,0.09) 0%,rgba(255,255,255,0.55) 100%)", backdropFilter:"blur(24px)", border:"1px solid rgba(20,213,113,0.12)", boxShadow:"0 8px 32px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.7)" },
  { background:"linear-gradient(160deg,rgba(91,97,244,0.07) 0%,rgba(255,255,255,0.55) 100%)", backdropFilter:"blur(24px)", border:"1px solid rgba(91,97,244,0.1)", boxShadow:"0 8px 32px rgba(0,0,0,0.06),inset 0 1px 0 rgba(255,255,255,0.7)" },
];

const SEV = {
  Critical:{ color:"#DC2626", bg:"#FEE2E2", dot:"#EF4444" },
  Major:   { color:"#D97706", bg:"#FEF3C7", dot:"#F59E0B" },
  Minor:   { color:"#ca8a04", bg:"#FEF9C3", dot:"#EAB308" },
};

const getScoreColor = s => s>=70?C.mint:s>=40?C.emerald:C.forest;
const getSevBadge   = s => s>=70?{label:"Good",bg:"#D1FAE5",color:C.emerald}:s>=40?{label:"Needs Work",bg:"#E0E7FF",color:C.violet}:{label:"Critical",bg:"#FEE2E2",color:C.red};

const SCORE_RECOVERY = { "A1.2":12, "C2.1":10, "A3.4":6, "B1.2":4, "C1.1":3, "A2.1":2, "A4.3":1, "C3.2":1 };

const INDUSTRIES = ["SaaS / Software","Ecommerce","Portfolio / Personal","Healthcare / Wellness","Fintech / Finance","Service / Agency"];
const PAGE_GOALS = ["Lead gen","Signups","Bookings","Sales","Demo requests","Brand awareness"];
const REVIEW_FOCUS = ["Scroll Behavior","CTA Placement","Copy Clarity","Visual Hierarchy","Responsiveness","Overall"];
const URGENCY = ["Just curious","Minor tweaks","Some friction","Real problems","Nothing converts"];
const STATUS_MSGS = [
  "Mapping conversion pathways...","Scanning above-the-fold signals...",
  "Cross-referencing industry benchmarks...","Measuring cognitive load patterns...",
  "Evaluating persuasion architecture...","Detecting friction points...",
  "Parsing trust signal density...","Analysing content-to-intent alignment...",
];

const FINDINGS = [
  { id:"A1.2", bpId:1, sev:"Critical", sevDot:"#EF4444", part:"A",
    title:"CTA buried below the fold",
    sub:"Structure & Conversion",
    desc:'Your primary "Start Free Trial" CTA renders at 680px - below the fold on 78% of devices. Visitors who don\'t scroll past the hero never encounter your conversion action.',
    leak:"£900/mo", effort:"Low",
    steps:["Move CTA to within 280px of viewport top","Check button contrast ratio is ≥4.5:1 against hero background","Add benefit micro-copy beneath: \"No credit card required\""],
    actions:["Reposition CTA in layout editor","Test button visibility at 375px","Add micro-copy beneath button"],
    prompt:`Rewrite the hero section to surface the CTA above fold.\n\nCurrent structure: [headline] [subhead] [feature list] [CTA]\nTarget: [headline] [CTA] [trust signal] [brief subhead]\n\nRequirements:\n- CTA visible without any scroll on a 375px mobile\n- Add one line of micro-copy beneath the button reducing commitment anxiety\n- Keep headline length the same\n- Tone: direct, confident`,
    before:'"Streamline your workflow." [Feature list] [Feature list] [CTA far below]',
    after:'"Stop context-switching. [Start Free Trial →] No credit card required. [Feature list]"' },
  { id:"C2.1", bpId:2, sev:"Critical", sevDot:"#EF4444", part:"C",
    title:"Value proposition fails the 5-second test",
    sub:"Content Branding",
    desc:'H1 reads "Streamline your workflow." - a category claim with no differentiated position. Visitors cannot identify who this product is for or why it\'s different within 5 seconds.',
    leak:"£700/mo", effort:"Low",
    steps:["Rewrite H1: who it's for + the outcome they get","Test: can a stranger identify your product in 5 seconds?","Align meta title to match new H1"],
    actions:["Draft 3 new H1 variants","Run 5-second test with 3 people","Update meta title to match winner"],
    prompt:`Rewrite this H1 and subheadline to be benefit-led.\n\nCurrent H1: "Streamline your workflow"\nCurrent sub: "Track, measure, and optimise your product with real-time data."\n\nRequirements:\n- Lead with the user outcome, not the product feature\n- Use "you" language throughout\n- H1 under 10 words\n- Subheadline makes the benefit concrete\n- Tone: direct, confident, no jargon`,
    before:'"Streamline your workflow." - category claim, zero differentiation',
    after:'"Ship features 40% faster - the project tool lean SaaS teams trust."' },
  { id:"A3.4", bpId:3, sev:"Major", sevDot:"#F59E0B", part:"A",
    title:"Social proof placed far from CTA",
    sub:"Structure & Conversion",
    desc:"Testimonials and customer logos appear below the pricing section, over 1,400px from the primary CTA. Trust signals need to be within 200px of the conversion action.",
    leak:"£480/mo", effort:"Medium",
    steps:["Move one testimonial to within 200px of the primary CTA","Add a logo strip directly below the hero CTA","Ensure testimonials are attributed - name, company, role"],
    actions:["Move testimonial card to hero section","Build logo strip component","Add attribution to all testimonials"],
    prompt:`Write 3 customer testimonial quotes for placement near the hero CTA.\n\nFormat: one sentence each, max 15 words, with name and role.\nEach quote should:\n- Name a specific measurable outcome\n- Sound like a real founder or PM\n- Avoid marketing speak`,
    before:"[CTA] ... 1,400px of content ... [Testimonials buried below pricing]",
    after:"[CTA] [Trust strip: logos + 1 quote] [Features]" },
  { id:"B1.2", bpId:4, sev:"Major", sevDot:"#F59E0B", part:"B",
    title:"Mobile nav hides pricing link",
    sub:"Performance & Trust",
    desc:"The pricing link is collapsed into the hamburger menu on mobile. High-intent mobile visitors cannot find pricing without extra interaction.",
    leak:"£340/mo", effort:"Medium",
    steps:["Add pricing as a persistent visible link in mobile nav","Or add a sticky 'See pricing' bar on mobile scroll","Test on 375px and 390px viewport widths"],
    actions:["Update mobile nav component","Add persistent pricing link","Test on iOS Safari and Android Chrome"],
    prompt:`Write CSS and HTML to make the pricing link persistent in mobile nav.\n\nRequirements:\n- Pricing visible at 375px without opening hamburger\n- Sits inline between logo and hamburger\n- Subtle but always visible\n- Include hover/tap state`,
    before:"[Hamburger] → [hidden: Home Features Pricing Blog]",
    after:"[Logo] [Pricing] [CTA] - always visible at 375px" },
  { id:"C1.1", bpId:5, sev:"Major", sevDot:"#F59E0B", part:"C",
    title:"Brand voice breaks mid-page",
    sub:"Content Branding",
    desc:'Hero uses casual direct language while feature descriptions switch to formal product-speak. The brand voice breaks within the first scroll, undermining credibility.',
    leak:"£200/mo", effort:"High",
    steps:["Define a single voice register in your brand guide","Rewrite feature descriptions to match the hero tone","Create approved voice examples for each content zone"],
    actions:["Write brand voice guide (1 page)","Rewrite all feature card copy","Review pricing and footer copy"],
    prompt:`Rewrite these 3 feature card bodies to match the hero voice.\n\nHero tone: casual, direct, user-first\nCard 1: "We built our dashboards to give you instant visibility."\nCard 2: "Our reporting engine lets your team generate any report."\nCard 3: "We designed collaboration features so your whole team stays aligned."\n\nFor each: use "you"/"your team" as subject, match casual tone, same length.`,
    before:'"Get it done" hero → "leveraging advanced workflow orchestration" features',
    after:'"Get it done" hero → "your team always knows what to do next" features' },
  { id:"A2.1", bpId:6, sev:"Major", sevDot:"#F59E0B", part:"A",
    title:"No low-risk entry point for hesitant visitors",
    sub:"Structure & Conversion",
    desc:'High-value visitors who won\'t sign up for a free trial have no alternative path. No "book a demo" option, no chat - these visitors leave with no capture.',
    leak:"£300/mo", effort:"Medium",
    steps:["Add a secondary CTA: \"Book a demo\" in hero and pricing","Consider a Calendly embed for frictionless booking","Track demo-to-trial conversion separately"],
    actions:["Add secondary CTA button to hero","Set up meeting scheduler link","Add demo CTA to pricing section"],
    prompt:`Add a secondary CTA alongside "Start Free Trial".\n\nThe secondary CTA should:\n- Offer a lower-commitment action (demo, product tour)\n- Be visually subordinate (outline style)\n- Reduce commitment anxiety\n- Sit inline with the primary button\n\nWrite 3 copy options and HTML for both buttons side by side.`,
    before:"[Start Free Trial] - only one path, nothing for hesitant visitors",
    after:"[Start Free Trial] [See a 2-min demo →] - two paths, same hero" },
  { id:"A4.3", bpId:7, sev:"Minor", sevDot:"#EAB308", part:"A",
    title:"Feature copy describes features, not outcomes",
    sub:"Structure & Conversion",
    desc:'Feature copy says what the feature does rather than the outcome it produces. Outcome language converts significantly better than feature-led copy.',
    leak:"£150/mo", effort:"Medium",
    steps:["Rewrite each feature as: Outcome → Who benefits → Feature","Limit descriptions to 2 sentences","Test with a non-technical reader"],
    actions:["Audit all feature descriptions","Rewrite in outcome format","Review with a non-technical reader"],
    prompt:`Rewrite these 3 feature descriptions from feature-led to outcome-led.\n\nCurrent:\n- "Real-time dashboards: instant visibility"\n- "Custom reports: generate any report"\n- "Team collaboration: whole team stays aligned"\n\nFor each:\n- Lead with the outcome the user gets\n- Name who benefits\n- Feature is secondary\n- Max 2 sentences`,
    before:'"Task assignment by team member" - feature description',
    after:'"Your team always knows their next action - no status meetings"' },
  { id:"C3.2", bpId:8, sev:"Minor", sevDot:"#EAB308", part:"C",
    title:"Pricing page lacks anchoring logic",
    sub:"Content Branding",
    desc:'Three tiers presented with no "most popular" signal and no comparison rationale. Visitors face a cold decision without cognitive scaffolding.',
    leak:"£200/mo", effort:"Low",
    steps:["Mark mid-tier as \"Most popular\" with a visual badge","Add a \"Best for...\" line under each tier","Add brief feature comparison below pricing"],
    actions:["Add 'Most popular' badge to mid plan","Write 'Best for...' copy for each tier","Draft feature comparison table"],
    prompt:`Write improved pricing section copy.\n\n1. A 1-2 sentence value anchor above the grid (25 words max) referencing a specific outcome before revealing price\n2. "Best for..." copy for each tier: Starter, Growth, Pro, Enterprise\n3. A "Most popular" badge label for Pro tier`,
    before:'"Starter $0 | Growth $49 | Pro $99 | Enterprise" - cold, no context',
    after:'"[Value anchor] Starter (best for: solo) | [POPULAR] Pro | Enterprise"' },
];

const BP_FINDINGS = [
  { id:1, zone:"hero", sev:"Critical", title:"Hero copy is feature-led, not benefit-led",
    fix:`Your H1 reads: "Powerful analytics for modern teams" - this describes the product, not the outcome for the user. Visitors decide within 5 seconds whether to stay. Rewrite to lead with what they gain.`,
    prompt:`Rewrite this H1 and subheadline to be benefit-led.\n\nCurrent H1: "Powerful analytics for modern teams"\nCurrent sub: "Track, measure, and optimise your product with real-time data."\n\nRequirements:\n- Lead with the user outcome, not the product feature\n- Use "you" language throughout\n- H1 under 10 words\n- Subheadline makes the benefit concrete\n- Tone: direct, confident, no jargon`,
    pts:10 },
  { id:2, zone:"hero", sev:"Critical", title:"Single high-commitment CTA - no low-risk entry",
    fix:`"Start Free Trial" asks for full commitment from cold traffic. Most first-time visitors aren't ready. Add a secondary CTA to give hesitant visitors a lower-stakes next step.`,
    prompt:`Add a secondary CTA alongside "Start Free Trial".\n\nThe secondary CTA should:\n- Offer a lower-commitment action (demo, product tour)\n- Be visually subordinate (outline style vs filled primary)\n- Reduce commitment anxiety with its copy\n- Sit inline with the primary button\n\nWrite 3 copy options and the HTML for both buttons side by side.`,
    pts:12 },
  { id:3, zone:"social", sev:"Major", title:"Social proof section has no testimonial quotes",
    fix:`Logo badges alone don't convert - people trust other people, not brand marks. Add 2–3 short testimonial quotes with specific outcomes alongside the logo row.`,
    prompt:`Write 3 customer testimonial quotes for the social proof section.\n\nFormat: one sentence each, max 15 words, written as a direct quote with name and role.\nEach quote should:\n- Name a specific measurable outcome\n- Sound like a real product manager or founder\n- Avoid marketing speak`,
    pts:6 },
  { id:4, zone:"features", sev:"Major", title:"Feature cards use 'we' language throughout",
    fix:`Every card opens with "We built..." - centering the company, not the user. Rewrite each card so "you" is the subject.`,
    prompt:`Rewrite these 3 feature card titles and bodies from "we" to "you" language.\n\nCard 1: "Real-time dashboards - We built our dashboards to give you instant visibility."\nCard 2: "Custom reports - Our reporting engine lets your team generate any report."\nCard 3: "Team collaboration - We designed collaboration features so your whole team stays aligned."\n\nFor each:\n- Title names the user outcome\n- Body uses "you" or "your team" as subject`,
    pts:3 },
  { id:5, zone:"pricing", sev:"Major", title:"Pricing section reveals cost before value",
    fix:`The section jumps straight to plan names and dollar amounts. Cold visitors see "$99/month" before understanding what they get back.`,
    prompt:`Write a value anchor to appear above the pricing grid.\n\nCurrent header: "Simple, transparent pricing"\n\nWrite 2 options (1–2 sentences, max 25 words each) that:\n- Reference a specific outcome or time-to-value before price\n- Reduce price anxiety by contextualising cost against benefit\n- Feel factual and earned, not salesy`,
    pts:4 },
  { id:6, zone:"cta2", sev:"Minor", title:"Bottom CTA repeats hero without handling objections",
    fix:`"Ready to get started?" mirrors the hero CTA without adding anything new. Address the most common objection before the button.`,
    prompt:`Rewrite the bottom CTA section to handle the setup objection.\n\nCurrent: "Ready to get started? Join thousands of teams already using our platform."\n\nWrite revised heading + subtext + CTA button label that:\n- Addresses setup simplicity directly\n- Uses existing social proof\n- Ends with a more specific CTA than "Start Free Trial"`,
    pts:2 },
  { id:7, zone:"nav", sev:"Minor", title:"Nav CTA has no visual distinction from nav links",
    fix:`"Get Started" in the nav carries the same visual weight as plain nav links. Give it a distinct button treatment.`,
    prompt:`Write CSS and HTML to style the nav CTA "Get Started" as a visually distinct button.\n\nRequirements:\n- Clearly differentiated from plain text nav links\n- Doesn't overpower the nav\n- Works on a light-background nav bar\n- Modern SaaS aesthetic\n- Include hover state`,
    pts:2 },
];

const PASSED = ["SSL / HTTPS confirmed","Viewport meta tag present","Single H1 - heading structure starts correctly","Favicon detected","Navigation links present in header","Schema / JSON-LD detected","External links open in new tab","Font loading optimised","No render-blocking scripts","Page weight under 3MB","No broken internal links","Touch targets meet 48px minimum"];
const CATS = [{name:"Copy & Messaging",score:45},{name:"CTA Effectiveness",score:65},{name:"Trust & Social Proof",score:70},{name:"Layout & Hierarchy",score:52},{name:"Technical Readiness",score:40}];
const STATES = ["unread","acknowledged","in-progress","done"];
const STATE_LABEL = { unread:"Unread", acknowledged:"Acknowledged", "in-progress":"In Progress", done:"Done" };
const STATE_STYLE = {
  unread:      { background:"rgba(11,28,72,0.06)", color:"#9CA3AF" },
  acknowledged:{ background:"rgba(91,97,244,0.1)", color:"#5B61F4" },
  "in-progress":{ background:"rgba(20,140,89,0.1)", color:"#148C59" },
  done:        { background:"rgba(20,213,113,0.15)", color:"#0a6b30" },
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;}body{margin:0;}
::placeholder{color:#9CA3AF;font-family:'Space Grotesk',sans-serif;font-weight:400;}
select{font-family:'Space Grotesk',sans-serif;}
.uxpact-slider{-webkit-appearance:none;appearance:none;background:linear-gradient(90deg,#14D571 0%,#148C59 50%,#5B61F4 100%);border-radius:3px;height:6px;outline:none;cursor:pointer;display:block;}
.uxpact-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;margin-top:-7px;}
.uxpact-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#fff;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.18);}
.uxpact-slider::-webkit-slider-runnable-track{height:6px;border-radius:3px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideRight{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
@keyframes countUp{from{opacity:0;transform:translateY(6px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes scoreIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
@keyframes pulseAnim{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.85)}}
@keyframes expandDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@keyframes chipPop{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes barSlide{from{width:0%}to{width:var(--target-w)}}
@keyframes spinIn{from{opacity:0;transform:rotate(-10deg) scale(0.8)}to{opacity:1;transform:rotate(0deg) scale(1)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn 0.3s ease both;}
.fade-up{animation:fadeUp 0.3s ease both;}
.slide-right{animation:slideRight 0.2s ease both;}
.expand-finding{overflow:hidden;transition:max-height 0.36s cubic-bezier(0.4,0,0.2,1),opacity 0.28s ease;}
.pro-card{transition:transform 0.22s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.22s ease;}
.pro-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.1)!important;}
`;

// ── SHARED ────────────────────────────────────────────────────────────
function Blobs() {
  return (<>
    <div style={{position:"fixed",top:-100,left:-60,width:480,height:480,background:"radial-gradient(circle,rgba(20,213,113,0.10) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none",zIndex:0}}/>
    <div style={{position:"fixed",top:300,right:-80,width:380,height:380,background:"radial-gradient(circle,rgba(91,97,244,0.06) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none",zIndex:0}}/>
    <div style={{position:"fixed",bottom:-60,left:"30%",width:400,height:350,background:"radial-gradient(circle,rgba(20,140,89,0.06) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none",zIndex:0}}/>
  </>);
}

function Nav({onNew,rightLabel="New Audit"}) {
  return (
    <nav style={{maxWidth:1120,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 28px",position:"relative",zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#186132,#14D571)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(20,140,89,0.2)"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/></svg>
        </div>
        <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:16,fontWeight:700,color:C.navy}}>UXpact</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        {["Home","Audits"].map(t=><span key={t} style={{fontSize:13,color:C.muted,fontWeight:450,cursor:"pointer"}}>{t}</span>)}
        {rightLabel&&<span onClick={onNew} style={{fontSize:13,color:C.emerald,fontWeight:600,cursor:"pointer"}}>{rightLabel}</span>}
      </div>
    </nav>
  );
}

function Pill({text,v}) {
  const s=v==="green"?{background:"#D1FAE5",color:C.navy}:v==="violet"?{background:"#E0E7FF",color:C.navy}:{background:"rgba(255,255,255,0.85)",color:C.muted};
  return <div style={{...s,padding:"5px 14px",borderRadius:6,fontSize:12.5,fontWeight:v?600:450,whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif",boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>{text}</div>;
}

function NodeMap({burst=false}) {
  const cvs=useRef(null),raf=useRef(null),t0=useRef(Date.now()),ns=useRef(null);
  useEffect(()=>{
    const c=cvs.current;if(!c)return;
    const ctx=c.getContext("2d"),dpr=window.devicePixelRatio||1,W=320,H=320;
    c.width=W*dpr;c.height=H*dpr;c.style.width=W+"px";c.style.height=H+"px";ctx.scale(dpr,dpr);
    if(!ns.current){
      const n=[],cx=W/2,cy=H/2,rng=s=>((Math.sin(s*127.1+311.7)*43758.5453)%1+1)%1;
      n.push({x:cx,y:cy,r:5,c:"forest"});
      for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2-Math.PI/2;n.push({x:cx+Math.cos(a)*52,y:cy+Math.sin(a)*52,r:3.5,c:rng(i)>0.5?"violet":"green"});}
      for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2+0.2;n.push({x:cx+Math.cos(a)*95,y:cy+Math.sin(a)*95,r:2.5,c:rng(i+10)>0.45?"violet":"green"});}
      for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2+0.1;n.push({x:cx+Math.cos(a)*138,y:cy+Math.sin(a)*138,r:2,c:rng(i+20)>0.5?"violet":"green"});}
      const cn=[];
      for(let i=1;i<=5;i++)cn.push([0,i]);
      for(let i=1;i<=5;i++){cn.push([i,6+(i%8)]);cn.push([i,6+((i+1)%8)]);}
      for(let i=6;i<=13;i++){cn.push([i,14+((i-6)%10)]);cn.push([i,14+((i-5)%10)]);}
      for(let i=6;i<13;i++)cn.push([i,i+1]);
      ns.current={n,cn};
    }
    const {n,cn}=ns.current;
    function draw(){
      const t=(Date.now()-t0.current)/1000;ctx.clearRect(0,0,W,H);
      const wR=burst?999:((t*40)%210);
      cn.forEach(([a,b])=>{
        const na=n[a],nb=n[b],md=(Math.hypot(na.x-W/2,na.y-H/2)+Math.hypot(nb.x-W/2,nb.y-H/2))/2,act=md<wR,isV=nb.c==="violet";
        ctx.beginPath();ctx.moveTo(na.x,na.y);ctx.lineTo(nb.x,nb.y);
        const ba=burst?0.5:(0.18+Math.sin(t*2+a)*0.08);
        ctx.strokeStyle=act?(isV?`rgba(91,97,244,${ba})`:`rgba(20,213,113,${ba})`):(isV?"rgba(91,97,244,0.05)":"rgba(20,140,89,0.05)");
        ctx.lineWidth=act?(burst?1.5:1):0.5;ctx.stroke();
        if(act&&!burst){const pt=(t*0.8+a*0.3)%1;ctx.beginPath();ctx.arc(na.x+(nb.x-na.x)*pt,na.y+(nb.y-na.y)*pt,1.2,0,Math.PI*2);ctx.fillStyle=`rgba(20,213,113,${0.5*(1-Math.abs(pt-0.5)*2)})`;ctx.fill();}
      });
      n.forEach(nd=>{
        const d=Math.hypot(nd.x-W/2,nd.y-H/2),act=d<wR,int=act?Math.min(1,(wR-d)/40):0;
        ctx.beginPath();ctx.arc(nd.x,nd.y,burst?nd.r*1.3:nd.r,0,Math.PI*2);
        if(nd.c==="forest")ctx.fillStyle=C.forest;
        else if(burst)ctx.fillStyle=nd.c==="violet"?"rgba(91,97,244,0.9)":"rgba(20,213,113,0.9)";
        else if(nd.c==="violet")ctx.fillStyle=act?`rgba(91,97,244,${0.3+int*0.7})`:"rgba(91,97,244,0.12)";
        else ctx.fillStyle=act?`rgba(20,213,113,${0.3+int*0.7})`:"rgba(20,140,89,0.12)";
        ctx.fill();
      });
      raf.current=requestAnimationFrame(draw);
    }
    draw();return()=>cancelAnimationFrame(raf.current);
  },[burst]);
  return <canvas ref={cvs} style={{display:"block",margin:"0 auto"}}/>;
}

function ArcGauge({score=61,animated=true,size="normal"}) {
  const big=size==="big";
  const r=big?130:90,sw=big?11:9,cx=big?160:110,cy=big?162:112,svgW=big?320:220,svgH=big?195:135;
  const pol=(rad,a)=>({x:cx+rad*Math.cos(a*Math.PI/180),y:cy+rad*Math.sin(a*Math.PI/180)});
  const s=pol(r,180),e=pol(r,360);
  const bgArc=`M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  const arcLen=Math.PI*r;
  const targetFrac=score/100;
  const [frac,setFrac]=useState(animated?0:targetFrac);
  const [num,setNum]=useState(animated?0:score);
  const [dotV,setDotV]=useState(!animated);
  const sc=getScoreColor(score),sev=getSevBadge(score);
  const dot=pol(r,180+180*frac);

  useEffect(()=>{
    if(!animated)return;
    const start=Date.now();
    const tick=()=>{
      const p=Math.min((Date.now()-start)/1400,1);
      const ease=1-Math.pow(1-p,3);
      setFrac(ease*targetFrac);
      setNum(Math.round(ease*score));
      if(p<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const dt=setTimeout(()=>setDotV(true),1650);
    return()=>clearTimeout(dt);
  },[animated,score]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        <defs>
          <linearGradient id={`ag-${size}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={C.forest}/><stop offset="50%" stopColor={C.emerald}/><stop offset="100%" stopColor={C.mint}/>
          </linearGradient>
          <filter id="glo"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d={bgArc} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={sw} strokeLinecap="round"/>
        <path d={bgArc} fill="none" stroke={`url(#ag-${size})`} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={arcLen} strokeDashoffset={arcLen*(1-frac)}
          style={{transition:animated?"none":"stroke-dashoffset 0s"}}/>
        {dotV&&frac>0&&<circle cx={dot.x} cy={dot.y} r={big?6:5} fill={sc} filter="url(#glo)"/>}
        <text x={cx} y={cy-(big?14:10)} textAnchor="middle"
          style={{fontSize:big?56:48,fontWeight:800,fill:sc,fontFamily:"'Unbounded',sans-serif",letterSpacing:"-2px"}}>
          {num}
        </text>
        <text x={cx} y={cy+(big?14:12)} textAnchor="middle"
          style={{fontSize:big?11:10,fontWeight:600,fill:C.dim,letterSpacing:2.5,textTransform:"uppercase",fontFamily:"'Space Grotesk',sans-serif"}}>
          UX Score
        </text>
      </svg>
      <div style={{marginTop:-2,padding:"4px 16px",borderRadius:20,background:sev.bg,fontSize:11,fontWeight:600,color:sev.color,fontFamily:"'Space Grotesk',sans-serif",transition:"background 0.4s ease,color 0.4s ease"}}>{sev.label}</div>
    </div>
  );
}

// ── SCREEN 1: INPUT ──────────────────────────────────────────────────
function InputScreen({onNext}) {
  const [url,setUrl]=useState(""),[industry,setIndustry]=useState(""),[goals,setGoals]=useState([]);
  const [challenge,setChallenge]=useState(2),[focus,setFocus]=useState([]),[hov,setHov]=useState(false);
  const [name,setName]=useState(""),[email,setEmail]=useState("");
  const isReady=url&&industry;
  const toggleGoal=g=>setGoals(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const toggleFocus=f=>setFocus(p=>p.includes(f)?p.filter(x=>x!==f):[...p,f]);
  const inp={width:"100%",height:42,borderRadius:8,border:"1px solid rgba(0,0,0,0.07)",padding:"0 13px",fontSize:13,color:C.navy,background:"rgba(255,255,255,0.55)",fontFamily:"'Space Grotesk',sans-serif",fontWeight:400,outline:"none",transition:"all 0.2s",boxShadow:"inset 0 1px 2px rgba(0,0,0,0.03)"};
  const oF=e=>{e.target.style.borderColor="rgba(22,163,74,0.4)";e.target.style.background="rgba(255,255,255,0.85)";e.target.style.boxShadow="0 0 0 3px rgba(22,163,74,0.07)";};
  const oB=e=>{e.target.style.borderColor="rgba(0,0,0,0.07)";e.target.style.background="rgba(255,255,255,0.55)";e.target.style.boxShadow="inset 0 1px 2px rgba(0,0,0,0.03)";};
  const lbl={display:"block",fontSize:12,fontWeight:500,color:"#374151",marginBottom:6,fontFamily:"'Space Grotesk',sans-serif"};
  const cTitle=(icon,text)=>(
    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:660,color:C.navy,marginBottom:18,display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:24,height:24,borderRadius:6,background:"linear-gradient(135deg,rgba(20,140,89,0.1),rgba(20,213,113,0.05))",display:"flex",alignItems:"center",justifyContent:"center"}}>{icon}</div>
      {text}
    </div>
  );
  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{FONTS}</style><Blobs/>
      <Nav onNew={()=>{}} rightLabel=""/>
      <div style={{maxWidth:1060,margin:"0 auto",padding:"8px 28px 60px",position:"relative",zIndex:10}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:26,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 6px"}}>
            Configure Your{" "}<span style={{background:"linear-gradient(90deg,#186132,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Audit</span>
          </h1>
          <p style={{fontSize:14,color:C.muted,margin:0}}>Fill in the details below and we'll analyse your site instantly.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:16,alignItems:"stretch"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{...glass,padding:24}}>
              {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#148C59" strokeWidth="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="#148C59" strokeWidth="1.5"/></svg>,"Drop Your Details")}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div><label style={lbl}>Who is this audit for? *</label><input type="text" placeholder="Jane Smith" value={name} onChange={e=>setName(e.target.value)} style={inp} onFocus={oF} onBlur={oB}/></div>
                <div><label style={lbl}>Best email to contact you? *</label><input type="email" placeholder="jane@company.com" value={email} onChange={e=>setEmail(e.target.value)} style={inp} onFocus={oF} onBlur={oB}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div><label style={lbl}>Drop your site link *</label><input type="url" placeholder="https://yoursite.com" value={url} onChange={e=>setUrl(e.target.value)} style={inp} onFocus={oF} onBlur={oB}/></div>
                <div><label style={lbl}>What type of site is this? *</label>
                  <div style={{position:"relative"}}>
                    <select value={industry} onChange={e=>setIndustry(e.target.value)} style={{...inp,appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",paddingRight:28,color:industry?C.navy:"#9CA3AF"}} onFocus={oF} onBlur={oB}>
                      <option value="" disabled>Select site type...</option>
                      {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div style={{...glass,padding:24,flex:1}}>
              {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,"Your Focus Area")}
              <div style={{marginBottom:20}}>
                <label style={{...lbl,marginBottom:8}}>What is this page supposed to do?</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"10px 14px",borderRadius:10,background:"rgba(245,246,248,0.8)",border:"1px solid rgba(0,0,0,0.04)",boxShadow:"inset 0 2px 4px rgba(0,0,0,0.04),0 1px 0 rgba(255,255,255,0.7)",minHeight:46}}>
                  {PAGE_GOALS.map(g=>{
                    const sel=goals.includes(g),isV=["Demo requests","Sales"].includes(g);
                    return <div key={g} onClick={()=>toggleGoal(g)} style={{padding:"5px 14px",borderRadius:6,background:sel?(isV?"#E0E7FF":"#D1FAE5"):"rgba(255,255,255,0.85)",border:"none",cursor:"pointer",transition:"all 0.18s",fontSize:12.5,fontWeight:sel?600:450,color:sel?C.navy:C.muted,whiteSpace:"nowrap",boxShadow:sel?"0 1px 3px rgba(0,0,0,0.06)":"0 1px 2px rgba(0,0,0,0.03)",transform:sel?"scale(1.03)":"scale(1)"}}>{g}</div>;
                  })}
                </div>
              </div>
              <div style={{marginBottom:22}}>
                <label style={{...lbl,marginBottom:10}}>How urgent is the problem?</label>
                <div style={{position:"relative"}}>
                  <input type="range" min="0" max="4" step="1" value={challenge} onChange={e=>setChallenge(+e.target.value)} className="uxpact-slider" style={{width:"100%",margin:0,display:"block"}}/>
                  <div style={{position:"relative",height:22,marginTop:5}}>
                    {URGENCY.map((l,i)=>{
                      const pct=i/4;
                      const left=`calc(${pct*100}% + ${10 - pct*20}px)`;
                      return (
                        <span key={i} style={{
                          position:"absolute",
                          left,
                          transform:i===0?"none":i===4?"translateX(-100%)":"translateX(-50%)",
                          fontSize:10.5,
                          color:challenge===i?C.navy:C.dim,
                          fontWeight:challenge===i?600:400,
                          whiteSpace:"nowrap",
                          transition:"color 0.2s",
                          fontFamily:"'Space Grotesk',sans-serif",
                          top:0
                        }}>{l}</span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={{marginBottom:22}}>
                <label style={{...lbl,marginBottom:10}}>What would you like reviewed?</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {REVIEW_FOCUS.map(item=>{
                    const ch=focus.includes(item);
                    return <div key={item} onClick={()=>toggleFocus(item)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:"1px solid rgba(0,0,0,0.06)",background:ch?"rgba(20,213,113,0.05)":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all 0.18s"}}>
                      <div style={{width:16,height:16,borderRadius:4,border:ch?"none":"1.5px solid #BFC5CE",background:ch?"linear-gradient(135deg,#16a34a,#22c55e)":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.18s"}}>
                        {ch&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <span style={{fontSize:12.5,fontWeight:450,color:"#4B5563",whiteSpace:"nowrap"}}>{item}</span>
                    </div>;
                  })}
                </div>
              </div>
              <button disabled={!isReady} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>isReady&&onNext({url:url||"clearflow.io",industry,goals})}
                style={{width:"100%",height:48,borderRadius:10,border:"none",background:isReady?(hov?"linear-gradient(135deg,#126B2E,#148C59)":"linear-gradient(135deg,#186132,#14D571)"):"rgba(0,0,0,0.06)",color:isReady?"#fff":"#9CA3AF",fontFamily:"'Unbounded',sans-serif",fontSize:14,fontWeight:660,cursor:isReady?"pointer":"not-allowed",transition:"all 0.3s",boxShadow:isReady?(hov?"0 8px 28px rgba(20,140,89,0.3)":"0 3px 12px rgba(20,140,89,0.15)"):"none",transform:isReady&&hov?"translateY(-1px)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                Run My Audit
                {isReady&&<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div style={{textAlign:"center",fontSize:11,color:"#9CA3AF",marginTop:10}}>Free during beta · Full reports from £X/audit after launch</div>
            </div>
          </div>
          <div style={{...glass,padding:"22px 18px",display:"flex",flexDirection:"column"}}>
            {cTitle(<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,"Your Audit Pack")}
            <div style={{display:"flex",flexDirection:"column",gap:10,flex:1}}>
              {[
                {lbl:"What you'll get",lc:C.emerald,bg:"linear-gradient(135deg,rgba(20,213,113,0.12),rgba(20,140,89,0.06))",t:"Full UX Diagnosis + PDF",d:"Scored audit across UX, industry & content branding - downloadable report",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#148C59" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>},
                {lbl:"Fix with context",lc:C.violet,bg:"linear-gradient(135deg,rgba(91,97,244,0.12),rgba(91,97,244,0.05))",t:"Conversion Blueprint",d:"Every finding pinned to your page with AI-ready fix prompts",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#5B61F4" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 12l2 2 4-4" stroke="#5B61F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>},
                {lbl:"Track your fixes",lc:C.emerald,bg:"linear-gradient(135deg,rgba(20,140,89,0.10),rgba(20,213,113,0.05))",t:"Pulse Tracker",d:"Chrome & Edge extension - check off fixes on your live site",icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#148C59" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#148C59" strokeWidth="1.5"/></svg>},
              ].map((p,i)=>(
                <div key={i} style={{padding:"18px 16px",borderRadius:10,background:p.bg,border:"1px solid rgba(255,255,255,0.5)",boxShadow:"0 2px 8px rgba(0,0,0,0.03),inset 0 1px 0 rgba(255,255,255,0.5)",flex:1,display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{p.icon}</div>
                  <div><div style={{fontSize:10,fontWeight:600,color:p.lc,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>{p.lbl}</div><div style={{fontFamily:"'Unbounded',sans-serif",fontSize:12,fontWeight:660,color:C.navy,marginBottom:4,lineHeight:1.3}}>{p.t}</div><div style={{fontSize:11.5,color:C.muted,lineHeight:1.45}}>{p.d}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 2: SCAN ────────────────────────────────────────────────────
function ScanScreen({auditData,onAccess}) {
  const [phase,setPhase]=useState("scan");
  const [anim,setAnim]=useState(false);
  const [lblIdx,setLblIdx]=useState(0),[lblOp,setLblOp]=useState(1);
  const [hangTight,setHangTight]=useState(false);
  const barRef=useRef(null),[hovCTA,setHovCTA]=useState(false);

  useEffect(()=>{
    const t1=setTimeout(()=>setPhase("burst"),8000);
    const t2=setTimeout(()=>setPhase("result"),8900);
    const t3=setTimeout(()=>setAnim(true),9100);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);
  useEffect(()=>{const t=setTimeout(()=>setHangTight(true),6000);return()=>clearTimeout(t);},[]);
  useEffect(()=>{
    const i=setInterval(()=>{setLblOp(0);setTimeout(()=>{setLblIdx(p=>(p+1)%STATUS_MSGS.length);setLblOp(1);},300);},1800);
    return()=>clearInterval(i);
  },[]);
  useEffect(()=>{
    const bar=barRef.current;if(!bar)return;
    const start=Date.now();let raf;
    const tick=()=>{const p=Math.min((Date.now()-start)/8000,1);bar.style.width=(1-Math.pow(1-p,2.5))*100+"%";if(p<1)raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[]);

  const showResult=phase==="result";
  const url=auditData?.url||"clearflow.io";
  const goals=auditData?.goals||["Signups","Demo requests"];

  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{FONTS}</style><Blobs/>
      <Nav onNew={()=>{}}/>
      <div style={{maxWidth:1060,margin:"0 auto",padding:"8px 28px 60px",position:"relative",zIndex:10}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:26,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 6px"}}>
            {showResult?"Your ":"Scanning "}
            <span style={{background:"linear-gradient(90deg,#186132,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              {showResult?"UXpact":"Your Site"}
            </span>
          </h1>
          <p style={{fontSize:14,color:C.muted,margin:0}}>{showResult?"Here's how your site performed across our analysis.":"We're deep-diving into your site right now."}</p>
        </div>

        <div style={{...glass,padding:"36px 32px",display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
            <Pill text={url} v="green"/>
            {(goals.length?goals:["Signups","Demo requests"]).slice(0,2).map((g,i)=><Pill key={i} text={g} v={["Demo requests","Sales"].includes(g)?"violet":"green"}/>)}
          </div>

          {!showResult&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,opacity:phase==="burst"?0:1,transition:"opacity 0.4s ease"}}>
              <div style={{width:320,height:320}}><NodeMap burst={phase==="burst"}/></div>
              <div style={{fontSize:12.5,fontWeight:500,color:C.emerald,opacity:lblOp,transition:"opacity 0.3s ease",minHeight:18,textAlign:"center"}}>{STATUS_MSGS[lblIdx]}</div>
              <div style={{width:"100%",maxWidth:260,height:3,borderRadius:2,background:"rgba(0,0,0,0.06)",overflow:"hidden",margin:"0 auto"}}>
                <div ref={barRef} style={{height:"100%",borderRadius:2,width:"0%",background:`linear-gradient(90deg,${C.forest},${C.mint})`,boxShadow:"0 0 6px rgba(20,213,113,0.25)"}}/>
              </div>
              <div style={{fontSize:11,color:C.dim,opacity:hangTight?1:0,transition:"opacity 0.8s ease",marginTop:4,textAlign:"center"}}>Hang tight - almost there</div>
            </div>
          )}

          {showResult&&(
            <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
              <div className="fade-up" style={{animationDelay:"0s"}}><ArcGauge animated={anim}/></div>

              {/* Top findings teaser - compact only */}
              <div className="fade-up" style={{animationDelay:"0.25s",width:"100%",maxWidth:520}}>
                <div style={{fontSize:10,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Top Findings</div>
                {[{d:"#EF4444",t:"Hero copy lacks a clear value proposition",s:"Critical"},{d:"#F59E0B",t:"No trust signals visible above the fold",s:"Major"},{d:"#F59E0B",t:"Primary CTA competes with navigation links",s:"Major"}].map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:8,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(0,0,0,0.04)",marginBottom:6,animation:`fadeUp 0.3s ease ${0.35+i*0.1}s both`}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:f.d,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:12.5,fontWeight:500,color:C.navy}}>{f.t}</span>
                    <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5,color:f.d,flexShrink:0}}>{f.s}</span>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="fade-up" style={{animationDelay:"0.5s",display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,width:"100%",maxWidth:420,borderRadius:10,overflow:"hidden",border:"1px solid rgba(255,255,255,0.65)",background:"rgba(255,255,255,0.5)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",boxShadow:"0 4px 16px rgba(0,0,0,0.06)"}}>
                <div style={{padding:"16px 18px",borderRight:"1px solid rgba(0,0,0,0.05)",textAlign:"center"}}>
                  <div style={{fontSize:22,fontWeight:800,color:C.forest,fontFamily:"'Unbounded',sans-serif",marginBottom:3}}>~42%</div>
                  <div style={{fontSize:11,fontWeight:500,color:C.muted}}>mobile drop-off</div>
                </div>
                <div style={{padding:"16px 18px",textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginBottom:3}}>
                    <span style={{fontSize:15}}>⚠️</span>
                    <span style={{fontSize:22,fontWeight:800,color:C.navy,fontFamily:"'Unbounded',sans-serif"}}>~£2,800/mo</span>
                  </div>
                  <div style={{fontSize:11,fontWeight:500,color:C.muted}}>at risk</div>
                </div>
              </div>

              {/* CTA */}
              <div className="fade-up" style={{animationDelay:"0.65s",width:"100%",maxWidth:420}}>
                <button onMouseEnter={()=>setHovCTA(true)} onMouseLeave={()=>setHovCTA(false)} onClick={onAccess}
                  style={{width:"100%",padding:"14px 40px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'Unbounded',sans-serif",fontSize:14,fontWeight:660,color:"#fff",background:hovCTA?`linear-gradient(135deg,${C.violet},#7B7FFF)`:`linear-gradient(135deg,${C.forest},${C.mint})`,boxShadow:hovCTA?"0 4px 20px rgba(91,97,244,0.35)":"0 3px 12px rgba(20,140,89,0.2)",transition:"all 0.3s ease",transform:hovCTA?"translateY(-1px)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  Access Full Report
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-7-7l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── UX PRO SUB-COMPONENTS ──────────────────────────────────────────────
function ProReaudit() {
  const [tab,setTab]=useState("delta");
  const [running,setRunning]=useState(false);
  const [ran,setRan]=useState(false);
  const [progress,setProgress]=useState(0);

  const runAudit=()=>{
    setRunning(true);setProgress(0);setRan(false);
    const msgs=["Comparing structural changes…","Re-scanning above-fold signals…","Checking CTA placement…","Evaluating copy shifts…","Cross-referencing previous findings…"];
    let i=0;
    const tick=setInterval(()=>{
      setProgress(p=>Math.min(p+Math.random()*18+8,100));
      i++;
      if(i>=msgs.length){clearInterval(tick);setTimeout(()=>{setRunning(false);setRan(true);},400);}
    },600);
  };

  const findings=[
    {l:"CTA above fold",prev:"Critical",now:"resolved",c:"#16A34A",icon:"✓"},
    {l:"Value proposition",prev:"Critical",now:"resolved",c:"#16A34A",icon:"✓"},
    {l:"Social proof placement",prev:"Major",now:"improved",c:"#148C59",icon:"↑"},
    {l:"Mobile nav hides pricing",prev:"Major",now:"regressed",c:"#F59E0B",icon:"↓"},
    {l:"Brand voice consistency",prev:"Major",now:"unchanged",c:"#9CA3AF",icon:"—"},
    {l:"Feature copy outcomes",prev:"Minor",now:"resolved",c:"#16A34A",icon:"✓"},
  ];
  const resolved=findings.filter(f=>f.now==="resolved");
  const regressed=findings.filter(f=>f.now==="regressed");
  const improved=findings.filter(f=>f.now==="improved");
  const unchanged=findings.filter(f=>f.now==="unchanged");

  const tabFindings=tab==="delta"?findings:tab==="resolved"?[...resolved,...improved]:tab==="regressed"?regressed:unchanged;

  const navColor={resolved:"#16A34A",improved:"#148C59",regressed:"#F59E0B",unchanged:"#9CA3AF"};
  const rowBg={resolved:"rgba(20,213,113,0.05)",improved:"rgba(20,140,89,0.05)",regressed:"rgba(245,158,11,0.06)",unchanged:"rgba(0,0,0,0.02)"};

  return (
    <div style={{borderRadius:12,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.8)",marginBottom:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
      {/* Header */}
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <span style={{fontSize:20,marginTop:1}}>🔄</span>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <div style={{fontSize:14,fontWeight:700,color:"#0B1C48",fontFamily:"'Unbounded',sans-serif",letterSpacing:"-0.2px"}}>Re-audit & Regression Tracking</div>
                <div style={{fontSize:9,fontWeight:700,background:"rgba(91,97,244,0.12)",color:"#5B61F4",borderRadius:20,padding:"3px 10px",letterSpacing:"0.04em"}}>Pro</div>
              </div>
              <div style={{fontSize:12,color:"#6B7280",lineHeight:1.55,maxWidth:480}}>Re-run the full 50-check audit after making changes. See exactly what improved, what regressed, and what new issues were introduced since your last run.</div>
            </div>
          </div>
          {!ran&&<button onClick={runAudit} disabled={running} style={{flexShrink:0,padding:"9px 18px",borderRadius:9,border:"none",cursor:running?"not-allowed":"pointer",background:running?"rgba(20,140,89,0.1)":"linear-gradient(135deg,#186132,#14D571)",color:running?"#148C59":"#fff",fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:700,transition:"all 0.2s",boxShadow:running?"none":"0 2px 8px rgba(20,140,89,0.2)"}}>
            {running?"Running…":"Run Re-audit →"}
          </button>}
          {ran&&<div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,padding:"7px 14px",borderRadius:9,background:"rgba(20,213,113,0.1)",border:"1px solid rgba(20,213,113,0.2)"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{fontSize:11,fontWeight:700,color:"#16A34A"}}>Audit complete</span>
          </div>}
        </div>
      </div>

      {/* Progress bar while running */}
      {running&&(
        <div style={{padding:"14px 20px",background:"rgba(20,213,113,0.04)",borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:11,color:"#6B7280"}}>Comparing against previous audit…</span>
            <span style={{fontSize:11,fontWeight:700,color:"#148C59"}}>{Math.round(progress)}%</span>
          </div>
          <div style={{height:4,borderRadius:2,background:"rgba(0,0,0,0.06)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:2,background:"linear-gradient(90deg,#186132,#14D571)",width:`${progress}%`,transition:"width 0.4s ease"}}/>
          </div>
        </div>
      )}

      {/* Results */}
      {ran&&(<>
        {/* Score banner */}
        <div style={{padding:"16px 20px",background:"linear-gradient(135deg,rgba(20,213,113,0.08),rgba(91,97,244,0.05))",borderBottom:"1px solid rgba(0,0,0,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Previous</div>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:24,fontWeight:800,color:"#9CA3AF"}}>61</div>
            </div>
            <div style={{fontSize:22,color:"#14D571",fontWeight:300}}>→</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:10,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Now</div>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:32,fontWeight:800,color:"#148C59"}}>74</div>
            </div>
            <div style={{padding:"4px 12px",borderRadius:20,background:"rgba(20,213,113,0.15)",border:"1px solid rgba(20,213,113,0.25)"}}>
              <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:800,color:"#148C59"}}>+13 pts</span>
            </div>
          </div>
          <div style={{display:"flex",gap:14}}>
            {[[resolved.length,"Resolved","#16A34A"],[improved.length,"Improved","#148C59"],[regressed.length,"Regressed","#F59E0B"],[unchanged.length,"Unchanged","#9CA3AF"]].map(([n,l,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:18,fontWeight:800,color:c}}>{n}</div>
                <div style={{fontSize:10,color:"#9CA3AF"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score bar */}
        <div style={{padding:"12px 20px 0",borderBottom:"1px solid rgba(0,0,0,0.05)"}}>
          <div style={{position:"relative",height:8,borderRadius:4,background:"rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:6}}>
            <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:4,background:"rgba(0,0,0,0.1)",width:"61%"}}/>
            <div style={{position:"absolute",left:0,top:0,height:"100%",borderRadius:4,background:"linear-gradient(90deg,#186132,#14D571)",width:"74%",transition:"width 1s ease"}}/>
            <div style={{position:"absolute",top:-2,left:"61%",transform:"translateX(-50%)",width:2,height:12,background:"rgba(255,255,255,0.9)",borderRadius:1}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#9CA3AF",paddingBottom:12}}>
            <span>Previous: 61</span><span>Industry avg: 68</span><span style={{color:"#148C59",fontWeight:600}}>Current: 74</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid rgba(0,0,0,0.05)",background:"rgba(255,255,255,0.5)"}}>
          {[["delta","All Changes"],["resolved","Resolved & Improved"],["regressed","Regressed"],["unchanged","Unchanged"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)} style={{padding:"10px 16px",fontSize:11,fontWeight:tab===v?700:400,color:tab===v?"#148C59":"#9CA3AF",background:"transparent",border:"none",borderBottom:tab===v?"2px solid #148C59":"2px solid transparent",cursor:"pointer",transition:"all 0.2s",fontFamily:"'Space Grotesk',sans-serif",whiteSpace:"nowrap",marginBottom:-1}}>{l}</button>
          ))}
        </div>

        {/* Finding rows */}
        <div style={{maxHeight:280,overflowY:"auto"}}>
          {tabFindings.map((f,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",borderBottom:"1px solid rgba(0,0,0,0.04)",background:rowBg[f.now],transition:"background 0.15s"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:rowBg[f.now],border:`1.5px solid ${navColor[f.now]}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:10,fontWeight:700,color:navColor[f.now]}}>{f.icon}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12.5,fontWeight:600,color:"#0B1C48"}}>{f.l}</div>
                <div style={{fontSize:10.5,color:"#9CA3AF",marginTop:1}}>Was: <span style={{fontWeight:600,color:"#6B7280"}}>{f.prev}</span></div>
              </div>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:navColor[f.now],background:`${rowBg[f.now]}`,padding:"3px 10px",borderRadius:20,border:`1px solid ${navColor[f.now]}33`}}>{f.now}</div>
            </div>
          ))}
        </div>

        {/* Lock CTA */}
        <div style={{padding:"12px 20px",background:"rgba(11,28,72,0.02)",borderTop:"1px solid rgba(0,0,0,0.04)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>🔒</span>
            <span style={{fontSize:11.5,color:"#6B7280"}}>Re-audit unlocks once your Pulse checklist is complete</span>
          </div>
          <button onClick={()=>setRan(false)} style={{fontSize:10,fontWeight:600,color:"#148C59",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Reset demo</button>
        </div>
      </>)}

      {/* Locked state (initial) */}
      {!ran&&!running&&(
        <div style={{padding:"20px",display:"flex",alignItems:"center",gap:14,background:"rgba(11,28,72,0.02)"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
              {[["3 Resolved","#16A34A"],["1 Regressed","#F59E0B"],["Score +13","#148C59"]].map(([t,c])=>(
                <div key={t} style={{fontSize:11,fontWeight:600,color:c,background:`${c}15`,border:`1px solid ${c}30`,borderRadius:6,padding:"4px 10px"}}>{t}</div>
              ))}
            </div>
            <div style={{fontSize:11,color:"#9CA3AF",lineHeight:1.55}}>Click "Run Re-audit →" to simulate what happens after you ship fixes. See score delta, resolved vs regressed findings, and what new issues surfaced.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProVision() {
  const [view,setView]=useState("vision"); // "current" | "vision" | "split"
  const [activeAnnotation,setActiveAnnotation]=useState(null);

  const annotations=[
    {id:1,label:"H1 rewritten - benefit-led",color:"#14D571",zone:"hero-h1"},
    {id:2,label:"CTA moved above fold, micro-copy added",color:"#5B61F4",zone:"hero-cta"},
    {id:3,label:"Trust strip inserted below CTA",color:"#14D571",zone:"hero-trust"},
    {id:4,label:"Feature cards rewritten - outcome language",color:"#5B61F4",zone:"features"},
    {id:5,label:"Logo strip + testimonial quote added",color:"#14D571",zone:"social"},
    {id:6,label:"Pricing anchor copy added above grid",color:"#5B61F4",zone:"pricing"},
  ];

  const Annotation=({id,children,zone})=>{
    const ann=annotations.find(a=>a.id===id);
    const active=activeAnnotation===id;
    return (
      <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setActiveAnnotation(active?null:id)}>
        {children}
        {(view==="vision"||view==="split")&&<div style={{position:"absolute",top:4,right:-10,width:20,height:20,borderRadius:"50%",background:ann.color,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,boxShadow:"0 2px 6px rgba(0,0,0,0.2)",transition:"transform 0.15s",transform:active?"scale(1.2)":"scale(1)"}}>
          <span style={{fontSize:9,fontWeight:800,color:"#fff"}}>{id}</span>
        </div>}
        {active&&(view==="vision"||view==="split")&&<div style={{position:"absolute",top:28,right:-10,background:"#0B1C48",color:"#fff",fontSize:11,padding:"6px 10px",borderRadius:7,whiteSpace:"nowrap",zIndex:20,pointerEvents:"none",boxShadow:"0 4px 14px rgba(0,0,0,0.25)",fontFamily:"'Space Grotesk',sans-serif"}}>
          {ann.label}
          <div style={{position:"absolute",top:-5,right:5,width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderBottom:"5px solid #0B1C48"}}/>
        </div>}
      </div>
    );
  };

  const CurrentPage=()=>(
    <div style={{background:"#fff",borderRadius:8,overflow:"hidden",border:"1px solid rgba(0,0,0,0.06)"}}>
      {/* Current nav */}
      <div style={{padding:"10px 16px",borderBottom:"1px solid #F3F4F6",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff"}}>
        <div style={{fontWeight:700,fontSize:12,color:"#0B1C48"}}>YourSite</div>
        <div style={{display:"flex",gap:12,fontSize:10.5,color:"#9CA3AF",alignItems:"center"}}>
          {["Home","Features","Pricing","Blog"].map(t=><span key={t}>{t}</span>)}
          <span style={{padding:"3px 10px",border:"1px solid #0B1C48",borderRadius:4,fontSize:10,fontWeight:600,color:"#0B1C48"}}>Get Started</span>
        </div>
      </div>
      {/* Current hero */}
      <div style={{padding:"20px 16px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#0B1C48",marginBottom:6,lineHeight:1.3,fontFamily:"'Unbounded',sans-serif"}}>Powerful analytics for modern teams</div>
        <div style={{fontSize:11,color:"#6B7280",marginBottom:14,lineHeight:1.5}}>Track, measure, and optimise your product with real-time data.</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[40,60,50,70,35].map((w,i)=><div key={i} style={{height:10,width:w,background:"rgba(11,28,72,0.07)",borderRadius:3}}/>)}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:4}}>
          {[55,45,65].map((w,i)=><div key={i} style={{height:10,width:w,background:"rgba(11,28,72,0.05)",borderRadius:3}}/>)}
        </div>
        <div style={{height:28,marginTop:16,width:"45%",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(24,97,50,0.25)",borderRadius:5,fontSize:11,fontWeight:600,color:"#186132"}}>Start Free Trial</div>
        <div style={{marginTop:4,fontSize:9,color:"#DC2626"}}>⚠ CTA is 680px from top - below fold on mobile</div>
      </div>
      {/* Current features */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>FEATURES</div>
        <div style={{fontSize:12,fontWeight:700,color:"#0B1C48",marginBottom:8}}>Everything you need</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {["Real-time dashboards","Custom reports","Team collaboration"].map((t,i)=>(
            <div key={i} style={{padding:"8px",background:"#F9FAFB",borderRadius:5,border:"1px solid #E5E7EB"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#0B1C48",marginBottom:2}}>{t}</div>
              <div style={{fontSize:9.5,color:"#9CA3AF"}}>We built this to give you instant visibility.</div>
            </div>
          ))}
        </div>
      </div>
      {/* Current social */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#0B1C48",marginBottom:6}}>Trusted by teams at leading companies</div>
        <div style={{display:"flex",gap:8,marginBottom:6}}>{[50,40,60,45,38].map((w,i)=><div key={i} style={{height:14,width:w,background:"rgba(11,28,72,0.08)",borderRadius:3}}/>)}</div>
        <div style={{background:"#FFF4E6",border:"1px solid #FFD580",borderRadius:4,padding:"6px 10px",fontSize:10,color:"#92400E"}}>No testimonial quotes detected</div>
      </div>
    </div>
  );

  const VisionPage=()=>(
    <div style={{background:"#fff",borderRadius:8,overflow:"hidden",border:"1px solid rgba(20,213,113,0.2)",boxShadow:"0 0 0 2px rgba(20,213,113,0.08)"}}>
      {/* Vision nav */}
      <div style={{padding:"10px 16px",borderBottom:"1px solid #F3F4F6",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#fff"}}>
        <div style={{fontWeight:700,fontSize:12,color:"#0B1C48"}}>YourSite</div>
        <div style={{display:"flex",gap:12,fontSize:10.5,color:"#9CA3AF",alignItems:"center"}}>
          {["Home","Features","Pricing","Blog"].map(t=><span key={t}>{t}</span>)}
          <Annotation id={1} zone="nav-cta">
            <span style={{padding:"4px 12px",background:"linear-gradient(135deg,#186132,#14D571)",borderRadius:5,fontSize:10,fontWeight:700,color:"#fff"}}>Start Free Trial</span>
          </Annotation>
        </div>
      </div>
      {/* Vision hero - CTA above fold, benefit-led copy */}
      <div style={{padding:"20px 16px",borderBottom:"1px solid #F3F4F6",background:"linear-gradient(160deg,rgba(20,213,113,0.04),rgba(255,255,255,0))"}}>
        <Annotation id={1} zone="hero-h1">
          <div style={{fontSize:15,fontWeight:800,color:"#0B1C48",marginBottom:4,lineHeight:1.3,fontFamily:"'Unbounded',sans-serif"}}>Ship features 40% faster - the tool lean SaaS teams trust</div>
        </Annotation>
        <div style={{fontSize:11,color:"#6B7280",marginBottom:10,lineHeight:1.5}}>See what your team shipped, where it slowed down, and what to fix next - without leaving your desk.</div>
        <Annotation id={2} zone="hero-cta">
          <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <div style={{height:28,paddingLeft:16,paddingRight:16,display:"flex",alignItems:"center",background:"linear-gradient(135deg,#186132,#14D571)",borderRadius:6,fontSize:11,fontWeight:700,color:"#fff",boxShadow:"0 2px 8px rgba(20,140,89,0.3)"}}>Start Free Trial →</div>
            <div style={{height:28,paddingLeft:14,paddingRight:14,display:"flex",alignItems:"center",border:"1.5px solid #148C59",borderRadius:6,fontSize:11,fontWeight:600,color:"#148C59"}}>See 2-min demo</div>
          </div>
        </Annotation>
        <Annotation id={3} zone="hero-trust">
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",gap:4}}>{[32,26,28,30,24].map((w,i)=><div key={i} style={{height:14,width:w,background:"rgba(11,28,72,0.12)",borderRadius:2}}/>)}</div>
            <div style={{fontSize:9.5,color:"#9CA3AF"}}>Trusted by 600+ teams</div>
          </div>
        </Annotation>
      </div>
      {/* Vision features - outcome language */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:6}}>FEATURES</div>
        <div style={{fontSize:12,fontWeight:700,color:"#0B1C48",marginBottom:8}}>Your team, always moving forward</div>
        <Annotation id={4} zone="features">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
            {[["You always know what shipped","Real-time dashboards"],["Your team runs any report in 30s","Custom reports"],["No more status meetings","Team collaboration"]].map(([out,t],i)=>(
              <div key={i} style={{padding:"8px",background:"rgba(20,213,113,0.04)",borderRadius:5,border:"1px solid rgba(20,213,113,0.15)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#0B1C48",marginBottom:2}}>{out}</div>
                <div style={{fontSize:9.5,color:"#9CA3AF"}}>{t}</div>
              </div>
            ))}
          </div>
        </Annotation>
      </div>
      {/* Vision social - testimonial near CTA */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#0B1C48",marginBottom:6}}>Trusted by teams at leading companies</div>
        <Annotation id={5} zone="social">
          <div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>{[50,40,60,45,38].map((w,i)=><div key={i} style={{height:14,width:w,background:"rgba(11,28,72,0.12)",borderRadius:3}}/>)}</div>
            <div style={{padding:"8px 10px",borderRadius:5,background:"rgba(20,213,113,0.05)",border:"1px solid rgba(20,213,113,0.12)",fontSize:10,color:"#0B1C48",lineHeight:1.5,fontStyle:"italic"}}>
              "We cut our planning cycle by 3 weeks in the first month."
              <div style={{fontSize:9,color:"#9CA3AF",marginTop:3,fontStyle:"normal"}}>— Sarah Chen, Head of Product, Notion</div>
            </div>
          </div>
        </Annotation>
      </div>
      {/* Vision pricing - anchor copy */}
      <div style={{padding:"12px 16px"}}>
        <Annotation id={6} zone="pricing">
          <div>
            <div style={{fontSize:11,color:"#6B7280",marginBottom:6,lineHeight:1.4}}>Teams using our platform ship 2× faster in their first 90 days.</div>
            <div style={{fontSize:12,fontWeight:700,color:"#0B1C48",marginBottom:8}}>Simple, transparent pricing</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:5}}>
              {[["Starter","$0","free forever",false],["Growth","$49","/ mo",false],["Pro","$99","/ mo",true],["Ent.","Custom","",false]].map(([n,p,s,pop])=>(
                <div key={n} style={{padding:"8px",background:pop?"rgba(20,213,113,0.06)":"#F9FAFB",border:`1px solid ${pop?"rgba(20,213,113,0.3)":"#E5E7EB"}`,borderRadius:5,textAlign:"center",position:"relative"}}>
                  {pop&&<div style={{position:"absolute",top:-7,left:"50%",transform:"translateX(-50%)",background:"#148C59",color:"#fff",fontSize:7,fontWeight:700,padding:"2px 6px",borderRadius:8}}>POPULAR</div>}
                  <div style={{fontSize:9.5,fontWeight:700,color:"#0B1C48"}}>{n}</div>
                  <div style={{fontSize:13,fontWeight:800,color:"#0B1C48",margin:"2px 0"}}>{p}</div>
                  <div style={{fontSize:9,color:"#9CA3AF"}}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </Annotation>
      </div>
    </div>
  );

  return (
    <div style={{borderRadius:12,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.8)",marginBottom:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.05)"}}>
      {/* Header */}
      <div style={{padding:"18px 20px 14px",borderBottom:"1px solid rgba(0,0,0,0.05)"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:14}}>
          <span style={{fontSize:20,marginTop:1}}>✨</span>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <div style={{fontSize:14,fontWeight:700,color:"#0B1C48",fontFamily:"'Unbounded',sans-serif",letterSpacing:"-0.2px"}}>UXpact Vision</div>
              <div style={{fontSize:9,fontWeight:700,background:"rgba(91,97,244,0.12)",color:"#5B61F4",borderRadius:20,padding:"3px 10px",letterSpacing:"0.04em"}}>Pro</div>
            </div>
            <div style={{fontSize:12,color:"#6B7280",lineHeight:1.55,maxWidth:480}}>A fully redesigned version of your site with every audit finding applied - improved structure, rewritten copy, and industry benchmark standards baked in. Click any numbered pin for the annotation.</div>
          </div>
        </div>

        {/* Change summary chips */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {[["CTA above fold","#14D571"],["Benefit-led H1","#5B61F4"],["Secondary CTA added","#14D571"],["Trust strip","#5B61F4"],["Outcome-led features","#14D571"],["Testimonial near CTA","#5B61F4"],["Pricing anchor copy","#14D571"]].map(([t,c])=>(
            <div key={t} style={{fontSize:10,fontWeight:600,color:c,background:`${c}15`,border:`1px solid ${c}30`,borderRadius:5,padding:"3px 9px"}}>{t}</div>
          ))}
        </div>

        {/* View toggle */}
        <div style={{display:"inline-flex",borderRadius:8,border:"1px solid rgba(0,0,0,0.08)",overflow:"hidden"}}>
          {[["current","Current"],["split","Split"],["vision","Vision ✦"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:"7px 16px",fontSize:11,fontWeight:view===v?700:400,color:view===v?"#148C59":"#9CA3AF",background:view===v?"rgba(20,213,113,0.1)":"rgba(255,255,255,0.7)",border:"none",cursor:"pointer",transition:"all 0.2s",fontFamily:"'Space Grotesk',sans-serif"}}>{l}</button>
          ))}
        </div>
        <div style={{fontSize:10,color:"#9CA3AF",marginTop:8}}>Click numbered pins on Vision view to see what changed</div>
      </div>

      {/* Page views */}
      <div style={{padding:"14px 16px"}}>
        {view==="current"&&<CurrentPage/>}
        {view==="vision"&&<VisionPage/>}
        {view==="split"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9CA3AF",marginBottom:6}}>Current</div>
              <CurrentPage/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#14D571",marginBottom:6}}>Vision ✦</div>
              <VisionPage/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProPlugins() {
  const C2={navy:"#0B1C48",muted:"#6B7280",dim:"#9CA3AF",emerald:"#148C59",mint:"#14D571",violet:"#5B61F4",amber:"#F59E0B"};
  const [activePlugin,setActivePlugin]=useState("Figma");
  const uniquePlugins=["Figma","Framer","Webflow","WordPress","Wix","Squarespace","Shopify"];
  const pluginFindings={
    Figma:[{t:"CTA below fold",s:"Critical"},{t:"Value prop unclear",s:"Critical"},{t:"No social proof near CTA",s:"Major"}],
    Framer:[{t:"CTA below fold",s:"Critical"},{t:"Brand voice inconsistent",s:"Major"}],
    Webflow:[{t:"Mobile nav hides pricing",s:"Major"},{t:"Feature copy feature-led",s:"Minor"}],
    WordPress:[{t:"CTA below fold",s:"Critical"},{t:"Page speed below threshold",s:"Major"},{t:"No schema markup",s:"Minor"}],
    Wix:[{t:"Value prop unclear",s:"Critical"},{t:"Mobile layout breaks on scroll",s:"Major"}],
    Squarespace:[{t:"No testimonials near CTA",s:"Major"},{t:"Nav CTA not visually prominent",s:"Minor"}],
    Shopify:[{t:"Above-fold CTA competes with nav",s:"Major"},{t:"Product copy feature-led",s:"Major"},{t:"Trust badges missing near checkout",s:"Minor"}],
    
  };
  const sevColor={Critical:"#EF4444",Major:"#F59E0B",Minor:"#EAB308"};
  return (
    <div style={{borderRadius:12,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.8)",padding:"18px",marginBottom:12,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
        <div style={{fontSize:22}}>🔌</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{fontSize:13.5,fontWeight:700,color:C2.navy}}>Design Tool Plugins</div>
            <div style={{fontSize:9,fontWeight:700,background:"rgba(91,97,244,0.1)",color:C2.violet,borderRadius:20,padding:"2px 9px"}}>Pro Add-on</div>
          </div>
          <div style={{fontSize:12,color:C2.muted,lineHeight:1.6}}>Audit findings surfaced contextually in your design tool. Working on the hero? The plugin shows exactly which findings apply - without leaving your tool.</div>
        </div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
        {uniquePlugins.map(p=>(
          <button key={p} onClick={()=>setActivePlugin(p)}
            style={{fontSize:10,fontWeight:600,borderRadius:6,padding:"4px 10px",border:"none",cursor:"pointer",transition:"all 0.2s",background:activePlugin===p?"linear-gradient(135deg,rgba(91,97,244,0.15),rgba(20,213,113,0.1))":"rgba(238,241,245,0.9)",color:activePlugin===p?C2.violet:C2.muted,transform:activePlugin===p?"scale(1.05)":"scale(1)",boxShadow:activePlugin===p?"0 2px 8px rgba(91,97,244,0.15)":"none"}}>
            {p}
          </button>
        ))}
      </div>
      <div style={{borderRadius:8,background:"rgba(11,28,72,0.03)",border:"1px solid rgba(91,97,244,0.1)",padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:C2.violet}}>Plugin Panel - {activePlugin} · Hero Section Active</div>
          <div style={{width:7,height:7,borderRadius:"50%",background:C2.mint,animation:"pulseAnim 2s infinite"}}/>
        </div>
        {(pluginFindings[activePlugin]||[]).map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<(pluginFindings[activePlugin]||[]).length-1?"1px solid rgba(91,97,244,0.06)":"none"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:sevColor[r.s]||"#9CA3AF",flexShrink:0}}/>
            <span style={{flex:1,fontSize:11.5,color:C2.navy}}>{r.t}</span>
            <button style={{fontSize:9,fontWeight:700,color:C2.violet,background:"rgba(91,97,244,0.08)",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer"}}>Fix →</button>
          </div>
        ))}
        <div style={{marginTop:10,fontSize:10,color:C2.dim}}>{(pluginFindings[activePlugin]||[]).length} of 8 findings apply to this section</div>
      </div>
    </div>
  );
}


function FindingCard({f,state,onState,active,onOpen}) {
  const si=STATES.indexOf(state);
  const handleClick=()=>{if(state==="unread")onState("acknowledged");onOpen(f.id);};
  const cycleState=e=>{e.stopPropagation();onState(STATES[(si+1)%STATES.length]);};
  return (
    <div style={{background:"rgba(255,255,255,0.72)",backdropFilter:"blur(16px)",border:active?`1.5px solid ${C.violet}`:"1px solid rgba(255,255,255,0.8)",borderRadius:12,marginBottom:8,overflow:"hidden",opacity:state==="done"?0.6:1,transition:"all 0.2s ease",boxShadow:active?"0 2px 12px rgba(91,97,244,0.12)":"0 2px 10px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"15px 18px",cursor:"pointer",userSelect:"none"}} onClick={handleClick}>
        <div style={{width:9,height:9,borderRadius:"50%",background:f.sevDot,flexShrink:0,boxShadow:`0 0 6px ${f.sevDot}55`}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13.5,fontWeight:650,color:C.navy,marginBottom:1,textDecoration:state==="done"?"line-through":"none"}}>{f.title}</div>
          <div style={{fontSize:11,color:C.muted}}>{f.sub}</div>
        </div>
        <div onClick={cycleState} style={{...STATE_STYLE[state],padding:"3px 11px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.3px",transition:"all 0.25s ease",flexShrink:0,userSelect:"none"}}>{STATE_LABEL[state]}</div>
        <div style={{fontSize:11,color:active?C.violet:C.dim,transform:active?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.28s ease",flexShrink:0}}>▾</div>
      </div>
    </div>
  );
}

function CTACard({ct,delay}) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:"22px 16px 24px",borderRadius:13,background:ct.bg,border:ct.b,cursor:"pointer",textAlign:"center",boxShadow:hov?"0 16px 40px rgba(0,0,0,0.14)":"0 4px 14px rgba(0,0,0,0.07)",transform:hov?"translateY(-6px) scale(1.02)":"none",transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",animation:`fadeUp 0.35s ease ${delay}s both`}}>
      <div style={{width:46,height:46,borderRadius:12,background:ct.ibg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:hov?"0 6px 20px rgba(0,0,0,0.2)":"0 3px 10px rgba(0,0,0,0.15)",transition:"box-shadow 0.3s ease,transform 0.3s ease",transform:hov?"scale(1.08)":"scale(1)"}}>{ct.icon}</div>
      <div style={{fontSize:12.5,fontWeight:700,color:C.navy,fontFamily:"'Unbounded',sans-serif",marginBottom:6,lineHeight:1.3}}>{ct.t}</div>
      <div style={{fontSize:11.5,color:C.muted,lineHeight:1.5}}>{ct.d}</div>
    </div>
  );
}

function ExpandingCTA({onBlueprint}) {
  const [expanded,setExpanded]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const obs=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting&&entry.intersectionRatio>=0.85)setExpanded(true);
    },{threshold:0.85});
    obs.observe(el);return()=>obs.disconnect();
  },[]);
  return (
    <div ref={ref} style={{borderRadius:16,background:"linear-gradient(135deg,#186132,#14D571)",boxShadow:"0 8px 32px rgba(20,140,89,0.2)",marginBottom:0}}>
      {!expanded?(
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>💜</span>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:14,fontWeight:700,color:"#fff"}}>You're all set.</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>Your audit pack is ready.</div>
          </div>
          <button onClick={()=>setExpanded(true)}
            style={{padding:"9px 20px",borderRadius:9,background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",fontFamily:"'Unbounded',sans-serif",fontSize:11,fontWeight:700,cursor:"pointer",transition:"background 0.2s ease"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.3)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.2)"}>
            Get your pack →
          </button>
        </div>
      ):(
        <div style={{padding:"28px",textAlign:"center",animation:"fadeUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both"}}>
          <div style={{fontSize:24,marginBottom:8}}>💜</div>
          <h2 style={{fontFamily:"'Unbounded',sans-serif",fontSize:20,fontWeight:700,color:"#fff",margin:"0 0 6px"}}>You're all set.</h2>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.75)",margin:"0 0 20px"}}>Your full audit pack is ready to go.</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,maxWidth:680,margin:"0 auto"}}>
            {[
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,ibg:"linear-gradient(145deg,#186132,#148C59)",bg:"rgba(255,255,255,0.96)",b:"none",t:"Full UX Diagnosis + PDF",d:"Scored audit across UX, industry & content branding. Download and share."},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,ibg:"linear-gradient(145deg,#818CF8,#5B61F4)",bg:"rgba(255,255,255,0.96)",b:"none",t:"Conversion Blueprint",d:"Every finding pinned to your page with AI-ready fix prompts."},
              {icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="2"/></svg>,ibg:"linear-gradient(145deg,#14D571,#148C59)",bg:"rgba(255,255,255,0.96)",b:"none",t:"Pulse Tracker",d:"Chrome & Edge extension. Check off fixes as you go."},
            ].map((ct,i)=>(
              <CTACard key={i} ct={ct} delay={i*0.07}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CatScores() {
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),100);return()=>clearTimeout(t);},[]);
  const left=[CATS[0],CATS[2],CATS[4]];
  const right=[CATS[1],CATS[3]];
  const tile=(cat,i,flex)=>{
    const sev=getSevBadge(cat.score);
    return (
      <div key={cat.name} style={{padding:"10px 12px",borderRadius:9,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",backdropFilter:"blur(4px)",animation:`fadeUp 0.3s ease ${i*0.08}s both`,display:"flex",flexDirection:"column",justifyContent:"space-between",...(flex?{flex:1}:{})}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.75)",lineHeight:1.3}}>{cat.name}</span>
            <span style={{fontSize:8,fontWeight:700,color:sev.color,background:"rgba(255,255,255,0.9)",borderRadius:20,padding:"1px 7px",flexShrink:0}}>{sev.label}</span>
          </div>
          <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0,marginLeft:8,animation:`countUp 0.5s ease ${i*0.1}s both`}}>{cat.score}</span>
        </div>
        <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.2)",overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:2,background:"rgba(255,255,255,0.85)",width:mounted?`${cat.score}%`:"0%",transition:`width 0.9s cubic-bezier(0.16,1,0.3,1) ${i*0.1}s`}}/>
        </div>
      </div>
    );
  };
  return (
    <div style={{display:"flex",gap:8,marginTop:16,alignItems:"stretch"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
        {left.map((cat,i)=>tile(cat,i,false))}
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
        {right.map((cat,i)=>tile(cat,i+1,true))}
      </div>
    </div>
  );
}

const GLOSSARY_TERMS = [
  {t:"conversion architecture",d:"The structural design of a page built to guide visitors toward a specific action. Covers CTA placement, visual hierarchy, and friction reduction across the full page flow."},
  {t:"cognitive load",d:"The mental effort a visitor needs to process a page. Cluttered layouts, feature-led copy, and competing CTAs all increase cognitive load and suppress conversion."},
  {t:"trust proximity",d:"Placing social proof such as testimonials, logos, and ratings in close spatial relation to the primary CTA. Reduces hesitation at the exact moment of decision."},
  {t:"scent trail",d:"The continuity of messaging and visual cues from an ad or referral source through to the landing page CTA. A broken scent trail is a leading cause of above-fold drop-off."},
];

function GlossaryStrip() {
  const [active,setActive]=useState(null);
  return (
    <div style={{marginTop:24,borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:18}}>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",color:C.dim,marginRight:4}}>Glossary</span>
          {GLOSSARY_TERMS.map((g,i)=>(
            <div key={i} style={{position:"relative",display:"inline-block"}}>
              <span onClick={()=>setActive(active===i?null:i)}
                style={{fontSize:12,fontWeight:600,color:active===i?C.violet:C.emerald,cursor:"pointer",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:3,transition:"color 0.15s"}}>
                {g.t}
              </span>
              {i<GLOSSARY_TERMS.length-1&&<span style={{color:C.dim,margin:"0 6px",fontSize:11}}>|</span>}
              {active===i&&(
                <div style={{position:"absolute",bottom:"calc(100% + 8px)",left:0,width:260,background:C.navy,color:"#fff",fontSize:11.5,lineHeight:1.6,padding:"10px 14px",borderRadius:9,zIndex:100,boxShadow:"0 6px 20px rgba(0,0,0,0.2)",fontFamily:"'Space Grotesk',sans-serif",animation:"fadeUp 0.15s ease both"}}>
                  <div style={{fontWeight:700,marginBottom:4,color:"#fff"}}>{g.t}</div>
                  <div style={{color:"rgba(255,255,255,0.8)"}}>{g.d}</div>
                  <div style={{position:"absolute",top:"100%",left:16,width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:`5px solid ${C.navy}`}}/>
                </div>
              )}
            </div>
          ))}
        </div>
        <a href="https://pinnate-bagpipe-e02.notion.site/UXpact-Glossary-Terms-Patterns-22a685bc7e8c80c9b3dce868e1d9650d" target="_blank" rel="noreferrer"
          style={{fontSize:11,fontWeight:600,color:C.violet,background:"rgba(91,97,244,0.08)",border:"1px solid rgba(91,97,244,0.2)",borderRadius:20,padding:"4px 12px",textDecoration:"none",whiteSpace:"nowrap",transition:"all 0.15s",flexShrink:0}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(91,97,244,0.15)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(91,97,244,0.08)";}}>
          Full glossary →
        </a>
      </div>
    </div>
  );
}

function CBTile({item,delay}) {
  const [open,setOpen]=useState(false);
  const sc=getSevBadge(item.score);
  return (
    <div onClick={()=>setOpen(o=>!o)} style={{padding:"10px 12px",borderRadius:10,background:"rgba(255,255,255,0.75)",border:"1px solid rgba(255,255,255,0.85)",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",animation:`fadeUp 0.25s ease ${delay}s both`,cursor:"pointer",transition:"box-shadow 0.2s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div style={{fontSize:10.5,fontWeight:700,color:C.navy}}>{item.label}</div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:14,fontWeight:800,color:getScoreColor(item.score)}}>{item.score}</span>
          <span style={{fontSize:8.5,fontWeight:700,color:sc.color,background:sc.bg,borderRadius:20,padding:"2px 7px"}}>{sc.label}</span>
          <span style={{fontSize:9,color:C.dim,transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}> ▾</span>
        </div>
      </div>
      <div style={{height:3,borderRadius:2,background:"rgba(0,0,0,0.06)",marginBottom:open?7:0,overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:2,background:getScoreColor(item.score),width:`${item.score}%`,transition:"width 0.8s ease"}}/>
      </div>
      <div className="expand-finding" style={{maxHeight:open?"120px":"0px",opacity:open?1:0}}>
        <div style={{fontSize:10.5,color:C.muted,lineHeight:1.45,paddingTop:4}}>{item.verdict}</div>
      </div>
    </div>
  );
}

function FullUXpact({onBlueprint,onProScreen}) {
  const [states,setStates]=useState(()=>Object.fromEntries(FINDINGS.map(f=>[f.id,"unread"])));
  const [filter,setFilter]=useState("all");
  const [wsTab,setWsTab]=useState("findings");
  const [showAllPassed,setShowAllPassed]=useState(false);
  const [projectedScore,setProjectedScore]=useState(61);
  const [scoreAnim,setScoreAnim]=useState(false);
  const [activeId,setActiveId]=useState(null);
  const activeF=FINDINGS.find(f=>f.id===activeId)||null;
  const openFinding=id=>setActiveId(a=>a===id?null:id);

  const setState=(id,s)=>{
    setStates(p=>{
      const next={...p,[id]:s};
      const recovered=Object.entries(next).filter(([k,v])=>v==="done"||v==="in-progress").reduce((acc,[k])=>acc+(SCORE_RECOVERY[k]||0),0);
      const partial=Object.entries(next).filter(([k,v])=>v==="in-progress").reduce((acc,[k])=>acc+Math.round((SCORE_RECOVERY[k]||0)*0.4),0);
      const doneRecovered=Object.entries(next).filter(([k,v])=>v==="done").reduce((acc,[k])=>acc+(SCORE_RECOVERY[k]||0),0);
      const newScore=Math.min(100,61+doneRecovered+partial);
      setProjectedScore(newScore);
      setScoreAnim(true);setTimeout(()=>setScoreAnim(false),600);
      return next;
    });
  };

  const done=Object.values(states).filter(s=>s==="done").length;
  const total=FINDINGS.length;
  const pct=Math.round(done/total*100);

  const filtered=FINDINGS.filter(f=>{
    if(filter==="all")return f.part!=="C";
    if(filter==="Critical")return f.sev==="Critical"&&f.part!=="C";
    if(filter==="Major")return f.sev==="Major"&&f.part!=="C";
    if(filter==="Minor")return f.sev==="Minor"&&f.part!=="C";
    if(["A","B","C"].includes(filter))return f.part===filter;
    return true;
  });

  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif",position:"relative"}}>
      <style>{FONTS}</style>
      <div style={{position:"fixed",top:-100,left:-60,width:480,height:480,background:"radial-gradient(circle,rgba(20,213,113,0.10) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
      <div style={{position:"fixed",top:600,right:-80,width:380,height:380,background:"radial-gradient(circle,rgba(91,97,244,0.06) 0%,transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
      <Nav onNew={()=>{}} rightLabel="New Audit"/>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 28px 24px"}}>
        <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:26,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 4px"}}>
          Your{" "}<span style={{background:"linear-gradient(90deg,#186132,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>UXpact</span>
        </h1>
        <p style={{fontSize:14,color:C.muted,margin:0}}>Everything we found, broken down by severity.</p>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 28px 40px",position:"relative",zIndex:10,display:"flex",gap:20,alignItems:"start"}}>

        {/* SIDEBAR */}
        <div style={{width:210,flexShrink:0,position:"sticky",top:20,height:"fit-content",display:"flex",flexDirection:"column",gap:12,paddingBottom:64}}>
          {/* Score - live projected */}
          <div style={{...glass,padding:"18px 14px",textAlign:"center"}}>
            <ArcGauge score={projectedScore} animated={scoreAnim} key={projectedScore}/>
            {projectedScore>61&&(
              <div style={{marginTop:6,fontSize:11,color:C.emerald,fontWeight:600,animation:"countUp 0.4s ease both"}}>
                +{projectedScore-61} pts projected
              </div>
            )}
            <div style={{marginTop:8,fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.6px"}}>clearflow.io · SaaS</div>
            <div style={{height:3,borderRadius:2,background:"rgba(0,0,0,0.06)",overflow:"hidden",margin:"8px 0 4px"}}>
              <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${C.forest},${C.mint})`,width:`${pct}%`,transition:"width 0.6s ease"}}/>
            </div>
            <div style={{fontSize:10,color:C.muted}}>{pct}% complete · {done}/{total} addressed</div>
          </div>

          {/* Filters */}
          <div style={{...glass,padding:14}}>
            <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:C.dim,marginBottom:8}}>Severity</div>
            {[["all","All findings",null,total],["Critical","Critical","#EF4444",3],["Major","Major","#F59E0B",5],["Minor","Minor","#EAB308",4]].map(([v,l,dot,cnt])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 9px",borderRadius:8,border:"none",background:filter===v?"rgba(20,140,89,0.1)":"transparent",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:filter===v?C.forest:C.muted,fontWeight:filter===v?600:400,transition:"all 0.18s",marginBottom:2,textAlign:"left"}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:dot||C.dim,flexShrink:0}}/>
                {l}<span style={{marginLeft:"auto",fontSize:10,background:"rgba(0,0,0,0.06)",borderRadius:10,padding:"1px 6px"}}>{cnt}</span>
              </button>
            ))}
            <div style={{height:1,background:"rgba(0,0,0,0.05)",margin:"8px 0"}}/>
            <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:C.dim,marginBottom:8}}>Area</div>
            {[["A","Structure & Conv."],["B","Performance & Trust"],["C","Content Branding"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFilter(v)} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 9px",borderRadius:8,border:"none",background:filter===v?"rgba(20,140,89,0.1)":"transparent",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:filter===v?C.forest:C.muted,fontWeight:filter===v?600:400,transition:"all 0.18s",marginBottom:2,textAlign:"left"}}>
                <span style={{padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:700,background:v==="A"?"rgba(20,140,89,0.1)":v==="B"?"rgba(91,97,244,0.1)":"rgba(11,28,72,0.07)",color:v==="A"?C.emerald:v==="B"?C.violet:C.navy}}>{v}</span>{l}
              </button>
            ))}
          </div>

          {/* Pulse ref */}
          <div style={{background:"rgba(91,97,244,0.06)",border:"1px solid rgba(91,97,244,0.15)",borderRadius:12,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:C.mint,animation:"pulseAnim 2s infinite"}}/>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",color:C.violet}}>Pulse Tracker</div>
            </div>
            <div style={{fontSize:11.5,fontWeight:500,color:C.navy,marginBottom:3}}>{done} / {total} items addressed</div>
            <div style={{fontSize:11,color:C.dim,lineHeight:1.5}}>Install the browser extension to track fixes on your live site.</div>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,minWidth:0}}>
          {/* UNIFIED TOP CARD: Diagnosis + Score bars + Benchmarks */}
          <div style={{...cardBgs[0],borderRadius:16,padding:"28px 28px 20px",marginBottom:16,animation:"fadeUp 0.4s ease 0s both"}}>
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:16}}>
              <Pill text="clearflow.io" v="green"/><Pill text="Signups" v="green"/><Pill text="Demo requests" v="violet"/>
            </div>
            <div style={{height:1,background:"rgba(0,0,0,0.05)",marginBottom:20}}/>

            {/* Primary Diagnosis - green gradient block with score tiles inside */}
            <div style={{borderRadius:12,padding:"20px 22px",background:"linear-gradient(135deg,#186132 0%,#148C59 60%,#14D571 100%)",marginBottom:20}}>
              <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",color:"rgba(255,255,255,0.6)",marginBottom:8}}>Primary Diagnosis</div>
              <p style={{fontSize:14,fontWeight:650,color:"#fff",lineHeight:1.65,margin:"0 0 10px"}}>For a SaaS product targeting signups, your conversion architecture is the single biggest barrier. <span style={{fontWeight:500,color:"rgba(255,255,255,0.85)"}}>No differentiated value prop, no trust proximity, and no visible CTA. These three together are suppressing your trial rate before most visitors have formed intent.</span></p>
              <p style={{fontSize:12.5,fontWeight:400,color:"rgba(255,255,255,0.75)",lineHeight:1.6,margin:"0 0 4px"}}>Your copy is feature-led where it should be outcome-led. Visitors can't pass the 5-second scent trail test. Fix the above-fold cognitive load and you likely recover 30-40% of visitors currently leaving without converting.</p>
              <CatScores/>
            </div>


            {/* Benchmark bars - same card, divider above */}
            <div style={{borderTop:"1px solid rgba(0,0,0,0.06)",paddingTop:16}}>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",color:C.dim,marginBottom:12}}>Industry Benchmark - SaaS / Software</div>
              {[["Your score",61,C.violet],["Industry avg",68,C.muted],["Top quartile",81,C.emerald]].map(([l,v,c],i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<2?8:0,fontSize:12}}>
                  <span style={{width:96,color:C.muted,flexShrink:0}}>{l}</span>
                  <div style={{flex:1,height:5,borderRadius:3,background:"rgba(0,0,0,0.06)",overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,background:c,width:`${v}%`,transition:"width 1.2s ease"}}/></div>
                  <span style={{width:24,textAlign:"right",fontWeight:700,color:c,fontSize:12}}>{v}</span>
                </div>
              ))}
              <p style={{fontSize:11,color:C.dim,marginTop:10,marginBottom:0,lineHeight:1.5}}>You're 7 points below the industry average. The top quartile gap is 20 points - primarily in messaging clarity and mobile structure.</p>
            </div>
          </div>

          {/* REVENUE LEAK - sticky starts here */}
          <div style={{position:"sticky",top:20,zIndex:11,...cardBgs[1],borderRadius:16,padding:"28px",marginBottom:16,animation:"fadeUp 0.4s ease 0.1s both"}}>
            <h2 style={{fontFamily:"'Unbounded',sans-serif",fontSize:18,fontWeight:700,color:C.navy,margin:"0 0 4px"}}>Revenue Leak</h2>
            <p style={{fontSize:13,color:C.muted,margin:"0 0 20px"}}>Here's what these issues are likely costing you.</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:14}}>
              {[{pct:"~42%",label:"mobile drop-off",desc:"Exit before CTA appears. Above-fold conversion architecture fix lifts rate by 28-47%.",color:C.forest},{pct:"2-3x",label:"trust gap",desc:"Lower conversion without trust proximity above fold. You're likely at 1.2% vs 3.1-4.2%.",color:C.violet},{pct:"18-32%",label:"copy friction",desc:"Conversion lift missed from feature-led vs benefit-led headlines. A classic cognitive load failure.",color:C.emerald}].map((r,i)=>(
                <div key={i} style={{padding:"20px 16px",borderRadius:12,background:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.9)",textAlign:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",animation:`fadeUp 0.3s ease ${i*0.07}s both`}}>
                  <div style={{fontSize:26,fontWeight:800,color:r.color,fontFamily:"'Unbounded',sans-serif",marginBottom:4}}>{r.pct}</div>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:6}}>{r.label}</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{r.desc}</div>
                </div>
              ))}
            </div>
            <p style={{fontSize:10.5,color:C.dim,margin:0}}>Estimates based on CRO benchmarks · Actual impact varies by traffic and industry.</p>
          </div>

          {/* FINDINGS - sticky, stacks over Revenue Leak */}
          <div style={{position:"sticky",top:20,zIndex:20,borderRadius:16,padding:"0",marginBottom:16,background:"#EEF1F5",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
            {activeF&&(
              <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(0,0,0,0.06)",background:"rgba(255,255,255,0.6)",borderRadius:"16px 16px 0 0",animation:"fadeUp 0.2s ease both"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.navy,flex:1,marginRight:12}}>{activeF.title}</div>
                  <button onClick={()=>setActiveId(null)} style={{fontSize:10,padding:"2px 9px",borderRadius:20,background:"rgba(0,0,0,0.06)",border:"none",cursor:"pointer",color:C.muted,flexShrink:0}}>Close ✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:10}}>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["Revenue Impact",activeF.leak,"est. monthly leak"],["Fix Effort",activeF.effort,"complexity"]].map(([l,v,s])=>(
                      <div key={l} style={{background:"rgba(238,241,245,0.9)",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:8.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",color:C.dim,marginBottom:2}}>{l}</div>
                        <div style={{fontSize:14,fontWeight:800,color:C.navy,fontFamily:"'Unbounded',sans-serif",marginBottom:1}}>{v}</div>
                        <div style={{fontSize:9.5,color:C.muted}}>{s}</div>
                      </div>
                    ))}
                    <button onClick={()=>onBlueprint(activeF)} style={{padding:"6px 12px",borderRadius:20,background:C.emerald,color:"#fff",border:"none",fontSize:10.5,fontWeight:700,cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",boxShadow:"0 2px 8px rgba(20,140,89,0.2)"}}>Open Blueprint →</button>
                  </div>
                  <div>
                    <p style={{fontSize:11.5,color:C.muted,lineHeight:1.55,marginBottom:10,marginTop:0}}>{activeF.desc}</p>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {activeF.actions.map((a,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7}}>
                          <div style={{width:15,height:15,borderRadius:"50%",background:"linear-gradient(135deg,#186132,#148C59)",color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{i+1}</div>
                          <span style={{fontSize:11,color:C.muted,lineHeight:1.45}}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div style={{padding:"6px",display:"flex",gap:3,borderRadius:activeF?"0":"16px 16px 0 0"}}>
              {[["findings","All Findings"],["content","Content Branding"],["working","What's Working"]].map(([v,l])=>(
                <button key={v} onClick={()=>setWsTab(v)} style={{flex:1,padding:"9px 12px",borderRadius:9,border:"none",background:wsTab===v?"#fff":"transparent",color:wsTab===v?C.forest:C.muted,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:wsTab===v?700:400,cursor:"pointer",transition:"all 0.18s ease",boxShadow:wsTab===v?"0 2px 6px rgba(0,0,0,0.12)":"none"}}>{l}</button>
              ))}
            </div>
            <div style={{padding:"16px"}}>
              {wsTab==="findings"&&(
                <div style={{paddingBottom:80}}>
                  {filtered.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontSize:13}}>No findings match this filter.</div>}
                  {filtered.map((f,i)=>(
                    <div key={f.id} style={{animation:`fadeUp 0.25s ease ${i*0.05}s both`}}>
                      <FindingCard f={f} state={states[f.id]} onState={s=>setState(f.id,s)} active={activeId===f.id} onOpen={openFinding}/>
                    </div>
                  ))}
                </div>
              )}
              {wsTab==="content"&&(
                <div className="fade-in" style={{paddingBottom:80}}>
                  <p style={{fontSize:11.5,color:C.muted,margin:"0 0 10px",lineHeight:1.4}}>How your copy, voice, and messaging hold up - the layer most audits skip entirely.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    {[
                      {label:"Brand Voice",score:48,verdict:"Hero tone is direct but feature copy switches to formal product-speak mid-page.",sev:"Critical"},
                      {label:"Messaging Hierarchy",score:52,verdict:"H1 states a category claim. Visitors can't answer 'why this product for me?' in 5 seconds.",sev:"Critical"},
                      {label:"Positioning Clarity",score:61,verdict:"Differentiation is implicit, not stated. Nothing explains why you over a competitor.",sev:"Major"},
                      {label:"CTA Copy Quality",score:65,verdict:"'Start Free Trial' is functional but generic. No urgency or outcome signal.",sev:"Major"},
                    ].map((item,i)=><CBTile key={i} item={item} delay={i*0.07}/>)}
                  </div>
                  <div style={{borderTop:"1px solid rgba(0,0,0,0.05)",paddingTop:10}}>
                    {FINDINGS.filter(f=>f.part==="C").map((f,i)=>(
                      <div key={f.id} style={{animation:`fadeUp 0.2s ease ${i*0.06}s both`}}>
                        <FindingCard f={f} state={states[f.id]} onState={s=>setState(f.id,s)} active={activeId===f.id} onOpen={openFinding}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {wsTab==="working"&&(
                <div className="fade-in">
                  <p style={{fontSize:13,color:C.muted,margin:"0 0 14px",lineHeight:1.5}}>These aren't just nice to have - they're real conversion assets you should protect.</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {(showAllPassed?PASSED:PASSED.slice(0,8)).map((p,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:"rgba(20,213,113,0.04)",border:"1px solid rgba(20,213,113,0.1)",borderRadius:9,fontSize:12,color:C.navy,fontWeight:500,animation:`fadeUp 0.22s ease ${i*0.04}s both`}}>
                        <div style={{width:20,height:20,borderRadius:6,background:"#14D571",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 6px rgba(20,213,113,0.3)"}}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        {p}
                      </div>
                    ))}
                  </div>
                  {!showAllPassed&&<button onClick={()=>setShowAllPassed(true)} style={{marginTop:12,background:"none",border:"none",color:C.emerald,fontSize:12,fontWeight:600,cursor:"pointer",padding:0}}>+ {PASSED.length-8} more</button>}
                  {/* Glossary */}
                  <GlossaryStrip/>
                </div>
              )}
            </div>
          </div>

          {/* UX PRO - sticky, stacks over Findings */}
          <div style={{position:"sticky",top:36,zIndex:30,borderRadius:16,padding:"24px 28px",marginBottom:16,background:"#EDEDFA",border:"1px solid rgba(91,97,244,0.12)",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",maxHeight:"calc(100vh - 84px)",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:15,fontWeight:700,color:C.navy}}>UX Pro</div>
              <div style={{fontSize:9,fontWeight:700,background:"rgba(91,97,244,0.1)",color:C.violet,borderRadius:20,padding:"3px 10px",letterSpacing:"0.04em"}}>Next tier</div>
            </div>
            <p style={{fontSize:13,color:C.muted,margin:"0 0 18px",lineHeight:1.5}}>Deeper features available in the next tier. Click to explore.</p>
            {[
              {icon:"🔄",title:"Re-audit & Regression Tracking",tier:"Pro",screen:"reaudit",desc:"Re-run the full 50-check audit after making changes. See what improved, what regressed, and what new issues surfaced since your last run."},
              {icon:"✨",title:"UXpact Vision",tier:"Pro",screen:"vision",desc:"A fully redesigned version of your site with every audit finding applied - improved structure, rewritten copy, industry benchmark standards baked in."},
              {icon:"🔌",title:"Design Tool Plugins",tier:"Pro Add-on",screen:"plugins",desc:"Audit findings surfaced contextually in Figma, Framer, Webflow, WordPress, Wix, Squarespace, and Shopify - without leaving your tool."},
            ].map((f,i)=>(
              <div key={i} onClick={()=>onProScreen(f.screen)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",borderRadius:12,background:"rgba(255,255,255,0.7)",border:"1px solid rgba(91,97,244,0.1)",marginBottom:i<2?10:0,cursor:"pointer",transition:"all 0.22s ease",boxShadow:"0 2px 8px rgba(0,0,0,0.04)",animation:`fadeUp 0.25s ease ${i*0.08}s both`}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)";}}>
                <div style={{fontSize:24,flexShrink:0}}>{f.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <div style={{fontSize:13.5,fontWeight:700,color:C.navy}}>{f.title}</div>
                    <div style={{fontSize:9,fontWeight:700,background:"rgba(91,97,244,0.1)",color:C.violet,borderRadius:20,padding:"2px 9px"}}>{f.tier}</div>
                  </div>
                  <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{f.desc}</div>
                </div>
                <div style={{fontSize:20,color:C.dim,flexShrink:0}}>→</div>
              </div>
            ))}
          </div>

          {/* BOTTOM CTA - sticky, stacks over UX Pro */}
          <div style={{position:"sticky",top:52,zIndex:40,marginBottom:0,maxHeight:"calc(100vh - 84px)",overflowY:"auto"}}>
            <ExpandingCTA onBlueprint={onBlueprint}/>
          </div>

          <div style={{textAlign:"center",padding:"0 0 40px"}}>
            <p style={{fontSize:11,color:C.dim,margin:0}}>clearflow.io · Audit #0024 · UXpact © 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 4: BLUEPRINT ───────────────────────────────────────────────
function Pin({finding,active,onClick}) {
  const [hov,setHov]=useState(false);
  const s=SEV[finding.sev==="Critical"?"Critical":finding.sev==="Major"?"Major":"Minor"];
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{width:28,height:28,borderRadius:"50%",background:active?s.color:s.dot,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,boxShadow:hov||active?"0 3px 10px rgba(0,0,0,0.25)":"0 2px 6px rgba(0,0,0,0.14)",transition:"all 0.18s ease",transform:active?"scale(1.2)":hov?"scale(1.1)":"scale(1)",filter:active?"brightness(0.88)":"none"}}>
        <span style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:"'Space Grotesk',sans-serif",userSelect:"none"}}>{finding.id}</span>
      </div>
      {hov&&!active&&(
        <div style={{position:"absolute",bottom:"calc(100% + 7px)",left:"50%",transform:"translateX(-50%)",background:C.navy,color:"#fff",fontSize:11,padding:"6px 10px",borderRadius:7,whiteSpace:"nowrap",zIndex:100,pointerEvents:"none",boxShadow:"0 4px 14px rgba(0,0,0,0.22)",fontFamily:"'Space Grotesk',sans-serif",maxWidth:200,textAlign:"center",lineHeight:1.4}}>
          {finding.title}
          <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:`5px solid ${C.navy}`}}/>
        </div>
      )}
    </div>
  );
}

function ScoreChip({pts,visible}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:visible?"linear-gradient(135deg,rgba(91,97,244,0.15),rgba(20,213,113,0.1))":"linear-gradient(135deg,rgba(220,38,38,0.08),rgba(220,38,38,0.04))",border:`1px solid ${visible?"rgba(91,97,244,0.3)":"rgba(220,38,38,0.15)"}`,fontSize:11,fontWeight:700,color:visible?C.violet:C.red,transition:"all 0.4s cubic-bezier(0.34,1.56,0.64,1)",transform:visible?"scale(1.05)":"scale(1)",fontFamily:"'Space Grotesk',sans-serif",animation:visible?"chipPop 0.35s ease":"none"}}>
      {visible?<span style={{animation:"countUp 0.4s ease both"}}>+{pts} pts recovered ✦</span>:<span>-{pts} pts</span>}
    </div>
  );
}

function FixDrawer({finding,findingIndex,onClose}) {
  const [copied,setCopied]=useState(false);
  const [recovered,setRecovered]=useState(false);
  const sev=SEV[finding.sev==="Critical"?"Critical":finding.sev==="Major"?"Major":"Minor"];
  const fixBgs=[
    {bg:"rgba(209,250,229,0.18)",border:"rgba(255,255,255,0.65)"},
    {bg:"rgba(224,231,255,0.18)",border:"rgba(255,255,255,0.65)"},
  ];
  const fixBg=fixBgs[findingIndex%2];
  const copy=()=>{navigator.clipboard.writeText(finding.prompt);setCopied(true);setTimeout(()=>setCopied(false),1500);};
  const pts=finding.pts||4;

  return (
    <div className="slide-right" style={{width:340,flexShrink:0,background:fixBg.bg,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderRadius:14,border:`1px solid ${fixBg.border}`,boxShadow:"0 8px 36px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.8)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${fixBg.border}`}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:sev.color,background:"rgba(255,255,255,0.75)",padding:"2px 8px",borderRadius:10}}>{finding.sev}</div>
              {/* Score chip */}
              <ScoreChip pts={pts} visible={recovered}/>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.navy,lineHeight:1.35,fontFamily:"'Unbounded',sans-serif",letterSpacing:"-0.2px"}}>{finding.title}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.dim,lineHeight:1,padding:"0 2px",flexShrink:0,transition:"color 0.15s"}}
            onMouseEnter={e=>e.target.style.color=C.navy} onMouseLeave={e=>e.target.style.color=C.dim}>×</button>
        </div>
      </div>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${fixBg.border}`}}>
        <div style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,marginBottom:8}}>Fix</div>
        <div style={{fontSize:13,color:"#374151",lineHeight:1.7}}>{finding.fix}</div>
      </div>
      <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div style={{fontSize:9.5,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted}}>AI-ready prompt</div>
          <button onClick={copy} style={{background:copied?"linear-gradient(135deg,#186132,#14D571)":"rgba(255,255,255,0.75)",border:copied?"none":`1px solid ${fixBg.border}`,borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all 0.2s ease"}}>
            {copied?<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>:<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke={C.muted} strokeWidth="1.8"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round"/></svg>}
          </button>
        </div>
        <div style={{flex:1,background:"rgba(255,255,255,0.78)",border:"1px solid rgba(0,0,0,0.06)",borderRadius:8,padding:"12px 14px",fontSize:11.5,lineHeight:1.75,color:"#374151",whiteSpace:"pre-wrap",fontFamily:"'Space Grotesk',sans-serif",overflowY:"auto"}}>{finding.prompt}</div>
      </div>
      <div style={{padding:"10px 16px",borderTop:`1px solid ${fixBg.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Grotesk',sans-serif",transition:"color 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.color=C.navy} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>← Back</button>
        <button onClick={()=>setRecovered(r=>!r)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:"none",background:recovered?"rgba(20,213,113,0.15)":"rgba(91,97,244,0.1)",color:recovered?"#0a6b30":C.violet,fontFamily:"'Space Grotesk',sans-serif",transition:"all 0.25s ease"}}>
          {recovered?"✓ Marked fixed":"Mark as fixed"}
        </button>
      </div>
    </div>
  );
}

function BlueprintScreen({initialFinding,onBack}) {
  const [activeId,setActiveId]=useState(initialFinding?.bpId||null);
  const [recovered,setRecovered]=useState({});
  const activeIdx=BP_FINDINGS.findIndex(f=>f.id===activeId);
  const activeFinding=activeIdx>=0?BP_FINDINGS[activeIdx]:null;
  const [hovPulse,setHovPulse]=useState(false);

  const totalRecovered=Object.entries(recovered).filter(([,v])=>v).reduce((acc,[k])=>acc+(BP_FINDINGS.find(f=>f.id===+k)?.pts||0),0);

  const FacLabel=({t})=><div style={{fontSize:9.5,fontWeight:600,letterSpacing:"0.1em",color:C.dim,textTransform:"uppercase",fontFamily:"'Space Grotesk',sans-serif",marginBottom:5}}>{t}</div>;
  const FacH2=({children})=><div style={{fontSize:17,fontWeight:700,color:C.navy,fontFamily:"'Unbounded',sans-serif",letterSpacing:"-0.3px",marginBottom:8}}>{children}</div>;
  const Sec=({children,style={},bb=true})=><div style={{padding:"22px 28px",borderBottom:bb?`1px solid ${C.border}`:"none",position:"relative",...style}}>{children}</div>;
  const PinRow=({zone})=>{
    const zf=BP_FINDINGS.filter(f=>f.zone===zone);
    if(!zf.length)return null;
    return <span style={{display:"inline-flex",gap:5,marginLeft:8,verticalAlign:"middle"}}>
      {zf.map(f=><Pin key={f.id} finding={f} active={activeId===f.id} onClick={()=>setActiveId(activeId===f.id?null:f.id)}/>)}
    </span>;
  };

  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{FONTS}</style><Blobs/>
      <Nav onNew={()=>{}} rightLabel="New Audit"/>
      <div style={{maxWidth:1140,margin:"0 auto",padding:"0 28px 24px",position:"relative",zIndex:10}}>
        <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:26,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 6px"}}>
          Your Conversion{" "}<span style={{background:"linear-gradient(90deg,#186132,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Blueprint</span>
        </h1>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <p style={{fontSize:14,color:C.muted,margin:0}}>Every finding mapped to your page - with fixes and AI prompts ready to copy.</p>
          {/* Running score recovery total */}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{fontSize:12,fontWeight:600,color:C.emerald,padding:"4px 12px",borderRadius:20,background:"rgba(20,213,113,0.1)",transition:"all 0.3s ease"}}>
              +{totalRecovered} pts recovered
            </div>
            <div style={{display:"flex",gap:10,fontSize:12,fontWeight:600}}>
              <span style={{color:C.red}}>● 2 Critical</span><span style={{color:C.amber}}>● 3 Major</span><span style={{color:"#ca8a04"}}>● 2 Minor</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <Pill text="clearflow.io" v="green"/><Pill text="Signups" v="green"/><Pill text="Demo requests" v="violet"/>
        </div>
        <div style={{fontSize:11.5,color:C.dim,textAlign:"right",marginBottom:10}}>Click a pin to see the fix + AI prompt</div>

        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
          {/* Facsimile */}
          <div style={{flex:1,minWidth:0,background:"#fff",borderRadius:14,overflow:"hidden",boxShadow:"0 4px 24px rgba(0,0,0,0.07)",border:`1px solid ${C.border}`}}>
            <div style={{background:"#F3F4F6",borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",gap:5}}>{["#FF5F57","#FEBC2E","#28C840"].map(c=><div key={c} style={{width:11,height:11,borderRadius:"50%",background:c}}/>)}</div>
              <div style={{flex:1,background:"#E5E7EB",borderRadius:5,padding:"4px 12px",fontSize:11.5,color:C.muted,textAlign:"center",margin:"0 8px"}}>https://yoursite.com</div>
            </div>
            <Sec style={{padding:"12px 28px",background:"#FAFAFA"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{fontWeight:700,fontSize:14,color:C.navy}}>YourSite</div>
                <div style={{display:"flex",gap:18,fontSize:12.5,color:C.muted,alignItems:"center"}}>
                  {["Home","Features","Pricing","Blog"].map(t=><span key={t}>{t}</span>)}
                  <span style={{padding:"4px 14px",border:`1.5px solid ${C.navy}`,borderRadius:6,fontSize:12,fontWeight:600,color:C.navy}}>Get Started<PinRow zone="nav"/></span>
                </div>
              </div>
            </Sec>
            <Sec>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
                <FacH2>Powerful analytics for modern teams<PinRow zone="hero"/></FacH2>
              </div>
              <div style={{fontSize:13,color:C.muted,marginBottom:14,lineHeight:1.5}}>Track, measure, and optimise your product with real-time data.</div>
              <button style={{padding:"10px 22px",background:C.forest,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}}>Start Free Trial</button>
            </Sec>
            <Sec>
              <FacLabel t="FEATURES"/>
              <FacH2>Everything you need to understand your users<PinRow zone="features"/></FacH2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {["Real-time dashboards","Custom reports","Team collaboration"].map((t,i)=>(
                  <div key={i} style={{padding:"12px 14px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12.5,fontWeight:700,color:C.navy,marginBottom:3}}>{t}</div>
                    <div style={{fontSize:11.5,color:C.muted,lineHeight:1.4}}>We built this to give you instant visibility across all your key metrics.</div>
                  </div>
                ))}
              </div>
            </Sec>
            <Sec>
              <FacLabel t="CUSTOMERS"/>
              <FacH2>Trusted by teams at leading companies<PinRow zone="social"/></FacH2>
              <div style={{display:"flex",gap:10,marginBottom:10}}>{[80,60,90,70,55].map((w,i)=><div key={i} style={{height:20,width:w,background:"rgba(11,28,72,0.08)",borderRadius:4}}/>)}</div>
              <div style={{background:"#FFF4E6",border:"1px solid #FFD580",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#92400E"}}>No testimonial quotes or outcome data detected in this section.</div>
            </Sec>
            <Sec>
              <FacLabel t="PRICING"/>
              <FacH2>Simple, transparent pricing<PinRow zone="pricing"/></FacH2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[["Starter","$0","free forever",false],["Growth","$49","/ month",false],["Pro","$99","/ month",true],["Enterprise","Custom","",false]].map(([n,p,s,pop])=>(
                  <div key={n} style={{padding:"14px",background:pop?"rgba(20,213,113,0.06)":"#F9FAFB",border:`1px solid ${pop?"rgba(20,213,113,0.3)":C.border}`,borderRadius:8,textAlign:"center",position:"relative"}}>
                    {pop&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:C.emerald,color:"#fff",fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:10}}>POPULAR</div>}
                    <div style={{fontSize:12,fontWeight:700,color:C.navy}}>{n}</div>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:17,fontWeight:700,color:C.navy,margin:"5px 0"}}>{p}</div>
                    <div style={{fontSize:11,color:C.dim}}>{s}</div>
                  </div>
                ))}
              </div>
            </Sec>
            <Sec>
              <FacH2>Ready to get started?<PinRow zone="cta2"/></FacH2>
              <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Join thousands of teams already using our platform.</div>
              <button style={{padding:"10px 22px",background:C.forest,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}}>Start Free Trial</button>
            </Sec>
            <div style={{padding:"12px 28px",borderTop:`1px solid ${C.border}`,background:"#FAFAFA",fontSize:11,color:C.dim}}>© 2026 YourSite · Audit #0024</div>
          </div>

          {/* Fix Drawer */}
          {activeFinding&&(
            <FixDrawer
              key={activeFinding.id}
              finding={activeFinding}
              findingIndex={activeIdx}
              onClose={()=>setActiveId(null)}/>
          )}
        </div>
      </div>

      {/* Pulse footer */}
      <div style={{maxWidth:1140,margin:"0 auto",padding:"0 28px 48px",display:"flex",justifyContent:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:32,background:"linear-gradient(135deg,#186132 0%,#14D571 100%)",borderRadius:14,padding:"20px 36px",boxShadow:"0 6px 24px rgba(20,140,89,0.22)"}}>
          <div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:15,fontWeight:700,color:"#fff",letterSpacing:"-0.2px",marginBottom:4}}>Ready to fix?</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.72)"}}>Pulse tracks every step.</div>
          </div>
          <button onMouseEnter={()=>setHovPulse(true)} onMouseLeave={()=>setHovPulse(false)}
            style={{padding:"11px 24px",borderRadius:9,background:hovPulse?C.violet:"#fff",border:"none",cursor:"pointer",fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,color:hovPulse?"#fff":C.forest,boxShadow:hovPulse?"0 4px 16px rgba(91,97,244,0.35)":"0 2px 8px rgba(0,0,0,0.1)",transform:hovPulse?"translateY(-1px)":"none",transition:"all 0.25s ease"}}>
            Start Pulse →
          </button>
        </div>
      </div>

      <div style={{maxWidth:1140,margin:"0 auto",padding:"0 28px 32px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Grotesk',sans-serif",transition:"color 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.color=C.navy} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>← Back to UXpact</button>
      </div>
    </div>
  );
}

// ── SCREEN 5: RE-AUDIT ───────────────────────────────────────────────
function ReauditScreen({onBack}) {
  const [tab,setTab]=useState("delta");
  const [running,setRunning]=useState(false);
  const [ran,setRan]=useState(false);
  const [progress,setProgress]=useState(0);
  const [progressMsg,setProgressMsg]=useState("");

  const msgs=["Comparing structural changes…","Re-scanning above-fold signals…","Checking CTA placement…","Evaluating copy shifts…","Cross-referencing previous findings…","Analysing mobile layout delta…"];

  const runAudit=()=>{
    setRunning(true);setProgress(0);setRan(false);setTab("delta");
    let i=0;let p=0;
    const tick=setInterval(()=>{
      p=Math.min(p+Math.random()*17+7,100);
      setProgress(p);
      setProgressMsg(msgs[i%msgs.length]);
      i++;
      if(p>=100){clearInterval(tick);setTimeout(()=>{setRunning(false);setRan(true);},500);}
    },550);
  };

  const allFindings=[
    {l:"CTA above fold",prev:"Critical",now:"resolved",c:"#16A34A",icon:"✓",pts:"+12"},
    {l:"Value proposition",prev:"Critical",now:"resolved",c:"#16A34A",icon:"✓",pts:"+10"},
    {l:"Social proof placement",prev:"Major",now:"improved",c:"#148C59",icon:"↑",pts:"+4"},
    {l:"Feature copy outcomes",prev:"Minor",now:"resolved",c:"#16A34A",icon:"✓",pts:"+3"},
    {l:"Mobile nav hides pricing",prev:"Major",now:"regressed",c:"#F59E0B",icon:"↓",pts:"−4"},
    {l:"Brand voice consistency",prev:"Major",now:"unchanged",c:"#9CA3AF",icon:"—",pts:"0"},
    {l:"Low-risk entry point",prev:"Major",now:"unchanged",c:"#9CA3AF",icon:"—",pts:"0"},
    {l:"Pricing anchor copy",prev:"Minor",now:"unchanged",c:"#9CA3AF",icon:"—",pts:"0"},
  ];
  const rowBg={resolved:"rgba(20,213,113,0.05)",improved:"rgba(20,140,89,0.04)",regressed:"rgba(245,158,11,0.06)",unchanged:"rgba(0,0,0,0.02)"};
  const statusColor={resolved:"#16A34A",improved:"#148C59",regressed:"#F59E0B",unchanged:"#9CA3AF"};

  const tabFindings=tab==="delta"?allFindings:tab==="resolved"?allFindings.filter(f=>f.now==="resolved"||f.now==="improved"):tab==="regressed"?allFindings.filter(f=>f.now==="regressed"):allFindings.filter(f=>f.now==="unchanged");

  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif"}}>
      <style>{FONTS}</style><Blobs/>
      <Nav onNew={()=>{}} rightLabel="New Audit"/>
      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 28px 24px",position:"relative",zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,padding:0}}
          onMouseEnter={e=>e.currentTarget.style.color=C.navy} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>← Back to UXpact</button>
        <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:24,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 4px"}}>
          Re-audit &{" "}<span style={{background:"linear-gradient(90deg,#186132,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Regression Tracking</span>
        </h1>
        <p style={{fontSize:14,color:C.muted,margin:"0 0 24px"}}>Re-run the full 50-check audit after making changes. See what improved, what regressed, what's new.</p>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 28px 60px",position:"relative",zIndex:10,display:"grid",gridTemplateColumns:"210px 1fr",gap:20}}>
        {/* Sidebar */}
        <div style={{position:"sticky",top:20,height:"fit-content",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...glass,padding:"18px 14px",textAlign:"center"}}>
            <ArcGauge score={ran?74:61} animated={ran} key={ran?"ran":"init"}/>
            {ran&&<div style={{marginTop:6,fontSize:11,color:C.emerald,fontWeight:600,animation:"countUp 0.4s ease both"}}>+13 pts recovered</div>}
            <div style={{marginTop:8,fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.6px"}}>clearflow.io · SaaS</div>
          </div>
          <div style={{...glass,padding:"14px"}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",color:C.dim,marginBottom:10}}>This audit</div>
            {[["Previous score","61",C.muted],["Current score",ran?"74":"—",C.emerald],["Delta",ran?"+13":"—","#16A34A"],["Resolved",ran?"4":"—",C.emerald],["Regressed",ran?"1":"—",C.amber]].map(([l,v,col])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid rgba(0,0,0,0.04)"}}>
                <span style={{fontSize:12,color:C.muted}}>{l}</span>
                <span style={{fontSize:12,fontWeight:700,color:col,animation:ran&&v!=="—"?"countUp 0.3s ease both":"none"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{...glass,padding:"14px"}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",color:C.dim,marginBottom:8}}>Filter</div>
            {[["delta","All Changes"],["resolved","Resolved"],["regressed","Regressed"],["unchanged","Unchanged"]].map(([v,l])=>(
              <button key={v} onClick={()=>setTab(v)} style={{display:"block",width:"100%",padding:"7px 9px",borderRadius:8,border:"none",background:tab===v?"rgba(20,140,89,0.1)":"transparent",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:tab===v?C.forest:C.muted,fontWeight:tab===v?600:400,transition:"all 0.18s",marginBottom:2,textAlign:"left"}}>{l}</button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div>
          {/* Run button card */}
          <div style={{...cardBgs[0],borderRadius:16,padding:"24px 28px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:C.navy,marginBottom:4}}>Last audit: <span style={{color:C.muted,fontWeight:400}}>clearflow.io · 2 days ago · Score 61</span></div>
                <div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>Click "Run Re-audit" to simulate results after shipping your fixes. Results will show a full diff against the previous run.</div>
              </div>
              {!ran&&<button onClick={runAudit} disabled={running} style={{flexShrink:0,padding:"11px 24px",borderRadius:10,border:"none",cursor:running?"not-allowed":"pointer",background:running?"rgba(20,140,89,0.1)":"linear-gradient(135deg,#186132,#14D571)",color:running?"#148C59":"#fff",fontFamily:"'Unbounded',sans-serif",fontSize:12,fontWeight:700,transition:"all 0.2s",boxShadow:running?"none":"0 4px 16px rgba(20,140,89,0.25)",transform:running?"none":"translateY(0)"}}>
                {running?"Running…":"Run Re-audit →"}
              </button>}
              {ran&&<div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,padding:"9px 16px",borderRadius:10,background:"rgba(20,213,113,0.1)",border:"1px solid rgba(20,213,113,0.2)",animation:"fadeIn 0.3s ease both"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{fontSize:12,fontWeight:700,color:"#16A34A"}}>Audit complete</span>
                <button onClick={()=>{setRan(false);setProgress(0);}} style={{marginLeft:6,fontSize:10,color:C.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Reset</button>
              </div>}
            </div>

            {/* Progress bar */}
            {running&&(
              <div style={{marginTop:20,animation:"fadeIn 0.2s ease both"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:11,color:C.muted}}>{progressMsg}</span>
                  <span style={{fontSize:11,fontWeight:700,color:C.emerald}}>{Math.round(progress)}%</span>
                </div>
                <div style={{height:5,borderRadius:3,background:"rgba(0,0,0,0.06)",overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:"linear-gradient(90deg,#186132,#14D571)",width:`${progress}%`,transition:"width 0.4s ease"}}/>
                </div>
              </div>
            )}
          </div>

          {/* Score delta banner */}
          {ran&&(
            <div style={{...cardBgs[1],borderRadius:16,padding:"24px 28px",marginBottom:16,animation:"fadeUp 0.3s ease both"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16,marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:20}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Previous</div>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:30,fontWeight:800,color:C.muted}}>61</div>
                  </div>
                  <div style={{fontSize:24,color:C.mint,fontWeight:300}}>→</div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:10,fontWeight:600,color:C.dim,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Now</div>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:38,fontWeight:800,color:C.emerald,animation:"scoreIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both"}}>74</div>
                  </div>
                  <div style={{padding:"5px 14px",borderRadius:20,background:"rgba(20,213,113,0.15)",border:"1px solid rgba(20,213,113,0.25)",animation:"chipPop 0.4s ease both"}}>
                    <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:14,fontWeight:800,color:C.emerald}}>+13 pts</span>
                  </div>
                </div>
                <div style={{display:"flex",gap:20}}>
                  {[[4,"Resolved / Improved","#16A34A"],[1,"Regressed","#F59E0B"],[3,"Unchanged","#9CA3AF"]].map(([n,l,c])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:22,fontWeight:800,color:c,animation:"countUp 0.4s ease both"}}>{n}</div>
                      <div style={{fontSize:10,color:C.dim}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Score bar */}
              <div style={{position:"relative",height:8,borderRadius:4,background:"rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:8}}>
                <div style={{position:"absolute",left:0,top:0,height:"100%",width:"61%",borderRadius:4,background:"rgba(0,0,0,0.08)"}}/>
                <div style={{position:"absolute",left:0,top:0,height:"100%",width:"74%",borderRadius:4,background:"linear-gradient(90deg,#186132,#14D571)",transition:"width 1s ease"}}/>
                <div style={{position:"absolute",top:-2,left:"61%",transform:"translateX(-50%)",width:2,height:12,background:"rgba(255,255,255,0.9)",borderRadius:1}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim}}>
                <span>Previous: 61</span><span>Industry avg: 68</span><span style={{color:C.emerald,fontWeight:600}}>Current: 74</span>
              </div>
              <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(11,28,72,0.03)",fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:7}}>
                🔒 Re-audit unlocks automatically once your Pulse checklist is complete
              </div>
            </div>
          )}

          {/* Finding diff rows */}
          {ran&&(
            <div style={{...cardBgs[2],borderRadius:16,overflow:"hidden",animation:"fadeUp 0.35s ease both"}}>
              <div style={{background:"rgba(238,241,245,0.9)",padding:"6px 10px",display:"flex",gap:4}}>
                {[["delta","All Changes"],["resolved","Resolved"],["regressed","Regressed"],["unchanged","Unchanged"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:"7px",borderRadius:7,border:"none",background:tab===v?"#fff":"transparent",color:tab===v?C.forest:C.muted,fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:tab===v?700:400,cursor:"pointer",transition:"all 0.2s",boxShadow:tab===v?"0 1px 5px rgba(0,0,0,0.09)":"none"}}>{l}</button>
                ))}
              </div>
              <div>
                {tabFindings.map((f,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 20px",borderBottom:"1px solid rgba(0,0,0,0.04)",background:rowBg[f.now],animation:`fadeUp 0.2s ease ${i*0.04}s both`,transition:"background 0.15s"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",border:`1.5px solid ${statusColor[f.now]}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:`${statusColor[f.now]}15`}}>
                      <span style={{fontSize:11,fontWeight:700,color:statusColor[f.now]}}>{f.icon}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{f.l}</div>
                      <div style={{fontSize:11,color:C.dim,marginTop:2}}>Was: <span style={{fontWeight:600,color:C.muted}}>{f.prev}</span></div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:statusColor[f.now],padding:"3px 11px",borderRadius:20,background:`${statusColor[f.now]}15`,border:`1px solid ${statusColor[f.now]}30`,textTransform:"capitalize"}}>{f.now}</div>
                    <div style={{fontSize:11,fontWeight:700,color:statusColor[f.now],minWidth:36,textAlign:"right"}}>{f.pts} pts</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!ran&&!running&&(
            <div style={{...cardBgs[0],borderRadius:16,padding:"40px",textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:12}}>🔄</div>
              <div style={{fontSize:14,fontWeight:600,color:C.navy,marginBottom:6}}>No re-audit run yet</div>
              <div style={{fontSize:13,color:C.muted,lineHeight:1.6,maxWidth:420,margin:"0 auto"}}>Ship your fixes first, then click "Run Re-audit" to compare against your baseline score and see exactly what improved.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SCREEN 6: VISION ─────────────────────────────────────────────────
function VisionScreen({onBack}) {
  const [view,setView]=useState("vision");
  const [activePin,setActivePin]=useState(null);

  const pinData=[
    {id:1,c:"#14D571",l:"Nav CTA - primary green button treatment"},
    {id:2,c:"#14D571",l:"H1 rewritten: benefit-led, audience-specific"},
    {id:3,c:"#5B61F4",l:"Primary CTA moved above fold"},
    {id:4,c:"#5B61F4",l:"Secondary CTA for hesitant visitors"},
    {id:5,c:"#14D571",l:"Trust strip - logo row + social proof count"},
    {id:6,c:"#5B61F4",l:"Feature cards rewritten in outcome language"},
    {id:7,c:"#14D571",l:"Testimonial moved adjacent to primary CTA"},
    {id:8,c:"#5B61F4",l:"Value anchor copy placed above pricing"},
  ];

  const P=({id})=>{
    const p=pinData.find(x=>x.id===id);
    const active=activePin===id;
    return (
      <span style={{display:"inline-flex",position:"relative",verticalAlign:"middle",marginLeft:5,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setActivePin(active?null:id);}}>
        <span style={{width:18,height:18,borderRadius:"50%",background:p.c,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:"#fff",boxShadow:active?`0 0 0 3px ${p.c}55`:"0 1px 4px rgba(0,0,0,0.3)",transition:"all 0.18s ease",transform:active?"scale(1.3)":"scale(1)"}}>{id}</span>
        {active&&<span style={{position:"absolute",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#0B1C48",color:"#fff",fontSize:10,fontWeight:600,padding:"5px 10px",borderRadius:6,whiteSpace:"nowrap",zIndex:200,pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.35)",fontFamily:"'Space Grotesk',sans-serif",animation:"fadeUp 0.15s ease both"}}>
          {p.l}
          <span style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"4px solid transparent",borderRight:"4px solid transparent",borderTop:"4px solid #0B1C48"}}/>
        </span>}
      </span>
    );
  };

  // Current - deliberately flat/broken to contrast with Vision
  const CurrentPage=()=>(
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",border:"1px solid #E5E7EB",fontFamily:"'Space Grotesk',sans-serif"}}>
      <div style={{background:"#F9FAFB",borderBottom:"1px solid #E5E7EB",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontWeight:700,fontSize:14,color:"#111827"}}>YourSite</span>
        <div style={{display:"flex",gap:16,alignItems:"center",fontSize:12,color:"#6B7280"}}>
          {["Home","Features","Pricing","Blog"].map(t=><span key={t}>{t}</span>)}
          <span style={{border:"1px solid #374151",borderRadius:5,padding:"5px 14px",fontSize:12,fontWeight:600,color:"#374151"}}>Get Started</span>
        </div>
      </div>
      <div style={{padding:"36px 24px 28px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:22,fontWeight:800,color:"#111827",marginBottom:10,lineHeight:1.3,fontFamily:"'Unbounded',sans-serif"}}>Powerful analytics for modern teams</div>
        <div style={{fontSize:13,color:"#6B7280",marginBottom:20,lineHeight:1.6,maxWidth:480}}>Track, measure, and optimise your product with real-time data.</div>
        <div style={{display:"flex",gap:6,flexDirection:"column",marginBottom:24}}>
          {["Real-time dashboards","Custom reporting","Team collaboration"].map((t,i)=><div key={i} style={{fontSize:12,color:"#9CA3AF"}}>• {t}</div>)}
        </div>
        <div style={{display:"inline-block",padding:"10px 24px",background:"rgba(24,97,50,0.15)",borderRadius:7,fontSize:13,fontWeight:600,color:"#186132",cursor:"pointer"}}>Start Free Trial</div>
        <div style={{marginTop:10,fontSize:10,color:"#EF4444",display:"flex",alignItems:"center",gap:4}}>⚠ CTA renders 680px from top - below fold on mobile</div>
      </div>
      <div style={{padding:"24px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9CA3AF",marginBottom:8}}>FEATURES</div>
        <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:14}}>Everything you need to understand your users</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[["Real-time dashboards","We built this to give you instant visibility across all your key metrics."],["Custom reports","Our reporting engine lets your team generate any report on demand."],["Team collaboration","We designed collaboration features so your whole team stays aligned."]].map(([t,d],i)=>(
            <div key={i} style={{padding:"14px",background:"#F9FAFB",borderRadius:8,border:"1px solid #E5E7EB"}}>
              <div style={{fontSize:13,fontWeight:700,color:"#111827",marginBottom:4}}>{t}</div>
              <div style={{fontSize:11.5,color:"#9CA3AF",lineHeight:1.5}}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{padding:"24px",borderBottom:"1px solid #F3F4F6"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:10}}>Trusted by teams at leading companies</div>
        <div style={{display:"flex",gap:10,marginBottom:10}}>{[60,48,72,55,44].map((w,i)=><div key={i} style={{height:20,width:w,background:"rgba(0,0,0,0.08)",borderRadius:4}}/>)}</div>
        <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:6,padding:"8px 12px",fontSize:11,color:"#92400E"}}>⚠ No testimonial quotes detected in this section</div>
      </div>
      <div style={{padding:"24px"}}>
        <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:14}}>Simple, transparent pricing</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[["Starter","$0","free forever",false],["Growth","$49","/ month",false],["Pro","$99","/ month",true],["Enterprise","Custom","",false]].map(([n,p,s,pop])=>(
            <div key={n} style={{padding:"16px 12px",background:pop?"rgba(20,213,113,0.05)":"#F9FAFB",border:`1px solid ${pop?"#6EE7B7":"#E5E7EB"}`,borderRadius:8,textAlign:"center",position:"relative"}}>
              {pop&&<div style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"#059669",color:"#fff",fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:8}}>POPULAR</div>}
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:4}}>{n}</div>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:20,fontWeight:800,color:"#111827",marginBottom:2}}>{p}</div>
              <div style={{fontSize:11,color:"#9CA3AF"}}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Vision - real website with brand colours, centred layout, proper design
  const VisionPage=()=>(
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",border:"2px solid rgba(20,213,113,0.3)",boxShadow:"0 0 0 4px rgba(20,213,113,0.06)",fontFamily:"'Space Grotesk',sans-serif"}}>
      {/* Nav */}
      <div style={{background:"#fff",borderBottom:"1px solid rgba(0,0,0,0.06)",padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:7,background:"linear-gradient(135deg,#186132,#14D571)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:14}}>⚡</span>
          </div>
          <span style={{fontWeight:700,fontSize:14,color:"#0B1C48"}}>YourSite</span>
        </div>
        <div style={{display:"flex",gap:20,alignItems:"center",fontSize:13,color:"#6B7280"}}>
          {["Home","Features","Pricing","Blog"].map(t=><span key={t} style={{cursor:"pointer",transition:"color 0.15s"}}>{t}</span>)}
          <span style={{background:"linear-gradient(135deg,#186132,#14D571)",color:"#fff",borderRadius:7,padding:"7px 18px",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(20,140,89,0.25)"}}>Start Free Trial <P id={1}/></span>
        </div>
      </div>

      {/* Hero */}
      <div style={{background:"linear-gradient(160deg,#0B1C48 0%,#186132 60%,#14D571 100%)",padding:"52px 28px 44px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",bottom:-40,left:-40,width:200,height:200,borderRadius:"50%",background:"rgba(91,97,244,0.06)",pointerEvents:"none"}}/>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(20,213,113,0.15)",border:"1px solid rgba(20,213,113,0.3)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:600,color:"#14D571",marginBottom:18}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#14D571",animation:"pulseAnim 2s infinite"}}/>
          Now in open beta - free during launch
        </div>
        <div style={{fontSize:30,fontWeight:800,color:"#fff",lineHeight:1.25,fontFamily:"'Unbounded',sans-serif",marginBottom:14,maxWidth:620,margin:"0 auto 14px",position:"relative",zIndex:1}}>
          Ship features 40% faster <P id={2}/>
          <br/><span style={{color:"#14D571"}}>the tool lean SaaS teams trust</span>
        </div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.75)",lineHeight:1.65,maxWidth:480,margin:"0 auto 28px",position:"relative",zIndex:1}}>
          See what your team shipped, where it slowed down, and what to fix next - without leaving your desk.
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",flexWrap:"wrap",position:"relative",zIndex:1}}>
          <span style={{background:"linear-gradient(135deg,#148C59,#14D571)",color:"#fff",borderRadius:9,padding:"12px 28px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(20,140,89,0.4)",display:"flex",alignItems:"center",gap:6}}>
            Start Free Trial → <P id={3}/>
          </span>
          <span style={{border:"1.5px solid rgba(255,255,255,0.35)",color:"#fff",borderRadius:9,padding:"12px 22px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            See 2-min demo <P id={4}/>
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginTop:20,position:"relative",zIndex:1}}>
          <div style={{display:"flex",gap:6}}>
            {[40,32,36,34,30].map((w,i)=><div key={i} style={{height:18,width:w,background:"rgba(255,255,255,0.2)",borderRadius:3}}/>)}
          </div>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.6)",display:"flex",alignItems:"center",gap:4}}>Trusted by 600+ teams <P id={5}/></span>
        </div>
      </div>

      {/* Features */}
      <div style={{padding:"36px 28px",borderBottom:"1px solid #F3F4F6",background:"#FAFAFA"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#148C59",marginBottom:8}}>FEATURES</div>
          <div style={{fontSize:22,fontWeight:800,color:"#0B1C48",fontFamily:"'Unbounded',sans-serif",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            Your team, always moving forward <P id={6}/>
          </div>
          <div style={{fontSize:13,color:"#6B7280",maxWidth:400,margin:"0 auto"}}>Built for lean SaaS teams who ship fast and iterate faster.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          {[
            {icon:"⚡","t":"You always know what shipped","d":"Real-time visibility across every sprint - zero context switching.","c":"rgba(20,213,113,0.08)","bc":"rgba(20,213,113,0.2)"},
            {icon:"📊","t":"Your team runs any report in 30s","d":"No waiting for data. Answers exactly when you need them.","c":"rgba(91,97,244,0.06)","bc":"rgba(91,97,244,0.18)"},
            {icon:"🤝","t":"No more status meetings","d":"Your whole team stays aligned without the weekly overhead.","c":"rgba(20,213,113,0.06)","bc":"rgba(20,213,113,0.15)"},
          ].map((f,i)=>(
            <div key={i} style={{padding:"18px 16px",background:f.c,borderRadius:10,border:`1px solid ${f.bc}`,textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:10}}>{f.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:"#0B1C48",marginBottom:6}}>{f.t}</div>
              <div style={{fontSize:11.5,color:"#6B7280",lineHeight:1.5}}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div style={{padding:"36px 28px",borderBottom:"1px solid #F3F4F6",background:"#fff",textAlign:"center"}}>
        <div style={{fontSize:22,fontWeight:800,color:"#0B1C48",fontFamily:"'Unbounded',sans-serif",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          Trusted by teams at leading companies <P id={7}/>
        </div>
        <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:24}}>
          {[58,44,68,50,40].map((w,i)=><div key={i} style={{height:22,width:w,background:"rgba(11,28,72,0.1)",borderRadius:4}}/>)}
        </div>
        <div style={{maxWidth:560,margin:"0 auto",background:"linear-gradient(135deg,rgba(20,213,113,0.06),rgba(91,97,244,0.04))",border:"1px solid rgba(20,213,113,0.15)",borderRadius:12,padding:"20px 24px"}}>
          <div style={{fontSize:16,color:"#0B1C48",lineHeight:1.6,fontStyle:"italic",marginBottom:10}}>
            "We cut our planning cycle by 3 weeks in the first month. Worth every penny."
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#5B61F4,#14D571)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff"}}>S</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#0B1C48"}}>Sarah Chen</div>
              <div style={{fontSize:11,color:"#9CA3AF"}}>Head of Product · Trendio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{padding:"36px 28px",background:"#FAFAFA"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:13,color:"#6B7280",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            Teams using our platform ship 2× faster in their first 90 days. <P id={8}/>
          </div>
          <div style={{fontSize:22,fontWeight:800,color:"#0B1C48",fontFamily:"'Unbounded',sans-serif"}}>Simple, transparent pricing</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            {n:"Starter",p:"$0",s:"free forever",pop:false,bg:"#fff",bc:"#E5E7EB"},
            {n:"Growth",p:"$49",s:"/ month",pop:false,bg:"#fff",bc:"#E5E7EB"},
            {n:"Pro",p:"$99",s:"/ month",pop:true,bg:"rgba(20,213,113,0.06)",bc:"#6EE7B7"},
            {n:"Enterprise",p:"Custom",s:"",pop:false,bg:"#fff",bc:"#E5E7EB"},
          ].map((t)=>(
            <div key={t.n} style={{padding:"20px 14px",background:t.bg,border:`1px solid ${t.bc}`,borderRadius:10,textAlign:"center",position:"relative",boxShadow:t.pop?"0 4px 20px rgba(20,140,89,0.12)":"none"}}>
              {t.pop&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#186132,#14D571)",color:"#fff",fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:10,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              <div style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:6}}>{t.n}</div>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:24,fontWeight:800,color:t.pop?"#148C59":"#0B1C48",marginBottom:4}}>{t.p}</div>
              <div style={{fontSize:11,color:"#9CA3AF",marginBottom:14}}>{t.s}</div>
              <div style={{padding:"8px",background:t.pop?"linear-gradient(135deg,#186132,#14D571)":"rgba(0,0,0,0.05)",borderRadius:6,fontSize:11,fontWeight:600,color:t.pop?"#fff":"#374151",cursor:"pointer"}}>
                {t.pop?"Get started →":"Choose plan"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif"}}>
      <style>{FONTS}</style><Blobs/>
      <Nav onNew={()=>{}} rightLabel="New Audit"/>
      <div style={{maxWidth:1140,margin:"0 auto",padding:"0 28px 24px",position:"relative",zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,padding:0}}
          onMouseEnter={e=>e.currentTarget.style.color=C.navy} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>← Back to UXpact</button>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:16}}>
          <div>
            <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:24,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 4px"}}>
              UXpact{" "}<span style={{background:"linear-gradient(90deg,#5B61F4,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Vision</span>
            </h1>
            <p style={{fontSize:14,color:C.muted,margin:0}}>Your site fully redesigned with every audit finding applied. Click numbered pins for annotations.</p>
          </div>
          <div style={{display:"inline-flex",borderRadius:10,background:"rgba(232,235,240,0.95)",padding:"5px",gap:3,flexShrink:0}}>
            {[["current","Current"],["split","Split"],["vision","Vision ✦"]].map(([v,l])=>(
              <button key={v} onClick={()=>{setView(v);setActivePin(null);}} style={{padding:"8px 18px",borderRadius:7,border:"none",background:view===v?"#fff":"transparent",color:view===v?C.forest:C.muted,fontSize:12,fontWeight:view===v?700:400,cursor:"pointer",transition:"all 0.18s ease",boxShadow:view===v?"0 2px 6px rgba(0,0,0,0.1)":"none",fontFamily:"'Space Grotesk',sans-serif"}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
          {[["Benefit-led H1","#14D571"],["CTA above fold","#14D571"],["Secondary CTA","#5B61F4"],["Trust strip","#14D571"],["Outcome features","#5B61F4"],["Testimonial near CTA","#14D571"],["Pricing anchor copy","#5B61F4"]].map(([t,c])=>(
            <div key={t} style={{fontSize:10,fontWeight:600,color:c,background:`${c}18`,border:`1px solid ${c}35`,borderRadius:20,padding:"3px 10px"}}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{maxWidth:1140,margin:"0 auto",padding:"0 28px 60px",position:"relative",zIndex:10}}>
        {view==="current"&&<div className="fade-in"><CurrentPage/></div>}
        {view==="vision"&&<div className="fade-in"><VisionPage/></div>}
        {view==="split"&&(
          <div className="fade-in" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.dim,marginBottom:8}}>Current</div>
              <CurrentPage/>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:C.emerald,marginBottom:8}}>Vision ✦</div>
              <VisionPage/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SCREEN 7: PLUGINS ────────────────────────────────────────────────
function PluginsScreen({onBack}) {
  const [activePlugin,setActivePlugin]=useState("Figma");
  const [activeSection,setActiveSection]=useState("Hero");
  const plugins=["Figma","Framer","Webflow","WordPress","Wix","Squarespace","Shopify"];
  const sections=["Hero","Features","Pricing","Footer"];
  const pluginFindings={
    Figma:{Hero:[{t:"CTA below fold",s:"Critical"},{t:"Value prop unclear",s:"Critical"}],Features:[{t:"Feature copy feature-led",s:"Major"}],Pricing:[{t:"No anchor copy",s:"Minor"}],Footer:[{t:"No secondary CTA",s:"Minor"}]},
    Framer:{Hero:[{t:"CTA below fold",s:"Critical"},{t:"Brand voice inconsistent",s:"Major"}],Features:[{t:"Outcome copy missing",s:"Major"}],Pricing:[],Footer:[]},
    Webflow:{Hero:[{t:"Mobile nav hides pricing",s:"Major"}],Features:[{t:"Feature copy feature-led",s:"Minor"}],Pricing:[{t:"No social proof near CTA",s:"Major"}],Footer:[]},
    WordPress:{Hero:[{t:"CTA below fold",s:"Critical"},{t:"Page speed below threshold",s:"Major"}],Features:[],Pricing:[{t:"No schema markup",s:"Minor"}],Footer:[{t:"No footer CTA",s:"Minor"}]},
    Wix:{Hero:[{t:"Value prop unclear",s:"Critical"},{t:"Mobile layout breaks",s:"Major"}],Features:[],Pricing:[],Footer:[]},
    Squarespace:{Hero:[{t:"No testimonials near CTA",s:"Major"}],Features:[],Pricing:[{t:"Nav CTA not prominent",s:"Minor"}],Footer:[]},
    Shopify:{Hero:[{t:"Above-fold CTA competes with nav",s:"Major"}],Features:[{t:"Product copy feature-led",s:"Major"}],Pricing:[{t:"Trust badges missing",s:"Minor"}],Footer:[]},
    
  };
  const sevColor={Critical:"#EF4444",Major:"#F59E0B",Minor:"#EAB308"};
  const currentFindings=(pluginFindings[activePlugin]||{})[activeSection]||[];
  const totalForPlugin=Object.values(pluginFindings[activePlugin]||{}).flat().length;

  return (
    <div className="fade-in" style={{minHeight:"100vh",background:C.bg,fontFamily:"'Space Grotesk',sans-serif"}}>
      <style>{FONTS}</style><Blobs/>
      <Nav onNew={()=>{}} rightLabel="New Audit"/>
      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 28px 24px",position:"relative",zIndex:10}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.muted,display:"flex",alignItems:"center",gap:4,fontFamily:"'Space Grotesk',sans-serif",marginBottom:16,padding:0}}
          onMouseEnter={e=>e.currentTarget.style.color=C.navy} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>← Back to UXpact</button>
        <h1 style={{fontFamily:"'Unbounded',sans-serif",fontSize:24,fontWeight:700,color:C.navy,letterSpacing:"-0.5px",margin:"0 0 4px"}}>
          Design Tool <span style={{background:"linear-gradient(90deg,#186132,#14D571)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Plugins</span>
        </h1>
        <p style={{fontSize:14,color:C.muted,margin:"0 0 24px"}}>Your audit findings surfaced contextually inside your design tool. Working on the hero? See exactly which findings apply - without leaving your tool.</p>
      </div>
      <div style={{maxWidth:1060,margin:"0 auto",padding:"0 28px 60px",position:"relative",zIndex:10,display:"grid",gridTemplateColumns:"210px 1fr",gap:20}}>
        {/* Sidebar */}
        <div style={{position:"sticky",top:20,height:"fit-content",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...glass,padding:"14px"}}>
            <div style={{fontSize:9.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.7px",color:C.dim,marginBottom:10}}>Platform</div>
            {plugins.map(p=>(
              <button key={p} onClick={()=>{setActivePlugin(p);setActiveSection("Hero");}} style={{display:"block",width:"100%",padding:"8px 10px",borderRadius:8,border:"none",background:activePlugin===p?"linear-gradient(135deg,rgba(20,140,89,0.12),rgba(20,213,113,0.06))":"transparent",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:activePlugin===p?C.forest:C.muted,fontWeight:activePlugin===p?600:400,transition:"all 0.15s",marginBottom:2,textAlign:"left",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                {p}
                {Object.values(pluginFindings[p]||{}).flat().length>0&&<span style={{fontSize:9,fontWeight:700,background:"rgba(20,140,89,0.12)",color:C.emerald,borderRadius:10,padding:"1px 6px"}}>{Object.values(pluginFindings[p]||{}).flat().length}</span>}
              </button>
            ))}
          </div>
        </div>
        {/* Main */}
        <div>
          {/* Plugin header card */}
          <div style={{...cardBgs[0],borderRadius:16,padding:"22px 24px",marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,rgba(91,97,244,0.15),rgba(20,213,113,0.1))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🔌</div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:C.navy,marginBottom:2}}>{activePlugin} Plugin</div>
                <div style={{fontSize:12,color:C.muted}}>{totalForPlugin} finding{totalForPlugin!==1?"s":""} apply to {activePlugin} projects</div>
              </div>
              <div style={{marginLeft:"auto",padding:"5px 14px",borderRadius:20,background:"rgba(91,97,244,0.1)",border:"1px solid rgba(91,97,244,0.15)",fontSize:10,fontWeight:700,color:C.violet}}>Pro Add-on</div>
            </div>
            <div style={{fontSize:12,color:C.muted,lineHeight:1.6,padding:"12px 14px",borderRadius:9,background:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.8)"}}>
              The {activePlugin} plugin reads your audit findings and surfaces them contextually as you design. Select a section below to see which findings are flagged for that area - and copy the fix prompt directly into your workflow.
            </div>
          </div>

          {/* Section tabs + findings panel */}
          <div style={{...cardBgs[2],borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"6px",display:"flex",gap:3,background:"rgba(215,220,232,0.5)",borderRadius:"16px 16px 0 0"}}>
              {sections.map(s=>(
                <button key={s} onClick={()=>setActiveSection(s)} style={{flex:1,padding:"9px 12px",borderRadius:9,border:"none",background:activeSection===s?"#fff":"transparent",color:activeSection===s?C.forest:C.muted,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:activeSection===s?700:400,cursor:"pointer",transition:"all 0.18s ease",boxShadow:activeSection===s?"0 2px 6px rgba(0,0,0,0.12)":"none"}}>
                  {s}
                  {((pluginFindings[activePlugin]||{})[s]||[]).length>0&&<span style={{marginLeft:6,fontSize:9,fontWeight:700,background:activeSection===s?"rgba(20,140,89,0.12)":"rgba(0,0,0,0.08)",color:activeSection===s?C.emerald:C.dim,borderRadius:10,padding:"1px 6px"}}>{((pluginFindings[activePlugin]||{})[s]||[]).length}</span>}
                </button>
              ))}
            </div>
            <div style={{padding:"20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:C.mint,animation:"pulseAnim 2s infinite"}}/>
                <div style={{fontSize:11,fontWeight:600,color:C.violet}}>Plugin Panel - {activePlugin} · {activeSection} Section Active</div>
              </div>
              {currentFindings.length===0?(
                <div style={{textAlign:"center",padding:"32px 0",color:C.muted,fontSize:13}}>
                  <div style={{fontSize:24,marginBottom:8}}>✓</div>
                  No findings flagged for the {activeSection} section
                </div>
              ):(
                <div>
                  {currentFindings.map((r,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:10,background:"rgba(255,255,255,0.7)",border:"1px solid rgba(255,255,255,0.8)",marginBottom:8,animation:`fadeUp 0.2s ease ${i*0.06}s both`,boxShadow:"0 2px 6px rgba(0,0,0,0.03)"}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:sevColor[r.s],flexShrink:0,boxShadow:`0 0 6px ${sevColor[r.s]}55`}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.navy}}>{r.t}</div>
                        <div style={{fontSize:11,color:C.muted,marginTop:2}}>{r.s} severity</div>
                      </div>
                      <button style={{padding:"6px 14px",borderRadius:7,background:"linear-gradient(135deg,rgba(91,97,244,0.1),rgba(20,213,113,0.08))",border:"none",fontSize:11,fontWeight:700,color:C.violet,cursor:"pointer",transition:"all 0.15s ease"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(91,97,244,0.2),rgba(20,213,113,0.15))";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,rgba(91,97,244,0.1),rgba(20,213,113,0.08))";}}>
                        Copy fix prompt →
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:12,padding:"10px 14px",borderRadius:8,background:"rgba(11,28,72,0.03)",fontSize:11,color:C.dim}}>
                {currentFindings.length} of {totalForPlugin} findings apply to the {activeSection} section in {activePlugin}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("input");
  const [auditData,setAuditData]=useState(null);
  const [bpFinding,setBpFinding]=useState(null);
  const openBP=f=>{setBpFinding(f);setScreen("blueprint");};
  const openProScreen=s=>setScreen(s);
  return (
    <>
      {screen==="input"&&<InputScreen onNext={d=>{setAuditData(d);setScreen("scan");}}/>}
      {screen==="scan"&&<ScanScreen auditData={auditData} onAccess={()=>setScreen("uxpact")}/>}
      {screen==="uxpact"&&<FullUXpact onBlueprint={openBP} onProScreen={openProScreen}/>}
      {screen==="blueprint"&&<BlueprintScreen initialFinding={bpFinding} onBack={()=>setScreen("uxpact")}/>}
      {screen==="reaudit"&&<ReauditScreen onBack={()=>setScreen("uxpact")}/>}
      {screen==="vision"&&<VisionScreen onBack={()=>setScreen("uxpact")}/>}
      {screen==="plugins"&&<PluginsScreen onBack={()=>setScreen("uxpact")}/>}
    </>
  );
}
