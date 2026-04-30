// ====================== ADMIN DASHBOARD LOGIC ======================

let isAdmin = false;

// Check if current user is admin
async function checkAdminStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/test`, {
      method: 'GET',
      credentials: 'include'
    });

    if (res.ok) {
      isAdmin = true;
      const adminTab = document.getElementById('adminNavLink');
      if (adminTab) adminTab.style.display = 'flex';
      console.log("%c✅ Admin access confirmed", "color: #00ffaa; font-weight: bold");
      return true;
    }
  } catch (err) {
    console.error("[Admin Check] Error:", err);
  }
  return false;
}

// Load Admin Overview (Stats + Quick Notifications)
async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'Unknown error');

    // Update Stats
    const collectiveEl = document.getElementById('collectiveBalance');
    if (collectiveEl) collectiveEl.textContent = `₦${Number(data.collectiveBalance || 0).toLocaleString('en-NG')}`;

    const todayFundsEl = document.getElementById('todayFunds');
    if (todayFundsEl) todayFundsEl.textContent = `₦${Number(data.stats?.todayFunds || 0).toLocaleString('en-NG')}`;

    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) totalUsersEl.textContent = Number(data.stats?.totalUsers || 0).toLocaleString('en-NG');

    const successTxEl = document.getElementById('successTx');
    if (successTxEl) successTxEl.textContent = Number(data.stats?.successTx || 0).toLocaleString('en-NG');

    console.log("%c✅ Admin Dashboard stats loaded", "color: #00ffaa");

  } catch (err) {
    console.error("[Admin Dashboard] Load error:", err);
  }
}

// ====================== ADMIN FULL TRANSACTION HISTORY ======================

// Load all users' recent transactions (main Recent Activity)
async function loadAdminRecentTransactions() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/transactions?limit=30`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (!data.ok) throw new Error(data.message || 'Unknown error');

    renderAdminTransactionHistory(data.transactions || []);

  } catch (err) {
    console.error("[Admin Transactions] Load error:", err);
    const container = document.getElementById('adminNotificationsList');
    if (container) {
      container.innerHTML = `<p style="padding:40px;text-align:center;color:#f66;">Failed to load recent activity</p>`;
    }
  }
}

// Render transactions in history style (this replaces renderAdminNotifications)
function renderAdminTransactionHistory(transactions) {
  const container = document.getElementById('adminNotificationsList');
  if (!container) return;

  container.innerHTML = '';

  if (transactions.length === 0) {
    container.innerHTML = `
      <p style="padding:40px;text-align:center;color:#888;">
        No recent transactions on the platform
      </p>`;
    return;
  }

  transactions.forEach(tx => {
    const isCredit = (tx.type === 'credit' || Number(tx.amount) > 0);
    const amount = Math.abs(Number(tx.amount || 0));

    const item = document.createElement('div');
    item.className = `admin-activity-item tx-item`;   // Reuse tx-item class from history
    item.style.cursor = 'pointer';

    item.innerHTML = `
      <div class="tx-icon ${isCredit ? 'incoming' : 'outgoing'}">
        ${isCredit ? 
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" stroke-width="2.5"><polyline points="5 12 12 19 19 12"></polyline><line x1="12" y1="19" x2="12" y2="5"></line></svg>` : 
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2.5"><polyline points="19 12 12 5 5 12"></polyline><line x1="12" y1="5" x2="12" y2="19"></line></svg>`
        }
      </div>
      <div class="tx-content" style="flex:1;">
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
          <div class="tx-time">
            ${new Date(tx.created_at).toLocaleString('en-NG', { 
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
            })}
          </div>
          <div class="tx-status" data-status="${(tx.status || 'success').toLowerCase()}">
            ${(tx.status || 'SUCCESS').toUpperCase()}
          </div>
        </div>
      </div>
    `;

    // Click to open receipt (reuses your existing function)
    item.addEventListener('click', () => {
      if (typeof showTransactionReceipt === 'function') {
        showTransactionReceipt(tx);
      } else {
        console.log("Receipt modal not available for tx:", tx.reference);
      }
    });

    container.appendChild(item);
  });
}

// Switch to Admin Tab
function switchToAdminTab() {
  document.querySelectorAll('.user-profile-dashboard-content, #adminDashboardContent')
    .forEach(el => el.classList.add('hidden'));

  const adminContent = document.getElementById('adminDashboardContent');
  if (adminContent) adminContent.classList.remove('hidden');

  // Load stats once
  const balanceEl = document.getElementById('collectiveBalance');
  if (balanceEl && !balanceEl.dataset.loaded) {
    loadAdminDashboard();
    balanceEl.dataset.loaded = 'true';
  }

  // Load recent transactions (this is the main "Recent Activity")
  loadAdminRecentTransactions();
}

// Initialize
async function initAdminFeatures() {
  const isAdminUser = await checkAdminStatus();
  if (!isAdminUser) return;

  const adminNav = document.getElementById('adminNavLink');
  if (adminNav) {
    adminNav.addEventListener('click', (e) => {
      e.preventDefault();
      switchToAdminTab();

      document.querySelectorAll('.bottom-nav .nav-item')
        .forEach(item => item.classList.remove('active'));

      adminNav.classList.add('active');
    });
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', initAdminFeatures);