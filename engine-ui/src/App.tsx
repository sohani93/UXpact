import { useEffect, useState } from "react";
import EngineInput from "./components/EngineInput";
import LoadingState from "./components/LoadingState";
import CompactResults from "./components/CompactResults";
import FullReport from "./pages/FullReport";
import ConversionBlueprint from "./pages/Blueprint";
import type { AuditData, AuditRequestFormData, Finding, RevenueLeak } from "./lib/ui-types";

type AuditMode = "input" | "loading" | "results";

function getPath() { return window.location.pathname; }

function generateRevenueLeak(score: number, findings: Finding[]): RevenueLeak {
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
  return { mobileDropoff: Math.round(mobileDropoff / 5) * 5, copyFriction: `${copyFriction}–${Math.min(copyFriction + 5, 40)}%`, riskBand };
}

function App() {
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path.startsWith("/report/")) return <FullReport auditId={path.split("/")[2]} />;
  if (path.startsWith("/blueprint/")) return <ConversionBlueprint auditId={path.split("/")[2]} />;
  return <AuditPage />;
}

function AuditPage() {
  const [mode, setMode] = useState<AuditMode>("input");
  const [form, setForm] = useState<AuditRequestFormData>({ name: "", email: "", url: "", industry: "saas", goal: "", challenge: "", focusAreas: [] });
  const [progress, setProgress] = useState(0);
  const [pendingData, setPendingData] = useState<AuditData | null>(null);
  const [result, setResult] = useState<AuditData | null>(null);
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (mode !== "loading") return;
    const started = Date.now();
    const p = window.setInterval(() => setProgress(Math.min(100, Math.round(((Date.now() - started) / 12000) * 100))), 120);
    return () => clearInterval(p);
  }, [mode]);

  useEffect(() => {
    if (mode !== "loading" || !pendingData || progress < 100) return;
    const t = window.setTimeout(() => { setResult(pendingData); setMode("results"); }, 350);
    return () => clearTimeout(t);
  }, [mode, pendingData, progress]);

  const handleSubmit = async (formData: AuditRequestFormData) => {
    const rawUrl = formData.url.trim();
    const normalisedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const normalisedFormData = { ...formData, url: normalisedUrl };
    setForm(normalisedFormData);
    sessionStorage.setItem("auditContext", JSON.stringify(normalisedFormData));
    const minWait = new Promise((resolve) => setTimeout(resolve, 4000));
    try {
      const parsedUrl = new URL(normalisedUrl);
      const parsedDomain = parsedUrl.hostname;
      setDomain(parsedDomain);
      setMode("loading");
      setProgress(0);
      const endpoint = import.meta.env.VITE_AUDIT_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/run-audit";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalisedFormData) });
      const json = await response.json();
      await minWait;
      if (!response.ok || json.error) { setMode("input"); return; }
      const findings: Finding[] = (json.findings ?? []).map((f: any) => ({ id: f.id, name: f.name, severity: f.severity, finding: f.finding, fix: f.fix, aiPrompt: f.aiPrompt, pass: Boolean(f.pass), glossaryTerms: f.glossaryTerms ?? [], domZone: f.domZone ?? "body-copy" }));
      const topFindings: Finding[] = (json.topFindings ?? []).map((f: any) => ({ id: f.id, name: f.name, severity: f.severity, finding: f.finding, fix: f.fix, aiPrompt: f.aiPrompt, pass: Boolean(f.pass), glossaryTerms: f.glossaryTerms ?? [], domZone: f.domZone ?? "body-copy" }));
      const auditData: AuditData = { auditId: json.auditId, url: normalisedUrl, domain: parsedDomain, score: Number(json.scores?.total ?? 0), criticalIssues: Number(json.scores?.criticalIssues ?? 0), createdAt: new Date().toISOString(), findings, topFindings, domData: json.domData ?? { navLinks: [], h1Text: parsedDomain, h2Texts: [], h3Texts: [], ctaTexts: [], paragraphTexts: [], imagesCount: 0, hasForm: false } };
      sessionStorage.setItem(`audit:${auditData.auditId}`, JSON.stringify(auditData));
      setPendingData(auditData);
    } catch { setMode("input"); }
  };

  const results = result ? { score: Math.round(result.score), scoreLabel: result.score >= 70 ? "Good" : result.score >= 40 ? "Needs Work" : "Critical", scoreSummary: "Here's how your site performed across our analysis.", findings: result.findings, topFindings: result.topFindings, criticalIssues: result.criticalIssues, revenueLeak: generateRevenueLeak(result.score, result.findings) } : { score: 0, scoreLabel: "", scoreSummary: "", findings: [], topFindings: [], criticalIssues: 0, revenueLeak: { mobileDropoff: 0, copyFriction: "", riskBand: "" } };
  const auditId = result?.auditId ?? "";

  return (
    <>
      {mode === "input" && <EngineInput onSubmit={handleSubmit} initialForm={form} />}
      {mode === "loading" && <LoadingState domain={domain || new URL(form.url).hostname} />}
      {mode === "results" && <CompactResults auditId={auditId} score={results.score} scoreLabel={results.scoreLabel} scoreSummary={results.scoreSummary} findings={results.findings} topFindings={results.topFindings} criticalIssues={results.criticalIssues} revenueLeak={results.revenueLeak} domain={domain} focusAreas={form.focusAreas} />}
    </>
  );
}

export default App;
