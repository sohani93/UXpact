import { useEffect, useState } from "react";
import EngineInput from "./components/EngineInput";
import LoadingState from "./components/LoadingState";
import FullReport from "./pages/FullReport";
import ConversionBlueprint from "./pages/Blueprint";
import type { AuditData, AuditRequestFormData, Finding } from "./lib/ui-types";

type AuditMode = "input" | "loading";

function getPath() { return window.location.pathname; }

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
  const [pendingData, setPendingData] = useState<AuditData | null>(null);

  const handleSubmit = async (formData: AuditRequestFormData) => {
    const rawUrl = formData.url.trim();
    const normalisedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const normalisedFormData = { ...formData, url: normalisedUrl };
    setForm(normalisedFormData);
    setPendingData(null);
    sessionStorage.setItem("auditContext", JSON.stringify(normalisedFormData));
    try {
      const parsedUrl = new URL(normalisedUrl);
      setMode("loading");
      const endpoint = import.meta.env.VITE_AUDIT_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/run-audit";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(normalisedFormData) });
      const json = await response.json();
      if (!response.ok || json.error) { setMode("input"); return; }
      const findings: Finding[] = (json.findings ?? []).map((f: any) => ({ id: f.id, name: f.name, severity: f.severity, finding: f.finding, fix: f.fix, aiPrompt: f.aiPrompt, pass: Boolean(f.pass), glossaryTerms: f.glossaryTerms ?? [], domZone: f.domZone ?? "body-copy" }));
      const topFindings: Finding[] = (json.topFindings ?? []).map((f: any) => ({ id: f.id, name: f.name, severity: f.severity, finding: f.finding, fix: f.fix, aiPrompt: f.aiPrompt, pass: Boolean(f.pass), glossaryTerms: f.glossaryTerms ?? [], domZone: f.domZone ?? "body-copy" }));
      const auditData: AuditData = { auditId: json.auditId, url: normalisedUrl, domain: parsedUrl.hostname, score: Number(json.scores?.total ?? 0), criticalIssues: Number(json.scores?.criticalIssues ?? 0), createdAt: new Date().toISOString(), findings, topFindings, domData: json.domData ?? { navLinks: [], h1Text: parsedUrl.hostname, h2Texts: [], h3Texts: [], ctaTexts: [], paragraphTexts: [], imagesCount: 0, hasForm: false } };
      sessionStorage.setItem(`audit:${auditData.auditId}`, JSON.stringify(auditData));
      setPendingData(auditData);
    } catch { setMode("input"); }
  };

  const handleAccess = () => {
    if (!pendingData) return;
    const p = `/report/${pendingData.auditId}`;
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <>
      {mode === "input" && <EngineInput onSubmit={handleSubmit} initialForm={form} />}
      {mode === "loading" && (
        <LoadingState
          url={form.url}
          goals={form.focusAreas}
          auditData={pendingData}
          onAccess={handleAccess}
          onError={() => setMode("input")}
        />
      )}
    </>
  );
}

export default App;
