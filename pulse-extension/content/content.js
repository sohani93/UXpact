(async function initPulse() {
  const { pulseChecklist, pulseAuditId, pulseAnonKey } = await chrome.storage.local.get([
    'pulseChecklist',
    'pulseAuditId',
    'pulseAnonKey',
  ]);
  if (!pulseChecklist || !pulseAuditId) return;

  const domain = pulseChecklist.domain?.replace(/^www\./, '');
  const currentHost = window.location.hostname.replace(/^www\./, '');
  // Allow rendering on any page if domain is empty (synced directly from audit ID)
  if (domain && !currentHost.includes(domain)) return;

  const root = document.createElement('div');
  root.id = 'uxpact-pulse';
  root.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'width:340px',
    'max-height:80vh',
    'background:rgba(255,255,255,.92)',
    'backdrop-filter:blur(24px)',
    'border-radius:16px',
    'padding:12px',
    'z-index:2147483647',
    'overflow:auto',
    'box-shadow:0 8px 32px rgba(0,0,0,0.15)',
    'font-family:sans-serif',
  ].join(';');

  const items = pulseChecklist.pulse_items || [];

  const persistItem = async (item) => {
    if (!pulseAnonKey || !item.id) return;
    try {
      await fetch(`https://oxminualycvnxofoevjs.supabase.co/rest/v1/audit_findings?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          apikey: pulseAnonKey,
          Authorization: `Bearer ${pulseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          completed: item.completed,
          completed_at: item.completed_at,
        }),
      });
    } catch {}
  };

  const render = () => {
    const completed = items.filter((i) => i.completed).length;
    const pct = items.length ? Math.round((completed / items.length) * 100) : 0;

    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:12px;">UXpact Pulse · ${completed}/${items.length} fixed</strong>
        <span style="font-size:11px;color:#148C59;font-weight:600;">${pct}%</span>
      </div>
      <div style="height:5px;background:#e5e7eb;border-radius:999px;margin-bottom:10px;">
        <div style="height:5px;border-radius:999px;background:linear-gradient(90deg,#14D571,#5B61F4);width:${pct}%;transition:width 0.3s;"></div>
      </div>
    `;

    items.forEach((item) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer;';

      const sevColor = item.severity === 'critical' ? '#DC2626' : item.severity === 'major' ? '#F59E0B' : '#EAB308';
      const dot = `<span style="width:8px;height:8px;border-radius:50%;background:${sevColor};flex-shrink:0;margin-top:4px;display:inline-block;"></span>`;

      row.innerHTML = `
        <input type="checkbox" ${item.completed ? 'checked' : ''} style="margin-top:2px;flex-shrink:0;" />
        ${dot}
        <span style="font-size:12px;${item.completed ? 'text-decoration:line-through;color:#9CA3AF;' : 'color:#0B1C48;'}">${item.finding}</span>
      `;

      row.querySelector('input').addEventListener('change', async (e) => {
        item.completed = e.target.checked;
        item.completed_at = item.completed ? new Date().toISOString() : null;
        // Persist to storage
        await chrome.storage.local.set({ pulseChecklist: { ...pulseChecklist, pulse_items: items } });
        // Persist to Supabase
        await persistItem(item);
        render();
      });

      root.appendChild(row);
    });
  };

  render();
  document.body.appendChild(root);
})();
