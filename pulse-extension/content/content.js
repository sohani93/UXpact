(async function initPulse() {
  const SUPABASE_URL = 'https://oxminualycvnxofoevjs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bWludWFseWN2bnhvZm9ldmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTYwNDIsImV4cCI6MjA1NTk5MjA0Mn0.hFdmSPMqh5-X2iLiHMt7GiGkNfKTHJIBkp1r5iddWA8';

  const { pulseChecklist, pulseAuditId } = await chrome.storage.local.get([
    'pulseChecklist', 'pulseAuditId'
  ]);
  if (!pulseChecklist || !pulseAuditId) return;

  const domain = pulseChecklist.domain?.replace(/^www\./, '');
  const currentHost = window.location.hostname.replace(/^www\./, '');
  if (domain && !currentHost.includes(domain)) return;

  // Inject fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@700&family=Space+Grotesk:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink);

  const C = {
    navy: '#0B1C48', forest: '#186132', emerald: '#148C59', mint: '#14D571',
    violet: '#5B61F4', red: '#DC2626', amber: '#F59E0B',
    textMuted: '#6B7280', textDim: '#9CA3AF',
  };

  const items = pulseChecklist.pulse_items || [];
  const sevOrder = { critical: 0, major: 1, minor: 2, Critical: 0, Major: 1, Minor: 2 };
  const sevColor = { critical: C.red, major: C.amber, minor: C.emerald, Critical: C.red, Major: C.amber, Minor: C.emerald };
  const sevEmoji = { critical: '🔴', major: '🟠', minor: '🟡', Critical: '🔴', Major: '🟠', Minor: '🟡' };

  let expanded = true;
  const checks = items.map((i) => i.completed || false);

  // Remove any existing instance
  const existing = document.getElementById('uxpact-pulse');
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = 'uxpact-pulse';
  document.body.appendChild(host);

  const persistItem = async (item, completed) => {
    if (!item.id) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/audit_findings?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        }),
      });
    } catch {}
  };

  const persistStorage = async () => {
    const updated = { ...pulseChecklist, pulse_items: items.map((item, i) => ({ ...item, completed: checks[i] })) };
    await chrome.storage.local.set({ pulseChecklist: updated });
  };

  const render = () => {
    const done = checks.filter(Boolean).length;
    const total = checks.length;
    const pct = total > 0 ? (done / total) * 100 : 0;
    const allDone = done === total && total > 0;

    // ── MINIMISED PILL ──
    if (!expanded) {
      host.innerHTML = `
        <div id="pulse-pill" style="position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:14px;background:rgba(255,255,255,0.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.6);box-shadow:0 8px 32px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.7);cursor:pointer;">
          <div style="width:26px;height:26px;border-radius:8px;background:linear-gradient(145deg,#14D571,#148C59);box-shadow:0 2px 6px rgba(20,140,89,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">◉</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:${C.navy};font-family:'Unbounded',sans-serif;">Pulse</div>
            <div style="font-size:10px;font-weight:600;color:${C.violet};font-family:'Space Grotesk',sans-serif;">${done}/${total} done</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="3"/>
            <circle cx="14" cy="14" r="11" fill="none" stroke="url(#miniGrad)" stroke-width="3"
              stroke-dasharray="${2 * Math.PI * 11}" stroke-dashoffset="${2 * Math.PI * 11 * (1 - pct / 100)}"
              stroke-linecap="round" transform="rotate(-90 14 14)"/>
            <defs>
              <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="${C.emerald}"/><stop offset="100%" stop-color="${C.violet}"/>
              </linearGradient>
            </defs>
          </svg>
        </div>`;
      host.querySelector('#pulse-pill').addEventListener('click', () => { expanded = true; render(); });
      return;
    }

    // ── COMPLETED STATE ──
    if (allDone) {
      host.innerHTML = `
        <div style="position:fixed;bottom:24px;right:24px;z-index:2147483647;width:340px;">
          <div style="border-radius:16px;background:rgba(255,255,255,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.6);box-shadow:0 8px 40px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.7);overflow:hidden;">
            <div style="padding:32px 24px;text-align:center;">
              <div style="font-size:36px;margin-bottom:8px;">💜</div>
              <h3 style="font-family:'Unbounded',sans-serif;font-size:16px;font-weight:700;color:${C.navy};margin:0 0 6px;">All fixes done!</h3>
              <p style="font-size:12.5px;color:${C.textMuted};margin:0 0 20px;line-height:1.5;font-family:'Space Grotesk',sans-serif;">Every item on your checklist has been implemented.</p>
              <div style="width:100%;height:4px;border-radius:2px;background:linear-gradient(90deg,${C.emerald},${C.violet});margin-bottom:20px;"></div>
              <button id="pulse-exit" style="width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,${C.forest},${C.mint});color:#fff;font-family:'Unbounded',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Exit Pulse</button>
              <p style="font-size:10px;color:${C.textDim};margin-top:10px;margin-bottom:0;font-family:'Space Grotesk',sans-serif;">Pulse will remove itself automatically.</p>
            </div>
            <div style="padding:8px 16px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;">
              <span style="font-size:9px;color:${C.textDim};font-family:'Space Grotesk',sans-serif;">Powered by UXpact Pulse</span>
            </div>
          </div>
        </div>`;
      host.querySelector('#pulse-exit').addEventListener('click', () => host.remove());
      return;
    }

    // ── Group by severity ──
    const grouped = {};
    items.forEach((item, i) => {
      const sev = (item.severity || 'minor');
      if (!grouped[sev]) grouped[sev] = [];
      grouped[sev].push({ ...item, idx: i });
    });
    const sevGroups = Object.entries(grouped).sort(([a], [b]) => (sevOrder[a] ?? 3) - (sevOrder[b] ?? 3));

    let checklistHTML = '';
    sevGroups.forEach(([sev, sevItems], gi) => {
      checklistHTML += `
        <div style="display:flex;align-items:center;gap:6px;margin:${gi === 0 ? '0 0 8px' : '14px 0 8px'};">
          <span style="font-size:10px;font-weight:700;color:${sevColor[sev]};text-transform:uppercase;letter-spacing:1px;font-family:'Space Grotesk',sans-serif;">${sevEmoji[sev]} ${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
          <div style="flex:1;height:1px;background:rgba(0,0,0,0.04);"></div>
        </div>`;
      sevItems.forEach((item) => {
        const checked = checks[item.idx];
        checklistHTML += `
          <div class="pulse-row" data-idx="${item.idx}" style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:8px;margin-bottom:4px;cursor:pointer;background:${checked ? 'rgba(91,97,244,0.04)' : 'transparent'};transition:background 0.15s;">
            <div class="pulse-check" data-idx="${item.idx}" style="width:20px;height:20px;border-radius:5px;flex-shrink:0;margin-top:1px;background:${checked ? C.violet : 'transparent'};border:2px solid ${checked ? C.violet : 'rgba(0,0,0,0.15)'};display:flex;align-items:center;justify-content:center;transition:all 0.15s;">
              ${checked ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
            </div>
            <span style="font-size:12px;font-family:'Space Grotesk',sans-serif;color:${checked ? C.textDim : C.navy};${checked ? 'text-decoration:line-through;opacity:0.5;' : ''}line-height:1.5;">${item.finding}</span>
          </div>`;
      });
    });

    host.innerHTML = `
      <div style="position:fixed;bottom:24px;right:24px;z-index:2147483647;width:340px;">
        <div style="border-radius:16px;background:rgba(255,255,255,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.6);box-shadow:0 8px 40px rgba(0,0,0,0.12),inset 0 1px 0 rgba(255,255,255,0.7);overflow:hidden;display:flex;flex-direction:column;max-height:80vh;">
          <!-- Header -->
          <div style="padding:14px 16px;border-bottom:1px solid rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(145deg,#14D571,#148C59);box-shadow:0 2px 6px rgba(20,140,89,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;flex-shrink:0;">◉</div>
              <div>
                <div style="font-size:13px;font-weight:700;color:${C.navy};font-family:'Unbounded',sans-serif;">UXpact Pulse</div>
                <div style="font-size:10px;color:${C.textDim};font-family:'Space Grotesk',sans-serif;">Audit #${pulseAuditId.slice(0,8)}</div>
              </div>
            </div>
            <div id="pulse-minimise" style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(0,0,0,0.04);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="${C.textMuted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
          <!-- Progress -->
          <div style="padding:12px 16px;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:11px;font-weight:600;color:${C.navy};font-family:'Space Grotesk',sans-serif;">Progress</span>
              <span style="font-size:11px;font-weight:700;color:${C.violet};font-family:'Space Grotesk',sans-serif;">${done}/${total}</span>
            </div>
            <div style="height:5px;border-radius:3px;background:rgba(0,0,0,0.06);overflow:hidden;">
              <div style="height:100%;border-radius:3px;background:linear-gradient(90deg,${C.emerald},${C.violet});width:${pct}%;transition:width 0.3s ease;box-shadow:0 0 8px rgba(91,97,244,0.25);"></div>
            </div>
          </div>
          <!-- Checklist -->
          <div style="overflow-y:auto;flex:1;padding:0 16px 12px;">
            ${checklistHTML}
          </div>
          <!-- Footer -->
          <div style="padding:8px 16px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;flex-shrink:0;">
            <span style="font-size:9px;color:${C.textDim};font-family:'Space Grotesk',sans-serif;">Powered by UXpact Pulse</span>
          </div>
        </div>
      </div>`;

    // Minimise
    host.querySelector('#pulse-minimise').addEventListener('click', () => { expanded = false; render(); });

    // Checkboxes
    host.querySelectorAll('.pulse-row').forEach((row) => {
      row.addEventListener('click', async () => {
        const idx = parseInt(row.dataset.idx, 10);
        checks[idx] = !checks[idx];
        const item = items[idx];
        item.completed = checks[idx];
        item.completed_at = checks[idx] ? new Date().toISOString() : null;
        await persistStorage();
        await persistItem(item, checks[idx]);
        render();
      });
    });
  };

  render();
})();
