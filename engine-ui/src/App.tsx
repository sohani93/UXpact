import { useEffect, useState } from "react";
import EngineInput from "./components/EngineInput";
import LoadingState from "./components/LoadingState";
import Workspace from "./pages/Workspace";
import type { AuditData, AuditRequestFormData } from "./lib/ui-types";

type AuditMode = "input" | "loading";

function getPath() { return window.location.pathname; }

function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // One continuous workspace per site — Diagnosis, Conversion Blueprint, and
  // UX Pulse all live as sections of the same page, not separate routes.
  // Old links (/report/:id, /blueprint/:id, /vision/:id) redirect here rather than 404.
  const workspaceMatch = path.match(/^\/(?:workspace|report|blueprint|reaudit|plugins|vision)\/(.+)$/);
  if (workspaceMatch) {
    const auditId = workspaceMatch[1];
    if (!path.startsWith("/workspace/")) window.history.replaceState({}, "", `/workspace/${auditId}`);
    return <Workspace auditId={auditId} />;
  }
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
      if (!response.ok || json.error || !json.auditId) { setMode("input"); return; }
      const auditData: AuditData = {
        auditId: json.auditId,
        url: normalisedUrl,
        domain: parsedUrl.hostname,
        createdAt: new Date().toISOString(),
        domData: json.domData ?? { navLinks: [], h1Text: parsedUrl.hostname, h2Texts: [], ctaTexts: [], paragraphTexts: [], testimonialTexts: [], trustLogoLabels: [], pricingTiers: [], imagesCount: 0, hasForm: false, metaTitle: "" },
        currentArchetype: json.currentArchetype ?? null,
        targetArchetype: json.targetArchetype ?? null,
        narrativeVerdict: json.narrativeVerdict ?? null,
        revenueLeakEstimate: json.revenueLeakEstimate ?? null,
        journeyBreaks: json.journeyBreaks ?? null,
        diagnosisError: json.diagnosisError ?? null,
      };
      sessionStorage.setItem(`audit:${auditData.auditId}`, JSON.stringify(auditData));
      setPendingData(auditData);
    } catch { setMode("input"); }
  };

  const handleAccess = () => {
    if (!pendingData) return;
    navigateTo(`/workspace/${pendingData.auditId}`);
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
