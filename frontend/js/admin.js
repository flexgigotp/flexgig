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

// Load Admin Stats
async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/dashboard`, { credentials: 'include' });
    const data = await res.json();

    if (data.ok) {
      document.getElementById('collectiveBalance').textContent = 
        `₦${Number(data.collectiveBalance || 0).toLocaleString('en-NG')}`;

      document.getElementById('todayFunds').textContent = 
        `₦${Number(data.stats?.todayFunds || 0).toLocaleString('en-NG')}`;

      document.getElementById('totalUsers').textContent = 
        Number(data.stats?.totalUsers || 0).toLocaleString('en-NG');

      const successTxEl = document.getElementById('successTx');
      if (successTxEl) successTxEl.textContent = Number(data.stats?.successTx || 0).toLocaleString('en-NG');
    }
  } catch (err) {
    console.error("[Admin Stats] Error:", err);
  }
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

// "View All" button → Open History Modal in Admin Mode
document.getElementById('viewAllNotificationsBtn')?.addEventListener('click', () => {
  window.isAdminViewingHistory = true;
  ModalManager.openModal('historyModal');
});

// Switch to Admin Tab
function switchToAdminTab() {
  document.querySelectorAll('.user-profile-dashboard-content, #adminDashboardContent')
    .forEach(el => el.classList.add('hidden'));

  document.getElementById('adminDashboardContent').classList.remove('hidden');

  const balanceEl = document.getElementById('collectiveBalance');
  if (balanceEl && !balanceEl.dataset.loaded) {
    loadAdminDashboard();
    loadAdminRecentTransactions();
    balanceEl.dataset.loaded = 'true';
  }
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
  }
}

document.addEventListener('DOMContentLoaded', initAdminFeatures);