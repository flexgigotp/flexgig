// ====================== ADMIN DASHBOARD LOGIC ======================

['log', 'debug', 'warn', 'error', 'info'].forEach(m => console[m] = () => {});

window.addEventListener('unhandledrejection', e => e.preventDefault());
window.onerror = () => true;
let isAdmin = false;

// Check if current user is admin
async function checkAdminStatus() {
  // Always start by ensuring tab is hidden — no matter what happens below
  const adminTab = document.getElementById('adminNavLink');
  if (adminTab) {
    adminTab.style.setProperty('display', 'none', 'important');
    adminTab.setAttribute('aria-hidden', 'true');
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/test`, {
      method: 'GET',
      credentials: 'include'
    });

    if (res.status === 200) {
      isAdmin = true;
      if (adminTab) {
        adminTab.style.setProperty('display', 'flex', 'important');
        adminTab.removeAttribute('aria-hidden');
      }
      console.log("%c✅ Admin access confirmed", "color: #00ffaa; font-weight: bold");
      return true;
    }

    // Any other response (403, 500, etc.) — explicitly keep hidden
    console.log(`[Admin Check] Non-200 response (${res.status}) — hiding admin tab`);
  } catch (err) {
    // Network failure, server crash, timeout — stay hidden
    console.warn("[Admin Check] Fetch failed — keeping admin tab hidden:", err.message);
  }

  // Explicit cleanup on any failure path
  isAdmin = false;
  if (adminTab) {
    adminTab.style.setProperty('display', 'none', 'important');
    adminTab.setAttribute('aria-hidden', 'true');
  }
  return false;
}

// Load Admin Stats
async function loadAdminDashboard() {
  const res = await fetch(`${API_BASE}/api/admin/dashboard`, { credentials: 'include' });
  const data = await res.json();

  if (data.ok) {
    document.getElementById('collectiveBalance').textContent =
      `₦${Number(data.collectiveBalance || 0).toLocaleString('en-NG')}`;
    document.getElementById('todayFunds').textContent =
      `₦${Number(data.stats?.todayFunds || 0).toLocaleString('en-NG')}`;
    document.getElementById('totalUsers').textContent =
      Number(data.stats?.totalUsers || 0).toLocaleString('en-NG');

    setTrend('todayFundsTrend', data.stats?.todayFundsTrend);
    setTrend('totalUsersTrend', data.stats?.totalUsersTrend);
  }
}

function setTrend(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (value === null || value === undefined) {
    el.textContent = '—';
    el.className = 'stat-trend neutral';
    return;
  }

  const num = Number(value);
  el.textContent = `${num >= 0 ? '↑' : '↓'} ${Math.abs(num)}%`;
  el.className = `stat-trend ${num >= 0 ? 'up' : 'down'}`;
}

// Load 10 Recent Transactions for Dashboard
async function loadAdminRecentTransactions() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/transactions?limit=10`, { credentials: 'include' });
    const data = await res.json();

    if (data.ok) {
      renderAdminRecentActivity(data.transactions || []);
    }
  } catch (err) {
    console.error("[Admin Recent Tx] Error:", err);
  }
}

// Render Recent Activity (compact)
function renderAdminRecentActivity(transactions) {
  const container = document.getElementById('adminNotificationsList');
  if (!container) return;

  container.innerHTML = '';

  if (transactions.length === 0) {
    container.innerHTML = `<p style="padding:40px;text-align:center;color:#888;">No recent activity</p>`;
    return;
  }

  transactions.forEach(tx => {
    const isCredit = tx.type === 'credit' || Number(tx.amount) > 0;
    const amount = Math.abs(Number(tx.amount || 0));

    const item = document.createElement('div');
    item.className = 'admin-activity-item tx-item';
    item.style.cursor = 'pointer';

    item.innerHTML = `
      <div class="tx-icon ${isCredit ? 'incoming' : 'outgoing'}">
        ${isCredit ? 
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2.5"><polyline points="5 12 12 19 19 12"></polyline><line x1="12" y1="19" x2="12" y2="5"></line></svg>` : 
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2.5"><polyline points="19 12 12 5 5 12"></polyline><line x1="12" y1="5" x2="12" y2="19"></line></svg>`
        }
      </div>
      <div class="tx-content" style="flex:1">
        <div class="tx-row">
          <div class="tx-desc">
            <strong>${tx.user_name || 'Unknown User'}</strong><br>
            <span style="color:#aaa;font-size:13px;">${tx.description || 'Transaction'}</span>
          </div>
          <div class="tx-amount ${isCredit ? 'credit' : 'debit'}">
            ${isCredit ? '+' : '-'} ₦${amount.toLocaleString('en-NG')}
          </div>
        </div>
        <div class="tx-row meta">
          <div class="tx-time">${formatAdminTime(tx.created_at)}</div>
          <div class="tx-status" data-status="${(tx.status || 'success').toLowerCase()}">
            ${(tx.status || 'SUCCESS').toUpperCase()}
          </div>
        </div>
      </div>
    `;

    item.addEventListener('click', () => showTransactionReceipt(tx));
    container.appendChild(item);
  });
}

function formatAdminTime(iso) {
  return new Date(iso).toLocaleString('en-NG', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    day: 'numeric', month: 'short'
  });
}

async function loadAdminMonthlyHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/monthly-history`, {
      credentials: 'include'
    });
    const data = await res.json();

    if (data.ok && Array.isArray(data.monthly_history)) {
      window.monthlyHistory = data.monthly_history;
      console.log('[Admin Monthly] Loaded:', window.monthlyHistory.length, 'months');
    }
  } catch (err) {
    console.error('[Admin Monthly] Failed to load:', err);
  }
}

// "View All" button → Open History Modal in Admin Mode
document.getElementById('viewAllNotificationsBtn')?.addEventListener('click', async () => {
  window.isAdminViewingHistory = true;
  await loadAdminMonthlyHistory(); // load admin-wide monthly totals before opening
  ModalManager.openModal('historyModal');
});

function notifyAdminNewTransaction(tx) {
  const amount = Number(tx.amount);

  // Anomaly detection
  const isLarge = amount >= 50000;
  const isRound = amount % 10000 === 0 && amount >= 20000;
  const isOffHours = new Date().getHours() < 6 || new Date().getHours() >= 23;
  const isSuspicious = isLarge || isRound || isOffHours;

  const formattedAmount = '₦' + amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const user = tx.user_name || 'Unknown user';
  const flag = isSuspicious ? '⚠️ ' : '';
  const msg = `${flag}💰 New Funding: ${user} — ${formattedAmount}`;

  // Toast
  if (typeof Toastify === 'function') {
    Toastify({
      text: msg,
      duration: isSuspicious ? 10000 : 5000,
      gravity: 'top',
      position: 'right',
      style: {
        background: isSuspicious ? '#ff6b35' : '#00d4aa',
        borderRadius: '12px',
        fontWeight: '600',
        fontSize: '14px'
      }
    }).showToast();
  }

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification(isSuspicious ? '⚠️ Unusual Funding Detected' : '💰 New Funding', {
      body: `${user} — ${formattedAmount}`,
      icon: '/frontend/svg/logo.svg',
      silent: false
    });
  }

  // Refresh admin recent activity if admin tab is visible
  const adminContent = document.getElementById('adminDashboardContent');
  if (adminContent && !adminContent.classList.contains('hidden')) {
    loadAdminRecentTransactions();
    loadAdminDashboard(); // refresh stats like total funded today
  }

  console.log(`[Admin Notify] ${isSuspicious ? '⚠️ SUSPICIOUS' : '✅ Normal'} funding: ${user} — ${formattedAmount}`);
}


// Switch to Admin Tab
function switchToAdminTab() {
  if (!isAdmin) {
    console.warn('[Admin] switchToAdminTab called without admin rights — blocked');
    return;
  }
  document.querySelector('.user-profile-dashboard-content')?.classList.add('hidden');  // ← ADD THIS
  document.getElementById('adminDashboardContent').classList.remove('hidden');

  // Let ModalManager know — clear its active state then set admin
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.classList.remove('active');
    item.removeAttribute('aria-current');
  });
  const adminNav = document.getElementById('adminNavLink');
  if (adminNav) {
    adminNav.classList.add('active');
    adminNav.setAttribute('aria-current', 'true');
  }

  // load stats only once
  const balanceEl = document.getElementById('collectiveBalance');
  if (balanceEl && !balanceEl.dataset.loaded) {
    loadAdminDashboard();
    loadAdminRecentTransactions();
    balanceEl.dataset.loaded = 'true';
  }
}

function switchToHomeTab() {
  document.getElementById('adminDashboardContent')?.classList.add('hidden');
  document.querySelector('.user-profile-dashboard-content')?.classList.remove('hidden');
}

// Initialize
async function initAdminFeatures() {
  if (await checkAdminStatus()) {
    const adminNav = document.getElementById('adminNavLink');
    if (adminNav) {
      adminNav.addEventListener('click', (e) => {
        e.preventDefault();
        switchToAdminTab();

        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
        adminNav.classList.add('active');
      });
    }

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('[Admin] Notification permission:', permission);
      });
    }

    // Start admin realtime immediately — keeps listening regardless of which tab is active
    if (typeof subscribeToAdminTransactions === 'function') {
      subscribeToAdminTransactions();
      console.log('[Admin] Global realtime started');
    }

    // ✅ ADD THIS
if (typeof subscribeToAdminUsersRealtime === 'function') {
  subscribeToAdminUsersRealtime();
  console.log('[Admin] Users realtime started');
}
  }
}

document.addEventListener('DOMContentLoaded', initAdminFeatures);