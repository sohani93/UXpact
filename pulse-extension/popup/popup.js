const SUPABASE_URL = 'https://oxminualycvnxofoevjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bWludWFseWN2bnhvZm9ldmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTYwNDIsImV4cCI6MjA1NTk5MjA0Mn0.hFdmSPMqh5-X2iLiHMt7GiGkNfKTHJIBkp1r5iddWA8';

const statusEl = document.getElementById('status');
const auditIdInput = document.getElementById('auditId');

// Auto-fill audit ID if stored
chrome.storage.local.get(['pulseAuditId'], (result) => {
  if (result.pulseAuditId) auditIdInput.value = result.pulseAuditId;
});

document.getElementById('syncBtn').addEventListener('click', async () => {
  const auditId = auditIdInput.value.trim().replace(/^#/, '');
  if (!auditId) { statusEl.textContent = 'Paste your Audit ID first.'; return; }

  statusEl.textContent = 'Syncing...';

  const url = `${SUPABASE_URL}/rest/v1/audit_findings?audit_id=eq.${auditId}&pass=eq.false&select=id,name,fix,severity,check_id`;

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const findings = await response.json();
    const actionableFindings = findings.filter((f) => f.fix !== 'Review manually or commission a UX audit.');

    if (actionableFindings.length === 0) {
      statusEl.textContent = 'No findings found for this Audit ID.';
      return;
    }

    const pulseItems = actionableFindings.map((f) => ({
      id: f.id,
      finding: f.fix || f.name,
      severity: f.severity,
      check_id: f.check_id,
      completed: false,
      completed_at: null,
    }));

    await chrome.storage.local.set({
      pulseChecklist: { domain: '', pulse_items: pulseItems },
      pulseAuditId: auditId,
    });

    statusEl.style.color = '#148C59';
    statusEl.textContent = `✓ Synced ${pulseItems.length} items. Visit the audited site to start fixing.`;
  } catch (err) {
    statusEl.style.color = '#DC2626';
    statusEl.textContent = `Sync failed: ${err.message}`;
  }
});
