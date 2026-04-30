// ====================== ADMIN DASHBOARD LOGIC ======================

let isAdmin = false;

// Check if current user is admin
async function checkAdminStatus() {
  try {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) return false;

    const res = await fetch('/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      isAdmin = true;
      document.getElementById('adminNavLink').style.display = 'flex';
      return true;
    }
  } catch (err) {
    console.log('[Admin] Not admin or error checking status');
  }
  return false;
}

// Load Admin Dashboard Data
async function loadAdminDashboard() {
  try {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    
    const res = await fetch('/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) throw new Error('Failed to load admin data');

    const data = await res.json();

    if (!data.ok) throw new Error(data.message || 'Unknown error');

    // Update Collective Balance
    document.getElementById('collectiveBalance').textContent = 
      `₦${Number(data.collectiveBalance || 0).toLocaleString('en-NG')}`;

    // Update Personal Balance
    document.getElementById('personalBalance').textContent = 
      `₦${Number(data.personalBalance || 0).toLocaleString('en-NG')}`;

    // Update Stats
    document.getElementById('todayFunds').textContent = 
      `₦${Number(data.stats?.todayFunds || 0).toLocaleString('en-NG')}`;

    document.getElementById('totalUsers').textContent = 
      Number(data.stats?.totalUsers || 0).toLocaleString('en-NG');

    // Render Recent Notifications
    renderAdminNotifications(data.notifications || []);

  } catch (err) {
    console.error('[Admin Dashboard] Load error:', err);
    // Optional: show a friendly message in the UI
  }
}

// Render notifications list
function renderAdminNotifications(notifications) {
  const container = document.getElementById('adminNotificationsList');
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
          <div class="notif-user">${notif.user_name || 'Unknown User'}</div>
          <div class="notif-desc">${notif.description || ''}</div>
          <div class="notif-time">${new Date(notif.created_at).toLocaleString('en-NG', { 
            hour: '2-digit', 
            minute: '2-digit' 
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

// Tab Switching Logic (integrate with your existing Navigo or manual tab system)
function switchToAdminTab() {
  // Hide all main content sections
  document.querySelectorAll('.user-profile-dashboard-content, #adminDashboardContent').forEach(el => {
    el.classList.add('hidden');
  });

  // Show admin dashboard
  document.getElementById('adminDashboardContent').classList.remove('hidden');

  // Load data if not already loaded
  if (!document.getElementById('collectiveBalance').dataset.loaded) {
    loadAdminDashboard();
    document.getElementById('collectiveBalance').dataset.loaded = 'true';
  }
}

// Initialize Admin Features
async function initAdminFeatures() {
  const isAdminUser = await checkAdminStatus();
  
  if (!isAdminUser) return;

  // Make Admin nav item clickable
  const adminNav = document.getElementById('adminNavLink');
  if (adminNav) {
    adminNav.addEventListener('click', (e) => {
      e.preventDefault();
      switchToAdminTab();
      
      // Optional: remove active class from other nav items
      document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
      });
      adminNav.classList.add('active');
    });
  }
}

// Run when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
  initAdminFeatures();
});