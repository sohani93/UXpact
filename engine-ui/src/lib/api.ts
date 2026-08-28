import type { Diagnosis, IntakeFormData } from "./types";
import { getDb } from "./db";

const RUN_AUDIT_URL = import.meta.env.VITE_AUDIT_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/run-audit";
const GENERATE_VISION_URL = import.meta.env.VITE_GENERATE_VISION_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/generate-vision";
const SELF_CHECK_VISION_URL = import.meta.env.VITE_SELF_CHECK_VISION_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/self-check-vision";
const DEPLOY_VARIANT_URL = import.meta.env.VITE_DEPLOY_VARIANT_ENDPOINT ?? "https://oxminualycvnxofoevjs.supabase.co/functions/v1/deploy-variant";

export async function runDiagnosis(form: IntakeFormData): Promise<Diagnosis | null> {
  const res = await fetch(RUN_AUDIT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const json = await res.json();
  if (!res.ok || json.error || !json.auditId) return null;
  return {
    auditId: json.auditId,
    url: form.url,
    domain: new URL(form.url).hostname,
    createdAt: new Date().toISOString(),
    domData: json.domData,
    currentArchetype: json.currentArchetype ?? null,
    targetArchetype: json.targetArchetype ?? null,
    narrativeVerdict: json.narrativeVerdict ?? null,
    revenueLeakEstimate: json.revenueLeakEstimate ?? null,
    journeyBreaks: json.journeyBreaks ?? null,
    diagnosisError: json.diagnosisError ?? null,
  };
}

export type VisionJobResult = { html: string } | { error: string };

async function pollVisionJob(jobId: string): Promise<VisionJobResult> {
  const db = getDb();
  const start = Date.now();
  const MAX_WAIT_MS = 5 * 60 * 1000;
  while (Date.now() - start < MAX_WAIT_MS) {
    const { data: job, error } = await db.from("vision_generation_jobs").select("status, html, error_message").eq("id", jobId).single();
    if (error) return { error: error.message || "Lost track of the generation job. Try again." };
    if (job.status === "done") return { html: job.html };
    if (job.status === "error") return { error: job.error_message || "Generation failed. Try again." };
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return { error: "This step is taking longer than expected. Try again in a moment." };
}

export async function generateVisionRebuild(args: {
  auditId: string;
  archetype: string;
  sectionOrder: string[];
  copySelections: Record<string, string>;
  rawHtml: string;
}): Promise<VisionJobResult> {
  const genRes = await fetch(GENERATE_VISION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const genJson = await genRes.json();
  if (!genRes.ok || genJson.error || !genJson.jobId) return { error: genJson.message || "Generation failed. Try again." };

  const draft = await pollVisionJob(genJson.jobId);
  if ("error" in draft) return draft;

  const checkRes = await fetch(SELF_CHECK_VISION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auditId: args.auditId, draftHtml: draft.html }),
  });
  const checkJson = await checkRes.json();
  if (!checkRes.ok || checkJson.error || !checkJson.jobId) return draft; // self-check failed to start — show the real, unchecked draft rather than nothing

  const final = await pollVisionJob(checkJson.jobId);
  if ("error" in final) return draft; // self-check itself failed — draft is still a real generated rebuild

  return final;
}

export async function deployVariant(args: {
  auditId: string;
  domain: string;
  generatedHtml: string;
  rawHtml: string;
  zones: string[];
  multiArmed?: boolean;
}): Promise<{ ok: true; embedSnippet: string } | { ok: false; message: string }> {
  const res = await fetch(DEPLOY_VARIANT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const json = await res.json();
  if (!res.ok || json.error) return { ok: false, message: json.message || "Deploy failed. Try again." };
  return { ok: true, embedSnippet: json.embedSnippet };
}

export const embedSnippetFor = (auditId: string) =>
  `<script src="https://uxpact.pages.dev/pulse-pro.js" data-uxpact-audit="${auditId}" async></script>`;
