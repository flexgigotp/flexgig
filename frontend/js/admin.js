// ====================== ADMIN DASHBOARD LOGIC ======================

const API_BASE = window.__SEC_API_BASE || 'https://api.flexgig.com.ng';

let isAdmin = false;

// Check if current user is admin
async function checkAdminStatus() {
  try {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) {
      console.log("[Admin] No token found");
      return false;
    }

    const res = await fetch(`${API_BASE}/api/admin/test`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) throw new Error("No token");

    const res = await fetch(`${API_BASE}/api/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data.ok) throw new Error(data.message || 'Unknown error');

    // Update Balances
    document.getElementById('collectiveBalance').textContent = 
      `₦${Number(data.collectiveBalance || 0).toLocaleString('en-NG')}`;

    document.getElementById('personalBalance').textContent = 
      `₦${Number(data.personalBalance || 0).toLocaleString('en-NG')}`;

    // Update Stats
    document.getElementById('todayFunds').textContent = 
      `₦${Number(data.stats?.todayFunds || 0).toLocaleString('en-NG')}`;

    document.getElementById('totalUsers').textContent = 
      Number(data.stats?.totalUsers || 0).toLocaleString('en-NG');

    // Render Notifications
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

  if (notifications.length === 0) {
    container.innerHTML = `<p style="padding:20px;text-align:center;color:#888;">No recent activity</p>`;
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
          <div class="notif-time">${new Date(notif.created_at).toLocaleString('en-NG', { 
            hour: '2-digit', minute: '2-digit' 
          })}</div>
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

  document.getElementById('adminDashboardContent').classList.remove('hidden');

  // Load data once
  if (!document.getElementById('collectiveBalance').dataset.loaded) {
    loadAdminDashboard();
    document.getElementById('collectiveBalance').dataset.loaded = 'true';
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

      // Remove active from others
      document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
      });
      adminNav.classList.add('active');
    });
  }
}

// Run on load
document.addEventListener('DOMContentLoaded', () => {
  initAdminFeatures();
});