import { FormEvent, useEffect, useState } from "react";

type Severity = "critical" | "major" | "minor";
type AuditMode = "input" | "loading" | "results";

type Finding = {
  id: string;
  name: string;
  severity: Severity;
  finding: string;
  fix?: string;
  aiPrompt?: string;
  pass: boolean;
  category?: string;
  domZone?: "hero" | "nav" | "cta" | "social-proof" | "body-copy" | "footer";
  glossaryTerms?: string[];
};

type AuditData = {
  auditId: string;
  url: string;
  domain: string;
  score: number;
  createdAt: string;
  findings: Finding[];
  domData: {
    navLinks: string[];
    h1Text: string;
    h2Texts: string[];
    h3Texts: string[];
    ctaTexts: string[];
    paragraphTexts: string[];
    imagesCount: number;
    hasForm: boolean;
  };
};

type AuditRequest = {
  name: string;
  email: string;
  url: string;
  industry: string;
  goal: string;
  challenge: string;
  focusAreas: string[];
};

const focusOptions = [
  "Scroll Behavior",
  "CTA Placement",
  "Copy Clarity",
  "Visual Hierarchy",
  "Responsiveness",
  "Overall",
];

const statusMessages = [
  "Parsing your page structure...",
  "Running conversion checks...",
  "Evaluating persuasion architecture...",
  "Scoring copy & messaging...",
  "Checking trust signals...",
  "Finalising your report...",
];

const ctaAssets = {
  download:
    "https://raw.githubusercontent.com/sohani93/uxpact-assets/main/Download%20(Purple).png",
  blueprint:
    "https://raw.githubusercontent.com/sohani93/uxpact-assets/main/Blueprint%20(Green).png",
  pulse:
    "https://raw.githubusercontent.com/sohani93/uxpact-assets/main/Pulse%20(Purple).png",
};

function getPath() {
  return window.location.pathname;
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function generateRevenueLeak(score: number, findings: Finding[]) {
  let mobileDropoff = 35;
  const titles = findings.map((f) => `${f.name} ${f.finding}`.toLowerCase());
  if (titles.some((t) => t.includes("above fold") || t.includes("cta"))) mobileDropoff += 12;
  if (titles.some((t) => t.includes("viewport"))) mobileDropoff += 8;
  if (titles.some((t) => t.includes("spacing") || t.includes("layout"))) mobileDropoff += 5;
  mobileDropoff = Math.min(65, mobileDropoff);

  let copyFriction = 15;
  if (titles.some((t) => t.includes("feature-led") || t.includes("feature led"))) copyFriction += 8;
  if (titles.some((t) => t.includes("value prop") || t.includes("value proposition"))) copyFriction += 9;
  copyFriction = Math.min(35, copyFriction);

  const riskBand = score < 40 ? "Critical" : score < 60 ? "High" : score < 70 ? "Medium" : "Low";

  return {
    mobileDropoff: Math.round(mobileDropoff / 5) * 5,
    copyFriction: `${copyFriction}–${Math.min(copyFriction + 5, 40)}%`,
    riskBand,
  };
}

function App() {
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path.startsWith("/report/")) {
    return <ReportPage auditId={path.split("/")[2]} />;
  }
  if (path.startsWith("/blueprint/")) {
    return <BlueprintPage auditId={path.split("/")[2]} />;
  }
  return <AuditPage />;
}

function AuditPage() {
  const [mode, setMode] = useState<AuditMode>("input");
  const [form, setForm] = useState<AuditRequest>({
    name: "",
    email: "",
    url: "",
    industry: "saas",
    goal: "",
    challenge: "",
    focusAreas: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [pendingData, setPendingData] = useState<AuditData | null>(null);
  const [loadingError, setLoadingError] = useState<string>("");
  const [result, setResult] = useState<AuditData | null>(null);

  useEffect(() => {
    if (mode !== "loading") return;
    const started = Date.now();
    const p = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const next = Math.min(100, Math.round((elapsed / 12000) * 100));
      setProgress(next);
    }, 120);
    const s = window.setInterval(() => setStatusIdx((i) => (i + 1) % statusMessages.length), 2000);
    return () => {
      clearInterval(p);
      clearInterval(s);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "loading" || !pendingData || progress < 100) return;
    const t = window.setTimeout(() => {
      setResult(pendingData);
      setMode("results");
    }, 350);
    return () => clearTimeout(t);
  }, [mode, pendingData, progress]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (!/^https?:\/\//.test(form.url)) nextErrors.url = "Site URL must start with http:// or https://";
    if (!form.industry) nextErrors.industry = "Site type is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    sessionStorage.setItem("auditContext", JSON.stringify(form));
    setMode("loading");
    setLoadingError("");
    setProgress(0);
    const minWait = new Promise((resolve) => setTimeout(resolve, 4000));

    try {
      const endpoint =
        import.meta.env.VITE_AUDIT_ENDPOINT ??
        "https://oxminualycvnxofoevjs.supabase.co/functions/v1/run-audit";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: form.url,
          industry: form.industry,
          name: form.name,
          email: form.email,
          goal: form.goal,
          challenge: form.challenge,
          focusAreas: form.focusAreas,
        }),
      });
      const json = await response.json();
      await minWait;

      if (!response.ok || json.error) {
        setLoadingError(json.error ?? "Unable to run audit. Please try again.");
        return;
      }

      const findings: Finding[] = (json.findings ?? []).map((f: any) => ({
        id: f.id,
        name: f.name,
        severity: f.severity,
        finding: f.finding,
        fix: f.fix,
        aiPrompt: f.aiPrompt,
        pass: Boolean(f.pass),
        glossaryTerms: f.glossaryTerms ?? [],
        domZone: f.domZone ?? "body-copy",
      }));

      const domain = new URL(form.url).hostname;
      const auditData: AuditData = {
        auditId: json.auditId,
        url: form.url,
        domain,
        score: Number(json.scores?.total ?? 0),
        createdAt: new Date().toISOString(),
        findings,
        domData: json.domData ?? {
          navLinks: [],
          h1Text: domain,
          h2Texts: [],
          h3Texts: [],
          ctaTexts: [],
          paragraphTexts: [],
          imagesCount: 0,
          hasForm: false,
        },
      };
      sessionStorage.setItem(`audit:${auditData.auditId}`, JSON.stringify(auditData));
      setPendingData(auditData);
    } catch {
      setLoadingError("Processing error. Please retry in a moment.");
    }
  };

  if (mode === "input") {
    return (
      <main className="shell">
        <section className="glass panel">
          <div className="grid-two">
            <form onSubmit={submit}>
              <h1>Run UXpact Audit</h1>
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} error={errors.name} />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={errors.email} />
              <Field label="Site URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} error={errors.url} />
              <label>Site type</label>
              <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                <option value="saas">SaaS</option>
                <option value="ecommerce">Ecommerce</option>
                <option value="portfolio">Portfolio</option>
                <option value="healthcare">Healthcare</option>
                <option value="fintech">Fintech</option>
                <option value="service">Service & Agency</option>
              </select>
              <label>Page goal</label>
              <textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} rows={3} />
              <label>Challenge</label>
              <textarea value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} rows={3} />
              <label>Focus area</label>
              <div className="pill-wrap">
                {focusOptions.map((item) => {
                  const selected = form.focusAreas.includes(item);
                  return (
                    <button
                      type="button"
                      className={`pill ${selected ? "pill-green" : "pill-off"}`}
                      key={item}
                      onClick={() =>
                        setForm({
                          ...form,
                          focusAreas: selected ? form.focusAreas.filter((x) => x !== item) : [...form.focusAreas, item],
                        })
                      }
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              <button className="submit-btn" type="submit">
                Start Audit
              </button>
            </form>
            <aside className="pack-preview">
              <h2>Your Audit Pack</h2>
              <p>UXpact Score</p>
              <p>Pulse Extension</p>
              <p>Instant PDF</p>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "loading") {
    return (
      <main className="shell">
        <section className="glass panel loading">
          <div className="pill-wrap">
            <span className="pill pill-violet">{(() => {
              try {
                return new URL(form.url).hostname;
              } catch {
                return form.url;
              }
            })()}</span>
            {form.focusAreas.map((area) => (
              <span className="pill pill-green" key={area}>{area}</span>
            ))}
          </div>
          <h1>Scanning {new URL(form.url).hostname}</h1>
          <div className="node" />
          <div className="bar"><span style={{ width: `${progress}%` }} /></div>
          <p>{statusMessages[statusIdx]}</p>
          {progress > 50 ? <p className="hint">Hang tight — we&apos;re almost done.</p> : null}
          {loadingError ? <p className="error">🔴 {loadingError}</p> : null}
        </section>
      </main>
    );
  }

  if (!result) return null;
  const topFindings = result.findings.filter((f) => !f.pass).slice(0, 3);
  const leak = generateRevenueLeak(result.score, result.findings);
  return (
    <main className="shell">
      <section className="glass panel results">
        <h1>{Math.round(result.score)}</h1>
        <p>UXpact Score</p>
        <div className="tile-row">
          <article className="tile">
            <strong>~{leak.mobileDropoff}%</strong>
            <span>Mobile drop-off</span>
          </article>
          <article className="tile">
            <strong>{leak.riskBand}</strong>
            <span>Revenue risk band</span>
          </article>
        </div>
        <ul>
          {topFindings.map((f) => (
            <li key={f.id}>
              <span className={`dot ${f.severity}`} /> {f.name}
            </li>
          ))}
        </ul>
        <button className="submit-btn" onClick={() => navigate(`/report/${result.auditId}`)}>
          Access Full Report →
        </button>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <>
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
      {error ? <p className="error">🔴 {error}</p> : null}
    </>
  );
}

function getAudit(auditId: string): AuditData | null {
  const raw = sessionStorage.getItem(`audit:${auditId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuditData;
  } catch {
    return null;
  }
}

function ReportPage({ auditId }: { auditId: string }) {
  const audit = getAudit(auditId);
  useEffect(() => {
    if (!audit) navigate("/audit?error=not-found");
  }, [audit]);
  const [expanded, setExpanded] = useState(false);
  if (!audit) return null;

  const critical = audit.findings.filter((f) => !f.pass && f.severity === "critical");
  const major = audit.findings.filter((f) => !f.pass && f.severity === "major");
  const minor = audit.findings.filter((f) => !f.pass && f.severity === "minor");
  const passed = audit.findings.filter((f) => f.pass);
  const leak = generateRevenueLeak(audit.score, audit.findings);

  return (
    <main className="report-shell">
      <header className="report-nav"><a href="/audit" onClick={(e) => {e.preventDefault();navigate('/audit');}}>UXpact</a><button onClick={() => navigate('/audit')}>New Audit</button></header>
      <section className="card">Score Overview: {Math.round(audit.score)}</section>
      <section className="card">Revenue Leak: ~{leak.mobileDropoff}% · {leak.riskBand} · {leak.copyFriction}</section>
      <FindingsCard title="Critical" findings={critical} />
      <FindingsCard title="Major" findings={major} />
      <FindingsCard title="Minor" findings={minor} />
      <section className="card"><h3>What&apos;s Working</h3>{(expanded ? passed : passed.slice(0,8)).map((p) => <p key={p.id}>✅ {p.name}</p>)}{passed.length>8?<button onClick={()=>setExpanded(!expanded)}>{expanded?'Show less':'Show all'}</button>:null}</section>
      <section className="card"><h3>Pulse Preview</h3>{[...critical,...major,...minor].slice(0,5).map((f)=><p key={f.id}>☐ {f.name}</p>)}</section>
      <section className="cta-tray">
        <h2>💜 You&apos;re all set.</h2>
        <div className="cta-grid">
          <button className="cta-box" onClick={() => alert("Connect /generate-pdf in Supabase to enable downloads.")}><img src={ctaAssets.download} /><strong>Download PDF</strong></button>
          <button className="cta-box" onClick={() => navigate(`/blueprint/${audit.auditId}`)}><img src={ctaAssets.blueprint} /><strong>Conversion Blueprint</strong></button>
          <button className="cta-box" onClick={() => navigator.clipboard.writeText(audit.auditId)}><img src={ctaAssets.pulse} /><strong>Start Pulse Tracker</strong></button>
        </div>
      </section>
    </main>
  );
}

function FindingsCard({ title, findings }: { title: string; findings: Finding[] }) {
  return <section className="card"><h3>{title} · {findings.length} findings</h3>{findings.map((f)=><article key={f.id}><strong>{f.name}</strong><p>{f.finding}</p></article>)}</section>;
}

function BlueprintPage({ auditId }: { auditId: string }) {
  const audit = getAudit(auditId);
  const [active, setActive] = useState<Finding | null>(null);
  useEffect(() => {
    if (!audit) navigate("/audit?error=not-found");
  }, [audit]);

  if (!audit) return null;
  const ordered = [...audit.findings.filter((f) => !f.pass)].sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, major: 1, minor: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <main className="shell blueprint-shell">
      <header className="report-nav"><button onClick={() => navigate(`/report/${audit.auditId}`)}>← Back to Report</button><span>{ordered.length} fixes · Critical first</span></header>
      <section className={`blueprint-grid ${active ? "with-drawer" : ""}`}>
        <div className="facsimile glass">
          <nav>{audit.domData.navLinks.map((n) => <span key={n}>{n}</span>)}</nav>
          <h1>{audit.domData.h1Text}</h1>
          {audit.domData.h2Texts.map((h) => <h2 key={h}>{h}</h2>)}
          {audit.domData.paragraphTexts.slice(0, 4).map((p, i) => <p key={i}>{p}</p>)}
          <div className="pins">
            {ordered.map((f, i) => <button key={f.id} className={`pin ${f.severity}`} onClick={() => setActive(f)}>{i + 1}</button>)}
          </div>
        </div>
        {active ? (
          <aside className="drawer glass">
            <p>{active.severity.toUpperCase()}</p>
            <h3>{active.name}</h3>
            <p>{active.fix ?? active.finding}</p>
            <pre>I&apos;m working on {audit.url}. My page has a UX issue:{"\n"}{active.name}{"\n\n"}{active.fix ?? active.finding}{"\n\n"}Please help me fix this. Rewrite or update the relevant section to resolve the issue.</pre>
            <button onClick={() => navigator.clipboard.writeText(active.aiPrompt ?? active.fix ?? active.finding)}>Copy</button>
            <button onClick={() => setActive(null)}>← Back</button>
          </aside>
        ) : null}
      </section>
    </main>
  );
}

export default App;
