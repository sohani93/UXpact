import { useEffect, useState } from "react";
import IntakeForm from "./intake/IntakeForm";
import ScanningView from "./intake/ScanningView";
import Workspace from "./workspace/Workspace";
import { runDiagnosis } from "./lib/api";
import type { Diagnosis, IntakeFormData } from "./lib/types";

function currentPath() { return window.location.pathname; }
function navigateTo(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const workspaceMatch = path.match(/^\/workspace\/(.+)$/);
  if (workspaceMatch) return <Workspace auditId={workspaceMatch[1]} />;

  return <Intake />;
}

const EMPTY_FORM: IntakeFormData = { name: "", email: "", url: "", industry: "saas", goal: "", challenge: "", focusAreas: [] };

function Intake() {
  const [form, setForm] = useState<IntakeFormData>(EMPTY_FORM);
  const [phase, setPhase] = useState<"form" | "scanning">("form");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);

  const handleSubmit = async (data: IntakeFormData) => {
    const normalizedUrl = /^https?:\/\//i.test(data.url) ? data.url : `https://${data.url}`;
    const normalized = { ...data, url: normalizedUrl };
    setForm(normalized);
    setDiagnosis(null);
    setPhase("scanning");
    try {
      const result = await runDiagnosis(normalized);
      if (result) {
        sessionStorage.setItem(`diagnosis:${result.auditId}`, JSON.stringify(result));
        setDiagnosis(result);
      } else {
        setPhase("form");
      }
    } catch {
      setPhase("form");
    }
  };

  if (phase === "scanning") {
    return (
      <ScanningView
        url={form.url}
        diagnosis={diagnosis}
        onEnter={() => diagnosis && navigateTo(`/workspace/${diagnosis.auditId}`)}
      />
    );
  }

  return <IntakeForm onSubmit={handleSubmit} initial={form} />;
}
