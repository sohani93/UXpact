const statusEl = document.getElementById('status');
document.getElementById('syncBtn').addEventListener('click', async () => {
  const auditId = document.getElementById('auditId').value.trim();
  if (!auditId) return;
  const url = `https://oxminualycvnxofoevjs.supabase.co/rest/v1/pulse_checklists?audit_id=eq.${auditId}&select=*,pulse_items(*)`;
  try {
    const response = await fetch(url, { headers: { apikey: '' } });
    const data = await response.json();
    await chrome.storage.local.set({ pulseChecklist: data[0] ?? null, pulseAuditId: auditId });
    statusEl.textContent = 'Checklist synced.';
  } catch {
    statusEl.textContent = 'Unable to sync checklist.';
  }
});
