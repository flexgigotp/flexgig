['log', 'debug', 'warn', 'error', 'info'].forEach(m => console[m] = () => {});

window.addEventListener('unhandledrejection', e => e.preventDefault());
window.onerror = () => true;
// notificationPopup.js
// ============================================================
// FLEXGIG — LOGIN / DASHBOARD NOTIFICATION POPUP SYSTEM

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────
  const API_BASE        = window.__SEC_API_BASE || 'https://api.flexgig.com.ng';
  const INITIAL_DELAY   = 1800;   // ms to wait after page load before first check
  const IDLE_POLL       = 400;    // ms between "is app idle?" checks
  const MAX_IDLE_WAIT   = 12000;  // ms max wait before showing anyway

  // ── State ─────────────────────────────────────────────────
  let _popups      = [];
  let _currentIdx  = 0;
  let _isVisible   = false;
  let _initialised = false;
  let _overlay     = null;
  let _card        = null;

  // ── Is the app currently processing? ─────────────────────
  function _isLoading() {
    const loader = document.getElementById('appLoader');
    if (loader && !loader.hidden) return true;
    if (window.ModalManager?.getOpenModals?.().length > 0) return true;
    return false;
  }

  // ── Wait for idle, then run callback ─────────────────────
  function _whenIdle(cb) {
    const start = Date.now();
    const check = () => {
      if (!_isLoading() || Date.now() - start > MAX_IDLE_WAIT) { cb(); return; }
      setTimeout(check, IDLE_POLL);
    };
    setTimeout(check, INITIAL_DELAY);
  }

  // ── API: fetch pending popups for this user ───────────────
  async function _fetchPopups() {
    try {
      const res = await fetch(`${API_BASE}/api/notification-popups`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.popups) ? json.popups : [];
    } catch (e) {
      console.warn('[NotifPopup] fetch error:', e.message);
      return [];
    }
  }

  // ── API: record dismissal for one popup ───────────────────
  async function _dismiss(id) {
    try {
      await fetch(`${API_BASE}/api/notification-popups/${id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.warn('[NotifPopup] dismiss error:', e.message);
    }
  }

  // ── Level → colours + inline SVG icon ────────────────────
  const LEVELS = {
    info: {
      accent:    '#3b82f6',
      iconBg:    'rgba(59,130,246,0.13)',
      labelBg:   'rgba(59,130,246,0.12)',
      labelColor:'#60a5fa',
      btnBg:     'rgba(59,130,246,0.14)',
      btnColor:  '#93c5fd',
      dotColor:  '#3b82f6',
      label:     'Notice',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
               <circle cx="12" cy="12" r="9.5" stroke="#3b82f6" stroke-width="1.8"/>
               <line x1="12" y1="8" x2="12" y2="13" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
               <circle cx="12" cy="16.5" r="1" fill="#3b82f6"/>
             </svg>`,
    },
    warning: {
      accent:    '#f59e0b',
      iconBg:    'rgba(245,158,11,0.13)',
      labelBg:   'rgba(245,158,11,0.12)',
      labelColor:'#fbbf24',
      btnBg:     'rgba(245,158,11,0.14)',
      btnColor:  '#fcd34d',
      dotColor:  '#f59e0b',
      label:     'Warning',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
               <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                     stroke="#f59e0b" stroke-width="1.8" stroke-linejoin="round"/>
               <line x1="12" y1="9" x2="12" y2="14" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
               <circle cx="12" cy="17.5" r="1" fill="#f59e0b"/>
             </svg>`,
    },
    error: {
      accent:    '#ef4444',
      iconBg:    'rgba(239,68,68,0.13)',
      labelBg:   'rgba(239,68,68,0.12)',
      labelColor:'#f87171',
      btnBg:     'rgba(239,68,68,0.14)',
      btnColor:  '#fca5a5',
      dotColor:  '#ef4444',
      label:     'Alert',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
               <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7l-9-5z"
                     stroke="#ef4444" stroke-width="1.8" stroke-linejoin="round"/>
               <line x1="12" y1="8" x2="12" y2="13" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
               <circle cx="12" cy="16.5" r="1" fill="#ef4444"/>
             </svg>`,
    },
  };

  const ARROW_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // ── Inject CSS once ───────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('__np_styles')) return;
    const s = document.createElement('style');
    s.id = '__np_styles';
    s.textContent = `
      #npOverlay {
        position:fixed; inset:0; z-index:2147483640;
        display:flex; align-items:center; justify-content:center; padding:20px;
        background:rgba(0,0,0,0.58);
        backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
        opacity:0; transition:opacity .28s ease; pointer-events:none;
      }
      #npOverlay.np-on { opacity:1; pointer-events:auto; }
      #npCard {
        background:#141414;
        border:1px solid rgba(255,255,255,0.09);
        border-radius:20px; width:100%; max-width:360px;
        position:relative; overflow:hidden;
        box-shadow:0 32px 64px rgba(0,0,0,.55),0 0 0 .5px rgba(255,255,255,.05);
        transform:translateY(28px) scale(.96);
        transition:transform .32s cubic-bezier(.22,.68,0,1.18),opacity .28s ease;
        opacity:0;
      }
      #npOverlay.np-on #npCard { transform:translateY(0) scale(1); opacity:1; }
      #npCard.np-right {
        animation:npRight .28s cubic-bezier(.22,.68,0,1.15) both;
      }
      #npCard.np-left  {
        animation:npLeft  .28s cubic-bezier(.22,.68,0,1.15) both;
      }
      @keyframes npRight { from{opacity:0;transform:translateX(28px)}  to{opacity:1;transform:translateX(0)} }
      @keyframes npLeft  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
      #npGlow {
        position:absolute; top:0; left:0; right:0; height:2px;
        border-radius:20px 20px 0 0; transition:background .3s;
      }
      .np-hd {
        display:flex; align-items:flex-start; gap:12px;
        padding:20px 18px 12px;
      }
      .np-ico {
        width:40px; height:40px; border-radius:12px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
        margin-top:1px; transition:background .3s;
      }
      .np-tc { flex:1; min-width:0; }
      .np-lbl {
        display:inline-block; font-size:10px; font-weight:600;
        text-transform:uppercase; letter-spacing:.07em;
        padding:2px 8px; border-radius:20px; margin-bottom:5px;
        transition:background .3s,color .3s;
      }
      .np-ttl { font-size:15px; font-weight:600; color:#fff; line-height:1.3; }
      #npBadge {
        position:absolute; top:14px; right:14px;
        background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.1);
        border-radius:20px; font-size:11px; color:rgba(255,255,255,.45);
        padding:2px 9px; font-weight:500;
      }
      .np-bd {
        padding:0 18px 16px; font-size:13px;
        color:rgba(255,255,255,.65); line-height:1.65;
      }
      .np-div { height:1px; background:rgba(255,255,255,.06); }
      .np-ft {
        display:flex; align-items:center; gap:8px; padding:12px 18px;
      }
      .np-dots { display:flex; align-items:center; gap:5px; flex:1; }
      .np-dot {
        height:6px; width:6px; border-radius:3px;
        background:rgba(255,255,255,.18);
        cursor:pointer; border:none; padding:0; flex-shrink:0;
        transition:width .2s ease,background .2s ease;
      }
      .np-dot.np-da { width:18px; }
      .np-nxt {
        background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
        border-radius:9px; padding:8px 13px; font-size:12px;
        color:rgba(255,255,255,.55); cursor:pointer;
        display:flex; align-items:center; gap:5px;
        transition:background .15s; flex-shrink:0;
      }
      .np-nxt:hover { background:rgba(255,255,255,.1); }
      .np-ok {
        border:none; border-radius:10px; padding:9px 20px;
        font-size:13px; font-weight:600; cursor:pointer;
        transition:opacity .15s,transform .1s; flex-shrink:0;
      }
      .np-ok:active { transform:scale(.93); opacity:.82; }
      @media(max-width:400px){
        #npCard{border-radius:18px}
        .np-hd{padding:18px 15px 10px}
        .np-bd{padding:0 15px 14px}
        .np-ft{padding:10px 15px}
      }
    `;
    document.head.appendChild(s);
  }

  // ── Build DOM once ────────────────────────────────────────
  function _buildDOM() {
    if (_overlay) return;
    _injectStyles();

    _overlay = document.createElement('div');
    _overlay.id = 'npOverlay';
    _overlay.setAttribute('role', 'dialog');
    _overlay.setAttribute('aria-modal', 'true');
    _overlay.setAttribute('aria-label', 'Notification');
    _overlay.innerHTML = `
      <div id="npCard">
        <div id="npGlow"></div>
        <span id="npBadge"></span>
        <div class="np-hd">
          <div class="np-ico" id="npIco"></div>
          <div class="np-tc">
            <span class="np-lbl" id="npLbl"></span>
            <div class="np-ttl"  id="npTtl"></div>
          </div>
        </div>
        <div class="np-bd" id="npBd"></div>
        <div class="np-div"></div>
        <div class="np-ft">
          <div class="np-dots" id="npDots"></div>
          <button class="np-nxt" id="npNxt">Next ${ARROW_SVG}</button>
          <button class="np-ok"  id="npOk">Got it</button>
        </div>
      </div>`;

    document.body.appendChild(_overlay);
    _card = document.getElementById('npCard');

    _overlay.addEventListener('click', e => { if (e.target === _overlay) _ok(); });
    document.getElementById('npOk').addEventListener('click', _ok);
    document.getElementById('npNxt').addEventListener('click', _next);
    document.addEventListener('keydown', e => {
      if (!_isVisible) return;
      if (e.key === 'Escape')      _ok();
      if (e.key === 'ArrowRight')  _next();
    });
  }

  // ── Render one slide ──────────────────────────────────────
  function _render(idx, dir) {
    const p   = _popups[idx]; if (!p) return;
    const c   = LEVELS[p.level] || LEVELS.info;
    const tot = _popups.length;

    document.getElementById('npGlow').style.background =
      `linear-gradient(90deg,transparent,${c.accent}99,transparent)`;

    const ico = document.getElementById('npIco');
    ico.style.background = c.iconBg;
    ico.innerHTML        = c.icon;

    const lbl = document.getElementById('npLbl');
    lbl.style.background = c.labelBg;
    lbl.style.color      = c.labelColor;
    lbl.textContent      = c.label;

    document.getElementById('npTtl').textContent = p.title   || '';
    document.getElementById('npBd').textContent  = p.message || '';

    const badge = document.getElementById('npBadge');
    badge.style.display = tot > 1 ? '' : 'none';
    badge.textContent   = `${idx + 1} of ${tot}`;

    // Dots
    const dots = document.getElementById('npDots');
    dots.innerHTML      = '';
    dots.style.display  = tot > 1 ? '' : 'none';
    if (tot > 1) {
      _popups.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'np-dot' + (i === idx ? ' np-da' : '');
        if (i === idx) d.style.background = c.dotColor;
        d.setAttribute('aria-label', `Notification ${i + 1}`);
        d.addEventListener('click', () => {
          if (i === _currentIdx) return;
          const go = i > _currentIdx ? 'right' : 'left';
          _currentIdx = i;
          _anim(go);
          _render(_currentIdx);
        });
        dots.appendChild(d);
      });
    }

    const isLast = idx === tot - 1;
    document.getElementById('npNxt').style.display = isLast ? 'none' : '';
    const ok = document.getElementById('npOk');
    ok.style.background = c.btnBg;
    ok.style.color      = c.btnColor;
    ok.textContent      = isLast ? 'Got it' : 'Skip';

    if (dir) _anim(dir);
  }

  function _anim(dir) {
    if (!_card) return;
    _card.classList.remove('np-right', 'np-left');
    void _card.offsetWidth;
    _card.classList.add(dir === 'right' ? 'np-right' : 'np-left');
  }

  // ── Show ──────────────────────────────────────────────────
  function _show() {
    if (!_overlay) _buildDOM();
    if (!_popups.length) return;
    _currentIdx = 0;
    _isVisible  = true;
    _render(0);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      _overlay.classList.add('np-on');
    }));
    setTimeout(() => document.getElementById('npOk')?.focus(), 350);
  }

  // ── OK / Skip handler ─────────────────────────────────────
  async function _ok() {
    if (_currentIdx < _popups.length - 1) {
      // Not last — advance without dismissing
      _currentIdx++;
      _anim('right');
      _render(_currentIdx);
      return;
    }
    // Last slide — close immediately, dismiss all in background
    _hide();
    const seen = [..._popups];
    _popups = [];
    seen.forEach(p => _dismiss(p.id).catch(() => {}));
  }

  function _next() {
    if (_currentIdx >= _popups.length - 1) return;
    _currentIdx++;
    _anim('right');
    _render(_currentIdx);
  }

  // ── Hide ──────────────────────────────────────────────────
  function _hide() {
    if (!_overlay) return;
    _overlay.classList.remove('np-on');
    setTimeout(() => {
      _isVisible = false;
      if (_overlay) { _overlay.remove(); _overlay = null; _card = null; }
    }, 300);
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    if (_initialised) return;
    _initialised = true;

    const popups = await _fetchPopups();
    if (!popups.length) { console.log('[NotifPopup] Nothing to show.'); return; }

    _popups = popups;
    console.log(`[NotifPopup] ${popups.length} popup(s) queued.`);

    _whenIdle(() => {
      if (_isVisible) return;
      _buildDOM();
      _show();
    });
  }

  // ── Public API ────────────────────────────────────────────
  window.NotifPopup = {
    init,
    // Push new popup(s) mid-session (e.g. from a WebSocket event)
    push(items) {
      const arr = Array.isArray(items) ? items : [items];
      if (!arr.length) return;
      if (_isVisible) {
        _popups = [..._popups, ...arr];
        _render(_currentIdx); // refresh dot count
      } else {
        _popups = arr;
        _whenIdle(() => { _buildDOM(); _show(); });
      }
    },
    close()             { _hide(); },
    get isVisible()     { return _isVisible; }
  };

  // ── Auto-hook into onDashboardLoad ────────────────────────
  function _hook() {
    if (typeof onDashboardLoad === 'function') {
      const orig = onDashboardLoad;
      onDashboardLoad = async function (...args) {
        const r = await orig.apply(this, args);
        setTimeout(() => window.NotifPopup.init(), 500);
        return r;
      };
      console.log('[NotifPopup] Hooked into onDashboardLoad ✓');
    } else {
      let n = 0;
      const t = setInterval(() => {
        if (typeof onDashboardLoad === 'function') { clearInterval(t); _hook(); return; }
        if (++n > 40) {
          clearInterval(t);
          console.warn('[NotifPopup] onDashboardLoad not found — using DOMContentLoaded fallback');
          document.readyState === 'loading'
            ? document.addEventListener('DOMContentLoaded', () => setTimeout(init, 3000))
            : setTimeout(init, 3000);
        }
      }, 100);
    }
  }

  _hook();
})();