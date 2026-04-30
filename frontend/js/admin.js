// ====================== ADMIN DASHBOARD LOGIC ======================

let isAdmin = false;

// Check if current user is admin
async function checkAdminStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/test`, {
      method: 'GET',
      credentials: 'include'
    });

    console.log(`[Admin Check] Status: ${res.status}`);

    if (res.ok) {
      isAdmin = true;

      const adminTab = document.getElementById('adminNavLink');
      if (adminTab) adminTab.style.display = 'flex';

      console.log("%c✅ Admin access confirmed", "color: #00ffaa; font-weight: bold");
      return true;
    } else {
      console.log("[Admin Check] Not admin or access denied");
    }
  } catch (err) {
    console.error("[Admin Check] Error:", err);
  }

  return false;
}


// Load Admin Dashboard Data
async function loadAdminDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.ok) throw new Error(data.message || 'Unknown error');

    // ======================
    // SAFE DOM UPDATES
    // ======================

    const collectiveEl = document.getElementById('collectiveBalance');
    if (collectiveEl) {
      collectiveEl.textContent =
        `₦${Number(data.collectiveBalance || 0).toLocaleString('en-NG')}`;
    }

    const todayFundsEl = document.getElementById('todayFunds');
    if (todayFundsEl) {
      todayFundsEl.textContent =
        `₦${Number(data.stats?.todayFunds || 0).toLocaleString('en-NG')}`;
    }

    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl) {
      totalUsersEl.textContent =
        Number(data.stats?.totalUsers || 0).toLocaleString('en-NG');
    }

    const successTxEl = document.getElementById('successTx');
    if (successTxEl) {
      successTxEl.textContent =
        Number(data.stats?.successTx || 0).toLocaleString('en-NG');
    }

    // Render notifications
    renderAdminNotifications(data.notifications || []);

    console.log("%c✅ Admin Dashboard loaded successfully", "color: #00ffaa");

  } catch (err) {
    console.error("[Admin Dashboard] Load error:", err);
  }
}


// Render notifications
function renderAdminNotifications(notifications) {
  const container = document.getElementById('adminNotificationsList');
  if (!container) return;

  container.innerHTML = '';

  if (!notifications.length) {
    container.innerHTML = `
      <p style="padding:20px;text-align:center;color:#888;">
        No recent activity
      </p>`;
    return;
  }

  notifications.forEach(notif => {
    const isFund = notif.type === 'fund';
    const amountClass = isFund ? 'positive' : 'negative';
    const amountSign = isFund ? '+' : '';

    const div = document.createElement('div');
    div.className = 'admin-notification-item';

    div.innerHTML = `
      <div class="notif-left">
        <div class="notif-icon ${isFund ? 'fund' : 'purchase'}">
          ${isFund ? '↑' : '↓'}
        </div>

        <div class="notif-info">
          <div class="notif-user">${notif.user_name || 'Unknown'}</div>
          <div class="notif-desc">${notif.description || ''}</div>
          <div class="notif-time">
            ${new Date(notif.created_at).toLocaleString('en-NG', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
      </div>

      <div class="notif-amount ${amountClass}">
        ${amountSign}₦${Math.abs(Number(notif.amount || 0)).toLocaleString('en-NG')}
      </div>
    `;

    container.appendChild(div);
  });
}


// Switch to Admin Tab
function switchToAdminTab() {
  document.querySelectorAll('.user-profile-dashboard-content, #adminDashboardContent')
    .forEach(el => el.classList.add('hidden'));

  const adminContent = document.getElementById('adminDashboardContent');
  if (adminContent) {
    adminContent.classList.remove('hidden');
  }

  // Load data once
  const balanceEl = document.getElementById('collectiveBalance');
  if (balanceEl && !balanceEl.dataset.loaded) {
    loadAdminDashboard();
    balanceEl.dataset.loaded = 'true';
  }
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