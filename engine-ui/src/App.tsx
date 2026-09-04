import { useEffect, useState } from "react";
import EngineInput from "./components/EngineInput";
import LoadingState from "./components/LoadingState";
import WorkspaceShell from "./pages/WorkspaceShell";
import { isDestination } from "./lib/destinations";
import { navigateTo } from "./lib/navigate";
import type { AuditData, AuditRequestFormData } from "./lib/ui-types";

function getPath() { return window.location.pathname; }

function App() {
  const [path, setPath] = useState(getPath());
  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Five real top-level routes sharing one audit_id, switched via the
  // persistent bottom nav — never scrolled to, never nested inside one
  // another: /workspace/:auditId/(diagnosis|blueprint|vision-pro|pulse|premium).
  const workspaceMatch = path.match(/^\/workspace\/([^/]+)\/([^/]+)\/?$/);
  if (workspaceMatch) {
    const [, auditId, dest] = workspaceMatch;
    if (!isDestination(dest)) {
      window.history.replaceState({}, "", `/workspace/${auditId}/diagnosis`);
      return <WorkspaceShell auditId={auditId} destination="diagnosis" />;
    }
    return <WorkspaceShell auditId={auditId} destination={dest} />;
  }

  // Old links — /workspace/:id, /report/:id, /blueprint/:id, /reaudit/:id,
  // /plugins/:id, /vision/:id — redirect to the new Diagnosis route for
  // that id rather than 404.
  const oldMatch = path.match(/^\/(?:workspace|report|blueprint|reaudit|plugins|vision)\/([^/]+)\/?$/);
  if (oldMatch) {
    const auditId = oldMatch[1];
    window.history.replaceState({}, "", `/workspace/${auditId}/diagnosis`);
    return <WorkspaceShell auditId={auditId} destination="diagnosis" />;
  }

  return <AuditPage />;
}

type AuditMode = "input" | "loading";

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
    navigateTo(`/workspace/${pendingData.auditId}/diagnosis`);
  };

  return (
    <>
      {mode === "input" && <EngineInput onSubmit={handleSubmit} initialForm={form} />}
      {mode === "loading" && <LoadingState auditData={pendingData} onAccess={handleAccess} />}
    </>
  );
}

export default App;
