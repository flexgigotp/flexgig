// notificationPopup.js
// ============================================================
// LOGIN / DASHBOARD NOTIFICATION POPUP SYSTEM

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────
  const API_BASE = window.__SEC_API_BASE || 'https://api.flexgig.com.ng';

  // How long to wait after page load before first popup attempt (ms)
  const INITIAL_DELAY_MS = 1800;

  // How often to poll the loading state before showing (ms)
  const IDLE_POLL_MS = 400;

  // Max time to wait for idle state before showing anyway (ms)
  const MAX_IDLE_WAIT_MS = 12000;

  // ── State ─────────────────────────────────────────────────
  let _popups        = [];   // pending popups to show
  let _currentIdx    = 0;    // index within current batch
  let _isVisible     = false;
  let _initialised   = false;
  let _overlay       = null;
  let _card          = null;

  // ── Detect if backend is currently processing ─────────────
  function _isLoading() {
    // Check the ref-counted loader your withLoader uses
    const loader = document.getElementById('appLoader');
    if (loader && !loader.hidden) return true;

    // Secondary check — ModalManager active (modal open = user is busy)
    if (window.ModalManager && typeof window.ModalManager.getOpenModals === 'function') {
      if (window.ModalManager.getOpenModals().length > 0) return true;
    }

    return false;
  }

  // ── Wait until the app is idle, then run callback ─────────
  function _whenIdle(callback) {
    const start = Date.now();
    const check = () => {
      if (!_isLoading()) {
        callback();
        return;
      }
      if (Date.now() - start > MAX_IDLE_WAIT_MS) {
        // Waited long enough — show anyway
        callback();
        return;
      }
      setTimeout(check, IDLE_POLL_MS);
    };
    setTimeout(check, INITIAL_DELAY_MS);
  }

  // ── API: fetch popups for current user ────────────────────
  async function _fetchPopups() {
    try {
      const res = await fetch(`${API_BASE}/api/notification-popups`, {
        method: 'credentials' === 'include' ? 'GET' : 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.popups) ? json.popups : [];
    } catch (e) {
      console.warn('[NotifPopup] fetch failed:', e.message);
      return [];
    }
  }

  // ── API: dismiss a popup ──────────────────────────────────
  async function _dismiss(popupId) {
    try {
      await fetch(`${API_BASE}/api/notification-popups/${popupId}/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.warn('[NotifPopup] dismiss failed:', e.message);
    }
  }

  // ── Level → visual config ─────────────────────────────────
  const LEVEL_CFG = {
    info: {
      iconClass: 'ti ti-info-circle',
      accentVar: '#3b82f6',
      labelBg:   'rgba(59,130,246,0.12)',
      labelColor:'#60a5fa',
      btnBg:     'rgba(59,130,246,0.14)',
      btnColor:  '#93c5fd',
      dotColor:  '#3b82f6',
    },
    warning: {
      iconClass: 'ti ti-alert-triangle',
      accentVar: '#f59e0b',
      labelBg:   'rgba(245,158,11,0.12)',
      labelColor:'#fbbf24',
      btnBg:     'rgba(245,158,11,0.14)',
      btnColor:  '#fcd34d',
      dotColor:  '#f59e0b',
    },
    error: {
      iconClass: 'ti ti-shield-exclamation',
      accentVar: '#ef4444',
      labelBg:   'rgba(239,68,68,0.12)',
      labelColor:'#f87171',
      btnBg:     'rgba(239,68,68,0.14)',
      btnColor:  '#fca5a5',
      dotColor:  '#ef4444',
    },
  };
  function _cfg(level) {
    return LEVEL_CFG[level] || LEVEL_CFG.info;
  }

  // ── Inject styles (once) ──────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('__notifpopup_styles')) return;
    const s = document.createElement('style');
    s.id = '__notifpopup_styles';
    s.textContent = `
      /* Overlay */
      #notifPopupOverlay {
        position: fixed;
        inset: 0;
        z-index: 2147483640;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0,0,0,0.58);
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
        opacity: 0;
        transition: opacity 0.28s ease;
        pointer-events: none;
      }
      #notifPopupOverlay.np-visible {
        opacity: 1;
        pointer-events: auto;
      }

      /* Card */
      #notifPopupCard {
        background: #141414;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 20px;
        width: 100%;
        max-width: 360px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 32px 64px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.05);
        transform: translateY(28px) scale(0.96);
        transition: transform 0.32s cubic-bezier(0.22,0.68,0,1.18),
                    opacity 0.28s ease;
        opacity: 0;
      }
      #notifPopupOverlay.np-visible #notifPopupCard {
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      /* Slide-in-right animation (for next slide) */
      #notifPopupCard.np-slide-in {
        animation: npSlideInRight 0.28s cubic-bezier(0.22,0.68,0,1.15) both;
      }
      @keyframes npSlideInRight {
        from { opacity:0; transform: translateX(28px); }
        to   { opacity:1; transform: translateX(0); }
      }

      /* Slide-in-left animation (dot tap going back) */
      #notifPopupCard.np-slide-in-left {
        animation: npSlideInLeft 0.28s cubic-bezier(0.22,0.68,0,1.15) both;
      }
      @keyframes npSlideInLeft {
        from { opacity:0; transform: translateX(-28px); }
        to   { opacity:1; transform: translateX(0); }
      }

      /* Glow strip at top (level colour) */
      #notifPopupGlow {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        border-radius: 20px 20px 0 0;
        transition: background 0.3s ease;
      }

      /* Header */
      .np-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 20px 18px 12px;
      }
      .np-icon-wrap {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 1px;
        transition: background 0.3s;
      }
      .np-icon-wrap i {
        font-size: 20px;
        transition: color 0.3s;
      }
      .np-title-col { flex: 1; min-width: 0; }
      .np-label {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        padding: 2px 8px;
        border-radius: 20px;
        margin-bottom: 5px;
        transition: background 0.3s, color 0.3s;
      }
      .np-title {
        font-size: 15px;
        font-weight: 600;
        color: #fff;
        line-height: 1.3;
      }

      /* Count badge */
      #notifPopupCount {
        position: absolute;
        top: 14px;
        right: 14px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        font-size: 11px;
        color: rgba(255,255,255,0.45);
        padding: 2px 9px;
        font-weight: 500;
      }

      /* Body */
      .np-body {
        padding: 0 18px 16px;
        font-size: 13px;
        color: rgba(255,255,255,0.65);
        line-height: 1.65;
      }

      /* Divider */
      .np-divider {
        height: 1px;
        background: rgba(255,255,255,0.06);
      }

      /* Footer */
      .np-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 18px;
      }
      .np-dots {
        display: flex;
        align-items: center;
        gap: 5px;
        flex: 1;
      }
      .np-dot {
        height: 6px;
        width: 6px;
        border-radius: 3px;
        background: rgba(255,255,255,0.18);
        cursor: pointer;
        transition: width 0.2s ease, background 0.2s ease;
        border: none;
        padding: 0;
        flex-shrink: 0;
      }
      .np-dot.np-dot-active {
        width: 18px;
      }
      .np-btn-next {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 9px;
        padding: 8px 13px;
        font-size: 12px;
        color: rgba(255,255,255,0.55);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background 0.15s, border-color 0.15s;
        flex-shrink: 0;
      }
      .np-btn-next:hover { background: rgba(255,255,255,0.1); }
      .np-btn-next i { font-size: 13px; }
      .np-btn-ok {
        border: none;
        border-radius: 10px;
        padding: 9px 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.1s;
        flex-shrink: 0;
      }
      .np-btn-ok:active { transform: scale(0.93); opacity: 0.82; }

      /* Dismissed state */
      .np-done-wrap {
        text-align: center;
        padding: 28px 20px 24px;
      }
      .np-done-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg,#10b981,#059669);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px;
        animation: npCheckPop 0.4s cubic-bezier(0.22,0.68,0,1.2) both;
      }
      @keyframes npCheckPop {
        from { transform: scale(0); opacity:0; }
        to   { transform: scale(1); opacity:1; }
      }
      .np-done-icon i { font-size: 24px; color: #fff; }
      .np-done-text {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 4px;
      }
      .np-done-sub {
        font-size: 12px;
        color: rgba(255,255,255,0.45);
      }

      /* Mobile */
      @media (max-width: 400px) {
        #notifPopupCard { border-radius: 18px; }
        .np-header { padding: 18px 15px 10px; }
        .np-body   { padding: 0 15px 14px; }
        .np-footer { padding: 10px 15px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Build DOM ─────────────────────────────────────────────
  function _buildDOM() {
    if (_overlay) return; // already built

    _injectStyles();

    _overlay = document.createElement('div');
    _overlay.id = 'notifPopupOverlay';
    _overlay.setAttribute('role', 'dialog');
    _overlay.setAttribute('aria-modal', 'true');
    _overlay.setAttribute('aria-label', 'Notification');

    _overlay.innerHTML = `
      <div id="notifPopupCard">
        <div id="notifPopupGlow"></div>
        <span id="notifPopupCount"></span>

        <div class="np-header">
          <div class="np-icon-wrap" id="npIconWrap">
            <i id="npIcon" class="ti ti-info-circle"></i>
          </div>
          <div class="np-title-col">
            <span class="np-label" id="npLabel">Notice</span>
            <div class="np-title" id="npTitle"></div>
          </div>
        </div>

        <div class="np-body" id="npBody"></div>

        <div class="np-divider"></div>

        <div class="np-footer">
          <div class="np-dots" id="npDots"></div>
          <button class="np-btn-next" id="npBtnNext" aria-label="Next notification">
            Next <i class="ti ti-arrow-right"></i>
          </button>
          <button class="np-btn-ok" id="npBtnOk">Got it</button>
        </div>
      </div>
    `;

    document.body.appendChild(_overlay);
    _card = document.getElementById('notifPopupCard');

    // Close on overlay click (outside card)
    _overlay.addEventListener('click', (e) => {
      if (e.target === _overlay) _handleOk();
    });

    document.getElementById('npBtnOk').addEventListener('click', _handleOk);
    document.getElementById('npBtnNext').addEventListener('click', _handleNext);

    // Keyboard: Escape = ok, Arrow right = next
    document.addEventListener('keydown', _onKeyDown);
  }

  // ── Keyboard ──────────────────────────────────────────────
  function _onKeyDown(e) {
    if (!_isVisible) return;
    if (e.key === 'Escape') _handleOk();
    if (e.key === 'ArrowRight') _handleNext();
  }

  // ── Render a single popup slide ───────────────────────────
  function _renderSlide(idx, animDir) {
    const popup = _popups[idx];
    if (!popup) return;

    const cfg   = _cfg(popup.level || 'info');
    const total = _popups.length;
    const isLast = idx === total - 1;

    // Glow
    document.getElementById('notifPopupGlow').style.background =
      `linear-gradient(90deg, transparent, ${cfg.accentVar}88, transparent)`;

    // Icon wrap
    const iconWrap = document.getElementById('npIconWrap');
    iconWrap.style.background = cfg.labelBg;
    const icon = document.getElementById('npIcon');
    icon.className = cfg.iconClass;
    icon.style.color = cfg.accentVar;

    // Label
    const label = document.getElementById('npLabel');
    label.style.background = cfg.labelBg;
    label.style.color      = cfg.labelColor;
    label.textContent      = (popup.level || 'info').charAt(0).toUpperCase()
                              + (popup.level || 'info').slice(1);

    // Title + body
    document.getElementById('npTitle').textContent = popup.title || '';
    document.getElementById('npBody').textContent  = popup.message || '';

    // Count badge
    const countEl = document.getElementById('notifPopupCount');
    if (total > 1) {
      countEl.textContent = `${idx + 1} of ${total}`;
      countEl.style.display = '';
    } else {
      countEl.style.display = 'none';
    }

    // Dots
    const dotsEl = document.getElementById('npDots');
    dotsEl.innerHTML = '';
    if (total > 1) {
      _popups.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'np-dot' + (i === idx ? ' np-dot-active' : '');
        dot.setAttribute('aria-label', `Notification ${i + 1}`);
        if (i === idx) {
          dot.style.background = cfg.dotColor;
        }
        dot.addEventListener('click', () => {
          if (i === _currentIdx) return;
          const dir = i > _currentIdx ? 'right' : 'left';
          _currentIdx = i;
          _animateCard(dir);
          _renderSlide(_currentIdx);
        });
        dotsEl.appendChild(dot);
      });
      dotsEl.style.display = '';
    } else {
      dotsEl.style.display = 'none';
    }

    // Next button
    const nextBtn = document.getElementById('npBtnNext');
    nextBtn.style.display = isLast ? 'none' : '';

    // OK button
    const okBtn = document.getElementById('npBtnOk');
    okBtn.style.background = cfg.btnBg;
    okBtn.style.color      = cfg.btnColor;
    okBtn.textContent      = isLast ? 'Got it' : 'Skip';

    // Slide animation
    if (animDir) _animateCard(animDir);
  }

  function _animateCard(dir) {
    if (!_card) return;
    _card.classList.remove('np-slide-in', 'np-slide-in-left');
    // Force reflow
    void _card.offsetWidth;
    _card.classList.add(dir === 'right' ? 'np-slide-in' : 'np-slide-in-left');
  }

  // ── Show overlay ──────────────────────────────────────────
  function _show() {
    if (!_overlay) _buildDOM();
    if (_popups.length === 0) return;

    _currentIdx = 0;
    _isVisible  = true;

    _renderSlide(0);
    // Let browser paint the card first, then fade in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _overlay.classList.add('np-visible');
      });
    });

    // Trap focus inside card
    setTimeout(() => {
      const okBtn = document.getElementById('npBtnOk');
      if (okBtn) okBtn.focus();
    }, 350);
  }

  // ── Handle "Got it" / "Skip" ──────────────────────────────
  async function _handleOk() {
    const popup = _popups[_currentIdx];
    if (!popup) return;

    // If not last, advance to next without dismissing
    if (_currentIdx < _popups.length - 1) {
      _currentIdx++;
      _animateCard('right');
      _renderSlide(_currentIdx);
      return;
    }

    // Last slide — dismiss all shown popups
    _hide(false);

    // Fire dismissals in background (one per popup seen)
    const seenPopups = [..._popups];
    seenPopups.forEach(p => _dismiss(p.id).catch(() => {}));

    // Show brief confirmation then close
    _showDoneState();
  }

  // ── Handle "Next" button ──────────────────────────────────
  function _handleNext() {
    if (_currentIdx >= _popups.length - 1) return;
    _currentIdx++;
    _animateCard('right');
    _renderSlide(_currentIdx);
  }

  // ── Hide overlay ──────────────────────────────────────────
  function _hide(immediate = false) {
    if (!_overlay) return;
    if (immediate) {
      _overlay.classList.remove('np-visible');
      _isVisible = false;
      return;
    }
    _overlay.classList.remove('np-visible');
    setTimeout(() => {
      _isVisible = false;
    }, 300);
  }

  // ── Show brief "all done" confirmation before final close ─
  function _showDoneState() {
    if (!_card) return;
    _overlay.classList.add('np-visible');
    _card.innerHTML = `
      <div class="np-done-wrap">
        <div class="np-done-icon"><i class="ti ti-circle-check"></i></div>
        <div class="np-done-text">You're all caught up</div>
        <div class="np-done-sub">Notifications dismissed until tomorrow</div>
      </div>
    `;
    setTimeout(() => {
      _overlay.classList.remove('np-visible');
      setTimeout(() => {
        _isVisible = false;
        _popups = [];
        // Rebuild card for next time
        if (_overlay) {
          _overlay.remove();
          _overlay = null;
          _card = null;
        }
      }, 300);
    }, 1800);
  }

  // ── Main init: fetch + conditionally show ─────────────────
  async function init() {
    if (_initialised) return;
    _initialised = true;

    const popups = await _fetchPopups();
    if (!popups || popups.length === 0) {
      console.log('[NotifPopup] No notifications to show.');
      return;
    }

    _popups = popups;
    console.log(`[NotifPopup] ${popups.length} notification(s) pending.`);

    // Wait for app to be idle before showing
    _whenIdle(() => {
      if (_isVisible) return; // already showing (shouldn't happen)
      _buildDOM();
      _show();
    });
  }

  // ── Expose public API ─────────────────────────────────────
  window.NotifPopup = {
    /**
     * Manually trigger init (auto-called via onDashboardLoad patch below)
     */
    init,

    /**
     * Push new popup(s) into the queue mid-session.
     * If a popup is already visible, the new one queues up.
     * If not, it shows after the idle wait.
     * @param {Object|Object[]} newPopups
     */
    push(newPopups) {
      const incoming = Array.isArray(newPopups) ? newPopups : [newPopups];
      if (!incoming.length) return;

      if (_isVisible) {
        // Append to current batch — user will reach them via Next
        _popups = [..._popups, ...incoming];
        _renderSlide(_currentIdx); // refresh dot count
        console.log('[NotifPopup] Queued', incoming.length, 'new popup(s) to current session.');
      } else {
        _popups = incoming;
        _whenIdle(() => {
          _buildDOM();
          _show();
        });
      }
    },

    /**
     * Dismiss and close programmatically (e.g. from admin panel)
     */
    close() {
      _hide();
    },

    /** Is the popup currently visible? */
    get isVisible() { return _isVisible; }
  };

  // ── Auto-hook into onDashboardLoad ────────────────────────
  // Patches the existing onDashboardLoad function to call init()
  // after it completes. Falls back to DOMContentLoaded if that
  // function doesn't exist yet.
  function _hookIntoDashboard() {
    if (typeof onDashboardLoad === 'function') {
      const _orig = onDashboardLoad;
      onDashboardLoad = async function (...args) {
        const result = await _orig.apply(this, args);
        // Give session + UI a moment to settle
        setTimeout(() => window.NotifPopup.init(), 500);
        return result;
      };
      console.log('[NotifPopup] Hooked into onDashboardLoad ✓');
    } else {
      // onDashboardLoad doesn't exist yet — watch for it
      let attempts = 0;
      const watch = setInterval(() => {
        attempts++;
        if (typeof onDashboardLoad === 'function') {
          clearInterval(watch);
          _hookIntoDashboard(); // re-run now that it exists
        } else if (attempts > 40) {
          // 4 seconds passed, onDashboardLoad never appeared
          // Fall back: run after DOMContentLoaded + delay
          clearInterval(watch);
          console.warn('[NotifPopup] onDashboardLoad not found — falling back to DOMContentLoaded');
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(init, 3000));
          } else {
            setTimeout(init, 3000);
          }
        }
      }, 100);
    }
  }

  // Start the hook attempt immediately
  _hookIntoDashboard();

})();