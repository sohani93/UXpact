(async function initPulse() {
  const { pulseChecklist, pulseAuditId } = await chrome.storage.local.get(['pulseChecklist', 'pulseAuditId']);
  if (!pulseChecklist || !pulseAuditId) return;
  const domain = pulseChecklist.domain?.replace(/^www\./, '');
  if (!domain || !window.location.hostname.replace(/^www\./, '').includes(domain)) return;

  const root = document.createElement('div');
  root.id = 'uxpact-pulse';
  root.style.cssText = 'position:fixed;bottom:24px;right:24px;width:340px;max-height:80vh;background:rgba(255,255,255,.7);backdrop-filter:blur(24px);border-radius:16px;padding:12px;z-index:2147483647;overflow:auto;';

  const items = pulseChecklist.pulse_items || [];
  const render = () => {
    const completed = items.filter((i) => i.completed).length;
    root.innerHTML = `<strong>UXpact Pulse · Audit #${pulseAuditId}</strong><div style="height:5px;background:#e5e7eb;border-radius:999px;margin:8px 0"><div style="height:5px;border-radius:999px;background:linear-gradient(90deg,#14D571,#5B61F4);width:${items.length ? (completed / items.length) * 100 : 0}%"></div></div>`;
    items.forEach((item) => {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin:6px 0;';
      row.innerHTML = `<input type="checkbox" ${item.completed ? 'checked' : ''} /> <span style="${item.completed ? 'text-decoration:line-through;color:#9CA3AF;opacity:.5;' : ''}">${item.finding}</span>`;
      row.querySelector('input').addEventListener('change', async (e) => {
        item.completed = e.target.checked;
        item.completed_at = item.completed ? new Date().toISOString() : null;
        render();
      });
      root.appendChild(row);
    });
  };

  render();
  document.body.appendChild(root);
})();
