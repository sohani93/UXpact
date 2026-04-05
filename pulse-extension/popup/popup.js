const statusEl = document.getElementById('status');
const setupSection = document.getElementById('setupSection');
const anonKeyInput = document.getElementById('anonKey');

// On load: check if anon key is already saved, hide setup section if so
chrome.storage.local.get(['pulseAnonKey'], (result) => {
  if (result.pulseAnonKey) {
    setupSection.style.display = 'none';
  }
});

document.getElementById('syncBtn').addEventListener('click', async () => {
  const auditId = document.getElementById('auditId').value.trim();
  if (!auditId) {
    statusEl.textContent = 'Enter an Audit ID.';
    return;
  }

  // Get or save anon key
  let anonKey = '';
  const stored = await chrome.storage.local.get(['pulseAnonKey']);
  if (stored.pulseAnonKey) {
    anonKey = stored.pulseAnonKey;
  } else {
    anonKey = anonKeyInput.value.trim();
    if (!anonKey) {
      statusEl.textContent = 'Enter your Supabase anon key.';
      return;
    }
    await chrome.storage.local.set({ pulseAnonKey: anonKey });
    setupSection.style.display = 'none';
  }

  const url = `https://oxminualycvnxofoevjs.supabase.co/rest/v1/audit_findings?audit_id=eq.${auditId}&pass=eq.false&select=id,name,fix,severity,check_id`;

  try {
    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const findings = await response.json();

    const pulseItems = findings.map((f) => ({
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
      pulseAnonKey: anonKey,
    });

    statusEl.textContent = `Synced ${pulseItems.length} items.`;
  } catch (err) {
    statusEl.textContent = `Sync failed: ${err.message}`;
  }
});
