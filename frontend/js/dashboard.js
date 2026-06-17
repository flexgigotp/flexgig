['log', 'debug', 'warn', 'error', 'info'].forEach(m => console[m] = () => {});

window.addEventListener('unhandledrejection', e => e.preventDefault());
window.onerror = () => true;
if (sessionStorage.getItem('fg_just_logged_out')) {
  window.__SERVER_USER_DATA__ = null;
}
(function() {
  document.addEventListener('focusin', () => {}, { passive: true });

  const forceTop = () => window.scrollTo(0, 0);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceTop);
  }
  window.addEventListener('load', () => {
    setTimeout(forceTop, 100);
  });

})();
import { getAllPlans, getPlans, fetchPlans } from './dataPlans.js';  


window.__SEC_API_BASE = 'https://api.flexgig.com.ng'
window.__ACCESS_TOKEN__ = localStorage.getItem('token') || null;

const SUPABASE_URL = 'https://bwmappzvptcjxlukccux.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWFwcHp2cHRjanhsdWtjY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0OTMzMjcsImV4cCI6MjA3MTA2OTMyN30.Ra7k6Br6nl1huQQi5DpDuOQSDE-6N1qlhUIvIset0mc';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,          
    persistSession: true,            
    storage: localStorage,           
    detectSessionInUrl: true,        
    flowType: 'pkce'                
  }
});

window.supabaseClient = supabaseClient;   
window.createClient = createClient; 
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;


    (function() {
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
      }
      
      window.addEventListener('beforeunload', function() {
        window.scrollTo(0, 0);
        if (history.state && history.state.scrollY) {
          history.replaceState({ ...history.state, scrollY: 0 }, '');
        }
      });
      
      window.addEventListener('load', function() {
        window.scrollTo(0, 0);
        let hasJumped = false;
        window.addEventListener('scroll', function handler() {
          if (!hasJumped && window.scrollY > 0) {
            hasJumped = true;
            window.scrollTo(0, 0);
            window.removeEventListener('scroll', handler);
          }
        }, { once: true, passive: true });
      }, { once: true });
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(() => window.scrollTo(0, 0), 0); // Micro-delay for reflow
        });
      } else {
        window.scrollTo(0, 0);
      }
      
      console.log('[NUCLEAR SCROLL FIX] Activated - top enforced on reload');
    })();



window.pollStatus = async function pollStatus(force = false) {
  const now = Date.now();

  if (!force && now - (window.__fg_last_poll_ts || 0) < 30000) {
    console.debug('[BROADCAST] Skipped – too soon');
    return;
  }

  window.__fg_last_poll_ts = now;

  try {
    const { data, error } = await supabaseClient
      .from('broadcasts')
      .select('id, message, level, url, meta, active, starts_at, expire_at')
      .eq('active', true)
      .lte('starts_at', new Date().toISOString())           // already started or no start time
      .or(`expire_at.is.null,expire_at.gt.${new Date().toISOString()}`)  // not expired
      .order('starts_at', { ascending: true })              // earliest first
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[BROADCAST] Supabase query failed:', error);
      return;
    }

    let message = '';
    let level = 'info';
    let serverId = null;
    let isPersistent = false;  

    if (data) {
      message = data.message || '';
      level = ['info', 'warning', 'error'].includes(data.level) ? data.level : 'info';
      serverId = data.id;
      isPersistent = !data.expire_at;  

      if (message) {
        showBanner(message, {
          persistent: isPersistent,
          serverId,
          type: level,
          url: data.url || null   
        });

        window.__fg_currentBanner = window.__fg_currentBanner || {};
        window.__fg_currentBanner.id = serverId;
        window.__fg_currentBanner.message = message;
        window.__fg_currentBanner.level = level;
        window.__fg_currentBanner.persistent = isPersistent;
        window.__fg_currentBanner.clientSticky = false;

        if (serverId) {
          localStorage.setItem('active_broadcast_id', String(serverId));
        }
      }
    } else {
      if (!window.__fg_currentBanner?.clientSticky) {
        hideBanner(true);
        localStorage.removeItem('active_broadcast_id');
      }
    }

    console.debug('[BROADCAST] Updated:', { 
      message: message.slice(0, 60), 
      level, 
      persistent: isPersistent 
    });

  } catch (err) {
    console.error('[BROADCAST] Unexpected error:', err);
  }
};


function setupBroadcastRealtime() {
  if (window.__broadcast_channel) {
    window.__broadcast_channel.unsubscribe().catch(() => {});
  }

  window.__broadcast_channel = supabaseClient.channel('public:broadcasts-changes');

  window.__broadcast_channel
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'broadcasts'
    }, (payload) => {
      console.log('[BROADCAST REALTIME] Change:', payload.eventType, payload.new || payload.old);
      pollStatus(true); // force refresh
    })
    .subscribe((status) => {
      console.log('[BROADCAST REALTIME] Subscription:', status);
    });
}


if (typeof onDashboardLoad === 'function') {
  const original = onDashboardLoad;
  onDashboardLoad = async function (...args) {
    await original(...args);

    setupBroadcastRealtime();
    pollStatus(true);                // initial fetch
  };
} else {
  console.warn('[BROADCAST] No onDashboardLoad – running standalone');
  setupBroadcastRealtime();
  pollStatus(true);
}

window.forceBroadcastCheck = () => pollStatus(true);

if (!window.__specialPlanRealtimeAttached__) {
  window.addEventListener('planUpdated', (e) => {
    const plan = e.detail;
    updateSpecialRemainingCount(plan);
  });

  window.__specialPlanRealtimeAttached__ = true;
}



const JWT_CACHE = {
  token: null,
  expiry: 0,
  pendingRequest: null, // Track in-flight request
  BUFFER_MS: 5 * 60 * 1000 // Refresh 5 min before expiry
};

/**
 * Get JWT - uses cache, shares pending requests
 * @param {boolean} forceRefresh - Force new token even if cached
 * @returns {Promise<string|null>} JWT token or null
 */
let _jwtRefreshAttempts = 0;
const JWT_MAX_REFRESH_ATTEMPTS = 2;
let _jwtBlockedByLock = false; // ✅ stops retry hammering when 423 locked

async function getSharedJWT(forceRefresh = false) {
  const now = Date.now();

  if (_jwtBlockedByLock && !forceRefresh) {
    throw new Error('JWT blocked — awaiting reauth');
  }

  if (!forceRefresh && JWT_CACHE.token && now < JWT_CACHE.expiry - JWT_CACHE.BUFFER_MS) {
    console.log('[JWT Cache] Using cached token (expires in', Math.round((JWT_CACHE.expiry - now) / 1000), 'seconds)');
    return JWT_CACHE.token;
  }

  if (JWT_CACHE.pendingRequest) {
    console.log('[JWT Cache] Waiting for pending request...');
    return JWT_CACHE.pendingRequest;
  }

  console.log('[JWT Cache] Fetching new JWT...');

  JWT_CACHE.pendingRequest = (async () => {
    try {
      const res = await fetch('https://api.flexgig.com.ng/api/supabase/token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      if (res.status === 423) {
        _jwtBlockedByLock = true; 
        console.warn('[JWT Cache] 🔒 Account locked (423) — triggering reauth modal');
        localStorage.setItem('fg_reauth_required_v1', JSON.stringify({
          reason: 'backend_423', ts: Date.now()
        }));
        try {
          if (window.__reauth && typeof window.__reauth.initReauthModal === 'function') {
            window.__reauth.initReauthModal({ show: true, context: 'reauth' });
          } else if (typeof showReauthModalLocal === 'function') {
            showReauthModalLocal({ fromStorageObj: { reason: 'backend_423', ts: Date.now() } });
          } else {
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'fg_reauth_required_v1',
              newValue: JSON.stringify({ reason: 'backend_423', ts: Date.now() })
            }));
          }
        } catch (e) {
          console.error('[JWT Cache] Failed to show reauth modal after 423:', e);
        }
        throw new Error('JWT fetch failed: 423');
      }

      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        const code = body?.error?.code || '';

        const isHardFailure = code === 'INVALID_TOKEN' || code === 'BANNED';
        if (!isHardFailure && _jwtRefreshAttempts < JWT_MAX_REFRESH_ATTEMPTS) {
          _jwtRefreshAttempts++;
          console.log(`[JWT Cache] 401 (code: "${code}") — attempting session refresh (attempt ${_jwtRefreshAttempts})`);

          const refreshRes = await fetch('https://api.flexgig.com.ng/auth/refresh', {
            method: 'POST',
            credentials: 'include' // sends the rt cookie
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json().catch(() => ({}));
            const newAccessToken = refreshData.token;

            if (newAccessToken) {
              console.log('[JWT Cache] ✅ Refresh succeeded — retrying supabase/token');
              _jwtRefreshAttempts = 0; // reset for next natural expiry

              const retryRes = await fetch('https://api.flexgig.com.ng/api/supabase/token', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
              });

              if (retryRes.ok) {
                const { token } = await retryRes.json();
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiry = payload.exp * 1000;
                JWT_CACHE.token = token;
                JWT_CACHE.expiry = expiry;
                console.log('[JWT Cache] ✅ Token cached after refresh (expires:', new Date(expiry).toISOString(), ')');

                const refreshIn = expiry - Date.now() - 60_000;
                if (refreshIn > 0) {
                  clearTimeout(window.__jwtProactiveRefreshTimer);
                  window.__jwtProactiveRefreshTimer = setTimeout(() => {
                    console.log('[JWT Cache] ⏰ Proactive refresh triggered (post-retry)');
                    getSharedJWT(true);
                  }, refreshIn);
                }

                return token;
              }
            }
          }

          console.warn('[JWT Cache] Refresh failed — session expired, dispatching logout event');
          _jwtRefreshAttempts = 0;
          
          JWT_CACHE.token = null;
          JWT_CACHE.expiry = 0;

          window.dispatchEvent(new CustomEvent('fg:session-expired'));
          return null;
        }

        console.warn('[JWT Cache] 401 with hard auth failure or max retries reached — giving up. code:', code);
        return null;
      }

      if (!res.ok) {
        throw new Error(`JWT fetch failed: ${res.status}`);
      }

      _jwtRefreshAttempts = 0;
      const { token } = await res.json();
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;

      JWT_CACHE.token = token;
      JWT_CACHE.expiry = expiry;

      console.log('[JWT Cache] ✅ New token cached (expires:', new Date(expiry).toISOString(), ')');

      const refreshIn = expiry - Date.now() - 60_000;
      if (refreshIn > 0) {
        clearTimeout(window.__jwtProactiveRefreshTimer);
        window.__jwtProactiveRefreshTimer = setTimeout(() => {
          console.log('[JWT Cache] ⏰ Proactive refresh triggered');
          getSharedJWT(true);
        }, refreshIn);
      }

      return token;

    } catch (err) {
      console.error('[JWT Cache] ❌ Fetch failed:', err);
      return null;
    } finally {
      JWT_CACHE.pendingRequest = null;
    }
  })();

  return JWT_CACHE.pendingRequest;
}


function clearJWTCache() {
  JWT_CACHE.token = null;
  JWT_CACHE.expiry = 0;
  JWT_CACHE.pendingRequest = null;
  console.log('[JWT Cache] Cache cleared');
}

window.getSharedJWT = getSharedJWT;
window.clearJWTCache = clearJWTCache;

window.addEventListener('fg:session-expired', () => {
  console.warn('[Session] Session fully expired — stopping retries and prompting login');

  if (typeof lastTxHealthy !== 'undefined') lastTxHealthy = Date.now();
  if (typeof lastUserHealthy !== 'undefined') lastUserHealthy = Date.now();


  if (typeof showToast === 'function') {
    showToast('Your session has expired. Reloading...', 'error');
  }

  setTimeout(() => {
    window.location.href = '/';
  }, 3000);
}, { once: true }); // once: true prevents duplicate handlers on hot reload

let sharedAuthClient = null;
let sharedAuthClientReady = false;

async function getSharedAuthClient(forceRefresh = false) {
  if (sharedAuthClient && sharedAuthClientReady && !forceRefresh) {
    console.log('[Shared Auth Client] Reusing existing client');
    return sharedAuthClient;
  }

  console.log('[Shared Auth Client] Fetching/refreshing token...');
  const token = await getSharedJWT(forceRefresh);
  if (!token) {
    console.error('[Shared Auth Client] No JWT available');
    return null;
  }

  if (!sharedAuthClient) {
    console.log('[Shared Auth Client] Creating new authenticated client (singleton)...');
    sharedAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'flexgig_shared_auth_jwt_v1',
      }
    });
  } else {
    console.log('[Shared Auth Client] Reusing existing client, just refreshing session...');
  }

  const { error } = await sharedAuthClient.auth.setSession({
    access_token: token,
    refresh_token: 'rt-cookie-managed' // ✅ real refresh handled by rt cookie on backend
  });

  if (error) {
    console.error('[Shared Auth Client] setSession failed:', error);
    sharedAuthClientReady = false;
    return null;
  }

  sharedAuthClientReady = true;
  console.log('[Shared Auth Client] ✅ Client ready (session refreshed if needed)');
  return sharedAuthClient;
}

window.getSharedAuthClient = getSharedAuthClient;

(function interceptFetch() {
  const _originalFetch = window.fetch;
  const OWN_API = 'api.flexgig.com.ng';
  const PUBLIC_PATHS = ['/auth/login', '/auth/send-otp', '/auth/verify-otp', 
                        '/auth/refresh', '/auth/check-email', '/auth/resend-otp'];

  window.fetch = async function(url, options = {}) {
    const urlStr = String(url);

    if (!urlStr.includes(OWN_API)) {
      return _originalFetch(url, options);
    }

    if (PUBLIC_PATHS.some(p => urlStr.includes(p))) {
      return _originalFetch(url, options);
    }

    const token = localStorage.getItem('token') || '';
    const enhancedOptions = {
      ...options,
      credentials: 'include',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers, // preserve caller's headers (X-PIN-TOKEN etc.)
      }
    };

    let res = await _originalFetch(url, enhancedOptions);

    if (res.status === 401) {
      console.warn('[FetchInterceptor] 401 on', urlStr, '— attempting silent refresh');

      try {
        const refreshRes = await _originalFetch('https://api.flexgig.com.ng/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        });

        if (!refreshRes.ok) {
          console.error('[FetchInterceptor] Refresh failed — session expired');
          handleSessionExpired();
          return res; // return original 401 response
        }

        const refreshData = await refreshRes.json();

        if (refreshData.token) {
          localStorage.setItem('token', refreshData.token);
          window.__ACCESS_TOKEN__ = refreshData.token;
          scheduleTokenRefresh(refreshData.token);
          console.log('[FetchInterceptor] ✅ Token refreshed — retrying original request');

          return _originalFetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${refreshData.token}`,
              ...options.headers,
            }
          });
        }

      } catch (err) {
        console.warn('[FetchInterceptor] Refresh network error:', err.message);
      }
    }

    return res;
  };

  console.log('[FetchInterceptor] ✅ Global fetch interceptor active');
})();



const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000; // Refresh when 2 min left
let _refreshTimer = null;
let _isRefreshing = false;

function getTokenExpiryMs(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch (e) {
    return null;
  }
}

function scheduleTokenRefresh(token) {
  if (_refreshTimer) clearTimeout(_refreshTimer);

  const expiryMs = getTokenExpiryMs(token);
  if (!expiryMs) return;

  const now = Date.now();
  const msUntilExpiry = expiryMs - now;
  const msUntilRefresh = msUntilExpiry - TOKEN_REFRESH_THRESHOLD_MS;

  if (msUntilRefresh <= 0) {
    console.log('[TokenRefresh] Token near/past expiry — refreshing now');
    silentRefreshToken();
    return;
  }

  console.log(`[TokenRefresh] Scheduled refresh in ${Math.round(msUntilRefresh / 1000)}s`);

  _refreshTimer = setTimeout(() => {
    silentRefreshToken();
  }, msUntilRefresh);
}

async function silentRefreshToken() {
  if (_isRefreshing) return; // Prevent double refresh
  _isRefreshing = true;

  try {
    console.log('[TokenRefresh] Silently refreshing token...');

    const res = await fetch('https://api.flexgig.com.ng/auth/refresh', {
      method: 'POST',
      credentials: 'include', 
    });

    if (!res.ok) {
      console.warn('[TokenRefresh] Refresh failed with status:', res.status);

      if (res.status === 401) {
        console.error('[TokenRefresh] Refresh token expired — logging out');
        handleSessionExpired();
      }
      return;
    }

    const data = await res.json();

    if (data.token) {
      localStorage.setItem('token', data.token);
      window.__ACCESS_TOKEN__ = data.token;
      console.log('[TokenRefresh] ✅ Token refreshed silently');
      scheduleTokenRefresh(data.token); // Schedule next refresh
    }

  } catch (err) {
    console.warn('[TokenRefresh] Network error during refresh, retrying in 30s:', err.message);
    _refreshTimer = setTimeout(silentRefreshToken, 30000);
  } finally {
    _isRefreshing = false;
  }
}


async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token') || '';

  const makeRequest = (t) => fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { 'Authorization': `Bearer ${t}` } : {}),
      ...(options.headers || {})
    }
  });

  let res = await makeRequest(token);

  if (res.status === 401) {
    console.warn('[authFetch] 401 received — attempting silent refresh before retry');
    await silentRefreshToken();

    const newToken = localStorage.getItem('token') || '';
    if (!newToken || newToken === token) {
      handleSessionExpired();
      throw new Error('Session expired. Please log in again.');
    }

    res = await makeRequest(newToken);

    if (res.status === 401) {
      handleSessionExpired();
      throw new Error('Session expired. Please log in again.');
    }
  }

  return res;
}

function handleSessionExpired() {
  console.error('[Auth] Session expired — redirecting to login');
  clearTimeout(_refreshTimer);
  localStorage.removeItem('token');

  if (typeof showToast === 'function') {
    showToast('Your session has expired. Please log in again.', 'error');
  }

  setTimeout(() => {
    window.location.href = '/';
  }, 1500);
}


(function initTokenRefresh() {
  // If a logout just happened, don't seed stale token
  if (sessionStorage.getItem('fg_just_logged_out')) {
    sessionStorage.removeItem('fg_just_logged_out');
    localStorage.removeItem('token');
    return;
  }

  const token = localStorage.getItem('token');
  if (token) {
    scheduleTokenRefresh(token);
    console.log('[TokenRefresh] Refresh cycle started');
  } else {
    fetch('https://api.flexgig.com.ng/api/session', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          window.__ACCESS_TOKEN__ = data.token;
          scheduleTokenRefresh(data.token);
          console.log('[TokenRefresh] Token seeded from session, refresh cycle started');
        }
      })
      .catch(() => console.warn('[TokenRefresh] Could not seed token from session'));
  }
})();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const token = localStorage.getItem('token');
    if (!token) return;

    const expiryMs = getTokenExpiryMs(token);
    if (!expiryMs) return;

    const msLeft = expiryMs - Date.now();
    if (msLeft < TOKEN_REFRESH_THRESHOLD_MS) {
      console.log('[TokenRefresh] Tab focused — token near expiry, refreshing');
      silentRefreshToken();
    }
  }
});

window.authFetch = authFetch;
window.silentRefreshToken = silentRefreshToken;
window.scheduleTokenRefresh = scheduleTokenRefresh;



let balanceRealtimeChannel = null;
let isSubscribing = false;
let activeRetryTimer = null;
let lastHealthyTs = 0;
const SUBSCRIPTION_RETRY_MS = 15000;
const HEALTHY_THRESHOLD_MS = 5000;

async function subscribeToWalletBalance(force = false) {
  const now = Date.now();
  console.log(`[Wallet Realtime] subscribeToWalletBalance called | force=${force}`);

  if (isSubscribing) return;
  if (!force && now - lastHealthyTs < HEALTHY_THRESHOLD_MS) return;

  if (balanceRealtimeChannel) {
    try {
      const authClient = await getSharedAuthClient(false);
      if (authClient) await authClient.removeChannel(balanceRealtimeChannel);
    } catch (e) {
      console.warn('[Wallet Realtime] Failed to remove old channel:', e?.message);
    }
    balanceRealtimeChannel = null;
    window.__balanceRealtimeChannel = null;
  }

  isSubscribing = true;

  try {
    const uid =
      window.__USER_UID ||
      localStorage.getItem('userId') ||
      JSON.parse(localStorage.getItem('userData') || '{}')?.uid ||
      (await getSession())?.user?.uid ||
      null;

    if (!uid || !uid.includes('-')) {
      console.error('[Wallet Realtime] Invalid UID — aborting');
      return;
    }

    const authClient = await getSharedAuthClient(force);
    if (!authClient) {
      console.error('[Wallet Realtime] No authenticated client');
      scheduleRetry();
      return;
    }

    const { data: testRow, error: testErr } = await authClient
      .from('user_wallets')
      .select('balance, user_uid')
      .eq('user_uid', uid)
      .maybeSingle();

    if (testErr) {
      console.error('[Wallet Realtime] RLS test failed:', testErr.message);
    } else {
      console.log('[Wallet Realtime] RLS OK — current balance:', testRow?.balance);
    }

    balanceRealtimeChannel = authClient.channel(`wallet:${uid}`);

    balanceRealtimeChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_uid=eq.${uid}`
        },
        (payload) => {
          console.log('[Wallet Realtime] 🔔 EVENT:', payload.eventType, payload.new);

          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newBalance = Number(payload.new?.balance);
            const oldBalance = Number(payload.old?.balance) || window.currentDisplayedBalance || 0;

            if (!isNaN(newBalance)) {
              const amount = newBalance - oldBalance;
              console.log(`[Wallet Realtime] Balance: ${oldBalance} → ${newBalance} (${amount > 0 ? '+' : ''}${amount})`);

              const updateData = {
                type: 'balance_update',
                balance: newBalance,
                amount,
                source: 'postgres_changes',
                timestamp: Date.now()
              };

              if (typeof window.__handleBalanceUpdate === 'function') {
                window.__handleBalanceUpdate(updateData);
              }
              if (typeof window.updateAllBalances === 'function') {
                window.updateAllBalances(newBalance);
              }
              if (typeof window.handleNewBalance === 'function') {
                window.handleNewBalance(newBalance, 'supabase-postgres');
              }

              window.dispatchEvent(new CustomEvent('balance_update', { detail: updateData }));
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[Wallet Realtime] STATUS:', status);
        if (err) console.error('[Wallet Realtime] ERROR:', err?.message || err);

        if (status === 'SUBSCRIBED') {
          console.log('[Wallet Realtime] ✅ SUBSCRIBED & LISTENING');
          lastHealthyTs = Date.now();
          if (activeRetryTimer) clearTimeout(activeRetryTimer);
        } else if (['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) {
          console.warn('[Wallet Realtime] Channel lost:', status);
          scheduleRetry();
        }
      });

    window.__balanceRealtimeChannel = balanceRealtimeChannel;

  } catch (err) {
    console.error('[Wallet Realtime] CRASH:', err);
    scheduleRetry();
  } finally {
    isSubscribing = false;
  }
}



window.subscribeToWalletBalance = subscribeToWalletBalance;



const REAUTH_TTL_MINUTES = 60;


let reauthClient = null;
let reauthClientExpiry = 0;

async function getReauthClient(forceRefresh = false) {
  const now = Date.now();

  if (reauthClient && now < reauthClientExpiry && !forceRefresh) {
    console.log('[REAUTH] Reusing existing client');
    return reauthClient;
  }

  console.log('[REAUTH] Fetching/refreshing token...');
  const token = await getSharedJWT(forceRefresh);
  if (!token) {
    console.error('[REAUTH] No JWT available');
    return null;
  }

  if (!reauthClient) {
    console.log('[REAUTH] Creating new client (singleton)...');
    reauthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: 'flexgig_reauth_jwt_v1'
      }
    });
  } else {
    console.log('[REAUTH] Reusing client, refreshing session...');
  }

  const { error } = await reauthClient.auth.setSession({
    access_token: token,
    refresh_token: token
  });

  if (error) {
    console.error('[REAUTH] setSession failed:', error);
    return null;
  }

  reauthClientExpiry = now + (50 * 60 * 1000);
  console.log('[REAUTH] ✅ Client ready and cached');
  return reauthClient;
}


async function requireReauthLock(reason = 'soft_idle_timeout') {
  console.log('[REAUTH] requireReauthLock →', reason);

  const uid =
    window.__USER_UID ||
    localStorage.getItem('userId') ||
    JSON.parse(localStorage.getItem('userData') || '{}')?.uid;

  if (!uid || !uid.includes('-')) {
    console.error('[REAUTH] Invalid UID:', uid);
    return false;
  }

  const authClient = await getReauthClient();

  if (authClient?.__locked) {
    console.warn('[REAUTH] Lock already active (backend)');
    return true;
  }

  if (!authClient) return false;

  const expiresAt = new Date(
    Date.now() + REAUTH_TTL_MINUTES * 60 * 1000
  ).toISOString();

  const { error } = await authClient
    .from('reauth_locks')
    .upsert({
      user_uid: uid,
      reason,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      metadata: { triggered_by: 'client_idle' }
    }, { onConflict: 'user_uid' });

  if (error) {
    console.error('[REAUTH] Supabase upsert failed:', error);
    return false;
  }

  localStorage.setItem('fg_reauth_required_v1', JSON.stringify({
    reason,
    expiresAt,
    ts: Date.now()
  }));

  return true;
}


async function checkReauthLock() {
  console.log('[REAUTH] checkReauthLock called');

  const uid =
    window.__USER_UID ||
    localStorage.getItem('userId') ||
    JSON.parse(localStorage.getItem('userData') || '{}')?.uid;

  if (!uid) {
    return { required: false };
  }

  let authClient;
  try {
    authClient = await getReauthClient();
  } catch (e) {
    console.warn('[REAUTH] getReauthClient threw:', e);
  }

  if (authClient && authClient.__locked) {
    console.warn('[REAUTH] Active lock detected via backend (423)');

    localStorage.setItem('fg_reauth_required_v1', JSON.stringify({
      reason: 'backend_423',
      ts: Date.now()
    }));

    return { required: true, reason: 'backend_423' };
  }

  if (!authClient) {
    console.warn('[REAUTH] No auth client — treating as locked (fail-safe)');
    return { required: true, reason: 'unknown_auth_state' };
  }

  const { data, error } = await authClient
    .from('reauth_locks')
    .select('reason, expires_at')
    .eq('user_uid', uid)
    .maybeSingle();

  if (!data || error) {
    localStorage.removeItem('fg_reauth_required_v1');
    return { required: false };
  }

  const expires = new Date(data.expires_at);
  if (Date.now() > expires.getTime()) {
    await authClient.from('reauth_locks').delete().eq('user_uid', uid);
    localStorage.removeItem('fg_reauth_required_v1');
    return { required: false };
  }

  localStorage.setItem('fg_reauth_required_v1', JSON.stringify({
    reason: data.reason,
    expiresAt: data.expires_at,
    ts: Date.now()
  }));

  return {
    required: true,
    reason: data.reason,
    expiresAt: data.expires_at
  };
}



async function clearReauthLock() {
  console.log('[REAUTH] clearReauthLock called');

  try {
    const uid = window.__USER_UID || 
                localStorage.getItem('userId') || 
                JSON.parse(localStorage.getItem('userData') || '{}')?.uid;

    if (!uid) return false;

    const authClient = await getReauthClient();
    if (!authClient) {
      return false;
    }

    const { error } = await authClient
      .from('reauth_locks')
      .delete()
      .eq('user_uid', uid);

    if (error) {
      console.error('[REAUTH] clear error:', error);
      return false;
    }

    localStorage.removeItem('fg_reauth_required_v1');
    _jwtBlockedByLock = false; // ✅ re-enable JWT fetching after successful reauth
    console.log('[REAUTH] Lock cleared for uid:', uid);
    return true;
  } catch (err) {
    console.error('[REAUTH] clear crashed:', err);
    return false;
  }
}



function scheduleRetry() {
  if (activeRetryTimer) {
    console.debug('[Wallet Realtime] Retry already scheduled — skipping duplicate');
    return;
  }

  console.log(
    `[Wallet Realtime] Scheduling retry in ${SUBSCRIPTION_RETRY_MS}ms`
  );

  activeRetryTimer = setTimeout(() => {
    activeRetryTimer = null;

    console.log('[Wallet Realtime] Executing scheduled retry');

    subscribeToWalletBalance(true);
  }, SUBSCRIPTION_RETRY_MS);
}

if (typeof onDashboardLoad === 'function') {
  const original = onDashboardLoad;
  onDashboardLoad = async function (...args) {
    console.log('[Dashboard DEBUG] onDashboardLoad called');
    await original(...args);

    setupBroadcastRealtime();
    pollStatus(true);
    subscribeToWalletBalance();   // ← Only this call — function handles its own retries now
  };
} else {
  console.warn('[BROADCAST] No onDashboardLoad – running standalone');
  setupBroadcastRealtime();
  pollStatus(true);
  subscribeToWalletBalance();
}



setInterval(async () => {
  console.log('[Shared Auth Client] Auto-refreshing JWT and client...');
  await getSharedAuthClient(true);
}, 30 * 60 * 1000);


    function saveCurrentAppState() {
  const state = {
    

    phoneNumber: document.getElementById('phone-input')?.value || '',


    selectedProvider: document.querySelector('.provider-box.active')?.className.match(/mtn|airtel|glo|ninemobile/)?.[0] || 'mtn',
    selectedPlanId: document.querySelector('.plan-box.selected')?.getAttribute('data-id') || '',



    timestamp: Date.now(),
    version: APP_VERSION || '1.0.0'
  };

  sessionStorage.setItem('__fg_app_state_v2', JSON.stringify(state));
  history.replaceState(state, '', location.href);

  console.log('[StateSaver] UI state saved → openModal:', state.openModal, state);
}
window.saveCurrentAppState = saveCurrentAppState;


(function () {
  'use strict';

  function getUserState() {
    try {
      const raw = localStorage.getItem('userState');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('[getUserState] Invalid userState JSON', e);
      return {};
    }
  }

  window.getUserState = window.getUserState || getUserState;
})();


const BIOMETRIC_TTL = 60_000; // safe short-lived TTL (~1 min)
const CACHE_KEY = '__cachedAuthOptions';

async function warmBiometricOptions(userId, context = 'reauth', options = {}) {
  const now = Date.now();

  let cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {}

  if (
  !options.force &&
  cached &&
  now - cached.fetchedAt < BIOMETRIC_TTL
) {
  console.log('[biometric] Using cached options from localStorage');

  const opts = cached.opts;
  try {
    if (opts && Array.isArray(opts.allowCredentials)) {
      opts.allowCredentials = opts.allowCredentials.map(c => {
        if (!c || !c.id) return c;
        if (c.id instanceof Uint8Array || c.id instanceof ArrayBuffer) return c;
        if (typeof c.id === 'string') {
          try {
            const pad = (4 - (c.id.length % 4)) % 4;
            const b64 = c.id.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
            const bin = atob(b64);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            return { ...c, id: buf };
          } catch (e) { return c; }
        }
        if (typeof c.id === 'object') {
          try {
            const keys = Object.keys(c.id);
            const max = keys.reduce((m, k) => Math.max(m, parseInt(k, 10)), -1);
            if (max >= 0) {
              const buf = new Uint8Array(max + 1);
              for (let i = 0; i <= max; i++) buf[i] = (c.id[i] ?? 0) & 0xff;
              return { ...c, id: buf };
            }
          } catch (e) { return c; }
        }
        return c;
      });
    }
  } catch (e) {
    console.warn('[biometric] allowCredentials rehydration failed', e);
  }

  window.__cachedAuthOptions = opts;
  window.__cachedAuthOptionsFetchedAt = cached.fetchedAt;
  return opts;
}

  const credentialId =
    localStorage.getItem('credentialId') ||
    localStorage.getItem('webauthn-cred-id');

  if (!credentialId) {
    console.warn('[biometric] Cannot warm — no stored credential ID');
    return null;
  }

  try {
    const res = await fetch(`${window.__SEC_API_BASE}/webauthn/auth/options`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credentialId, context })
    });

    if (!res.ok) throw new Error('Biometric warmup failed');

    const opts = await res.json();

    window.__cachedAuthOptions = opts;
window.__cachedAuthOptionsFetchedAt = Date.now();
localStorage.setItem(CACHE_KEY, JSON.stringify({
  opts,
  fetchedAt: Date.now()
}));

try {
  if (opts?.challenge) {
    const raw = localStorage.getItem('__bioChallengeHistory');
    const hist = raw ? JSON.parse(raw) : [];
    const updated = [opts.challenge, ...hist.filter(c => c !== opts.challenge)].slice(0, 5);
    localStorage.setItem('__bioChallengeHistory', JSON.stringify(updated));
    console.log('[biometric] Challenge history updated, depth:', updated.length);
  }
} catch (e) {}

    console.log('[biometric] Options warmed for user', userId);
    return opts;
  } catch (err) {
    console.error('[biometric] Warm failed', err);
    return null;
  }
}

window.warmBiometricOptions = window.warmBiometricOptions || warmBiometricOptions;
let biometricRewarmInterval = null;

const checkoutModal = document.getElementById('checkoutModal');

function startModalBiometricRewarming() {
  if (biometricRewarmInterval) clearInterval(biometricRewarmInterval);

  let uid = null;
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      uid = parsed.uid || parsed.user?.id || parsed.user?.uid;
    }
  } catch (e) {}

  if (!uid) {
    console.warn('[modal-rewarm] No user ID found — cannot start rewarming');
    return;
  }

  console.log('%c[modal-rewarm] Starting continuous rewarming for checkout modal', 'color:#0b0;font-weight:bold');

  const rewarm = async () => {
    try {
      window.__cachedAuthOptions = null;
      localStorage.removeItem('__cachedAuthOptions');

      const opts = await warmBiometricOptions(uid, 'reauth', { force: true });
      if (!opts) return;

      if (window.__cachedAuthOptions) {
        if (!(window.__cachedAuthOptions.challenge instanceof Uint8Array)) {
          const buf = fromBase64Url(window.__cachedAuthOptions.challenge);
          if (buf instanceof ArrayBuffer && buf.byteLength > 0) {
            window.__cachedAuthOptions.challenge = new Uint8Array(buf);
          }
        }

        if (Array.isArray(window.__cachedAuthOptions.allowCredentials)) {
          window.__cachedAuthOptions.allowCredentials = window.__cachedAuthOptions.allowCredentials
            .map(c => {
              if (!c.id) return null;
              if (!(c.id instanceof Uint8Array)) {
                const buf = fromBase64Url(c.id);
                return buf instanceof ArrayBuffer && buf.byteLength > 0
                  ? { ...c, id: new Uint8Array(buf) }
                  : null;
              }
              return c;
            })
            .filter(Boolean);
        }
      }

      console.log('[modal-rewarm] Fresh options ready');
    } catch (err) {
      console.error('[modal-rewarm] Failed', err);
    }
  };

rewarm();

biometricRewarmInterval = setInterval(async () => {
  if (window.__biometricInFlight) {
    console.log('[modal-rewarm] Skipped (biometric in flight)');
    return;
  }

  await rewarm();
}, 30_000);
}

function stopModalBiometricRewarming() {
  if (biometricRewarmInterval) {
    clearInterval(biometricRewarmInterval);
    biometricRewarmInterval = null;
    console.log('[modal-rewarm] Stopped — modal closed');
  }
}

if (checkoutModal) {
  const observer = new MutationObserver(() => {
    const isHidden = checkoutModal.getAttribute('aria-hidden') === 'true';
    const isDisplayed = window.getComputedStyle(checkoutModal).display !== 'none';

    if (!isHidden && isDisplayed) {
      startModalBiometricRewarming();
    } else {
      stopModalBiometricRewarming();
    }
  });

  observer.observe(checkoutModal, {
    attributes: true,
    attributeFilter: ['aria-hidden', 'style', 'class']
  });

  if (checkoutModal.getAttribute('aria-hidden') !== 'true' &&
      window.getComputedStyle(checkoutModal).display !== 'none') {
    startModalBiometricRewarming();
  }
}

checkoutModal?.querySelector('.close-btn')?.addEventListener('click', stopModalBiometricRewarming);



const DEBUG_MODE = false; // ← Change to false to hide completely

(function () {
  if (!DEBUG_MODE) {
    window.mobileLog = () => {}; // No-op function
    console.log('[Debug] Console disabled (DEBUG_MODE = false)');
    return;
  }

  if (window.mobileConsoleLoaded) {
    const existing = document.getElementById('mobileConsole');
    const existingBtn = document.getElementById('toggleBtn');
    if (existing && existingBtn) {
      const isHidden = existing.style.display === 'none';
      existing.style.display = isHidden ? 'flex' : 'none';
      existingBtn.textContent = isHidden ? '✖️' : '🔧';
      return;
    }
    existing?.remove();
    existingBtn?.remove();
    delete window.mobileConsoleLoaded;
  }
  window.mobileConsoleLoaded = true;

  const style = document.createElement('style');
  style.textContent = `
    #mobileConsole{position:fixed;inset:0;display:none;flex-direction:column;background:#000;color:#0f0;z-index:2147483640;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #consoleHeader{background:#1a1a1a;padding:12px;border-bottom:2px solid #0f0;display:flex;justify-content:space-between;align-items:center;z-index:2147483642}
    #consoleHeader h3{font-size:16px;color:#0f0;margin:0}
    #clearBtn{background:#ff0000;color:white;border:none;padding:8px 16px;border-radius:6px;font-weight:bold;font-size:12px;cursor:pointer}
    #logOutput{flex:1;overflow-y:auto;padding:10px;font-family:'Courier New',monospace;font-size:11px;line-height:1.5;z-index:2147483641}
    .log-entry{margin:4px 0;padding:6px;border-left:3px solid;background:rgba(255,255,255,0.03);word-wrap:break-word;word-break:break-word;font-size:11px}
    .log-entry pre{margin:4px 0;padding:4px;background:rgba(255,255,255,0.05);border-radius:4px;overflow-x:auto;font-size:10px}
    .log-info{border-color:#0f0;color:#0f0}
    .log-warn{border-color:#ff0;color:#ff0}
    .log-error{border-color:#f00;color:#f00}
    .log-success{border-color:#0ff;color:#0ff}
    .log-ws{border-color:#f0f;color:#f0f}
    .log-timestamp{color:#888;font-size:10px;margin-right:8px}
    #commandPanel{background:#1a1a1a;border-top:2px solid #0f0;padding:12px;z-index:2147483642}
    #commandInput{width:100%;background:#000;color:#0f0;border:1px solid #0f0;padding:10px;font-family:'Courier New',monospace;font-size:13px;border-radius:6px;margin-bottom:10px}
    #quickCommands{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .cmd-btn{background:#0f0;color:#000;border:none;padding:10px;border-radius:6px;font-weight:bold;font-size:11px;cursor:pointer;text-align:center}
    .cmd-btn:active{background:#0c0;transform:scale(0.98)}
    #toggleBtn{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#0f0;color:#000;border:none;font-size:24px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,255,0,0.5);cursor:pointer;font-weight:bold}
    #toggleBtn:active{transform:scale(0.95)}
  `;
  document.head.appendChild(style);

  document.body.insertAdjacentHTML('beforeend', `
    <button id="toggleBtn" aria-label="Toggle Debug Console">🔧</button>
    <div id="mobileConsole">
      <div id="consoleHeader">
        <h3>🔧 Dev Console</h3>
        <button id="clearBtn">Clear</button>
      </div>
      <div id="logOutput"></div>
      <div id="commandPanel">
        <input type="text" id="commandInput" placeholder="Type command + Enter" autocomplete="off" autocorrect="off" autocapitalize="off">
        <div id="quickCommands">
          <button class="cmd-btn" data-cmd="checkPolling()">Polling</button>
          <button class="cmd-btn" data-cmd="checkWebSocket()">WebSocket</button>
          <button class="cmd-btn" data-cmd="testBalance()">Balance</button>
          <button class="cmd-btn" data-cmd="forceSync()">Sync</button>
          <button class="cmd-btn" data-cmd="getUserId()">User ID</button>
          <button class="cmd-btn" data-cmd="checkModal()">Modal</button>
          <button class="cmd-btn" data-cmd="testPayment()">Test Pay</button>
          <button class="cmd-btn" data-cmd="showStatus()">Status</button>
        </div>
      </div>
    </div>
  `);

  const consoleEl = document.getElementById('mobileConsole');
  const logOutput = document.getElementById('logOutput');
  const toggleBtn = document.getElementById('toggleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const commandInput = document.getElementById('commandInput');
  const quickCommands = document.getElementById('quickCommands');

  function log(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3});
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    
    let formatted = '';
    if (typeof msg === 'object' && msg !== null) {
      try {
        if (msg instanceof Error) {
          formatted = `❌ ${msg.name}: ${msg.message}\n${msg.stack || ''}`;
        } else if (Array.isArray(msg)) {
          formatted = `Array(${msg.length}) ${JSON.stringify(msg, null, 2)}`;
        } else {
          formatted = JSON.stringify(msg, null, 2);
        }
        formatted = `<pre>${formatted}</pre>`;
      } catch (e) {
        formatted = String(msg);
      }
    } else {
      formatted = String(msg);
    }
    
    div.innerHTML = `<span class="log-timestamp">[${ts}]</span>${formatted}`;
    logOutput.appendChild(div);
    logOutput.scrollTop = logOutput.scrollHeight;
    
    console.log(`[MobileConsole ${type.toUpperCase()}]`, msg);
  }
  
  window.mobileLog = log;

  toggleBtn.onclick = () => {
    const isVisible = consoleEl.style.display !== 'none';
    consoleEl.style.display = isVisible ? 'none' : 'flex';
    toggleBtn.textContent = isVisible ? '🔧' : '✖️';
    if (!isVisible) {
      setTimeout(() => commandInput.focus(), 100);
    }
  };

  clearBtn.onclick = () => { 
    logOutput.innerHTML = ''; 
    log('Console cleared', 'success'); 
  };

  function execute(cmd) {
    log(`> ${cmd}`, 'info');
    try {
      const result = eval(cmd);
      if (result !== undefined && result !== null) {
        if (result instanceof Promise) {
          result
            .then(r => {
              if (r !== undefined) log(r, 'success');
            })
            .catch(e => log(e, 'error'));
        } else {
          log(result, 'success');
        }
      }
    } catch (e) {
      log(e, 'error');
    }
  }

  commandInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = commandInput.value.trim();
      if (cmd) {
        execute(cmd);
        commandInput.value = '';
      }
    }
  });

  quickCommands.addEventListener('click', e => {
    const btn = e.target.closest('.cmd-btn');
    if (btn) execute(btn.dataset.cmd);
  });

  function getApiBase() {
    return window.__SEC_API_BASE || 'https://api.flexgig.com.ng' || window.location.origin;
  }

  function safeGetUserId() {
    try {
      return window.__USER_UID || (localStorage && localStorage.getItem('userId')) || null;
    } catch (e) {
      return null;
    }
  }

  
  window.checkPolling = () => {
    log('🔍 Checking polling...', 'ws');
    const api = getApiBase();
    log(`API: ${api}`, 'info');
    
    fetch(`${api}/api/session?light=true&t=${Date.now()}`, {
      credentials: 'include', 
      cache: 'no-store'
    })
      .then(r => {
        log(`Status: ${r.status} ${r.statusText}`, r.ok ? 'success' : 'error');
        return r.json();
      })
      .then(j => {
        const bal = j.user?.wallet_balance;
        log(`Balance: ₦${bal !== undefined ? bal.toLocaleString() : 'N/A'}`, 'success');
        log(`Seq: ${j.wallet_seq || 'N/A'}`, 'info');
        return j;
      })
      .catch(e => log(e, 'error'));
  };

  window.checkWebSocket = () => {
    log('🔍 Checking WebSocket...', 'ws');
    const uid = safeGetUserId();
    
    if (!uid) {
      log('❌ No user ID found', 'error');
      return;
    }

    log(`User ID: ${uid}`, 'success');
    log('Connecting...', 'ws');
    
    let ws;
    try {
      ws = new WebSocket('wss://api.flexgig.com.ng/ws/wallet');
    } catch (e) {
      log(e, 'error');
      return;
    }

    ws.onopen = () => {
      log('✅ WebSocket CONNECTED!', 'success');
      const msg = JSON.stringify({type: 'subscribe', user_uid: uid});
      ws.send(msg);
      log(`📤 Sent: ${msg}`, 'ws');
    };
    
    ws.onmessage = e => {
      log(`📨 Message: ${e.data}`, 'ws');
      try {
        const data = JSON.parse(e.data);
        log(data, 'success');
      } catch {}
    };
    
    ws.onerror = e => log(`❌ WS Error: ${e.type}`, 'error');
    
    ws.onclose = e => {
      log(`🔌 WS Closed: code=${e.code}, clean=${e.wasClean}`, e.wasClean ? 'warn' : 'error');
    };
    
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        log('Closing test connection...', 'info');
        ws.close();
      }
    }, 10000);
  };

  window.testBalance = async () => {
    log('🧪 Testing balance fetch...', 'ws');
    const api = getApiBase();
    
    try {
      const r = await fetch(`${api}/api/session?light=true&t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      
      log(`Status: ${r.status}`, r.ok ? 'success' : 'error');
      
      if (!r.ok) {
        const text = await r.text();
        log(`Response: ${text.substring(0, 200)}`, 'error');
        return;
      }
      
      const j = await r.json();
      const bal = j.user?.wallet_balance;
      
      log(`✅ Balance: ₦${bal !== undefined ? bal.toLocaleString() : 'N/A'}`, 'success');
      log(`Seq: ${j.wallet_seq || 'N/A'}`, 'info');
      log(`User: ${j.user?.username || 'N/A'}`, 'info');
      
      return j;
    } catch (e) { 
      log(e, 'error'); 
    }
  };

  window.forceSync = async () => {
    log('🔄 Force syncing...', 'ws');
    const api = getApiBase();
    
    try {
      const r = await fetch(`${api}/api/session?light=true&t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!r.ok) {
        log(`❌ Sync failed: ${r.status}`, 'error');
        return;
      }
      
      const j = await r.json();
      const bal = j.user?.wallet_balance;
      
      log(`✅ Synced: ₦${bal !== undefined ? bal.toLocaleString() : 'N/A'}`, 'success');
      
      if (typeof handleNewBalance === 'function') {
        handleNewBalance(bal, 'dev-console');
        log('✅ Called handleNewBalance', 'success');
      } else if (typeof window.handleNewBalance === 'function') {
        window.handleNewBalance(bal, 'dev-console');
        log('✅ Called window.handleNewBalance', 'success');
      } else {
        log('⚠️ handleNewBalance not found', 'warn');
      }
      
      return j;
    } catch (e) { 
      log(e, 'error'); 
    }
  };

  window.getUserId = () => {
    const uid = safeGetUserId();
    log(`User ID: ${uid || 'NOT FOUND'}`, uid ? 'success' : 'error');
    
    if (!uid) {
      log('Checking localStorage...', 'info');
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes('user') || key.includes('id')) {
            keys.push(`${key}: ${localStorage.getItem(key).substring(0, 50)}`);
          }
        }
        if (keys.length) log(keys, 'info');
      } catch (e) {
        log('Cannot access localStorage', 'warn');
      }
    }
    
    return uid;
  };

  window.checkModal = () => {
    log('🔍 Checking modal...', 'info');
    const m = document.getElementById('addMoneyModal');
    
    if (!m) {
      log('❌ Modal element not found', 'error');
      return;
    }
    
    log('✅ Modal exists', 'success');
    const style = getComputedStyle(m);
    const result = {
      exists: true,
      visible: style.display !== 'none',
      display: style.display,
      transform: m.style.transform || 'none',
      classes: m.className
    };
    log(result, 'info');
    return result;
  };

  window.testPayment = () => {
    log('🧪 Simulating payment...', 'ws');
    
    const testData = {
      type: 'balance_update', 
      balance: 50000, 
      amount: 5000, 
      seq: Date.now()
    };
    
    log(testData, 'info');
    
    if (window.__handleBalanceUpdate) {
      log('Calling __handleBalanceUpdate...', 'info');
      window.__handleBalanceUpdate(testData);
      log('✅ Handler called', 'success');
    } else {
      log('⚠️ __handleBalanceUpdate not found', 'warn');
    }
    
    log('Dispatching event...', 'info');
    window.dispatchEvent(new CustomEvent('balance_update', { detail: testData }));
    log('✅ Event dispatched', 'success');
  };

  window.showStatus = () => {
    log('📊 System Status:', 'ws');
    
    const status = {
      userId: safeGetUserId() || 'NOT FOUND',
      apiBase: getApiBase(),
      modal: !!document.getElementById('addMoneyModal'),
      balanceHandler: typeof window.__handleBalanceUpdate === 'function',
      notify: typeof window.notify === 'function',
      updateBalances: typeof window.updateAllBalances === 'function',
      playSound: typeof window.playSuccessSound === 'function',
      modalManager: typeof window.ModalManager !== 'undefined'
    };
    
    log(status, 'info');
    return status;
  };

  log('🚀 Mobile Dev Console Ready!', 'success');
  log('Tap 🔧 to toggle console', 'info');
  log(`Debug Mode: ${DEBUG_MODE ? 'ENABLED' : 'DISABLED'}`, 'info');

  window.addEventListener('error', e => {
    if (consoleEl.style.display === 'none') {
      consoleEl.style.display = 'flex';
      toggleBtn.textContent = '✖️';
    }
    log({
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error
    }, 'error');
  });

  setTimeout(() => {
    log('Running initial checks...', 'info');
    getUserId();
    checkModal();
  }, 1500);

})();


let __backHandler = null;
let reauthModal = null;
let promptModal = null;
let reauthModalOpen = false;

const REAUTH_GRACE_SECONDS = 20; // tune 15-30s as desired

function getLastPinReauthTs() {
  try { return Number(sessionStorage.getItem('lastPinReauthAt') || '0'); } catch (e) { return 0; }
}
function setLastPinReauthTs(ts = Date.now()) {
  try { sessionStorage.setItem('lastPinReauthAt', String(ts)); } catch (e) { /* ignore */ }
}
function inGraceWindow() {
  const ts = getLastPinReauthTs();
  return ts && (Date.now() - ts) < REAUTH_GRACE_SECONDS * 1000;
}

(function ensureFreshPlansOnLoad() {
  const CACHE_KEY = 'cached_data_plans_v14'; // Match your current version

  async function fetchAndCacheFreshPlans() {
    let freshPlans = null;
    let source = 'unknown';

    try {
      console.log('%c[PLANS] Fetching fresh plans on load...', 'color:cyan');

      const supabase = window.supabaseClient;
      
      if (supabase) {
        console.log('%c[PLANS] Attempting Supabase fetch...', 'color:cyan');
        
        try {
          const { data, error } = await supabase
            .from('data_plans')
            .select('*')
            .eq('active', true)
            .order('price', { ascending: true });

          if (error) {
            console.warn('[PLANS] Supabase fetch error:', error.message);
            throw error;
          }

          if (data && data.length > 0) {
            freshPlans = data;
            source = 'Supabase';
            console.log(`%c[PLANS] ✅ Fetched ${freshPlans.length} plans from Supabase`, 'color:lime;font-weight:bold');
          } else {
            console.warn('[PLANS] Supabase returned empty data, trying API...');
            throw new Error('Empty Supabase response');
          }
        } catch (supabaseErr) {
          console.warn('[PLANS] Supabase failed, falling back to API:', supabaseErr.message);
        }
      } else {
        console.warn('[PLANS] Supabase client not available, using API');
      }

      if (!freshPlans) {
        console.log('%c[PLANS] Attempting API fetch...', 'color:orange');
        
        const response = await fetch('https://api.flexgig.com.ng/api/dataPlans', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`API HTTP ${response.status}`);
        }

        freshPlans = await response.json();
        source = 'API';
        console.log(`%c[PLANS] ✅ Fetched ${freshPlans.length} plans from API`, 'color:lime;font-weight:bold');
      }

      if (freshPlans && freshPlans.length > 0) {
        const latestUpdate = freshPlans.reduce((max, p) => 
          p.updated_at && p.updated_at > max ? p.updated_at : max, ''
        );

        localStorage.setItem(CACHE_KEY, JSON.stringify({
          plans: freshPlans,
          updatedAt: latestUpdate,
          source: source,
          fetchedAt: new Date().toISOString()
        }));

        if (typeof plansCache !== 'undefined') plansCache = freshPlans;
        if (typeof cacheUpdatedAt !== 'undefined') cacheUpdatedAt = latestUpdate;

        console.log(`%c[PLANS] Cache updated with fresh data from ${source}`, 'color:lime');

        const activeProvider = ['mtn', 'airtel', 'glo', 'ninemobile'].find(p => 
          document.querySelector(`.provider-box.${p}.active`)
        );

        if (activeProvider && typeof renderDashboardPlans === 'function') {
          renderDashboardPlans(activeProvider);
          renderModalPlans(activeProvider);
          attachPlanListeners();
          console.log(`%c[PLANS] UI refreshed for ${activeProvider.toUpperCase()}`, 'color:lime');
        }
      }

    } catch (err) {
      console.error('[PLANS] All fetch methods failed, using cache:', err);
      
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log(`%c[PLANS] Using cached data (${parsed.plans?.length || 0} plans)`, 'color:yellow');
        }
      } catch (cacheErr) {
        console.error('[PLANS] Failed to load cache:', cacheErr);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndCacheFreshPlans);
  } else {
    fetchAndCacheFreshPlans();
  }


  console.log('🚀 Fresh plan fetch system active (Supabase → API → Cache)');
})();


async function renderDashboardCardsFromState({ preferServer = true } = {}) {
  const pinCard = document.getElementById('dashboardPinCard');
  const updateProfileCard = document.getElementById('dashboardUpdateProfileCard');

  if (!pinCard && !updateProfileCard) return;

  let hasPin = localStorage.getItem('hasPin') === 'true';
  let profileCompleted = localStorage.getItem('profileCompleted') === 'true';

  if (preferServer && typeof getSession === 'function') {
    try {
      const session = await getSession();
      if (session?.user) {
        hasPin = !!session.user.hasPin;
        profileCompleted = !!session.user.profileCompleted;

        localStorage.setItem('hasPin', hasPin);
        localStorage.setItem('profileCompleted', profileCompleted);
      }
    } catch (err) {
      console.warn("renderDashboardCardsFromState fallback to local flags", err);
    }
  }

  if (pinCard) {
  if (!hasPin) {
    pinCard.classList.add("js-ready");
    pinCard.classList.remove("pin-hidden");
  } else {
    pinCard.classList.add("pin-hidden");
    pinCard.classList.remove("js-ready");
  }
}

if (updateProfileCard) {
  if (!profileCompleted) {
    updateProfileCard.classList.add("js-ready");
    updateProfileCard.classList.remove("update-profile-hidden");
  } else {
    updateProfileCard.classList.add("update-profile-hidden");
    updateProfileCard.classList.remove("js-ready");
  }
}


  if (typeof manageDashboardCards === "function") {
    try { manageDashboardCards(); } catch (e) {}
  }
}





async function scheduleHardIdleCheck() {
  if (hardIdleTimeout) clearTimeout(hardIdleTimeout);

  const now = Date.now();
  const last = Number(localStorage.getItem('lastActive') || now);
  const remaining = HARD_IDLE_MS - (now - last);

  hardIdleTimeout = setTimeout(async () => {
    console.log('🔥 [HARD IDLE] Timeout triggered - checking reauth status');
    
    const localCheck = shouldReauthLocal('reauth');
    if (localCheck.needsReauth) {
      try { 
        console.log('🔒 [HARD IDLE] Local check: Reauth required - showing modal');
        await showReauthModal({ context: 'reauth', reason: 'hard-idle' }); 
      } catch(e) { 
        console.error('[hardIdle] showReauthModal failed', e); 
      }
    } else {
      try {
        console.log('🔒 [HARD IDLE] Local check passed - verifying with server');
        const serverCheck = await checkServerReauthStatus();
        if (serverCheck && (serverCheck.needsReauth || serverCheck.reauthRequired)) {
          console.log('🔒 [HARD IDLE] Server check: Reauth required - showing modal');
          await showReauthModal({ context: 'reauth', reason: 'hard-idle' });
        } else {
          console.log('✅ [HARD IDLE] Server check passed - no reauth needed');
        }
      } catch(e) { 
        console.warn('[hardIdle] server reauth check failed', e); 
      }
    }
  }, remaining > 0 ? remaining : 0);
}

async function guardedHideReauthModal() {
  try {

    function _isCanonicalPending() {
      try { return !!JSON.parse(localStorage.getItem('fg_reauth_required_v1') || 'null'); } catch (e) { return false; }
    }

    if (!_isCanonicalPending()) {
      try {
        if (reauthModal) {
          reauthModal.classList.add('hidden');
          try { reauthModal.removeAttribute('aria-modal'); } catch (e) {}
          try { reauthModal.removeAttribute('role'); } catch (e) {}
          if ('inert' in HTMLElement.prototype) {
            try { reauthModal.inert = false; } catch (e) {}
          } else {
            try { reauthModal.removeAttribute('aria-hidden'); reauthModal.style.pointerEvents = ''; } catch (e) {}
          }
        }
        const _pm = (typeof document !== 'undefined') ? document.getElementById('promptModal') : null;
        if (_pm) {
          try {
            _pm.classList.add('hidden');
            _pm.removeAttribute('aria-hidden');
            _pm.style.pointerEvents = '';
          } catch (e) {}
        }

        reauthModalOpen = false;
        try { setReauthActive(false); } catch(e) {}
        try { localStorage.removeItem('fg_reauth_active_tab'); } catch(e) {}
      } catch (e) {
        console.warn('[reauth] guardedHideReauthModal UI hide error', e);
      }
    } else {
      console.debug('[reauth] guardedHideReauthModal: canonical flag still present; skipping hide');
    }
  } catch (err) {
    console.warn('[reauth] guardedHideReauthModal unexpected error', err);
    try { setReauthActive(false); } catch(e){}
  }
}

async function fullClientLogout() {
  try {
    console.log('[fullClientLogout] Starting complete logout process...');

    try {
      const res = await fetch(`${BACKEND_URL}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        console.warn('[fullClientLogout] Server logout failed, proceeding with client cleanup anyway');
      } else {
        const data = await res.json();
        console.log('[fullClientLogout] Server logout response:', data);
      }
    } catch (fetchErr) {
      console.error('[fullClientLogout] Server logout request failed:', fetchErr);
    }

    try {
      localStorage.clear();
      sessionStorage.clear();
      
      window.currentUser = null;
      window.currentEmail = null;
      window.__rp_reset_token = null;
      window.__SERVER_USER_DATA__ = null; // Clear server-embedded data
      
      console.log('[fullClientLogout] Cleared storage and global state');
    } catch (storageErr) {
      console.error('[fullClientLogout] Storage clearing failed:', storageErr);
    }

    try {
      if (window.indexedDB) {
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          for (const db of dbs) {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
              console.log('[fullClientLogout] Deleted IndexedDB:', db.name);
            }
          }
        } else {
          const knownDBs = ['flexgig-db', 'webauthn-credentials']; // Add your DB names
          for (const dbName of knownDBs) {
            indexedDB.deleteDatabase(dbName);
          }
        }
      }
    } catch (idbErr) {
      console.error('[fullClientLogout] IndexedDB clearing failed:', idbErr);
    }

    try {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        
        const domains = [
          window.location.hostname,
          '.flexgig.com.ng',
          'flexgig.com.ng',
          '.localhost',
          'localhost'
        ];
        
        const paths = ['/', '/dashboard', '/api', '/auth'];
        
        for (const domain of domains) {
          for (const path of paths) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}`;
          }
        }
      }
      console.log('[fullClientLogout] Cleared client-accessible cookies');
    } catch (cookieErr) {
      console.error('[fullClientLogout] Cookie clearing failed:', cookieErr);
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[fullClientLogout] Unregistered service worker');
        }
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[fullClientLogout] Cleared cache storage');
      }
    } catch (swErr) {
      console.error('[fullClientLogout] Service worker/cache clearing failed:', swErr);
    }

    try {
      if (window.webauthnCredentials) {
        window.webauthnCredentials = null;
      }
      console.log('[fullClientLogout] Cleared WebAuthn memory state');
    } catch (webauthnErr) {
      console.error('[fullClientLogout] WebAuthn clearing failed:', webauthnErr);
    }

    console.log('[fullClientLogout] Logout complete, redirecting...');

// ✅ Set sentinel BEFORE redirect so next page load skips stale localStorage
sessionStorage.setItem('fg_just_logged_out', '1');

// ✅ Nuke token explicitly so initTokenRefresh doesn't seed stale data
localStorage.removeItem('token');
localStorage.removeItem('userData');
localStorage.removeItem('fg_reauth_required_v1');
localStorage.removeItem('active_broadcast_id');
localStorage.removeItem('userId');
localStorage.removeItem('userEmail');

window.location.replace('/');

  } catch (err) {
    console.error('[fullClientLogout] Critical error during logout:', err);
    window.location.replace('/');
  }
}

/**
 * Notify that reauth is complete and clear the lock — now uses direct Supabase
 */
async function notifyReauthComplete() {
  try {
    console.log('[REAUTH] Clearing lock via Supabase (notifyReauthComplete)');

    const success = await clearReauthLock();

    if (success) {
      console.log('[REAUTH] ✅ Supabase lock cleared successfully');
      return true;
    } else {
      console.warn('[REAUTH] Supabase lock clear returned false');
      return false;
    }
  } catch (err) {
    console.error('[REAUTH] Supabase clear failed in notifyReauthComplete:', err);
    return false;
  }
}
window.notifyReauthComplete = notifyReauthComplete;

(function ensurePersistentReauthBootstrap(){
  try {
    if (typeof initCrossTabReauth === 'function') {
      try { initCrossTabReauth(); } catch(e) { console.warn('early initCrossTabReauth failed', e); }
    }

    const LOCAL_KEY = 'fg_reauth_required_v1';
    function readLocalKey() {
      try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch(e){ return null; }
    }

    const stored = readLocalKey();
    if (!stored) return;

    let attempts = 0;
    const maxAttempts = 20;
    const retryMs = 250;

    const tryShow = async () => {
      attempts++;
      try {
        if (typeof showReauthModalLocal === 'function') {
          showReauthModalLocal({ fromStorageObj: stored });
          return;
        }
        if (window.__reauth && typeof window.__reauth.initReauthModal === 'function') {
          await window.__reauth.initReauthModal({ show: true, context: 'reauth' });
          return;
        }
        window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_KEY, newValue: JSON.stringify(stored) }));
      } catch (e) {
      }
      if (attempts < maxAttempts) setTimeout(tryShow, retryMs);
      else console.warn('ensurePersistentReauthBootstrap: giving up after attempts');
    };

    tryShow();

    document.addEventListener('visibilitychange', () => {
      try {
        if (document.visibilityState === 'visible') {
          const s = readLocalKey();
          if (s) {
            try {
              if (typeof showReauthModalLocal === 'function') showReauthModalLocal({ fromStorageObj: s });
              else if (window.__reauth && typeof window.__reauth.initReauthModal === 'function') window.__reauth.initReauthModal({ show: true, context: 'reauth' });
            } catch (e) {}
          }
        }
      } catch (e) {}
    }, { passive:true });

    window.addEventListener('beforeunload', () => {
      try {
        const s = readLocalKey();
        if (s) localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
      } catch (e) {}
    });
  } catch (err) {
    console.warn('ensurePersistentReauthBootstrap failed', err);
  }
})();


(async function reconcileServerReauthOnBoot() {
  const LOCAL_KEY = 'fg_reauth_required_v1';

  try {
    const local = (function readLocal() { 
      try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } 
      catch(e){ return null; } 
    })();
    
    if (local) {
      console.debug('[REAUTH-BOOT] Local flag exists, skipping reconcile');
      return;
    }

    console.debug('[REAUTH-BOOT] No local canonical flag found — querying backend for authoritative reauth state');

    if (typeof checkReauthLock !== 'function') {
      console.debug('[REAUTH-BOOT] checkReauthLock not available yet — skipping server reconcile');
      return;
    }

    let srv;
    try {
      srv = await checkReauthLock();
    } catch (err) {
      console.warn('[REAUTH-BOOT] Server check failed:', err);
      return;
    }

    if (srv && srv.required) {
      console.warn('[REAUTH-BOOT] Lock detected, showing modal immediately');
      
      try {
        if (window.__reauth && typeof window.__reauth.initReauthModal === 'function') {
          await window.__reauth.initReauthModal({ show: true, context: 'reauth' });
          console.info('[REAUTH-BOOT] Modal shown via __reauth.initReauthModal');
        } 
        else if (typeof showReauthModalLocal === 'function') {
          showReauthModalLocal({ 
            fromStorageObj: { 
              reason: srv.reason || 'backend_423',
              ts: Date.now() 
            } 
          });
          console.info('[REAUTH-BOOT] Modal shown via showReauthModalLocal');
        }
        else {
          const obj = {
            token: (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('t_' + Date.now()),
            ts: Date.now(),
            reason: srv.reason || 'backend_423'
          };
          window.dispatchEvent(new StorageEvent('storage', { 
            key: LOCAL_KEY, 
            newValue: JSON.stringify(obj) 
          }));
          console.info('[REAUTH-BOOT] Storage event dispatched');
        }
      } catch (e) {
        console.error('[REAUTH-BOOT] Failed to show reauth modal:', e);
      }
    } else {
      console.debug('[REAUTH-BOOT] No reauth required');
    }
  } catch (e) {
    console.warn('[REAUTH-BOOT] Unexpected error in reconcile:', e);
  }
})();



function isCanonicalReauthPending() {
  console.log('❄️❄️❄️ isCanonicalReauthPending check');
  try {
    return !!JSON.parse(localStorage.getItem('fg_reauth_required_v1') || 'null');
  } catch (e) {
    return false;
  }
}

function clearCanonicalReauthFlag() {
  console.log('clearCanonicalReauthFlag called');
  try {
    if (window.fgReauth && typeof window.fgReauth.completeReauth === 'function') {
      try {
        const p = window.fgReauth.completeReauth();
        if (p && typeof p.then === 'function') p.catch(() => {/* swallow */});
      } catch (e) { /* ignore call errors */ }
    }
  } catch (e) {}
  try { localStorage.removeItem('fg_reauth_required_v1'); } catch (e) {}
  try { localStorage.removeItem('reauthPending'); } catch (e) {} // legacy
}




function normalizeB64Url(s) {
  if (s === null || s === undefined) return '';
  s = String(s);
  s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return s;
}
function bytesToB64Url(u8) {
  if (!u8 || !u8.length) return '';
  var bin = '';
  for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return normalizeB64Url(btoa(bin));
}
function ensureUint8FromMaybeObject(val) {
  if (val instanceof ArrayBuffer) return new Uint8Array(val);
  if (ArrayBuffer.isView(val)) return new Uint8Array(val.buffer || val);
  if (Array.isArray(val)) return new Uint8Array(val.map(n => Number(n) & 0xff));
  if (val && typeof val === 'object') {
    if (Array.isArray(val.data)) return new Uint8Array(val.data.map(n => Number(n) & 0xff));
    var keys = Object.keys(val).filter(k => /^\d+$/.test(k));
    if (keys.length) {
      var max = Math.max.apply(null, keys.map(Number));
      var out = new Uint8Array(max + 1);
      for (var k of keys) { out[Number(k)] = Number(val[k]) & 0xff; }
      return out;
    }
  }
  return null;
}
function challengeToB64Url(ch) {
  if (ch === null || ch === undefined) return '';
  if (typeof ch === 'string') {
    var s = ch.trim();
    if ((s[0] === '{' || s[0] === '[') && (s.indexOf(':') !== -1 || s.indexOf('[') === 0)) {
      try {
        var parsed = JSON.parse(s);
        var u = ensureUint8FromMaybeObject(parsed);
        if (u) return bytesToB64Url(u);
      } catch (e) { /* ignore */ }
    }
    return normalizeB64Url(ch);
  }
  var u8 = ensureUint8FromMaybeObject(ch);
  if (u8) return bytesToB64Url(u8);
  try { return normalizeB64Url(btoa(JSON.stringify(ch))); } catch (e) { return ''; }
}

async function tryImmediateReauthWithFreshOptions(freshOpts, attemptLimit = 1, context = {}) {
  
  console.log('[webauthn] tryImmediateReauth: Manual call initiated', context);
  
  const biometricsEnabled = localStorage.getItem('biometricsEnabled') === 'true';
  const credentialId = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id');
  
  if (!biometricsEnabled || !credentialId) {
    console.log('[webauthn] tryImmediateReauth: Skipped (bio disabled or no cred)');
    return { ok: false, reason: 'biometrics-not-available' };
  }
  
  console.log('🔐 [webauthn] Calling biometric panel (manual trigger)');
  
  function b64UrlToUint8(s) {
    if (!s) return null;
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    try {
      const bin = atob(s);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    } catch (e) { return null; }
  }
  
  function ensureUint8(val) {
    if (val instanceof ArrayBuffer) return new Uint8Array(val);
    if (ArrayBuffer.isView(val)) return new Uint8Array(val.buffer || val);
    if (Array.isArray(val)) return new Uint8Array(val.map(n => Number(n) & 0xff));
    if (typeof val === 'string') {
      const maybe = val.trim();
      if (maybe && (maybe[0] === '{' || maybe[0] === '[')) {
        try { return ensureUint8FromMaybeObject(JSON.parse(maybe)); } catch (e) { /* ignore */ }
      }
      return b64UrlToUint8(val);
    }

    if (val && typeof val === 'object' && Array.isArray(val.data)) {
      return new Uint8Array(val.data.map(n => Number(n) & 0xff));
    }

    const keys = (val && typeof val === 'object') ? Object.keys(val).filter(k => /^\d+$/.test(k)) : [];
    if (keys.length) {
      const max = Math.max(...keys.map(Number));
      const out = new Uint8Array(max + 1);
      for (const k of keys) out[Number(k)] = Number(val[k]) & 0xff;
      return out;
    }
    return null;
  }

  const publicKey = {};
  publicKey.challenge = ensureUint8(freshOpts.challenge || freshOpts.challengeBase64 || freshOpts.challengeBytes || freshOpts.challenge_raw);
  if (freshOpts.rpId) publicKey.rpId = freshOpts.rpId;
  if (freshOpts.timeout) publicKey.timeout = freshOpts.timeout;
  if (freshOpts.userVerification) publicKey.userVerification = freshOpts.userVerification;

  const rawAllow = Array.isArray(freshOpts.allowCredentials) ? freshOpts.allowCredentials : [];
  publicKey.allowCredentials = rawAllow.map(c => {
    const id = ensureUint8(c.id) || (typeof c.id === 'string' ? b64UrlToUint8(c.id) : null);
    return { type: c.type || 'public-key', id: id || c.id, transports: c.transports || ['internal'] };
  }).filter(x => !!x.id);

  let attempt = 0;
  while (attempt < attemptLimit) {
    attempt++;
    try {
      console.log(`🔐 [webauthn] Attempt ${attempt}/${attemptLimit} - Calling navigator.credentials.get() (manual)`);
      const assertion = await navigator.credentials.get({ publicKey });
      if (assertion) {
        console.log('✅ [webauthn] Biometric success (manual)');
        return { ok: true, assertion };
      }
    } catch (err) {
      console.warn('[webauthn] Manual biometric attempt failed', err);
      break;
    }
  }
  return { ok: false, reason: 'get-failed' };
}



(function () {
  let __loaderRefCount = 0;
  let __loaderSavedState = null;
  let __loaderBackHandlerInstalled = false;

  function _saveAndDisableInteractive() {
    __loaderSavedState = new Map();
    const els = Array.from(document.querySelectorAll('button, input, select, textarea, a'));
    els.forEach(el => {
      try {
        __loaderSavedState.set(el, !!el.disabled);
        el.disabled = true;
      } catch (e) { /* ignore elements that throw */ }
    });
  }

  function _restoreInteractive() {
    if (!__loaderSavedState) return;
    try {
      __loaderSavedState.forEach((wasDisabled, el) => {
        try {
          el.disabled = !!wasDisabled;
        } catch (e) { /* ignore */ }
      });
    } finally {
      __loaderSavedState = null;
    }
  }

  window.showLoader = function showLoader() {
    const loader = document.getElementById('appLoader');
    if (!loader) return;
    __loaderRefCount++;

    if (__loaderRefCount === 1) {
      loader.hidden = false;
      _saveAndDisableInteractive();

      const modalManagerActive = window.ModalManager && window.ModalManager.isScrollLocked && window.ModalManager.isScrollLocked();
      if (!modalManagerActive) {
        document.body.style.setProperty('--loader-scroll-lock', 'hidden', 'important');
        document.body.classList.add('loader-active');
      }

      if (!__loaderBackHandlerInstalled) {
        __backHandler = function () {
          history.pushState(null, '', location.href);
        };
        window.addEventListener('popstate', __backHandler);
        history.pushState(null, '', location.href);
        __loaderBackHandlerInstalled = true;
      }
    }
  };

  window.hideLoader = function hideLoader(forceReset = false) {
    const loader = document.getElementById('appLoader');
    if (!loader) return;

    if (forceReset) {
      __loaderRefCount = 0;
    } else {
      __loaderRefCount = Math.max(0, __loaderRefCount - 1);
    }

    if (__loaderRefCount === 0) {
      loader.hidden = true;
      _restoreInteractive();

      const modalManagerActive = window.ModalManager && window.ModalManager.isScrollLocked && window.ModalManager.isScrollLocked();
      if (!modalManagerActive) {
        document.body.style.removeProperty('--loader-scroll-lock');
        document.body.classList.remove('loader-active');
      }

      if (__loaderBackHandlerInstalled && typeof __backHandler === 'function') {
        window.removeEventListener('popstate', __backHandler);
        __backHandler = null;
        __loaderBackHandlerInstalled = false;
      }
    }
  };
})();




async function withLoader(task) {
  const start = Date.now();

  let callerInfo = 'unknown';
  try {
    const rawStack = (new Error()).stack || '';
    const lines = rawStack.split('\n').map(l => l.trim()).filter(Boolean);

    let callerLine = lines.find(l => !/withLoader/.test(l) && !/Error/.test(l));
    if (!callerLine && lines.length >= 2) callerLine = lines[1];

    if (callerLine) {
      let m = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
      if (m) {
        const func = m[1];
        const file = m[2].split('/').pop(); // keep filename for readability
        const line = m[3];
        const col = m[4];
        callerInfo = `${func} @ ${file}:${line}:${col}`;
      } else {
        m = callerLine.match(/(.*)@(.+):(\d+):(\d+)/);
        if (m) {
          const func = m[1] || '(anonymous)';
          const file = m[2].split('/').pop();
          const line = m[3];
          const col = m[4];
          callerInfo = `${func} @ ${file}:${line}:${col}`;
        } else {
          callerInfo = callerLine;
        }
      }
    }
  } catch (e) {
    callerInfo = 'unknown';
  }

  console.log(`[DEBUG ⌛⌛⌛] withLoader: Starting task (called from ${callerInfo})`);
  showLoader();
  try {
    const result = await task();
    const duration = Date.now() - start;
    console.log(`[DEBUG ⌛⌛⌛] withLoader: Task completed (duration: ${duration}ms) (called from ${callerInfo})`);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[DEBUG ⌛⌛⌛] withLoader: Task failed after ${duration}ms (called from ${callerInfo})`, err);
    throw err;
  } finally {
    try { hideLoader(); } catch (e) { /* ignore */ }
  }
}
window.withLoader = window.withLoader || withLoader

async function parseErrorResponse(res) {
  try {
    const clone = res.clone();
    const json = await clone.json().catch(() => null);
    if (json && (json.message || json.code || Object.keys(json).length)) {
      return { message: (json.message || JSON.stringify(json)), code: json.code || null, raw: json };
    }
  } catch (e) { /* ignore JSON parse error */ }

  try {
    const txt = await res.text();
    if (txt) return { message: txt, code: null, raw: txt };
  } catch (e) { /* ignore text parse error */ }

  return { message: res.status ? `${res.status} ${res.statusText || ''}`.trim() : 'Unknown error', code: null, raw: null };
}

if (typeof window.__fg_pin_clearAllInputs !== 'function') {
  window.__fg_pin_clearAllInputs = function __fg_pin_clearAllInputs_fallback() {
    try {
      const els = document.querySelectorAll('#currentPin, #newPin, #confirmPin');
      els.forEach(e => { try { e.value = ''; } catch (_) {} });
      if (els && els[0]) try { els[0].focus(); } catch (_) {}
    } catch (e) { /* swallow */ }
  };
}



(function instrumentStorage() {
  try {
    const origRemove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) {
      if (key === 'credentialId') {
        console.log('[STORAGE TRACE] removeItem called for', key, 'time:', new Date().toISOString());
        console.trace();
      }
      return origRemove.apply(this, arguments);
    };

    window.addEventListener('storage', (e) => {
      if (e.key === 'credentialId') {
        console.log('[STORAGE EVENT] storage event for credentialId:', {
          oldValue: e.oldValue,
          newValue: e.newValue,
          url: e.url,
          time: new Date().toISOString()
        });
      }
    });

    window.addEventListener('beforeunload', () => {
      try {
        console.log('[STORAGE TRACE] beforeunload — credentialId currently:', localStorage.getItem('credentialId'), 'time:', new Date().toISOString());
      } catch (err) {
        console.error('[STORAGE TRACE] beforeunload read error', err);
      }
    });

    console.log('[STORAGE TRACE] Instrumentation installed');
  } catch (e) {
    console.error('[STORAGE TRACE] Failed to install instrumentation', e);
  }
})();


window.__fg_currentBanner = window.__fg_currentBanner || {
  id: null,            // server-provided notification id (if any)
  sticky: false,       // true = server asked that this not be auto-cleared
  clientSticky: false, // true = client/admin intentionally set a sticky broadcast
  message: ''          // current visible message
};




function setBannerMessage(msg, repeatTimes = 6) {
  const repeated = String(msg).repeat(repeatTimes);
  document.querySelectorAll('.banner-msg').forEach(el => {
    el.textContent = repeated;
  });
  const inner = document.querySelector('.scroll-inner');
  if (inner) {
    inner.style.animation = 'none';
    void inner.offsetWidth;
    inner.style.animation = '';
  }
}

function showBanner(msg, opts = {}) {
  const STATUS_BANNER = document.getElementById('status-banner');
  if (!STATUS_BANNER) return;

  setBannerMessage(msg, 1);
  STATUS_BANNER.classList.remove('hidden');

  STATUS_BANNER.classList.remove('level-info', 'level-error', 'level-warning');

  const level = opts.type || 'info';
  STATUS_BANNER.classList.add(`level-${level}`);

  try {
    window.__fg_currentBanner = window.__fg_currentBanner || { id: null, sticky: false, clientSticky: false, message: '' };
    window.__fg_currentBanner.message = String(msg || '');
    window.__fg_currentBanner.sticky = !!opts.persistent;
    window.__fg_currentBanner.id = opts.serverId || window.__fg_currentBanner.id || null;

    if (opts.clientSticky) window.__fg_currentBanner.clientSticky = true;
    if (opts.serverId && !opts.clientSticky) window.__fg_currentBanner.clientSticky = false;
  } catch (e) { /* swallow */ }
}

window.setBannerMessage = setBannerMessage;
window.showBanner = showBanner;
window.hideBanner = hideBanner;

window.setupBroadcastSubscription = setupBroadcastSubscription;
window.safeUnsubscribeChannel = safeUnsubscribeChannel;

window.fetchActiveBroadcasts = fetchActiveBroadcasts;
window.fetchWithAutoRefresh = fetchWithAutoRefresh;

window.handleBroadcast = handleBroadcast;

window.__fg_currentBanner = window.__fg_currentBanner || {};
window.__fg_broadcast_channel = window.__fg_broadcast_channel || null;


function hideBanner(force = false) {
  try {
    const state = window.__fg_currentBanner || {};
    if (!force && (state.sticky || state.clientSticky)) {
      return;
    }
  } catch (e) { /* ignore */ }

  const STATUS_BANNER = document.getElementById('status-banner');
  if (STATUS_BANNER) STATUS_BANNER.classList.add('hidden');

  try {
    if (force || !(window.__fg_currentBanner?.sticky || window.__fg_currentBanner?.clientSticky)) {
      window.__fg_currentBanner = { id: null, sticky: false, clientSticky: false, message: '' };
      localStorage.removeItem('active_broadcast_id');
    }
  } catch (e) {}
}

let __fg_broadcast_channel = null;

function safeUnsubscribeChannel() {
  try {
    if (__fg_broadcast_channel && typeof __fg_broadcast_channel.unsubscribe === 'function') {
      __fg_broadcast_channel.unsubscribe().catch(() => {});
    }
  } catch (e) { /* ignore */ }
  __fg_broadcast_channel = null;
}

function setupBroadcastSubscription(force = false) {
  try {
    if (__fg_broadcast_channel && !force) return __fg_broadcast_channel;

    safeUnsubscribeChannel();

    __fg_broadcast_channel = supabaseClient.channel('public:broadcasts');

function applyBroadcastRow(row) {
  if (!row) return;
  const now = new Date();
  const startsOk = !row.starts_at || new Date(row.starts_at) <= now;
  const notExpired = !row.expire_at || new Date(row.expire_at) > now;

  if (row.active && startsOk && notExpired) {
    const id = row.id != null ? String(row.id) : null;

    const allowedLevels = ['info', 'warning', 'error'];
    const level = allowedLevels.includes(row.level) ? row.level : 'info';

    try {
      showBanner(row.message || '', {
        persistent: !!row.sticky,
        serverId: id,
        type: level // ← pass the level here
      });
    } catch (e) {
      console.warn('applyBroadcastRow showBanner failed', e);
    }

    try { 
      if (id != null) localStorage.setItem('active_broadcast_id', String(id));
      localStorage.setItem('active_broadcast_ts', String(Date.now()));
      window.__fg_currentBanner = window.__fg_currentBanner || {};
      window.__fg_currentBanner.serverId = id;
      window.__fg_currentBanner.id = id;
      window.__fg_currentBanner.message = row.message || '';
      window.__fg_currentBanner.level = level; // ← store level
      window.__fg_currentBanner.sticky = !!row.sticky;
      window.__fg_currentBanner.clientSticky = false;
    } catch (e) {}
  } else {
        const showingId = localStorage.getItem('active_broadcast_id');
        if (showingId && String(showingId) === String(row.id)) {
          hideBanner();
          try {
            localStorage.removeItem('active_broadcast_id');
            localStorage.removeItem('active_broadcast_ts');
            if (window.__fg_currentBanner) {
              delete window.__fg_currentBanner.serverId;
              delete window.__fg_currentBanner.id;
            }
          } catch (e) {}
        }
      }
    }

    __fg_broadcast_channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcasts' }, (payload) => {
        console.log('[BROADCAST INSERT]', payload);
        applyBroadcastRow(payload.new);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'broadcasts' }, (payload) => {
        console.log('[BROADCAST UPDATE]', payload);
        applyBroadcastRow(payload.new);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'broadcasts' }, (payload) => {
        console.log('[BROADCAST DELETE]', payload);
        const showingId = localStorage.getItem('active_broadcast_id');
        if (showingId && String(showingId) === String(payload.old.id)) {
          hideBanner();
          try {
            localStorage.removeItem('active_broadcast_id');
            localStorage.removeItem('active_broadcast_ts');
            if (window.__fg_currentBanner) {
              delete window.__fg_currentBanner.serverId;
              delete window.__fg_currentBanner.id;
            }
          } catch (e) {}
        }
      })
      .subscribe((status) => {
        console.log('[BROADCAST SUBSCRIBE STATUS]', status);
        if (status === 'SUBSCRIBED') {
          if (typeof pollStatus === 'function') {
            try {
              pollStatus();
            } catch (e) { console.debug('setupBroadcastSubscription: pollStatus failed', e); }
          } else {
            (async () => {
              try {
                const apiBase = (window.__SEC_API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : ''));
                const url = apiBase ? `${apiBase}/api/broadcasts/active` : '/api/broadcasts/active';
                const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
                if (res.ok) {
                  const json = await res.json();
                  const row = Array.isArray(json) ? json[0] : json;
                  if (row) applyBroadcastRow(row);
                }
              } catch (e) { console.debug('setupBroadcastSubscription: fallback active fetch failed', e); }
            })();
          }
        }
      });

    return __fg_broadcast_channel;
  } catch (err) {
    console.warn('setupBroadcastSubscription failed', err);
    safeUnsubscribeChannel();
    return null;
  }
}






async function fetchActiveBroadcasts() {
  try {
    const res = await fetch(`${window.__SEC_API_BASE || ''}/api/broadcasts/active?_${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store'
    });

    if (!res.ok) {
      console.warn('[BCAST] /api/broadcasts/active returned', res.status);
      return [];
    }

    const json = await res.json();
    const broadcasts = json.broadcasts || [];

    broadcasts.sort((a, b) => {
      const aStart = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const bStart = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      return aStart - bStart;
    });

    if (broadcasts.length > 0) {
      const b = broadcasts[0];
      const now = new Date();

      if (!b.expire_at || new Date(b.expire_at) > now) {
        const STATUS_BANNER = document.getElementById('status-banner');
        if (STATUS_BANNER) {
          STATUS_BANNER.classList.remove('level-info', 'level-warning', 'level-error');

          const allowedLevels = ['info', 'warning', 'error'];
          const level = allowedLevels.includes(b.level) ? b.level : 'info';
          STATUS_BANNER.classList.add(`level-${level}`);

          window.setBannerMessage(b.message || '', 1);

          STATUS_BANNER.classList.remove('hidden');

          window.__fg_currentBanner = window.__fg_currentBanner || {};
          window.__fg_currentBanner.message = b.message || '';
          window.__fg_currentBanner.level = level;
          window.__fg_currentBanner.sticky = !!b.sticky;
          window.__fg_currentBanner.clientSticky = false;
          window.__fg_currentBanner.id = b.id;
        }

        localStorage.setItem('active_broadcast_id', b.id);
      } else {
        hideBanner();
        localStorage.removeItem('active_broadcast_id');
      }
    } else {
      hideBanner();
      localStorage.removeItem('active_broadcast_id');
    }

    return broadcasts;
  } catch (err) {
    console.error('[BCAST] fetchActiveBroadcasts error', err);
    return [];
  }
}





async function fetchWithAutoRefresh(url, opts = {}) {
  opts.credentials = 'include';
  opts.headers = opts.headers || { 'Accept': 'application/json' };
  let res = await fetch(url, opts);
  if (res.status === 401) {
    console.log('[DEBUG] fetchWithAutoRefresh: 401, attempting /auth/refresh');
    const refresh = await fetch(`${window.__SEC_API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (refresh.ok) {
      console.log('[DEBUG] fetchWithAutoRefresh: Refresh succeeded, retrying');
      res = await fetch(url, opts);
    } else {
      console.warn('[WARN] fetchWithAutoRefresh: Refresh failed');
    }
  }
  return res;
}

const APP_VERSION = '1.0.0';


const updateProfileModal = document.getElementById('updateProfileModal');
if (updateProfileModal && updateProfileModal.classList.contains('active')) {
  openUpdateProfileModal();
}



window.__sessionLoading = false;
window.__sessionPromise = null;
window.__lastSessionLoadId = 0;
window.__INITIAL_SESSION_FETCHED = false;

async function getSession() {
  if (window.__sessionDeadUntil && Date.now() < window.__sessionDeadUntil) {
    console.debug('[getSession] Cooling down — no session available');
    return null;
  }

  if (window.__sessionPromise) {
    console.log('[DEBUG] getSession: Reusing in-flight promise');
    return window.__sessionPromise;
  }

  const loadId = Date.now();
  window.__lastSessionLoadId = loadId;

  window.__sessionPromise = (async () => {
    try {
      console.log('[DEBUG] getSession: Starting (loadId=' + loadId + ')');

      const cachedUserData = localStorage.getItem('userData');
      let cachedUser = null;

      if (cachedUserData) {
        try {
          const parsed = JSON.parse(cachedUserData);
          if (Date.now() - parsed.cachedAt < 300000) { // 5 minutes
            console.log('[DEBUG] getSession: Cache is fresh — returning immediately');
            applySessionToDOM(parsed);

            setTimeout(async () => {
              try {
                const res = await fetch(`${window.__SEC_API_BASE}/api/session`, {
                  credentials: 'include',
                  headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
                });
                if (res.ok) {
                  const payload = await res.json();
                  if (payload?.user) {
                    updateLocalStorageFromUser(payload.user);
                    if (window.subscribeToTransactions) window.subscribeToTransactions(true);
                  }
                }
              } catch(e) { /* non-critical */ }
            }, 2000);

            return { user: parsed };
          }
          cachedUser = parsed; // stale but keep as fallback
        } catch (e) {
          console.warn('[WARN] getSession: Invalid cache', e);
        }
      }

      console.log('[DEBUG] getSession: Cache stale or missing, fetching from /api/session');

      let res = await fetch(`${window.__SEC_API_BASE}/api/session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (res.status === 401) {
        console.log('[DEBUG] getSession: 401, attempting refresh');
        const refreshRes = await fetch(`${window.__SEC_API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (refreshRes.ok) {
          console.log('[DEBUG] getSession: Refresh succeeded, retrying');
          res = await fetch(`${window.__SEC_API_BASE}/api/session`, {
            method: 'GET',
            credentials: 'include',
            headers: { 
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
        } else {
          console.warn('[WARN] getSession: Refresh failed — cooling down for 30s');
          window.__sessionDeadUntil = Date.now() + 30000;
          window.dispatchEvent(new CustomEvent('session:missing', {
            detail: { reason: 'refresh_failed', timestamp: Date.now() }
          }));
          return null;
        }
      }

      if (!res.ok) {
        console.error('[ERROR] getSession: API returned', res.status);
        if (cachedUser) {
          console.log('[DEBUG] getSession: Falling back to cache');
          return { user: cachedUser };
        }
        return null;
      }

      const payload = await res.json();
      if (!payload || !payload.user) {
        console.error('[ERROR] getSession: Invalid payload', payload);
        if (cachedUser) return { user: cachedUser };
        return null;
      }

      const { user } = payload;
      console.log('[DEBUG] getSession: API success', user);

      if (!cachedUser || JSON.stringify(user) !== JSON.stringify(cachedUser)) {
        console.log('[DEBUG] getSession: Data changed, updating DOM');
        applySessionToDOM(user);
      }

      updateLocalStorageFromUser(user);

      console.log('[DEBUG] getSession: Complete (loadId=' + loadId + ')');

if (window.subscribeToTransactions) {
  console.log('[Auth] Session ready → triggering realtime subscriptions');
  
  const resolvedUid = user?.uid || localStorage.getItem('userId');
  if (resolvedUid) window.__USER_UID = resolvedUid;

  window.subscribeToTransactions(true);
  subscribeToWalletBalance(true);
  if (typeof subscribeToUserRealtime === 'function') subscribeToUserRealtime(true);
}
      return { user };

    } catch (err) {
      console.error('[ERROR] getSession: Failed', err);
      
      const cachedUserData = localStorage.getItem('userData');
      if (cachedUserData) {
        try {
          const cached = JSON.parse(cachedUserData);
console.log('[DEBUG] getSession: Using cache as fallback');
applySessionToDOM(cached);
if (cached.wallet_balance != null && !isNaN(Number(cached.wallet_balance))) {
  window.balanceInitialized = false; // reset so updateAllBalances doesn't skip
  window.updateAllBalances(Number(cached.wallet_balance), true);
}
return { user: cached };
        } catch (e) {
          console.warn('[WARN] getSession: Cache parse failed', e);
        }
      }
      return null;
    } finally {
      window.__sessionPromise = null;
    }
  })();

  return window.__sessionPromise;
}

window.getSession = getSession;

window.currentDisplayedBalance = 0;
window.isBalanceMasked = true;
window.animationFrame = null;
window.balanceInitialized = false;
let balanceToggleInProgress = false;

try {
  const saved = localStorage.getItem('balanceMasked');
  if (saved !== null) window.isBalanceMasked = saved === 'true';
} catch (e) {
  window.isBalanceMasked = true;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function applyBalanceVisibility() {
  const cards = document.querySelectorAll('.balance');
  cards.forEach(card => {
    const real = card.querySelector('.balance-real, [data-balance]');
    const masked = card.querySelector('.balance-masked');
    if (!real || !masked) return;

    const parent = real.parentElement;
    if (parent && !parent.dataset.balanceWidthReserved) {
      real.style.opacity = '1';
      parent.style.minWidth = parent.offsetWidth + 'px';
      parent.dataset.balanceWidthReserved = 'true';
      real.style.opacity = '';
    }

    real.style.transition = 'opacity 320ms ease';
    masked.style.transition = 'opacity 420ms ease';

    if (window.isBalanceMasked) {
      real.style.opacity = '0';
      masked.style.opacity = '1';
      setTimeout(() => {
        real.style.pointerEvents = 'none';
        masked.style.pointerEvents = '';
      }, 50);
    } else {
      real.style.opacity = '1';
      masked.style.opacity = '0';
      setTimeout(() => {
        masked.style.pointerEvents = 'none';
        real.style.pointerEvents = '';
      }, 50);
    }
  });
}

function setupNuclearEyeToggle() {
  document.removeEventListener('click', window.__NUCLEAR_EYE_HANDLER, true);

  window.__NUCLEAR_EYE_HANDLER = function(e) {
    const eye = e.target.closest('.balance-eye-toggle');
    if (!eye) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (window.animationFrame) {
      cancelAnimationFrame(window.animationFrame);
      window.animationFrame = null;
    }

    const wasMasked = window.isBalanceMasked;
    const shouldShowBalance = wasMasked; // clicking closed eye → show, clicking open → hide

    window.isBalanceMasked = !shouldShowBalance;
    localStorage.setItem('balanceMasked', window.isBalanceMasked);

    const realAmount = window.currentDisplayedBalance || 0;
    const formatted = '₦' + realAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    document.querySelectorAll('[data-balance], .balance-real').forEach(el => el.textContent = formatted);
    document.querySelectorAll('.balance-masked').forEach(el => el.textContent = shouldShowBalance ? formatted : '••••••');

    document.querySelectorAll('.balance-real, [data-balance]').forEach(el => {
      el.style.opacity = shouldShowBalance ? '1' : '0';
      el.style.pointerEvents = shouldShowBalance ? '' : 'none';
    });
    document.querySelectorAll('.balance-masked').forEach(el => {
      el.style.opacity = shouldShowBalance ? '0' : '1';
      el.style.pointerEvents = shouldShowBalance ? 'none' : '';
    });

document.querySelectorAll('.balance-eye-toggle').forEach(toggle => {
  toggle.classList.toggle('open', shouldShowBalance);
  toggle.classList.toggle('closed', !shouldShowBalance);
  toggle.setAttribute('aria-pressed', shouldShowBalance);
  toggle.setAttribute('aria-label', shouldShowBalance ? 'Hide balance' : 'Show balance');

  const o = toggle.querySelector('.eye-open-svg');
  const c = toggle.querySelector('.eye-closed-svg');
  if (o && c) {
    o.style.transition = c.style.transition = 'transform 420ms cubic-bezier(.2,.9,.3,1), opacity 320ms ease';
    o.style.opacity = shouldShowBalance ? '1' : '0';
    o.style.transform = `translate(-50%,-50%) scaleY(${shouldShowBalance ? 1 : 0.25})`;
    c.style.opacity = shouldShowBalance ? '0' : '1';
    c.style.transform = `translate(-50%,-50%) scaleY(${shouldShowBalance ? 0.25 : 1})`;
  }
});

const switchEl = document.getElementById('balanceSwitch');
if (switchEl) {
  switchEl.setAttribute('aria-checked', shouldShowBalance ? 'true' : 'false');

  const knob = switchEl.querySelector('.knob');
  if (knob) {
    knob.style.transition = 'transform 420ms cubic-bezier(0.2, 0.9, 0.3, 1)';
    knob.style.transform = shouldShowBalance 
      ? (switchEl.classList.contains('small') ? 'translateX(18px)' : 'translateX(26px)') 
      : 'translateX(0)';
  }
}

    console.log(`EYE FORCE: Balance is now ${shouldShowBalance ? 'VISIBLE' : 'HIDDEN'} — all eyes in sync`);
  };

  document.addEventListener('click', window.__NUCLEAR_EYE_HANDLER, { capture: true, passive: false });
}

function syncAllEyes() {
  const shouldShow = !window.isBalanceMasked;
  document.querySelectorAll('.balance-eye-toggle').forEach(eye => {
    eye.classList.toggle('open', shouldShow);
    eye.classList.toggle('closed', !shouldShow);
    eye.setAttribute('aria-pressed', shouldShow);
    eye.setAttribute('aria-label', shouldShow ? 'Hide balance' : 'Show balance');

    const o = eye.querySelector('.eye-open-svg');
    const c = eye.querySelector('.eye-closed-svg');
    if (o && c) {
      o.style.opacity = shouldShow ? '1' : '0';
      o.style.transform = `translate(-50%,-50%) scaleY(${shouldShow ? 1 : 0.25})`;
      c.style.opacity = shouldShow ? '0' : '1';
      c.style.transform = `translate(-50%,-50%) scaleY(${shouldShow ? 0.25 : 1})`;
    }
  });
  applyBalanceVisibility();
}

syncAllEyes();
applyBalanceVisibility();

setupNuclearEyeToggle();

window.updateAllBalances = function(newBalance, skipAnimation = false) {
  newBalance = Number(newBalance) || 0;

  if (balanceToggleInProgress) {
    console.debug('[Balance] Update blocked during toggle');
    return;
  }

  const formatted = '₦' + newBalance.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (!window.balanceInitialized || skipAnimation) {
    window.balanceInitialized = true;
    window.currentDisplayedBalance = newBalance;

    document.querySelectorAll('[data-balance], .balance-real').forEach(el => el.textContent = formatted);
    document.querySelectorAll('.balance-masked').forEach(el => el.textContent = window.isBalanceMasked ? '••••••' : formatted);

    syncAllEyes();
    applyBalanceVisibility();
    return;
  }

  if (window.animationFrame) cancelAnimationFrame(window.animationFrame);

  const startBalance = window.currentDisplayedBalance;
  const duration = Math.abs(newBalance - startBalance) < 5000 ? 800 : 1400;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(progress);
    const current = startBalance + (newBalance - startBalance) * eased;
    const currFormatted = '₦' + current.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    document.querySelectorAll('[data-balance], .balance-real').forEach(el => el.textContent = currFormatted);
    document.querySelectorAll('.balance-masked').forEach(el => el.textContent = window.isBalanceMasked ? '••••••' : currFormatted);

    if (progress < 1) {
      window.animationFrame = requestAnimationFrame(step);
    } else {
      window.currentDisplayedBalance = newBalance;
      window.animationFrame = null;
      syncAllEyes(); // keep eyes in sync after animation
      applyBalanceVisibility();
    }
  }

  window.animationFrame = requestAnimationFrame(step);
};

window.applyBalanceVisibility = applyBalanceVisibility;

window.__handleBalanceUpdate = function(data) {
  if (!data || isNaN(Number(data.balance))) return;
  console.log('[Balance] __handleBalanceUpdate called:', data.balance);
  
  window.updateAllBalances(Number(data.balance));

  try {
    const raw = localStorage.getItem('userState');
    if (raw) {
      const state = JSON.parse(raw);
      state.balance = Number(data.balance);
      state.wallet_balance = Number(data.balance);
      localStorage.setItem('userState', JSON.stringify(state));
    }
  } catch(e) {}
};


if (window.location.pathname.includes('dashboard')) {
  window.addEventListener('load', () => { // Or 'DOMContentLoaded' if preferred
    console.log('[DEBUG] window.load: Starting MutationObserver');
    observeForElements();
    onDashboardLoad();
  });
}

function responsiveNameSize() {
  const firstname = document.getElementById('firstname');
  const support = document.querySelector('.support');
  const header = document.querySelector('header');
  
  if (!firstname || !support || !header) return;
  
  const resizeObserver = new ResizeObserver(() => {
    const headerWidth = header.offsetWidth;
    const supportWidth = support.offsetWidth;
    const avatarWidth = document.querySelector('.avatar').offsetWidth;
    const padding = 22 * 2; // header padding
    const gaps = 12 + 10; // avatar margin + support gap
    
    const availableWidth = headerWidth - supportWidth - avatarWidth - padding - gaps;
    const nameWidth = firstname.offsetWidth;
    
    if (nameWidth > availableWidth * 0.7) {
      firstname.style.fontSize = '0.95rem';
    } else if (nameWidth > availableWidth * 0.5) {
      firstname.style.fontSize = '1rem';
    } else {
      firstname.style.fontSize = '1.15rem'; // default
    }
  });
  
  resizeObserver.observe(header);
}

function observeForElements() {
  const targetNode = document.body; // Or a specific parent like document.querySelector('.user-greeting')
  const config = { childList: true, subtree: true }; // Watch for added/removed nodes

  const observer = new MutationObserver((mutations, obs) => {
    const greetEl = document.getElementById('greet');
    const firstnameEl = document.getElementById('firstname');
    const avatarEl = document.getElementById('avatar');

    if (greetEl && firstnameEl && avatarEl) {
      console.log('[DEBUG] MutationObserver: Elements detected, running getSession');
      const cachedUserData = localStorage.getItem('userData');
      if (cachedUserData) {
        try {
          const parsed = JSON.parse(cachedUserData);
          const firstName = parsed.fullName?.split(' ')[0] || 'User';
          applySessionToDOM(parsed, firstName);
        } catch (e) { /* ignore */ }
      }
      getSession(); // Call directly (no need for safeGetSession retries here)
      obs.disconnect(); // Stop observing once elements are found
    }
  });

  observer.observe(targetNode, config);
  console.log('[DEBUG] MutationObserver: Started watching for elements');
  
  const greetEl = document.getElementById('greet');
  const firstnameEl = document.getElementById('firstname');
  const avatarEl = document.getElementById('avatar');
  if (greetEl && firstnameEl && avatarEl) {
    console.log('[DEBUG] MutationObserver: Elements already present');
    getSession();
    observer.disconnect();
  }
}


function applySessionToDOM(user) {
  const greetEl = document.getElementById('greet');
  const firstnameEl = document.getElementById('firstname');
  const avatarEl = document.getElementById('avatar');

  if (!greetEl || !firstnameEl || !avatarEl) {
    console.warn('[WARN] applySessionToDOM: Elements not found');
    return;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  
  if (greetEl.textContent !== greeting) {
    greetEl.textContent = greeting;
  }

  const displayName = user.username || user.firstName || user.fullName?.split(' ')[0] || 'User';
  const displayNameCapitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  
  if (firstnameEl.textContent !== displayNameCapitalized) {
    firstnameEl.textContent = displayNameCapitalized;
  }
  responsiveNameSize();

  const profilePicture = user.profilePicture || '';
  const isValidImage = profilePicture && /^(data:image\/|https?:\/\/|\/)/i.test(profilePicture);
  
  if (isValidImage) {
    const currentSrc = avatarEl.querySelector('img')?.src || '';
    const picturePath = profilePicture.split('?')[0];
    
    if (!currentSrc.includes(picturePath)) {
      avatarEl.innerHTML = `<img src="${profilePicture}" alt="Profile" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      avatarEl.removeAttribute('aria-label');
    }
  } else {
    const initial = displayName.charAt(0).toUpperCase();
    const currentText = avatarEl.textContent?.trim() || '';
    
    if (currentText !== initial) {
      avatarEl.innerHTML = '';
      avatarEl.textContent = initial;
      avatarEl.setAttribute('aria-label', displayNameCapitalized);
    }
  }

if (user.wallet_balance !== undefined) {
if (user.wallet_balance === undefined || user.wallet_balance === null) return;
const newBalance = Number(user.wallet_balance);
if (isNaN(newBalance)) return; // malformed — don't overwrite good data
window.updateAllBalances(newBalance, true);  // skip animation on first load
  
  const formatted = '₦' + newBalance.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  document.querySelectorAll('[data-balance], .balance-real').forEach(el => {
    el.textContent = formatted;
  });
  
  document.querySelectorAll('.balance-masked').forEach(el => {
    el.textContent = window.isBalanceMasked ? '••••••' : formatted;  // ✅ Use window.isBalanceMasked
applyBalanceVisibility();



    });
  }
}


/**
 * Balance Switch + Eye Toggle Helper
 * - Makes #balanceSwitch clickable and animates its knob
 * - Syncs with eye icons (they remain the primary toggle)
 * - Controls balance mask/show + text update
 * - Forces smooth knob slide every time
 * 
 * Call this once after DOM ready (e.g. in onDashboardLoad or at end of script)
 */
function initBalanceSwitchHelper() {
  if (window.__balanceSwitchHelperInitialized) return;
  window.__balanceSwitchHelperInitialized = true;

  window.isBalanceMasked = localStorage.getItem('balanceMasked') === 'true';
  window.currentDisplayedBalance = window.currentDisplayedBalance || 0;
  window.balanceToggleInProgress = false;

  const toggleBalance = () => {
    if (window.balanceToggleInProgress) return;
    window.balanceToggleInProgress = true;

    window.isBalanceMasked = !window.isBalanceMasked;
    localStorage.setItem('balanceMasked', window.isBalanceMasked);

    const shouldShow = !window.isBalanceMasked;

    const formatted = '₦' + window.currentDisplayedBalance.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    document.querySelectorAll('[data-balance], .balance-real').forEach(el => el.textContent = formatted);
    document.querySelectorAll('.balance-masked').forEach(el => el.textContent = shouldShow ? formatted : '••••••');

    document.querySelectorAll('.balance-real, [data-balance]').forEach(el => {
      el.style.opacity = shouldShow ? '1' : '0';
      el.style.pointerEvents = shouldShow ? '' : 'none';
    });
    document.querySelectorAll('.balance-masked').forEach(el => {
      el.style.opacity = shouldShow ? '0' : '1';
      el.style.pointerEvents = shouldShow ? 'none' : '';
    });

    document.querySelectorAll('.balance-eye-toggle').forEach(toggle => {
      toggle.classList.toggle('open', shouldShow);
      toggle.classList.toggle('closed', !shouldShow);
      toggle.setAttribute('aria-pressed', shouldShow);
      toggle.setAttribute('aria-label', shouldShow ? 'Hide balance' : 'Show balance');

      const o = toggle.querySelector('.eye-open-svg');
      const c = toggle.querySelector('.eye-closed-svg');
      if (o && c) {
        o.style.transition = c.style.transition = 'transform 420ms cubic-bezier(.2,.9,.3,1), opacity 320ms ease';
        o.style.opacity = shouldShow ? '1' : '0';
        o.style.transform = `translate(-50%,-50%) scaleY(${shouldShow ? 1 : 0.25})`;
        c.style.opacity = shouldShow ? '0' : '1';
        c.style.transform = `translate(-50%,-50%) scaleY(${shouldShow ? 0.25 : 1})`;
      }
    });

    const sw = document.getElementById('balanceSwitch');
    if (sw) {
      sw.setAttribute('aria-checked', shouldShow ? 'true' : 'false');

      const knob = sw.querySelector('.knob');
      if (knob) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            knob.style.transition = 'none';
            void knob.offsetWidth; // force reflow

            knob.style.transition = 'transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important';
            knob.style.transform = shouldShow 
              ? (sw.classList.contains('small') ? 'translateX(18px)' : 'translateX(26px)')
              : 'translateX(0)';
          });
        });
      }
    }

    setTimeout(() => { window.balanceToggleInProgress = false; }, 400);
  };

  const balanceSwitch = document.getElementById('balanceSwitch');
  if (balanceSwitch) {
    const freshSwitch = balanceSwitch.cloneNode(true);
    balanceSwitch.parentNode.replaceChild(freshSwitch, balanceSwitch);

    freshSwitch.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      toggleBalance();
    });

    freshSwitch.style.pointerEvents = 'auto';
    freshSwitch.style.cursor = 'pointer';
  }



  console.log('[Balance Switch Helper] Initialized — switch now clickable + animates knob');
}

initBalanceSwitchHelper();


function updateLocalStorageFromUser(user) {
  try {
    const userData = {
      uid: user.uid || user.id || '',
      email: user.email || '',
      username: user.username || '',
      fullName: user.fullName || '',
      firstName: user.firstName || user.fullName?.split(' ')[0] || 'User',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      profilePicture: user.profilePicture || '',
      hasPin: user.hasPin || false,
      hasBiometrics: user.hasBiometrics || false,
      profileCompleted: user.profileCompleted || false,
      fullNameEdited: user.fullNameEdited || false,
      lastUsernameUpdate: user.lastUsernameUpdate || '',
      monthlyHistory: user.monthlyHistory || [],
      allTimeIn: user.allTimeIn || 0,
      allTimeOut: user.allTimeOut || 0,
      totalDataTxCount: user.totalDataTxCount || 0,
      recentDataTx: user.recentDataTx || [],
      wallet_balance: user.wallet_balance ?? null,
      cachedAt: Date.now()
  };

    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('userEmail', user.email || '');
    localStorage.setItem('userId', user.uid || user.id || '');
    localStorage.setItem('firstName', userData.firstName);
    localStorage.setItem('username', user.username || '');
    localStorage.setItem('fullName', user.fullName || '');
    localStorage.setItem('phoneNumber', user.phoneNumber || '');
    localStorage.setItem('address', user.address || '');
    localStorage.setItem('profilePicture', user.profilePicture || '');
    localStorage.setItem('hasPin', user.hasPin ? 'true' : 'false');
    localStorage.setItem('biometricsEnabled', user.hasBiometrics ? 'true' : 'false');
    localStorage.setItem('profileCompleted', user.profileCompleted ? 'true' : 'false');
    localStorage.setItem('fullNameEdited', user.fullNameEdited ? 'true' : 'false');
    localStorage.setItem('lastUsernameUpdate', user.lastUsernameUpdate || '');
    localStorage.setItem('monthlyHistory', JSON.stringify(user.monthlyHistory || []));
    localStorage.setItem('allTimeIn', user.allTimeIn || 0);
    localStorage.setItem('allTimeOut', user.allTimeOut || 0);
    localStorage.setItem('totalDataTxCount', user.totalDataTxCount || 0);
    localStorage.setItem('recentDataTx', JSON.stringify(user.recentDataTx || []));

    console.log('[DEBUG] updateLocalStorageFromUser: Updated', {
      hasPin: user.hasPin,
      hasBiometrics: user.hasBiometrics,
      profileCompleted: user.profileCompleted
    });
  } catch (err) {
    console.warn('[WARN] updateLocalStorageFromUser: Failed', err);
  }
}










async function handleBioLoginToggle(e) {
    e.preventDefault();
    const switchBtn = e.currentTarget;
    const currentlyOn = switchBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentlyOn;
    
    console.log('[DEBUG] handleBioLoginToggle clicked:', { currentlyOn, newState });
    
    switchBtn.setAttribute('aria-checked', newState.toString());
    if (newState) {
        switchBtn.classList.add('active');
        switchBtn.classList.remove('inactive');
    } else {
        switchBtn.classList.add('inactive');
        switchBtn.classList.remove('active');
    }
    localStorage.setItem('biometricForLogin', newState ? 'true' : 'false');
    
    if (window.__sec_KEYS && window.__sec_KEYS.bioLogin) {
        localStorage.setItem(window.__sec_KEYS.bioLogin, newState ? '1' : '0');
    }
    
    const bioForTx = localStorage.getItem('biometricForTx') === 'true';
    if (!newState && !bioForTx) {
        console.log('[DEBUG] Both children OFF -> disabling parent');
        localStorage.setItem('biometricsEnabled', 'false');
        
        if (window.__sec_KEYS && window.__sec_KEYS.biom) {
            localStorage.setItem(window.__sec_KEYS.biom, '0');
        }
        
        const mainSwitch = document.getElementById('biometricsSwitch');
        if (mainSwitch) {
            mainSwitch.setAttribute('aria-checked', 'false');
            mainSwitch.classList.remove('active');
            mainSwitch.classList.add('inactive');
        }
        
        const subgroup = document.getElementById('biometricsOptions');
        if (subgroup) subgroup.hidden = true;
        
        if (typeof notify === 'function') {
            notify('Biometrics fully disabled (both options off)', 'info');
        }
    } else {
        if (typeof notify === 'function') {
            notify(newState ? 'Biometrics enabled for login' : 'Biometrics disabled for login', newState ? 'success' : 'info');
        }
    }
    
    console.log('[DEBUG] handleBioLoginToggle complete:', {
        bioForLogin: localStorage.getItem('biometricForLogin'),
        bioForTx: localStorage.getItem('biometricForTx'),
        biometricsEnabled: localStorage.getItem('biometricsEnabled')
    });
}

async function handleBioTxToggle(e) {
    e.preventDefault();
    const switchBtn = e.currentTarget;
    const currentlyOn = switchBtn.getAttribute('aria-checked') === 'true';
    const newState = !currentlyOn;
    
    console.log('[DEBUG] handleBioTxToggle clicked:', { currentlyOn, newState });
    
    switchBtn.setAttribute('aria-checked', newState.toString());
    if (newState) {
        switchBtn.classList.add('active');
        switchBtn.classList.remove('inactive');
    } else {
        switchBtn.classList.add('inactive');
        switchBtn.classList.remove('active');
    }
    localStorage.setItem('biometricForTx', newState ? 'true' : 'false');
    
    if (window.__sec_KEYS && window.__sec_KEYS.bioTx) {
        localStorage.setItem(window.__sec_KEYS.bioTx, newState ? '1' : '0');
    }
    
    const bioForLogin = localStorage.getItem('biometricForLogin') === 'true';
    if (!newState && !bioForLogin) {
        console.log('[DEBUG] Both children OFF -> disabling parent');
        localStorage.setItem('biometricsEnabled', 'false');
        
        if (window.__sec_KEYS && window.__sec_KEYS.biom) {
            localStorage.setItem(window.__sec_KEYS.biom, '0');
        }
        
        const mainSwitch = document.getElementById('biometricsSwitch');
        if (mainSwitch) {
            mainSwitch.setAttribute('aria-checked', 'false');
            mainSwitch.classList.remove('active');
            mainSwitch.classList.add('inactive');
        }
        
        const subgroup = document.getElementById('biometricsOptions');
        if (subgroup) subgroup.hidden = true;
        
        if (typeof notify === 'function') {
            notify('Biometrics fully disabled (both options off)', 'info');
        }
    } else {
        if (typeof notify === 'function') {
            notify(newState ? 'Biometrics enabled for transactions' : 'Biometrics disabled for transactions', newState ? 'success' : 'info');
        }
    }
    
    console.log('[DEBUG] handleBioTxToggle complete:', {
        bioForLogin: localStorage.getItem('biometricForLogin'),
        bioForTx: localStorage.getItem('biometricForTx'),
        biometricsEnabled: localStorage.getItem('biometricsEnabled')
    });
}

async function handleBioToggle(e) {
  e.preventDefault();
  const mainSwitch = e.currentTarget;
  const currentlyEnabled = mainSwitch.getAttribute('aria-checked') === 'true';
  
  if (currentlyEnabled) {
    await disableBiometrics();  // Your disable func (if exists; else local clear)
    mainSwitch.setAttribute('aria-checked', 'false');
    mainSwitch.classList.remove('active');
    mainSwitch.classList.add('inactive');
    const subgroup = document.getElementById('biometricsOptions');
    if (subgroup) subgroup.hidden = true;
    notify('Biometrics disabled', 'info');
  } else {
    const { success } = await registerBiometrics();  // Your register func
    if (success) {
      mainSwitch.setAttribute('aria-checked', 'true');
      mainSwitch.classList.add('active');
      mainSwitch.classList.remove('inactive');
      const subgroup = document.getElementById('biometricsOptions');
      if (subgroup) subgroup.hidden = false;
      localStorage.setItem('biometricForLogin', 'true');
      localStorage.setItem('biometricForTx', 'true');
      notify('Biometrics enabled', 'success');
    }
  }
}











async function onDashboardLoad() {
  console.log('[onDashboardLoad] fired');
  console.log('[onDashboardLoad] loadLatestHistoryAsFallback available?', typeof loadLatestHistoryAsFallback);
  const cachedUserData = localStorage.getItem('userData');
  if (cachedUserData) {
    try {
      const parsed = JSON.parse(cachedUserData);
      if (Date.now() - parsed.cachedAt < 300000) {
        const firstName = parsed.fullName?.split(' ')[0] || 'User';
        const domReady = await waitForDomReady(); // Reuse your func
        if (domReady) applySessionToDOM(parsed, firstName);
      }
    } catch (e) { /* ignore */ }
  }

  let session = null;
  try {
    session = await getSession(); // <-- only one call in the entire function
  } catch (err) {
    console.warn('[onDashboardLoad] getSession() failed:', err);
    session = null;
  }



if (session?.user && typeof window.seedKYCStateFromSessionUser === 'function') {
  window.seedKYCStateFromSessionUser(session.user);
}

  setupBroadcastSubscription();
  subscribeToWalletBalance();
  if (typeof loadLatestHistoryAsFallback === 'function') {
  loadLatestHistoryAsFallback();
} else {
  const maxWait = 5000;
  const interval = 100;
  let waited = 0;
  const waitForHistory = setInterval(() => {
    waited += interval;
    if (typeof loadLatestHistoryAsFallback === 'function') {
      clearInterval(waitForHistory);
      console.log(`[onDashboardLoad] loadLatestHistoryAsFallback ready after ${waited}ms`);
      loadLatestHistoryAsFallback();
    } else if (waited >= maxWait) {
      clearInterval(waitForHistory);
      console.warn('[onDashboardLoad] loadLatestHistoryAsFallback never became available');
    }
  }, interval);
}
  await loadInitialUserTotals();
  subscribeToUserRealtime();



  await renderDashboardCardsFromState({ preferServer: true });

  initializeSmartAccountPinButton();

  try {
    const broadcasts = await fetchActiveBroadcasts(); // this already shows banner & sets active_broadcast_id
    console.debug('[BCAST] fetchActiveBroadcasts returned', broadcasts.length);
  } catch (err) {
    console.warn('[BCAST] fetchActiveBroadcasts failed at login', err);
  }

  try {
    const freshRes = await fetch(`${window.__SEC_API_BASE}/api/session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'  // Ensure fresh server data
      }
    });
    if (!freshRes.ok) throw new Error(`Fresh session fetch failed: ${freshRes.status}`);
    const freshPayload = await freshRes.json();
    const freshSession = { user: freshPayload.user || {} };  // Mimic getSession structure

    console.log('[DEBUG-SYNC-FRESH] Raw fresh session.user:', {
      hasPin: freshSession?.user?.hasPin,
      hasBiometrics: freshSession?.user?.hasBiometrics,
      uid: freshSession?.user?.uid,
      email: freshSession?.user?.email
    });

    const hasPin = freshSession?.user?.hasPin || localStorage.getItem('hasPin') === 'true' || false;
    localStorage.setItem('hasPin', hasPin ? 'true' : 'false');

    const biometricsEnabled = freshSession?.user?.hasBiometrics || localStorage.getItem('biometricsEnabled') === 'true' || false;
    localStorage.setItem('biometricsEnabled', biometricsEnabled ? 'true' : 'false');

    console.log('[DEBUG-SYNC-FRESH] Post-sync localStorage:', {
      hasPin: localStorage.getItem('hasPin'),
      biometricsEnabled: localStorage.getItem('biometricsEnabled'),
      credentialId: localStorage.getItem('credentialId')
    });

    if (biometricsEnabled) {
      const storedLogin = localStorage.getItem('biometricForLogin');
      const storedTx = localStorage.getItem('biometricForTx');

      if (storedLogin === null) localStorage.setItem('biometricForLogin', 'true');
      if (storedTx === null) localStorage.setItem('biometricForTx', 'true');

      console.log('[DEBUG-SYNC] Sub-flags preserved/defaulted:', {
        bioForLogin: localStorage.getItem('biometricForLogin') === 'true',
        bioForTx: localStorage.getItem('biometricForTx') === 'true'
      });
    }

    if (localStorage.getItem('biometricsEnabled') === 'true' && localStorage.getItem('credentialId')) {
      prefetchAuthOptions();
    }
    await restoreBiometricUI();

  } catch (err) {
    console.warn('[onDashboardLoad] Flag sync error', err);
    try {
      const useSession = session; // reuse single call result (may be null)
      const hasPin = useSession?.user?.hasPin || localStorage.getItem('hasPin') === 'true' || false;
      localStorage.setItem('hasPin', hasPin ? 'true' : 'false');

      const biometricsEnabled = useSession?.user?.hasBiometrics || localStorage.getItem('biometricsEnabled') === 'true' || false;
      localStorage.setItem('biometricsEnabled', biometricsEnabled ? 'true' : 'false');

      if (!biometricsEnabled) {
        localStorage.setItem('biometricForLogin', 'false');
        localStorage.setItem('biometricForTx', 'false');
      }

      if (biometricsEnabled && localStorage.getItem('credentialId')) {
        prefetchAuthOptions();
      }
      await restoreBiometricUI();
    } catch (fallbackErr) {
      console.error('[onDashboardLoad] Fallback sync failed too', fallbackErr);
    }
  }


  if (window.__reauth && typeof window.__reauth.initReauthModal === 'function') {
    await window.__reauth.initReauthModal();
  } else {
    console.warn('initReauthModal not available - skipping');
  }
  if (window.__reauth && typeof window.__reauth.setupInactivity === 'function') {
    window.__reauth.setupInactivity();
  } else {
    console.warn('setupInactivity not available - skipping');
  }

  (function(){
    let __fg_reauth_timer = null;
    const __fg_reauth_debounce_ms = 600; // slightly larger debounce to allow server to settle
    const MIN_REAUTH_POLL_MS = 700;
    let __fg_last_reauth_poll = 0;

    window.addEventListener('fg:reauth-success', (ev) => {
      try {
        if (typeof hideTinyReauthNotice === 'function') {
          try { hideTinyReauthNotice(); } catch (e) { /* swallow */ }
        }

        if (__fg_reauth_timer) clearTimeout(__fg_reauth_timer);
        __fg_reauth_timer = setTimeout(() => {
          __fg_reauth_timer = null;
          const now = Date.now();
          if (now - __fg_last_reauth_poll < MIN_REAUTH_POLL_MS) {
            console.debug('fg:reauth-success: recent poll already run — skipping immediate poll');
            return;
          }
          __fg_last_reauth_poll = now;
          try {
            if (typeof pollStatus === 'function') {
              pollStatus();
            }
          } catch (e) {
            console.warn('fg:reauth-success -> pollStatus failed', e);
          }
        }, __fg_reauth_debounce_ms);
      } catch (err) {
        console.warn('fg:reauth-success handler error', err);
      }
    }, { passive: true });
  })();

try {
  const IDLE_TIME = 30 * 60 * 1000; // 30 minutes
  const last = parseInt(localStorage.getItem('lastActive')) || 0;
  if (Date.now() - last > IDLE_TIME) {
    let reauthCheck = null;
    try {
      reauthCheck = await shouldReauth(); // shouldReauth talks to /reauth/status
    } catch (e) {
      console.warn('boot-time shouldReauth failed, falling back to soft prompt', e);
    }

    if (reauthCheck && reauthCheck.needsReauth) {
      try {
        if (window.__reauth && typeof window.__reauth.showReauthModal === 'function') {
          await window.__reauth.showReauthModal('reauth');
        } else {
          await showReauthModal('reauth');
        }
      } catch (e) {
        console.warn('Failed to show reauth modal on boot; falling back to inactivity prompt', e);
        await showInactivityPrompt();
      }
    } else {
      try { resetIdleTimer(); } catch (e) { console.warn('resetIdleTimer on boot failed', e); }
    }
  }
} catch (e) {
  console.warn('boot-time inactivity check failed', e);
}

  if (window.__idleDetection) {
    await window.__idleDetection.setup();
  }

if (typeof pollStatus === 'function') pollStatus();

setInterval(() => pollStatus(), 30000);

getSharedJWT().catch(() => {});


  async function registerSW() {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[DEBUG] SW registered', reg);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                setTimeout(() => {
                  if (confirm('Update available! Reload for latest features?')) {
                    window.location.reload();
                  }
                }, 2000);
              } else {
                window.location.reload();
              }
            }
          });
        });

        reg.addEventListener('activated', (e) => {
          if (e.isUpdate) console.log('[DEBUG] SW activated - new cache loaded');
        });
      } catch (err) {
        console.warn('[WARN] SW registration failed', err);
      }
    }
  }

  if (localStorage.getItem('justLoggedIn') === 'true') {
    localStorage.removeItem('justLoggedIn');
    setupInactivity();
  }

  async function checkForUpdates() {
    try {
      const res = await fetch(`/frontend/pwa/manifest.json?v=${APP_VERSION}`);
      if (!res.ok) throw new Error('Version check failed');
      console.log('[DEBUG] App up-to-date');
    } catch (err) {
      console.log('[DEBUG] Version mismatch - triggering reload');
      window.location.reload();
    }
  }

  registerSW();
  checkForUpdates();
  pollStatus(); // Initial
  setInterval(pollStatus, 30000); // Every 30s


}



/**
 * Hides dashboard cards based on completion status from server
 * Call this after getSession() or on dashboard load
 */



async function manageDashboardCards(forceHidePin = false, forceShowProfile = false) {
    const traceId = `DC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const log = (msg, data = {}) => {
        const ts = new Date().toISOString();
        console.log(`[DC-TRACE ${ts} #${traceId}] ${msg}`, data);
    };
    
    try {
        log('START: Checking cards visibility', { forceHidePin, forceShowProfile });
        
        function applyToCard(cardId, shouldHide, cardType = 'generic') {
            const card = document.getElementById(cardId);
            if (!card) {
                log(`APPLY: ${cardType} card element NOT FOUND - check ID '${cardId}'`);
                return;
            }
            
            const hideClass = 'dashboard-card-hidden';
            const fadeClass = 'dashboard-card-fading';
            
            log(`APPLY: ${cardType} card - shouldHide: ${shouldHide}`, { id: cardId });
            
            if (shouldHide) {
                card.classList.add(fadeClass);
                setTimeout(() => {
                    card.classList.add(hideClass);
                    card.classList.remove(fadeClass);
                    log(`APPLY: ${cardType} fade-to-hide complete`);
                }, 200);
            } else {
                card.classList.remove(hideClass, fadeClass);
                card.style.display = 'flex';  // Inline restore - no !important needed
                log(`APPLY: ${cardType} show with inline flex`);
            }
            
            requestAnimationFrame(() => {
                const computed = getComputedStyle(card).display;
                log(`APPLY: ${cardType} post-paint check`, { 
                    shouldHide, 
                    computed, 
                    finalVisible: computed !== 'none',
                    classList: card.className 
                });
                
                if (shouldHide && computed !== 'none') {
                    log(`WARN: ${cardType} mismatch - forcing hide`);
                    card.classList.add(hideClass);
                    card.style.setProperty('display', 'none', 'important');
                } else if (!shouldHide && computed !== 'flex') {
                    log(`WARN: ${cardType} mismatch - forcing flex`);
                    card.style.setProperty('display', 'flex', 'important');
                }
            });
        }
        
        log('PHASE1: Instant apply from localStorage');
        const localHasPin = localStorage.getItem('hasPin') === 'true';
        const localProfileCompleted = localStorage.getItem('profileCompleted') === 'true';
        
        applyToCard('dashboardPinCard', localHasPin || forceHidePin, 'PIN');
        
        applyToCard('dashboardUpdateProfileCard', localProfileCompleted || !forceShowProfile, 'Profile');
        
        if (!window.__dashboardListenersAttached) {
            log('ATTACH: Adding global listeners');
            window.addEventListener('pin-status-changed', (e) => {
                log('EVENT: pin-status-changed');
                manageDashboardCards(true);
            });
            window.addEventListener('profile-status-changed', (e) => {
                log('EVENT: profile-status-changed');
                manageDashboardCards(false, true);  // Force show Profile
            });
            window.addEventListener('storage', (e) => {
                log('EVENT: storage changed', { key: e.key });
                if (e.key === 'hasPin') manageDashboardCards(true);
                if (e.key === 'profileCompleted') manageDashboardCards(false, true);
            });
            window.__dashboardListenersAttached = true;
        } else {
            log('ATTACH: Listeners already attached');
        }
        
        log('PHASE2: Background server sync (await getSession for both PIN + Profile)');
        try {
            if (typeof getSession === 'function') {
                log('SYNC: Calling getSession()');
                const sessionStart = Date.now();
                const session = await getSession();  // Await fresh server data
                const sessionDuration = Date.now() - sessionStart;
                log('SYNC: getSession() complete', { durationMs: sessionDuration, sessionExists: !!session });
                
                if (session?.user) {
                    const serverHasPin = session.user.hasPin || false;
                    log('SYNC: PIN server value', { serverHasPin });
                    
                    const serverProfileCompleted = session.user.profileCompleted || false;
                    log('SYNC: Profile server value', { serverProfileCompleted });
                    
                    const oldHasPin = localHasPin;
                    const oldProfileCompleted = localProfileCompleted;
                    log('SYNC: Old local values', { oldHasPin, oldProfileCompleted });
                    
                    localStorage.setItem('hasPin', serverHasPin ? 'true' : 'false');
                    localStorage.setItem('profileCompleted', serverProfileCompleted ? 'true' : 'false');
                    log('SYNC: Updated localStorage from server', { newHasPin: serverHasPin, newProfileCompleted: serverProfileCompleted });
                    
                    log('SYNC: Re-applying to PIN after server sync');
                    applyToCard('dashboardPinCard', serverHasPin, 'PIN');
                    
                    log('SYNC: Re-applying to Profile after server sync');
                    applyToCard('dashboardUpdateProfileCard', serverProfileCompleted, 'Profile');
                    
                    if (serverHasPin !== oldHasPin) {
                        log('SYNC: Dispatching pin-status-changed');
                        window.dispatchEvent(new Event('pin-status-changed'));
                    }
                    if (serverProfileCompleted !== oldProfileCompleted) {
                        log('SYNC: Dispatching profile-status-changed');
                        window.dispatchEvent(new Event('profile-status-changed'));
                    }
                } else {
                    log('SYNC: No user in session - fallback to local');
                }
            } else {
                log('SYNC: getSession() not available - fallback to local');
            }
        } catch (e) {
            log('SYNC: Failed', { error: e.message });
            log('SYNC: Fallback re-apply from local (server error)');
            applyToCard('dashboardPinCard', localHasPin, 'PIN');
            applyToCard('dashboardUpdateProfileCard', localProfileCompleted, 'Profile');
        }
        
        log('END: manageDashboardCards complete');
        
    } catch (err) {
        log('ERROR: Unexpected', { error: err.message });
    }
}

function initializeSmartAccountPinButton() {
    try {
        const accountPinRow = document.getElementById('securityPinRow');
        const accountPinStatus = document.getElementById('accountPinStatus');    if (!accountPinRow || !accountPinStatus) {
        console.warn('[Smart PIN Button] Account Pin elements not found in security modal');
        return;
    }
    
    console.log('[Smart PIN Button] Found Account Pin row, setting up smart behavior');
    
    async function openPinModal(mode = 'setup') {
        const modalId = mode === 'change' ? 'securityPinModal' : 'pinModal';
        
        if (typeof window.ModalManager !== 'undefined' && typeof window.ModalManager.openModal === 'function') {
            window.ModalManager.openModal(modalId);
            console.log(`[Smart PIN Button] Opened ${modalId} via ModalManager for ${mode}`);
        } else {
            const modal = document.getElementById(modalId) || 
                          document.querySelector(`.${mode === 'change' ? 'pin-change-modal' : 'pin-setup-modal'}`);
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('active');
                modal.style.display = 'flex';
                console.log(`[Smart PIN Button] Direct open ${modalId} for ${mode}`);
            } else {
                console.error(`[Smart PIN Button] ${modalId} not found for ${mode}`);
                if (typeof notify === 'function') notify(`${mode.charAt(0).toUpperCase() + mode.slice(1)} PIN not available`, 'error');
                return false;
            }
        }
        setTimeout(() => focusFirstInput(mode), 100);
        return true;
    }
    
    function focusFirstInput(mode) {
        const modal = document.querySelector('.modal.active, .pin-modal:not(.hidden), #pinModal:not(.hidden), #securityPinModal:not(.hidden)');
        if (!modal) return;
        const firstInput = modal.querySelector('input[type="password"], input[autofocus], .pin-input, input[role="pin"]');
        
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        if (!firstInput) {
            try { modal.querySelector('h2, .modal-title, [role="banner"]')?.focus?.({ preventScroll: true }); } catch(e) {}
            return;
        }
        
        if (isMobile) {
            try { const title = modal.querySelector('.pin-header h2, .modal-title'); if (title) title.focus({ preventScroll: true }); } catch (e) {}
            return;
        }
        
        try {
            firstInput.focus({ preventScroll: true });
            firstInput.setAttribute('aria-label', mode === 'change' ? 'Enter current PIN' : 'Enter new PIN');
        } catch (e) {
            try { firstInput.focus(); } catch (e2) {}
        }
    }
    
    function updateAccountPinButton() {
        const hasPin = localStorage.getItem('hasPin') === 'true';
        
        if (hasPin) {
            accountPinStatus.textContent = 'PIN set. You can change your PIN here';
            console.log('[Smart PIN Button] Updated to "change PIN" mode');
        } else {
            accountPinStatus.textContent = 'No PIN set. Setup PIN';
            console.log('[Smart PIN Button] Updated to "setup PIN" mode');
        }
    }
    
    updateAccountPinButton();
    
    accountPinRow.addEventListener('click', async function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        e.stopPropagation();
        
        const hasPin = localStorage.getItem('hasPin') === 'true';
        
        console.log('[Smart PIN Button] Clicked (blocked ModalManager), hasPin:', hasPin);
        
        const opened = await openPinModal(hasPin ? 'change' : 'setup');
        if (!opened) {
            console.warn('[Smart PIN Button] Failed to open modal');
            return;
        }
        
    }, { capture: true, passive: false });  // Capture: Runs FIRST!
    
    window.addEventListener('pin-status-changed', function() {
        console.log('[Smart PIN Button] PIN status changed, updating button');
        updateAccountPinButton();
        
        if (typeof manageDashboardCards === 'function') {
            manageDashboardCards();
        }
    });
    
    window.addEventListener('storage', function(e) {
        if (e.key === 'hasPin') {
            console.log('[Smart PIN Button] hasPin changed in storage, updating button');
            updateAccountPinButton();
        }
    });
    
    console.log('[Smart PIN Button] Initialization complete');
    
} catch (err) {
    console.error('[Smart PIN Button] Initialization error:', err);
}}


async function restoreBiometricUI() {
    const biometricsEnabledRaw = localStorage.getItem('biometricsEnabled');
    const credentialId = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id');
    const hasPin = localStorage.getItem('hasPin') === 'true';
    const bioForLoginRaw = localStorage.getItem('biometricForLogin');
    const bioForTxRaw = localStorage.getItem('biometricForTx');
    
    console.log('[DEBUG-UI] restoreBiometricUI RAW localStorage reads:', {
        biometricsEnabled: biometricsEnabledRaw,
        credentialId: credentialId,
        bioForLogin: bioForLoginRaw,
        bioForTx: bioForTxRaw,
        hasPin
    });
    
    let biometricsEnabled = biometricsEnabledRaw === 'true';
    let bioForLogin = bioForLoginRaw === 'true';
    let bioForTx = bioForTxRaw === 'true';
    
    const atLeastOneChildEnabled = bioForLogin || bioForTx;
    
    if (biometricsEnabledRaw === null && bioForLoginRaw === null && bioForTxRaw === null) {
        console.log('[DEBUG-UI] First-time setup detected, leaving all OFF');
        biometricsEnabled = false;
        bioForLogin = false;
        bioForTx = false;
    }
    else if (biometricsEnabled && bioForLoginRaw === null && bioForTxRaw === null) {
        console.log('[DEBUG-UI] Bio enabled but children unset -> defaulting children to true');
        bioForLogin = true;
        bioForTx = true;
        localStorage.setItem('biometricForLogin', 'true');
        localStorage.setItem('biometricForTx', 'true');
    }
    else if (biometricsEnabled && !bioForLogin && !bioForTx) {
        console.log('[DEBUG-UI] Both children OFF -> turning parent OFF');
        biometricsEnabled = false;
        localStorage.setItem('biometricsEnabled', 'false');
    }
    else if (!biometricsEnabled) {
        console.log('[DEBUG-UI] Parent OFF -> ensuring children OFF');
        bioForLogin = false;
        bioForTx = false;
        localStorage.setItem('biometricForLogin', 'false');
        localStorage.setItem('biometricForTx', 'false');
    }
    
    console.log('[DEBUG-UI] restoreBiometricUI FINAL state:', {
        biometricsEnabled,
        hasCred: !!credentialId,
        hasPin,
        bioForLogin,
        bioForTx,
        atLeastOneChildEnabled: bioForLogin || bioForTx
    });
    
    function applySwitchState(btn, checked) {
        if (!btn) return;
        try {
            btn.setAttribute('aria-checked', String(!!checked));
            if (checked) {
                btn.classList.add('active');
                btn.classList.remove('inactive');
            } else {
                btn.classList.add('inactive');
                btn.classList.remove('active');
            }
        } catch (e) {
            console.warn('applySwitchState failed', e);
        }
    }
    
    function applyFullState() {
        const mainSwitch = document.getElementById('biometricsSwitch');
        if (!mainSwitch) {
            console.warn('[WARN-UI] Main switch (#biometricsSwitch) not found');
            return false;
        }
        
        const shouldParentBeOn = biometricsEnabled && credentialId && (bioForLogin || bioForTx);
        
        console.log('[DEBUG-UI] Applying UI state:', {
            shouldParentBeOn,
            biometricsEnabled,
            hasCredential: !!credentialId,
            bioForLogin,
            bioForTx
        });
        
        if (shouldParentBeOn) {
            applySwitchState(mainSwitch, true);
            const subgroup = document.getElementById('biometricsOptions');
            if (subgroup) subgroup.hidden = false;
            
            applySwitchState(document.getElementById('bioLoginSwitch'), bioForLogin);
            applySwitchState(document.getElementById('bioTxSwitch'), bioForTx);
            
            const setupCta = document.getElementById('biometricsSetupCta');
            if (setupCta) setupCta.hidden = true;
            
            console.log('[DEBUG-UI] ✅ Applied ACTIVE state (parent ON, children visible)');
            
        } else if (biometricsEnabled && !credentialId) {
            applySwitchState(mainSwitch, false);
            const subgroup = document.getElementById('biometricsOptions');
            if (subgroup) subgroup.hidden = true;
            
            const setupCta = document.getElementById('biometricsSetupCta');
            if (setupCta) {
                setupCta.hidden = false;
            }
            
            console.warn('[WARN-UI] biometricsEnabled true but credential missing; showing setup CTA');
            
        } else {
            applySwitchState(mainSwitch, false);
            const subgroup = document.getElementById('biometricsOptions');
            if (subgroup) subgroup.hidden = true;
            
            const setupCta = document.getElementById('biometricsSetupCta');
            if (setupCta) setupCta.hidden = true;
            
            console.log('[DEBUG-UI] ⭕ Applied INACTIVE state (parent OFF, children hidden)');
        }
        
        if (!mainSwitch.__eventsAttached) {
            if (typeof handleBioToggle === 'function') {
                try { mainSwitch.addEventListener('click', handleBioToggle); } catch (e) {}
            }
            mainSwitch.__eventsAttached = true;
        }
        
        
        
        console.log('[DEBUG-UI] Final UI state - main aria-checked:', mainSwitch.getAttribute('aria-checked'));
        console.log('[DEBUG-UI] Final UI state - subgroup hidden:', document.getElementById('biometricsOptions')?.hidden);
        
        return true;
    }
    
    if (applyFullState()) return;
    
    const observer = new MutationObserver((mutations) => {
        if (applyFullState()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
        observer.disconnect();
        if (!document.getElementById('biometricsSwitch')) {
            console.error('[ERROR-UI] Settings toggle (#biometricsSwitch) never found — check markup');
        }
    }, 5000);
}

function handleBroadcast(payload) {
  console.log('[BROADCAST RECEIVED]', payload);

  const { message, url } = payload;

  if (message) {
    showBanner(message);

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BROADCAST_NOTIFICATION',
        payload: { message, url }
      });
    }
  }
}

var __fg_pin_inputCurrentEl = null;
var __fg_pin_inputNewEl = null;
var __fg_pin_inputConfirmEl = null;
var __fg_pin_changePinForm = null;
var __fg_pin_securityPinModal = null;
var __fg_pin_resetPinBtn = null;


(function installSafeClear() {
  const previous = window.__fg_pin_clearAllInputs;
  window.__fg_pin_clearAllInputs = function __fg_pin_clearAllInputs_safe() {
    try {
      const cur = (typeof __fg_pin_inputCurrentEl !== 'undefined' && __fg_pin_inputCurrentEl) ? __fg_pin_inputCurrentEl : document.getElementById('currentPin');
      const neu = (typeof __fg_pin_inputNewEl !== 'undefined' && __fg_pin_inputNewEl) ? __fg_pin_inputNewEl : document.getElementById('newPin');
      const conf = (typeof __fg_pin_inputConfirmEl !== 'undefined' && __fg_pin_inputConfirmEl) ? __fg_pin_inputConfirmEl : document.getElementById('confirmPin');

      if (cur) try { cur.value = ''; } catch (e) {}
      if (neu) try { neu.value = ''; } catch (e) {}
      if (conf) try { conf.value = ''; } catch (e) {}

      if (cur && typeof cur.focus === 'function') try { cur.focus(); } catch(e) {}
    } catch (err) {
      console.warn('__fg_pin_clearAllInputs_safe failed', err);
      if (typeof previous === 'function') try { previous(); } catch (e) { /* swallow */ }
    }
  };
})();

(function traceClearCalls(){
  const orig = window.__fg_pin_clearAllInputs;
  window.__fg_pin_clearAllInputs = function tracedClear(...args){
    console.warn('TRACE: __fg_pin_clearAllInputs called — stack:');
    console.trace();
    if (typeof orig === 'function') {
      try { return orig.apply(this, args); } catch (e) { console.error('tracedClear orig failed', e); }
    }
  };
})();






async function loadUserProfile(noCache = false) {
  const cachedUserData = localStorage.getItem('userData');
  if (!noCache && cachedUserData) {
    try {
      const parsed = JSON.parse(cachedUserData);
      if (Date.now() - parsed.cachedAt < 300000) { // 5min TTL
        console.log('[DEBUG] loadUserProfile: Fresh cache, skipping fetch');
        return parsed; // Return cache instead of fetching
      }
    } catch (e) {
      console.warn('[WARN] loadUserProfile: Invalid cache, proceeding to fetch');
    }
  }

  try {
    console.log('[DEBUG] loadUserProfile: Initiating fetch, credentials: include, time:', new Date().toISOString());

    const headers = { 'Accept': 'application/json' };

    let url = 'https://api.flexgig.com.ng/api/profile';
    if (noCache) {
      url += `?_${Date.now()}`;
    }

    const response = await fetchWithAutoRefresh(url, { method: 'GET', headers });

    console.log('[DEBUG] loadUserProfile: Response status', response.status, 'Headers', [...response.headers]);

    let parsedData = null;
    try {
      const txt = await response.text();
      parsedData = txt ? JSON.parse(txt) : null;
    } catch (e) {
      console.warn('[WARN] loadUserProfile: Response not valid JSON or empty');
      parsedData = null;
    }

    if (!response.ok) {
      const serverMsg = (parsedData && (parsedData.error || parsedData.message)) || `HTTP ${response.status}`;
      console.error('[ERROR] Profile update failed.', serverMsg);
      throw new Error(serverMsg);
    }

    const data = parsedData || {};
    console.log('[DEBUG] loadUserProfile: Parsed response data', data);

    const currentUsername = localStorage.getItem('username') || '';
    const currentProfilePicture = localStorage.getItem('profilePicture') || '';
    if (data.username && data.username !== currentUsername) {
      localStorage.setItem('username', data.username);
    }
    if (data.phoneNumber) {
      localStorage.setItem('phoneNumber', data.phoneNumber);
    }
    if (data.address) {
      localStorage.setItem('address', data.address);
    }
    if (data.profilePicture && data.profilePicture !== currentProfilePicture) {
      localStorage.setItem('profilePicture', data.profilePicture);
    }
    if (data.fullName) {
      localStorage.setItem('fullName', data.fullName);
      localStorage.setItem('fullNameEdited', data.fullNameEdited ? 'true' : 'false');
      localStorage.setItem('firstName', data.fullName.split(' ')[0] || localStorage.getItem('firstName') || 'User');
    }
    if (data.lastUsernameUpdate) {
      localStorage.setItem('lastUsernameUpdate', data.lastUsernameUpdate);
    }

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.username = data.username || userData.username;
    userData.fullName = data.fullName || userData.fullName;
    userData.profilePicture = data.profilePicture || userData.profilePicture;
    userData.cachedAt = Date.now();
    localStorage.setItem('userData', JSON.stringify(userData));

    const firstnameEl = document.getElementById('firstname');
    const avatarEl = document.getElementById('avatar');
    if (!firstnameEl || !avatarEl) {
      console.error('[ERROR] loadUserProfile: Missing DOM elements', { firstnameEl: !!firstnameEl, avatarEl: !!avatarEl });
      return data;
    }

    const firstName = data.fullName?.split(' ')[0] || localStorage.getItem('firstName') || 'User';
    const profilePicture = data.profilePicture || localStorage.getItem('profilePicture') || '';
    const isValidProfilePicture = profilePicture && /^(data:image\/|https?:\/\/|\/)/i.test(profilePicture);
    const displayName = data.username || firstName || 'User';

    const currentDisplay = firstnameEl.textContent?.toLowerCase() || '';
    const newDisplay = (displayName.charAt(0).toUpperCase() + displayName.slice(1)).toLowerCase();
    if (currentDisplay !== newDisplay) {
      firstnameEl.textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }

    const currentAvatarHTML = avatarEl.innerHTML;
    const newAvatarHTML = isValidProfilePicture 
      ? `<img src="${profilePicture}" alt="Profile Picture" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
      : displayName.charAt(0).toUpperCase();
    if (currentAvatarHTML !== newAvatarHTML) {
      avatarEl.innerHTML = newAvatarHTML;
      if (isValidProfilePicture) {
        avatarEl.removeAttribute('aria-label');
      } else {
        avatarEl.setAttribute('aria-label', displayName);
      }
    }

    return data;
  } catch (err) {
    console.error('[ERROR] loadUserProfile: Fetch failed', err);
    if (cachedUserData) {
      try {
        return JSON.parse(cachedUserData);
      } catch (e) {
        console.warn('[WARN] loadUserProfile: Cache invalid on error fallback');
      }
    }
    throw err; // Re-throw if no fallback
  }
}









let userEmail = localStorage.getItem('userEmail') || '';
let firstName = localStorage.getItem('firstName') || '';




const deleteKey = document.getElementById('deleteKey');
deleteKey.addEventListener('click', () => {
  if (currentPin.length > 0) {
    currentPin = currentPin.slice(0, -1);
    pinInputs[currentPin.length].classList.remove('filled');
    pinInputs[currentPin.length].value = '';
  }
});


async function loadProfileData() {
  console.log('[DEBUG] loadProfileData: Loading user profile into modal');

  const fullName = localStorage.getItem('fullName') || '';
  const username = localStorage.getItem('username') || '';
  const phoneNumber = localStorage.getItem('phoneNumber') || '';
  const email = localStorage.getItem('userEmail') || '';
  const address = localStorage.getItem('address') || '';
  const profilePicture = localStorage.getItem('profilePicture') || '';

  if (fullNameInput) fullNameInput.value = fullName;
  if (usernameInput) usernameInput.value = username;
  if (phoneNumberInput) phoneNumberInput.value = phoneNumber;
  if (emailInput) emailInput.value = email;
  if (addressInput) addressInput.value = address;

  if (profilePicturePreview) {
    const displayName = username || fullName.split(' ')[0] || 'User';
    const fallbackLetter = displayName.charAt(0).toUpperCase();

    if (profilePicture && isValidImageSource(profilePicture)) {
      profilePicturePreview.innerHTML = `<img src="${profilePicture}" alt="Profile Picture" class="avatar-img" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      profilePicturePreview.innerHTML = '';
      profilePicturePreview.textContent = fallbackLetter;
    }
  }

  const lastUpdate = localStorage.getItem('lastUsernameUpdate');
  if (lastUpdate && usernameInput) {
    usernameInput.disabled = true;
    if (usernameError) {
      usernameError.textContent = 'Username cannot be changed after initial setup';
      usernameError.classList.add('active', 'info');
    }
  }

  console.log('[DEBUG] loadProfileData: Data loaded', { fullName, username, email });
}





if (window.ModalManager) {
  const originalOpenModal = window.ModalManager.openModal;
  window.ModalManager.openModal = function(modalId) {
    const result = originalOpenModal.call(this, modalId);
    
    if (modalId === 'updateProfileModal') {
      setTimeout(() => {
        loadProfileData();
        attachProfileListeners();
        validateProfileForm(true);
      }, 450);
    }
    
    return result;
  };
}




function isValidImageSource(src) {
  if (!src) return false;
  return /^(data:image\/|https?:\/\/|\/)/i.test(src);
}

function updateGreetingAndAvatar(username, firstName, imageUrl) {
  const avatarEl = document.getElementById('avatar');
  const firstnameEl = document.getElementById('firstname');
  const greetEl = document.getElementById('greet');

  if (!avatarEl || !firstnameEl || !greetEl) return;

  const hour = new Date().getHours();
  greetEl.textContent = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  const profilePicture = (imageUrl !== undefined ? imageUrl : localStorage.getItem('profilePicture')) || '';
  const displayName = (username || firstName || 'User').toString();
  const displayNameCapitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  if (isValidImageSource(profilePicture)) {
    const cacheSrc = profilePicture.includes('?') ? `${profilePicture}&v=${Date.now()}` : `${profilePicture}?v=${Date.now()}`;
    avatarEl.innerHTML = `<img src="${cacheSrc}" alt="Profile Picture" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    avatarEl.removeAttribute('aria-label');
  } else {
    avatarEl.innerHTML = '';
    avatarEl.textContent = displayName.charAt(0).toUpperCase();
    avatarEl.setAttribute('aria-label', displayNameCapitalized);
  }

  firstnameEl.textContent = displayNameCapitalized;
}


let recentTransactions = JSON.parse(localStorage.getItem('recentTransactions')) || [];

window.__fg_pin_clearAllInputs = function __fg_pin_clearAllInputs_safe() {
  try {
    const cur = (typeof __fg_pin_inputCurrentEl !== 'undefined' && __fg_pin_inputCurrentEl) ? __fg_pin_inputCurrentEl : document.getElementById('currentPin');
    const neu = (typeof __fg_pin_inputNewEl !== 'undefined' && __fg_pin_inputNewEl) ? __fg_pin_inputNewEl : document.getElementById('newPin');
    const conf = (typeof __fg_pin_inputConfirmEl !== 'undefined' && __fg_pin_inputConfirmEl) ? __fg_pin_inputConfirmEl : document.getElementById('confirmPin');

    if (cur) try { cur.value = ''; } catch (e) { /* ignore */ }
    if (neu) try { neu.value = ''; } catch (e) { /* ignore */ }
    if (conf) try { conf.value = ''; } catch (e) { /* ignore */ }

    if (cur && typeof cur.focus === 'function') {
      try { cur.focus(); } catch (e) { /* ignore */ }
    } else if (neu && typeof neu.focus === 'function') {
      try { neu.focus(); } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.warn('__fg_pin_clearAllInputs_safe failed', err);
  }
};


const svgPaths = {
  mtn: '/frontend/svg/MTN-icon.svg',
  airtel: '/frontend/svg/airtel-icon.svg',
  glo: '/frontend/svg/GLO-icon.svg',
  ninemobile: '/frontend/svg/9mobile-icon.svg'
};
const svgShapes = {
  mtn: `<svg class="yellow-circle-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#FFD700"/></svg>`,
  airtel: `<svg class="airtel-rect-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="20" height="12" rx="4" fill="#e4012b"/></svg>`,
  glo: `<svg class="glo-diamond-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,12 12,22 2,12" fill="#00B13C"/></svg>`,
  ninemobile: `<svg class="ninemobile-triangle-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><polygon points="12,3 21,21 3,21" fill="#7DB700"/></svg>`,
  receive: `<svg class="bank-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 9v9h16V9l-8-5-8 5zm4 4h8v2H8v-2zm0 4h4v2H8v-2z" fill="#00cc00" stroke="#fff" stroke-width="1"/></svg>`
};


(function(){
  const orig = window.__origFetch || window.fetch;
  window.__debugFetchAuthOptions = true;
  window.fetch = async function(input, init) {
    try {
      const url = (typeof input === 'string') ? input : (input && input.url) || '';
      if (url.indexOf('/webauthn/auth/options') !== -1) {
        let body = null;
        try { body = init && init.body ? JSON.parse(init.body) : null; } catch(e){ body = init && init.body ? init.body : null; }
        console.log('[DEBUG POST] ->', url, 'body:', body);
        const start = Date.now();
        const res = await orig(input, init);
        const text = await res.text().catch(()=>'(no body)');
        console.log('[DEBUG RESP] <-', url, 'status:', res.status, 'durationMs:', Date.now()-start, 'text:', text);
        return new Response(text, { status: res.status, headers: {'Content-Type':'application/json'} });
      }
    } catch(e){ console.warn('debug fetch wrapper error', e); }
    return orig(input, init);
  };
})();




(function(){
  const AUTH_OPTIONS_TTL = 30 * 1000; // 30s

  function mkLog(prefix) {
    return {
      d: (...args) => console.debug(`[${prefix}] ${new Date().toISOString()}`, ...args),
      i: (...args) => console.info(`[${prefix}] ${new Date().toISOString()}`, ...args),
      w: (...args) => console.warn(`[${prefix}] ${new Date().toISOString()}`, ...args),
      e: (...args) => console.error(`[${prefix}] ${new Date().toISOString()}`, ...args)
    };
  }
  const __webauthn_log = mkLog('webauthn');

  function cacheAuthOptions(opts) {
    try {
      window.__cachedAuthOptions = opts || null;
      window.__cachedAuthOptionsFetchedAt = opts ? Date.now() : 0;
      __webauthn_log.d('cacheAuthOptions set', { fresh: !!opts, ts: window.__cachedAuthOptionsFetchedAt });
    } catch (e) {
      __webauthn_log.e('cacheAuthOptions error', e);
    }
  }

  function cachedOptionsFresh() {
    try {
      return !!(window.__cachedAuthOptions && window.__cachedAuthOptionsFetchedAt && (Date.now() - window.__cachedAuthOptionsFetchedAt) <= AUTH_OPTIONS_TTL);
    } catch(e){
      return false;
    }
  }

  if (!window.fromBase64Url) {
    window.fromBase64Url = function (input) {
      try {
        if (input == null) return new ArrayBuffer(0);

        if (input instanceof ArrayBuffer) return input;

        if (ArrayBuffer.isView(input)) return input.buffer;

        if (typeof input === 'object' && Array.isArray(input.data)) {
          return new Uint8Array(input.data).buffer;
        }

        if (typeof input === 'object') {
          const keys = Object.keys(input);
          const numericKeys = keys.filter(k => /^[0-9]+$/.test(k));
          if (numericKeys.length) {
            const maxIndex = Math.max(...numericKeys.map(k => parseInt(k, 10)));
            const arr = new Uint8Array(maxIndex + 1);
            for (let i = 0; i <= maxIndex; i++) {
              arr[i] = typeof input[i] === 'number' ? input[i] & 0xff : 0;
            }
            return arr.buffer;
          }
          const vals = Object.values(input);
          if (Array.isArray(vals) && vals.length && typeof vals[0] === 'number') {
            return new Uint8Array(vals.map(v => v & 0xff)).buffer;
          }
        }

        if (typeof input === 'string') {
          let s = input.replace(/-/g, '+').replace(/_/g, '/');
          while (s.length % 4) s += '=';
          const raw = atob(s);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
          return arr.buffer;
        }

        console.warn('[webauthn] fromBase64Url: unknown input type', typeof input, input);
        return new ArrayBuffer(0);
      } catch (err) {
        console.warn('[webauthn] fromBase64Url error', err, input);
        return new ArrayBuffer(0);
      }
    };
  }

  function convertOptionsFromServer(publicKey) {
    try {
      if (!publicKey) return publicKey;

      if (publicKey.challenge) {
        const ch = fromBase64Url(publicKey.challenge);
        if (ch) publicKey.challenge = new Uint8Array(ch);
      }

      if (Array.isArray(publicKey.allowCredentials)) {
        publicKey.allowCredentials = publicKey.allowCredentials.map(function(c){
          try {
            let idBuf = null;
            if (typeof c.id === 'string') {
              idBuf = fromBase64Url(c.id);
            } else if (c instanceof ArrayBuffer) {
              idBuf = c;
            } else if (ArrayBuffer.isView(c.id)) {
              idBuf = c.id.buffer;
            } else if (typeof c.id === 'object') {
              const maybe = fromBase64Url(c.id);
              idBuf = maybe && (maybe instanceof ArrayBuffer) ? maybe : null;
              if (!idBuf) {
                const vals = Object.values(c.id || {});
                if (vals.length && typeof vals[0] === 'number') idBuf = new Uint8Array(vals.map(v=>v&0xff)).buffer;
              }
            }
            return Object.assign({}, c, { id: idBuf ? new Uint8Array(idBuf) : idBuf });
          } catch (e) {
            __webauthn_log.w('allowCredentials conversion failed for item', c, e);
            return c;
          }
        });
      }

      return publicKey;
    } catch (e) {
      __webauthn_log.w('convertOptionsFromServer error', e);
      return publicKey;
    }
  }

  function deriveUserIdFromLocalStorage() {
    try {
      const ud = localStorage.getItem('userData') || localStorage.getItem('user');
      if (!ud) return null;
      const parsed = JSON.parse(ud);
      return parsed?.id || parsed?.uid || parsed?.userId || null;
    } catch (e) {
      __webauthn_log.w('deriveUserIdFromLocalStorage parse failed', e);
      return null;
    }
  }

  async function tryGetSessionUserId(timeoutMs = 600) {
    if (typeof getSession !== 'function') return null;
    let resolved = null;
    try {
      const p = (async () => {
        try {
          const s = await getSession();
          return s?.user?.id || s?.user?.uid || null;
        } catch (e) {
          return null;
        }
      })();
      const t = new Promise(r => setTimeout(() => r(null), timeoutMs));
      resolved = await Promise.race([p, t]);
      return resolved;
    } catch (e) {
      __webauthn_log.w('tryGetSessionUserId failed', e);
      return null;
    }
  }

  function deepCopyAuthOptions(opts) {
  if (!opts) return opts;
  const out = Object.assign({}, opts);
  if (opts.challenge instanceof Uint8Array) out.challenge = new Uint8Array(opts.challenge);
  else if (opts.challenge instanceof ArrayBuffer) out.challenge = opts.challenge.slice(0);
  if (Array.isArray(opts.allowCredentials)) {
    out.allowCredentials = opts.allowCredentials.map(function(c) {
      const item = Object.assign({}, c);
      if (c.id instanceof Uint8Array) item.id = new Uint8Array(c.id);
      else if (c.id instanceof ArrayBuffer) item.id = c.id.slice(0);
      return item;
    });
  }
  return out;
}

  window.getAuthOptionsWithCache = window.getAuthOptionsWithCache || (async function({ credentialId=null, userId=null }={}) {
    __webauthn_log.d('getAuthOptionsWithCache entry', { credentialId, userId, cachedFresh: cachedOptionsFresh() });
    if (cachedOptionsFresh()) {
      try {
        __webauthn_log.d('Returning fresh cached options (fast-path)');
        return deepCopyAuthOptions(window.__cachedAuthOptions); // ✅ preserves Uint8Array
      } catch(e){
        __webauthn_log.w('Cache deep-copy failed, returning raw');
        return window.__cachedAuthOptions;
      }
    }

    const apiBase = (window.__SEC_API_BASE || (typeof API_BASE!=='undefined' ? API_BASE : ''));
    const resolvedCred = credentialId || localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id') || null;

    let resolvedUser = userId || window.__webauthn_userId || deriveUserIdFromLocalStorage();
    if (!resolvedUser) {
      __webauthn_log.d('No userId yet, attempting short getSession wait');
      resolvedUser = await tryGetSessionUserId(600); // wait up to 600ms for session
    }
    __webauthn_log.d('Resolved identity', { userId: !!resolvedUser, credentialId: !!resolvedCred });

    let triedDiscoverFallback = false;
    const tryFetch = async (endpoint, body, headers) => {
      const url = `${apiBase}${endpoint}`;
      const start = Date.now();
      __webauthn_log.d('POST ->', url, 'body:', body);
      const fetchImpl = (typeof window.__origFetch !== 'undefined') ? window.__origFetch : fetch.bind(window);
      const rawRes = await fetchImpl(url, { method:'POST', credentials:'include', headers: Object.assign({'Content-Type':'application/json'}, headers||{}), body: JSON.stringify(body) });
      const duration = Date.now() - start;
      let text = '';
      try { text = await rawRes.text(); } catch(e){ text = '(no body)'; }
      __webauthn_log.d('Fetch result', { url, status: rawRes.status, ok: rawRes.ok, durationMs: duration, rawTextSample: text && text.slice ? text.slice(0,300) : text });
      return { rawRes, text, duration };
    };

    const handleSuccess = (opts) => {
      const converted = convertOptionsFromServer(opts);
      cacheAuthOptions(converted);
      return deepCopyAuthOptions(converted); // ✅ preserves Uint8Array
    };

    try {
      if (resolvedUser) {
        const body = { credentialId: resolvedCred, userId: resolvedUser };
        const { rawRes, text } = await tryFetch('/webauthn/auth/options', body);
        if (!rawRes.ok) {
          __webauthn_log.w('Primary options endpoint returned non-ok, will inspect for fallback', { status: rawRes.status, text });
          if ((rawRes.status === 400 && /missing.*user/i.test(text || '')) || !resolvedUser) {
            __webauthn_log.i('Primary failed due to missing userId; will try discover fallback');
            triedDiscoverFallback = true;
            const { rawRes: dRes, text: dText } = await tryFetch('/webauthn/auth/options', { credentialId: resolvedCred });
            if (!dRes.ok) {
              __webauthn_log.e('Discover fallback failed', { status: dRes.status, text: dText });
              throw new Error(`Auth options discover failed: ${dText || dRes.status}`);
            }
            const opts = JSON.parse(dText || '{}');
            __webauthn_log.i('Discover fallback succeeded', { allowCount: opts.allowCredentials ? opts.allowCredentials.length : 0 });
            return handleSuccess(opts);
          }
          throw new Error(text || `HTTP ${rawRes.status}`);
        }
        const opts = JSON.parse(text || '{}');
        __webauthn_log.i('Primary options fetch successful', { allowCount: opts.allowCredentials ? opts.allowCredentials.length : 0 });
        return handleSuccess(opts);
      } else {
        __webauthn_log.i('No userId resolved; calling discover endpoint to avoid Missing userId');
        const { rawRes, text } = await tryFetch('/webauthn/auth/options', { credentialId: resolvedCred });
        if (!rawRes.ok) {
          __webauthn_log.e('Discover endpoint failed', { status: rawRes.status, text });
          throw new Error(text || `HTTP ${rawRes.status}`);
        }
        const opts = JSON.parse(text || '{}');
        __webauthn_log.i('Discover options fetch successful', { allowCount: opts.allowCredentials ? opts.allowCredentials.length : 0 });
        return handleSuccess(opts);
      }
    } catch (err) {
      __webauthn_log.e('getAuthOptionsWithCache error', err);
      cacheAuthOptions(null);
      throw err;
    }
  });

  window.invalidateAuthOptionsCache = window.invalidateAuthOptionsCache || function(){ cacheAuthOptions(null); __webauthn_log.d('invalidateAuthOptionsCache called'); };

if (!window.prefetchAuthOptions) window.prefetchAuthOptions = async function prefetchAuthOptions() {
  try {
    if (window.__prefetchInFlight) {
      console.debug('[prefetchAuthOptions] abort: prefetch already in flight');
      return;
    }
    if (window.__cachedAuthOptionsLock) {
      console.debug('[prefetchAuthOptions] abort: cached options locked (auth in progress)');
      return;
    }

    if (typeof cachedOptionsFresh === 'function' && cachedOptionsFresh()) {
      console.debug('[prefetchAuthOptions] cache fresh, skipping fetch');
      return;
    }

    window.__prefetchInFlight = true;

    const storedId = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id');
    if (!storedId) {
      window.__prefetchInFlight = false;
      return;
    }

    const res = await fetch((window.__SEC_API_BASE || API_BASE) + '/webauthn/auth/options', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId: storedId, userId: (window.__webauthn_userId || null) })
    });

    if (!res.ok) {
      console.warn('[prefetchAuthOptions] options fetch not ok', await res.text().catch(()=>'(no-body)'));
      window.__prefetchInFlight = false;
      return;
    }

    const publicKey = await res.json();

    try {
      if (publicKey.challenge && typeof publicKey.challenge === 'string' && typeof window.fromBase64Url === 'function') {
        const ch = window.fromBase64Url(publicKey.challenge);
        if (ch) publicKey.challenge = new Uint8Array(ch);
      }
      if (Array.isArray(publicKey.allowCredentials)) {
        publicKey.allowCredentials = publicKey.allowCredentials.map(function(c){
          try {
            const idVal = (typeof c.id === 'string') ? (window.fromBase64Url ? window.fromBase64Url(c.id) : null) : c.id;
            return {
              type: c.type || 'public-key',
              transports: c.transports || ['internal'],
              id: idVal ? new Uint8Array(idVal) : idVal
            };
          } catch (e) {
            return { type: c.type || 'public-key', transports: c.transports || ['internal'], id: c.id };
          }
        });
      }
    } catch (e) {
      console.warn('[prefetchAuthOptions] conversion error', e);
    }

    if (window.__cachedAuthOptionsLock) {
      console.debug('[prefetchAuthOptions] fetched options but lock active — discarding to avoid race');
    } else {
      window.__cachedAuthOptions = publicKey;
      window.__cachedAuthOptionsFetchedAt = Date.now();
      console.log('[prefetchAuthOptions] cached auth options ready');
    }
  } catch (err) {
    console.warn('[prefetchAuthOptions] failed', err);
  } finally {
    window.__prefetchInFlight = false;
  }
};


  if (!window.__webauthnFetchWrapped) {
    window.__webauthnFetchWrapped = true;
    if (typeof window.fetch === 'function') {
      window.__origFetch = window.fetch.bind(window);
      window.fetch = async function(input, init){
        try {
          const url = (typeof input === 'string') ? input : (input && input.url) || '';
          if (url && url.indexOf('/webauthn/auth/options') !== -1) {
            __webauthn_log.d('fetch wrapper intercept', { url, initBody: init && init.body ? (typeof init.body === 'string' ? init.body.slice(0,400) : '[non-string body]') : null });

            const headerHasBypass = (h) => {
              if (!h) return false;
              try {
                if (typeof h.get === 'function') {
                  return !!(h.get('X-Bypass-AuthCache') || h.get('x-bypass-authcache'));
                }
                if (Array.isArray(h)) {
                  for (const pair of h) {
                    if (Array.isArray(pair) && String(pair[0]).toLowerCase() === 'x-bypass-authcache') return true;
                  }
                } else if (typeof h === 'object') {
                  for (const k of Object.keys(h)) if (k.toLowerCase() === 'x-bypass-authcache') return true;
                }
              } catch(e){ /* ignore */ }
              if (window.__bypassAuthOptions) return true;
              return false;
            };

            if (init && headerHasBypass(init.headers)) {
              __webauthn_log.i('fetch wrapper bypass header present - calling network directly');
              return window.__origFetch(input, init);
            }

            let credentialId = null, userId = null;
            try {
              const b = init && init.body ? JSON.parse(init.body) : null;
              if (b && typeof b === 'object') { credentialId = b.credentialId || null; userId = b.userId || null; }
            } catch(e){ __webauthn_log.w('fetch wrapper parse body failed', e); }

            try {
              const opts = await window.getAuthOptionsWithCache({ credentialId, userId });
              __webauthn_log.d('fetch wrapper returning cached options', { cached: !!opts });
              return new Response(JSON.stringify(opts), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } catch (e) {
              __webauthn_log.w('fetch wrapper getAuthOptionsWithCache failed, falling back to network', e);
              return window.__origFetch(input, init);
            }
          }
        } catch(e){ __webauthn_log.w('fetch wrapper error', e); }
        return window.__origFetch(input, init);
      };
    }
  }

})();

let currentActiveShortcut = 'data'; // Always default to Data

function setActiveShortcut(shortcutId) {
  document.querySelectorAll('.short-item').forEach(item => {
    item.classList.remove('active');
  });

  const target = document.querySelector(`.short-item[data-shortcut="${shortcutId}"]:not(.coming-soon)`);
  if (target) {
    target.classList.add('active');
    currentActiveShortcut = shortcutId;
  } else {
    const dataItem = document.querySelector('.short-item[data-shortcut="data"]');
    if (dataItem) {
      dataItem.classList.add('active');
    }
    currentActiveShortcut = 'data';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveShortcut('data');
});

document.querySelectorAll('.short-item:not(.coming-soon)').forEach(item => {
  const id = item.dataset.shortcut;

  const activate = () => {
    setActiveShortcut(id);

    if (id === 'data') {
      console.log('Opening Data purchase...');
    }
  };

  item.addEventListener('click', activate);
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  });
});

document.querySelectorAll('.short-item.coming-soon').forEach(item => {
  const showComingSoon = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    showToast('This service is coming soon!', 'info');

    if (currentActiveShortcut !== 'data') {
      setActiveShortcut('data');
    }
  };

  item.addEventListener('click', showComingSoon);
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showComingSoon();
    }
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const providerClasses = ['mtn', 'airtel', 'glo', 'ninemobile'];
  const serviceItems = document.querySelectorAll('.short-item');
  const providers = document.querySelectorAll('.provider-box');
  const plansRow = document.querySelector('.plans-row');
  const continueBtn = document.getElementById('continueBtn');
  const phoneInput = document.getElementById('phone-input');
  const contactBtn = document.querySelector('.contact-btn');
  const allPlansModal = document.getElementById('allPlansModal');
  const openBtn = document.querySelector('.see-all-plans');
  const allPlansModalContent = allPlansModal.querySelector('.plan-modal-content');
  const pullHandle = allPlansModal.querySelector('.pull-handle');
  const slider = document.querySelector('.provider-grid .slider');

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const providerPrefixes = {
    MTN:       ['0702','0703','0704','0706','0707','0803','0806','0810','0813','0814','0816','0903','0906','0913','0916'],
    GLO:       ['0705','0805','0807','0811','0815','0905','0915'],
    AIRTEL:    ['0701','0708','0802','0808','0812','0901','0902','0904','0907','0911','0912'],
    ninemobile: ['0809','0817','0818','0908','0909'],
  };

  function detectProvider(phone) {
    let normalized = phone.replace(/^\+234/, '0');
    if (!normalized.startsWith('0')) normalized = '0' + normalized;
    const prefix = normalized.slice(0, 4);
    for (const [provider, prefixes] of Object.entries(providerPrefixes)) {
      if (prefixes.includes(prefix)) {
        return provider === 'ninemobile' ? '9mobile' : provider.charAt(0).toUpperCase() + provider.slice(1);
      }
    }
    return null;
  }
  window.detectProvider = window.detectProvider || detectProvider;

function formatNigeriaNumber(phone, isInitialDigit = false, isPaste = false) {
  try {
    if (!phone) {
      return { value: '', cursorOffset: 0, valid: false };
    }
    let cleaned = String(phone).replace(/[\s-]/g, '');
    let cursorOffset = 0;

    if (isInitialDigit && ['7','8','9'].includes(cleaned[0])) {
      cleaned = '0' + cleaned;
      cursorOffset = 1;
    }
    if (cleaned.startsWith('234') || cleaned.startsWith('+234')) {
      cleaned = '0' + cleaned.slice(3);
    }
    if (cleaned.length > 11) cleaned = cleaned.slice(0, 11);

    let formatted;
    if (cleaned.length <= 4) formatted = cleaned;
    else if (cleaned.length <= 7) formatted = `${cleaned.slice(0,4)} ${cleaned.slice(4)}`;
    else formatted = `${cleaned.slice(0,4)} ${cleaned.slice(4,7)} ${cleaned.slice(7)}`;

    const isValid = cleaned.length === 11 && /^0[789][01]\d{8}$/.test(cleaned);

    return { value: formatted, cursorOffset, valid: !!isValid };
  } catch (error) {
    console.error('[ERROR] formatNigeriaNumber:', error);
    return { value: '', cursorOffset: 0, valid: false };
  }
}
window.formatNigeriaNumber = window.formatNigeriaNumber || formatNigeriaNumber;


  function isNigeriaMobile(val) {
    const cleaned = val.replace(/\s/g, '');
    const prefix = cleaned.slice(0, 4);
    return cleaned.length === 11 && cleaned.startsWith('0') && Object.values(providerPrefixes).flat().includes(prefix);
  }

  function isValidPhone(val) {
    const cleaned = val.replace(/\s/g, '');
    return /^0\d{10}$/.test(cleaned);
  }

  function isProviderSelected() {
    return !!providerClasses.find(cls => slider.classList.contains(cls));
  }

  function isPlanSelected() {
    return !!plansRow.querySelector('.plan-box.selected');
  }

  function saveUserState() {
  const activeProvider = providerClasses.find(cls => slider.classList.contains(cls));
  const selectedPlan = plansRow.querySelector('.plan-box.selected'); // ← MOVED INSIDE!
  const phoneNumber = phoneInput.value;
  const rawNumber = normalizePhone(phoneNumber);

  if (!rawNumber) {
    console.warn('[WARN] saveUserState: Invalid phone number:', phoneNumber);
  }

  localStorage.setItem('userState', JSON.stringify({
    provider: activeProvider || '',
    planId: selectedPlan ? selectedPlan.getAttribute('data-id') : '',
    number: rawNumber || '',
    serviceIdx: [...serviceItems].findIndex(el => el.classList.contains('active')),
  }));

  console.log('[DEBUG] saveUserState: Saved state:', {
    provider: activeProvider,
    planId: selectedPlan ? selectedPlan.getAttribute('data-id') : '(none)',
    number: rawNumber,
  });
}
window.saveUserState = window.saveUserState || saveUserState;


  function smoothScroll(element, target, duration) {
    const start = element.scrollLeft;
    const change = target - start;
    let startTime = null;

    function animateScroll(currentTime) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
      element.scrollLeft = start + change * ease;
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    }
    requestAnimationFrame(animateScroll);
  }

  function moveSliderTo(box) {
    const boxRect = box.getBoundingClientRect();
    const gridRect = box.parentElement.getBoundingClientRect();
    const scrollContainer = box.closest('.provider-grid');
    const scrollLeft = scrollContainer.scrollLeft;

    const left = boxRect.left - gridRect.left + scrollLeft;
    const top = boxRect.top - gridRect.top;

    slider.style.width = `${boxRect.width}px`;
    slider.style.height = `${boxRect.height}px`;
    slider.style.left = `${left}px`;
    slider.style.top = `${top}px`;
    slider.style.transition = 'all 0.3s ease';

    console.log('[DEBUG] moveSliderTo: Slider moved to', {
      provider: box.classList,
      left: left,
      top: top,
      width: boxRect.width,
      height: boxRect.height,
      scrollLeft: scrollLeft
    });
  }

  function handleResize() {
    const activeProvider = document.querySelector('.provider-box.active');
    if (activeProvider) {
      moveSliderTo(activeProvider);
      console.log('[DEBUG] handleResize: Slider re-aligned to active provider:', activeProvider.classList);
    }
  }

  const debouncedHandleResize = debounce(handleResize, 100);
  window.addEventListener('resize', debouncedHandleResize);

  let providerTransitioning = false;
  let pendingProvider = null;

  function selectProvider(providerClass) {
    const providerBox = document.querySelector(`.provider-box.${providerClass}`);
    const currentActive = document.querySelector('.provider-box.active');
    const currentProvider = providerClasses.find(cls => currentActive?.classList.contains(cls));

    if (!providerBox || currentProvider === providerClass) return;

    if (providerTransitioning) {
      pendingProvider = providerClass;
      return;
    }

    providerTransitioning = true;
    pendingProvider = null;

    if (currentActive) currentActive.classList.remove('active');

    slider.style.transition = 'transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease';
    slider.style.transformOrigin = 'left center';
    slider.style.transform = 'rotateY(90deg) scale(0.8)';
    slider.style.opacity = '0';
    slider.style.boxShadow = '5px 5px 20px rgba(0,0,0,0.2)';

    const providerGrid = providerBox.closest('.provider-grid') || providerBox.closest('.provider-row');
    if (providerGrid) {
      const scrollContainer = providerGrid;
      const boxRect = providerBox.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const gap = 12;
      const scrollTarget = boxRect.left + scrollContainer.scrollLeft - containerRect.left
        - (containerRect.width - boxRect.width) / 2
        + (gap * providerClasses.indexOf(providerClass));
      smoothScroll(scrollContainer, scrollTarget, 350);
    }

    const providerNames = { mtn: 'MTN', airtel: 'AIRTEL', glo: 'GLO', ninemobile: '9MOBILE' };

    moveSliderTo(providerBox);

    const handleTransitionEnd = (e) => {
      if (!['left', 'top', 'width', 'height', 'transform', 'opacity'].includes(e.propertyName)) return;

      slider.removeEventListener('transitionend', handleTransitionEnd);

      slider.className = `slider ${providerClass}`;
      slider.innerHTML = `
        <img src="${svgPaths[providerClass]}" alt="${providerNames[providerClass]}" class="provider-icon" />
        <div class="provider-name">${providerNames[providerClass]}</div>
      `;

      slider.style.transition = 'none';
      slider.style.transformOrigin = 'right center';
      slider.style.transform = 'rotateY(90deg) scale(0.8)';
      slider.style.opacity = '0';
      slider.style.boxShadow = '5px 5px 20px rgba(0,0,0,0.2)';

      requestAnimationFrame(() => {
        slider.style.transition = 'transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease';
        slider.style.transform = 'rotateY(0deg) scale(1)';
        slider.style.opacity = '1';
        slider.style.boxShadow = '0px 5px 20px rgba(0,0,0,0.2)';
      });

      providerBox.classList.add('active');

      plansRow.classList.remove(...providerClasses);
      plansRow.classList.add(providerClass);
      plansRow.querySelectorAll('.plan-box').forEach(plan => {
        plan.classList.remove(...providerClasses);
        if (plan.classList.contains('selected')) plan.classList.add(providerClass);
      });
      allPlansModal.querySelectorAll('.plan-box.selected').forEach(p => p.classList.remove('selected', ...providerClasses));

      renderDashboardPlans(providerClass);
      renderModalPlans(providerClass);
      attachPlanListeners();
      logPlanIDs();
      updateContinueState();
      saveUserState();
      saveCurrentAppState();

      providerTransitioning = false;

      if (pendingProvider && pendingProvider !== providerClass) {
        selectProvider(pendingProvider);
      }
    };

    slider.addEventListener('transitionend', handleTransitionEnd);
  }



let __allPlansCache = [];
let __plansLoaded = false;

async function loadAllPlansOnce() {
  const CACHE_KEY = 'cached_data_plans_v14';

  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.plans)) {
        __allPlansCache = parsed.plans;
      }
    }
  } catch {}

  if (window.__REAUTH_LOCKED__ === true) {
    return __allPlansCache;
  }

  if (!__plansLoaded) {
    try {
      const res = await fetchPlans();

      if (Array.isArray(res) && res.length > 0) {
        __allPlansCache = res;
        __plansLoaded = true;
      }
    } catch {
    }
  }

  return __allPlansCache;
}


function syncSpecialPlanGradientState() {
  console.log('%c[GRADIENT SYNC] Starting...', 'color:yellow;font-weight:bold');
  
  const specialPlans = document.querySelectorAll('.plan-box.mtn.special-plan');
  console.log(`[GRADIENT SYNC] Found ${specialPlans.length} special plans`);
  
  specialPlans.forEach(plan => {
    const isSelected = plan.classList.contains('selected');
    console.log(`[GRADIENT SYNC] Plan ${plan.dataset.id} - Selected: ${isSelected}`);
    
    const existingStyle = plan.querySelector('style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const gradientStyle = document.createElement('style');
    
    gradientStyle.textContent = `
      .plan-box.mtn.special-plan[data-id="${plan.dataset.id}"]::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 8px;
        padding: 2px;
        background: conic-gradient(red, orange, yellow, cyan, red);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        pointer-events: none;
        z-index: 1;
        transition: opacity 0.3s ease;  /* Smooth fade in/out */
        opacity: ${isSelected ? '0' : '1'};
        animation: ${isSelected ? 'none' : 'borderTrain 6s linear infinite, hueShift 10s linear infinite'};
      }
      
      @keyframes borderTrain {
        0% { background-position: 0% 50%; }
        100% { background-position: 400% 50%; }
      }
      
      @keyframes hueShift {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `;
    
    plan.appendChild(gradientStyle);
    plan.style.position = 'relative';
    plan.style.overflow = 'hidden';
    
    console.log(`[GRADIENT] ${isSelected ? 'OFF' : 'ON'} for:`, plan.dataset.id);
  });
  
  console.log('%c[GRADIENT SYNC] Complete', 'color:lime;font-weight:bold');
}



window.syncSpecialPlanGradientState = window.syncSpecialPlanGradientState || syncSpecialPlanGradientState;


function attach9mobileModalListeners() {
  const modalPlans = document.querySelectorAll(
    '.plan-modal-content .plan-box.ninemobile'
  );

  modalPlans.forEach(plan => {
    plan.removeEventListener('click', plan._forcedClickListener);

    const listener = e => {
      console.log('[9MOBILE CLICK] Modal plan clicked', {
        id: plan.dataset.id,
        provider: plan.dataset.provider || 'ninemobile',
        classes: plan.className
      });

      if (typeof window.handlePlanClick === 'function') {
        handlePlanClick(e);
      }
    };

    plan._forcedClickListener = listener;
    plan.addEventListener('click', listener);
  });

  console.log(`[9MOBILE LISTENERS] ${modalPlans.length} plans are clickable`);
}

window.attach9mobileModalListeners = window.attach9mobileModalListeners || attach9mobileModalListeners;

function getSpecialPlanState(plan) {
  const dayOfMonth = new Date().getUTCDate();
  const slots      = Number(plan.daily_available_slots) || 0;
  const used       = Number(plan.daily_purchase_count)  || 0;
 
  if (plan.monthly_sold_out === true) return 'monthly_sold_out';
  if (dayOfMonth > 10)                return 'window_closed';
  if (slots > 0 && used >= slots)     return 'daily_sold_out';
  return 'available';
}

 
window.getSpecialPlanState = window.getSpecialPlanState || getSpecialPlanState;

function updateSpecialRemainingCount(plan) {
  if (
    plan.category?.toUpperCase() !== 'SPECIAL' ||
    plan.provider?.toLowerCase() !== 'mtn'
  ) return;
 
  const boxes = document.querySelectorAll(
    `.plan-box.mtn.special-plan[data-id="${plan.plan_id}"]`
  );
 
  const state = getSpecialPlanState(plan);
 
  const labelMap = {
    available:        `${Math.max(0, (Number(plan.daily_available_slots) || 0) - (Number(plan.daily_purchase_count) || 0))} left today`,
    daily_sold_out:   'Sold out today',
    monthly_sold_out: 'Sold out this month',
    window_closed:    'Available 1st–10th',
  };
 
  const isSoldOut = state !== 'available';
 
  boxes.forEach(box => {
    let el = box.querySelector('.remaining-count');
    if (!el) {
      el = document.createElement('div');
      el.className = 'remaining-count';
      box.prepend(el);
    }
 
    el.textContent = labelMap[state];
    el.classList.toggle('sold-out', isSoldOut);
 
    box.classList.toggle('sold-out', isSoldOut);
    box.style.pointerEvents = isSoldOut ? 'none'        : '';
    box.style.opacity       = isSoldOut ? '0.6'         : '';
    box.style.cursor        = isSoldOut ? 'not-allowed' : '';
  });
}
 
window.updateSpecialRemainingCount = updateSpecialRemainingCount;

async function renderDashboardPlans(provider) {
  console.log('%c[RENDER] Starting renderDashboardPlans for:', 'color:cyan;font-weight:bold', provider);
 
  const plansRow = document.querySelector('.plans-row');
  if (!plansRow) {
    console.error('[ERROR] .plans-row not found');
    return;
  }
 
  plansRow.querySelectorAll('.plan-box').forEach(p => p.remove());
  console.log('[RENDER] Cleared old plans');
 
  const plans = await loadAllPlansOnce();
  console.log('[RENDER] Total loaded plans:', plans.length);
 
  const providerPlans = plans.filter(p =>
    p.provider?.toLowerCase() === (provider === 'ninemobile' ? '9mobile' : provider.toLowerCase()) &&
    p.active === true
  );
  console.log(`[RENDER] Found ${providerPlans.length} plans for ${provider}`);
 
  let plansToShow = [];
 
  if (provider === 'ninemobile') {
    const sortedPlans = [...providerPlans].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    plansToShow = sortedPlans.slice(0, 2);
    console.log('[RENDER] 9mobile → showing first 2 plans by price');
  } else {
    const awoof   = providerPlans.filter(p => p.category.toUpperCase() === 'AWOOF').sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    const cg      = providerPlans.filter(p => p.category.toUpperCase() === 'CG').sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    const gifting = providerPlans.filter(p => p.category.toUpperCase() === 'GIFTING').sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    const special = providerPlans.filter(p => p.category.toUpperCase() === 'SPECIAL').sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
 
    console.log('[RENDER] Categories found →', {
      awoof: awoof.length,
      cg: cg.length,
      gifting: gifting.length,
      special: special.length
    });
 
    if (provider === 'airtel') {
      if (awoof.length > 0) plansToShow.push(awoof[0]);
      if (cg.length > 0)    plansToShow.push(cg[0]);
    }
    else if (provider === 'glo') {
      if (cg.length > 0)          plansToShow.push(cg[0]);
      else if (awoof.length > 0)  plansToShow.push(awoof[0]);
      if (gifting.length > 0)     plansToShow.push(gifting[0]);
    }
    else if (provider === 'mtn') {
      let specialAvailable = false;
 
      if (special.length > 0) {
        const firstSpecial = special[0];
        const state = getSpecialPlanState(firstSpecial);
 
        // Show the special box on dashboard only when available or daily sold out.
        // window_closed and monthly_sold_out → hide entirely, fall through to awoof/gifting.
        if (state === 'available' || state === 'daily_sold_out') {
          plansToShow.push(firstSpecial);
          specialAvailable = true;
          console.log(`[RENDER] Added SPECIAL to dashboard (state: ${state})`);
        } else {
          console.log(`[RENDER] SPECIAL hidden from dashboard (state: ${state})`);
        }
      }
 
      if (!specialAvailable) {
        if (awoof.length > 0) {
          plansToShow.push(awoof[0]);
          console.log('[RENDER] Added first AWOOF (position 1)');
        }
        if (gifting.length > 0) {
          plansToShow.push(gifting[0]);
          console.log('[RENDER] Added first GIFTING (position 2)');
        }
      } else {
        if (awoof.length > 0) {
          plansToShow.push(awoof[0]);
          console.log('[RENDER] Added first AWOOF as second');
        } else if (gifting.length > 0) {
          plansToShow.push(gifting[0]);
          console.log('[RENDER] Added first GIFTING as second');
        }
      }
    }
  }
 
  const seeAllBtn = plansRow.querySelector('.see-all-plans');
  if (!seeAllBtn) {
    console.error('[ERROR] .see-all-plans button not found');
    return;
  }
 
  console.log(`[RENDER] Final plans to show: ${plansToShow.length}`);
 
  plansToShow.forEach((plan, i) => {
    const already = plansRow.querySelector(`.plan-box[data-id="${plan.plan_id}"][data-provider="${provider}"]`);
    if (already) {
      console.log('[RENDER] Skipping duplicate dashboard plan:', plan.plan_id);
      return;
    }
 
    const box = document.createElement('div');
    box.className = `plan-box ${provider}`;
    box.dataset.id = plan.plan_id;
    box.dataset.provider = provider;
 
    const categoryUpper = plan.category ? plan.category.toUpperCase() : '';
 
    // ── Special plan: gradient border + state badge ────────────────────────
    let remainingCountHTML = '';
 
    if (categoryUpper === 'SPECIAL' && provider === 'mtn') {
      box.classList.add('special-plan');
 
      const state     = getSpecialPlanState(plan);
      const isSoldOut = state !== 'available';
 
      const labelMap = {
        available:        `${Math.max(0, (Number(plan.daily_available_slots) || 0) - (Number(plan.daily_purchase_count) || 0))} left today`,
        daily_sold_out:   'Sold out today',
        monthly_sold_out: 'Sold out this month',
        window_closed:    'Available 1st–10th',
      };
 
      remainingCountHTML = `
        <div class="remaining-count${isSoldOut ? ' sold-out' : ''}">
          ${labelMap[state]}
        </div>
      `;
 
      // Store state on element so post-render block can read it
      box.dataset.specialState = state;
 
      const gradientStyle = document.createElement('style');
      gradientStyle.textContent = `
        .plan-box.mtn.special-plan[data-id="${plan.plan_id}"]::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: conic-gradient(red, orange, yellow, cyan, red);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
          opacity: 1;
          animation: borderTrain 6s linear infinite, hueShift 10s linear infinite;
        }
        @keyframes borderTrain {
          0%   { background-position: 0%   50%; }
          100% { background-position: 400% 50%; }
        }
        @keyframes hueShift {
          0%   { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `;
      box.appendChild(gradientStyle);
      box.style.position = 'relative';
      box.style.overflow = 'hidden';
    }
    // ── End special plan block ─────────────────────────────────────────────
 
    const tag = (plan.category && !['STANDARD', 'NORMAL'].includes(categoryUpper))
      ? `<span class="plan-type-tag">${categoryUpper}</span>`
      : '';
 
    box.innerHTML += `
      ${remainingCountHTML}
      <div class="plan-price plan-amount">₦${plan.price}</div>
      <div class="plan-data plan-gb">${plan.data_amount || plan.data}</div>
      <div class="plan-duration">${plan.duration || plan.validity}</div>
      ${tag}
    `;
 
    plansRow.insertBefore(box, seeAllBtn);
 
    // Apply sold-out interaction state after the box is in the DOM
    if (categoryUpper === 'SPECIAL' && provider === 'mtn') {
      const state = box.dataset.specialState;
      if (state && state !== 'available') {
        box.classList.add('sold-out');
        box.style.pointerEvents = 'none';
        box.style.opacity       = '0.6';
        box.style.cursor        = 'not-allowed';
      }
    }
 
    console.log(`[RENDER] Added plan ${i + 1}: ${plan.category || 'Standard'} ₦${plan.price}`);
  });
 
  attachPlanListeners();
  syncSpecialPlanGradientState();
 
  console.log('%c[RENDER] Dashboard complete', 'color:lime;font-weight:bold');
}

async function renderModalPlans(provider) {
  console.log('%c[RENDER MODAL] Starting for:', 'color:purple;font-weight:bold', provider);
  
  const modal = document.getElementById('allPlansModal');
  if (!modal) return;

  const awoofSection = modal.querySelector('.plan-section.awoof-section');
  const giftingSection = modal.querySelector('.plan-section.gifting-section');

  const plans = await loadAllPlansOnce();
  let providerPlans = plans.filter(p => 
    p.provider?.toLowerCase() === (provider === 'ninemobile' ? '9mobile' : provider.toLowerCase()) &&
    p.active === true
  );

const existingSpecialSection = modal.querySelector('.plan-section.special-section');

if (provider !== 'mtn' && existingSpecialSection) {
  existingSpecialSection.remove();
  console.log('[RENDER MODAL] SPECIAL section removed for', provider);
}


  const sortByPrice = (planArray) => {
    return planArray.sort((a, b) => {
      const priceA = parseFloat(a.price) || 0;
      const priceB = parseFloat(b.price) || 0;
      return priceA - priceB;
    });
  };

  if (provider === 'ninemobile') {
    if (awoofSection) {
      const sortedPlans = sortByPrice([...providerPlans]);
      fillPlanSection(awoofSection, provider, 'standard', sortedPlans,
        '9MOBILE PLANS', svgShapes.ninemobile
      );
      awoofSection.style.display = 'block';
    }
    if (giftingSection) {
      giftingSection.style.display = 'none';
    }
    console.log('[RENDER MODAL] 9mobile sections rendered');
    return;
  }

  const awoofPlans = sortByPrice(providerPlans.filter(p => p.category.toUpperCase() === 'AWOOF'));
  const cgPlans = sortByPrice(providerPlans.filter(p => p.category.toUpperCase() === 'CG'));
  const giftingPlans = sortByPrice(providerPlans.filter(p => p.category.toUpperCase() === 'GIFTING'));
  
  const specialPlans = sortByPrice(providerPlans.filter(p => p.category.toUpperCase() === 'SPECIAL'));

  console.log(`[RENDER MODAL] ${provider.toUpperCase()} categories:`, {
    awoof: awoofPlans.length,
    cg: cgPlans.length,
    gifting: giftingPlans.length,
    special: specialPlans.length
  });

  if (provider === 'mtn') {
    let specialSection = modal.querySelector('.plan-section.special-section');
    if (!specialSection && specialPlans.length > 0) {
      specialSection = awoofSection.cloneNode(true);
      specialSection.classList.add('special-section');
      specialSection.classList.remove('awoof-section');
      specialSection.querySelector('.plans-grid').innerHTML = ''; // Clear cloned plans
      modal.querySelector('.plan-modal-content').insertBefore(specialSection, awoofSection);
      console.log('[RENDER MODAL] Created new SPECIAL section for MTN');
    }

    if (specialSection) {
      if (specialPlans.length > 0) {
        fillPlanSection(specialSection, provider, 'special', specialPlans,
          'MTN SPECIAL LIMITED', svgShapes[provider]
        );
        specialSection.style.display = 'block';
        console.log('[RENDER MODAL] SPECIAL section rendered with', specialPlans.length, 'plans');
      } else {
        specialSection.style.display = 'none';
      }
    }

    if (awoofSection) {
      if (awoofPlans.length > 0) {
        fillPlanSection(awoofSection, provider, 'awoof', awoofPlans,
          'MTN AWOOF', svgShapes[provider]
        );
        awoofSection.style.display = 'block';
      } else {
        awoofSection.style.display = 'none';
      }
    }

    if (giftingSection) {
      if (giftingPlans.length > 0) {
        fillPlanSection(giftingSection, provider, 'gifting', giftingPlans,
          'MTN GIFTING', svgShapes[provider]
        );
        giftingSection.style.display = 'block';
      } else {
        giftingSection.style.display = 'none';
      }
    }
  }
  else if (provider === 'airtel') {
    if (awoofSection) {
      if (awoofPlans.length > 0) {
        fillPlanSection(awoofSection, provider, 'awoof', awoofPlans,
          'AIRTEL AWOOF', svgShapes[provider]
        );
        awoofSection.style.display = 'block';
      } else {
        awoofSection.style.display = 'none';
      }
    }

    if (giftingSection) {
      if (cgPlans.length > 0) {
        fillPlanSection(giftingSection, provider, 'cg', cgPlans,
          'AIRTEL CG', svgShapes[provider]
        );
        giftingSection.style.display = 'block';
      } else {
        giftingSection.style.display = 'none';
      }
    }
  }
  else if (provider === 'glo') {
    if (awoofSection) {
      if (cgPlans.length > 0) {
        fillPlanSection(awoofSection, provider, 'cg', cgPlans,
          'GLO CG', svgShapes[provider]
        );
        awoofSection.style.display = 'block';
      } else if (awoofPlans.length > 0) {
        fillPlanSection(awoofSection, provider, 'awoof', awoofPlans,
          'GLO AWOOF', svgShapes[provider]
        );
        awoofSection.style.display = 'block';
      } else {
        awoofSection.style.display = 'none';
      }
    }

    if (giftingSection) {
      if (giftingPlans.length > 0) {
        fillPlanSection(giftingSection, provider, 'gifting', giftingPlans,
          'GLO GIFTING', svgShapes[provider]
        );
        giftingSection.style.display = 'block';
      } else {
        giftingSection.style.display = 'none';
      }
    }
  }
  
  console.log('%c[RENDER MODAL] Complete - sections configured for', 'color:lime;font-weight:bold', provider);
  attachPlanListeners();
  syncSpecialPlanGradientState();

}
window.renderModalPlans = window.renderModalPlans || renderModalPlans;

function fillPlanSection(sectionEl, provider, subType, plans, title, svg) {
  sectionEl.setAttribute('data-provider', provider);
  const grid = sectionEl.querySelector('.plans-grid');
  if (!grid) return;
 
  grid.innerHTML = '';
 
  plans.forEach((plan, index) => {
    const box = document.createElement('div');
    box.className = `plan-box ${provider}`;
    box.dataset.id = plan.plan_id;
    box.dataset.provider = provider;
 
    const categoryUpper = plan.category ? plan.category.toUpperCase() : '';
 
    // ── Determine sold-out state ───────────────────────────────────────────
    const state     = (categoryUpper === 'SPECIAL' && provider === 'mtn')
                        ? getSpecialPlanState(plan)
                        : 'available';
    const isSoldOut = state !== 'available';
    // ── End state block ────────────────────────────────────────────────────
 
    if (categoryUpper === 'SPECIAL' && provider === 'mtn') {
      box.classList.add('special-plan');
 
      const gradientStyle = document.createElement('style');
      gradientStyle.textContent = `
        .plan-box.mtn.special-plan[data-id="${plan.plan_id}"]::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: conic-gradient(red, orange, yellow, cyan, red);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
          opacity: 1;
          animation: borderTrain 6s linear infinite, hueShift 10s linear infinite;
        }
        @keyframes borderTrain {
          0%   { background-position: 0%   50%; }
          100% { background-position: 400% 50%; }
        }
        @keyframes hueShift {
          0%   { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `;
      box.appendChild(gradientStyle);
      box.style.position = 'relative';
      box.style.overflow = 'hidden';
 
      if (isSoldOut) {
        box.classList.add('sold-out');
        box.style.pointerEvents = 'none';
        box.style.opacity       = '0.6';
        box.style.cursor        = 'not-allowed';
      }
    }
 
    const tag = (categoryUpper && !['STANDARD', 'NORMAL'].includes(categoryUpper))
      ? `<span class="plan-type-tag ${categoryUpper === 'SPECIAL' ? 'special-tag' : ''}">${categoryUpper}</span>`
      : '';
 
    // ── Remaining count badge ──────────────────────────────────────────────
    let remainingCountHTML = '';
 
    if (categoryUpper === 'SPECIAL' && provider === 'mtn') {
      const labelMap = {
        available:        `${Math.max(0, (Number(plan.daily_available_slots) || 0) - (Number(plan.daily_purchase_count) || 0))} left today`,
        daily_sold_out:   'Sold out today',
        monthly_sold_out: 'Sold out this month',
        window_closed:    'Available 1st–10th',
      };
 
      remainingCountHTML = `
        <div class="remaining-count${isSoldOut ? ' sold-out' : ''}">
          ${labelMap[state]}
        </div>
      `;
    }
    // ── End badge block ────────────────────────────────────────────────────
 
    box.innerHTML += `
      ${remainingCountHTML}
      <div class="plan-amount">₦${plan.price}</div>
      <div class="plan-data">${plan.data_amount || plan.data}</div>
      <div class="plan-days">${plan.duration || plan.validity}</div>
      ${tag}
    `;
 
    grid.appendChild(box);
    console.log(`[FILL SECTION] Added modal plan ${index + 1}: ${plan.plan_id} (state: ${state})`);
  });
 
  const header = sectionEl.querySelector('.section-header');
  if (header) {
    header.querySelector('svg')?.remove();
    header.insertAdjacentHTML('afterbegin', svg);
    const h2 = header.querySelector('h2');
    if (h2) h2.textContent = title;
  }
 
  console.log(`[FILL SECTION] ${title}: ${plans.length} plans added`);
}
 
window.renderDashboardPlans = renderDashboardPlans;
window.fillPlanSection = fillPlanSection;




document.addEventListener('DOMContentLoaded', async () => {
  await loadAllPlansOnce();

  const initialProvider = providerClasses.find(cls => slider.classList.contains(cls)) || 'mtn';

  await renderDashboardPlans(initialProvider);
  await renderModalPlans(initialProvider);
  attachPlanListeners();
  logPlanIDs();
  updateContinueState();
  syncSpecialPlanGradientState();
});
const seeAllBtn = document.querySelector('.see-all-plans');
if (seeAllBtn) {
  seeAllBtn.addEventListener('click', () => {
    ModalManager.openModal('allPlansModal');
    attach9mobileModalListeners();

    setTimeout(() => {
      const dashSelected = plansRow.querySelector('.plan-box.selected');
      const activeProvider = providerClasses.find(cls => slider.classList.contains(cls));

      allPlansModalContent.scrollTop = 0;

      const awoofSection = allPlansModal.querySelector('.plan-section.awoof-section');
      const giftingSection = allPlansModal.querySelector('.plan-section.gifting-section');
      if (giftingSection) giftingSection.style.display = activeProvider === 'ninemobile' ? 'none' : 'block';
      if (awoofSection) awoofSection.style.display = 'block';

      if (dashSelected) {
        const id = dashSelected.getAttribute('data-id');
        
        allPlansModal.querySelectorAll('.plan-box.selected').forEach(p => {
          p.classList.remove('selected', ...providerClasses);
        });
        
        const modalPlan = allPlansModal.querySelector(`.plan-box[data-id="${id}"]`);
        if (modalPlan) {
          modalPlan.classList.add('selected', activeProvider);
          
          setTimeout(() => {
            modalPlan.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }, 150);
          
          console.log('[MODAL] Auto-scrolled to selected plan:', id);
        }
      }
    }, 300);
  });
}
  function logPlanIDs() {
    const dashboardPlanIDs = Array.from(plansRow.querySelectorAll('.plan-box')).map(p => p.getAttribute('data-id'));
    const modalPlanIDs = Array.from(allPlansModal.querySelectorAll('.plan-box')).map(p => p.getAttribute('data-id'));
    console.log('[RAW LOG] Dashboard plan IDs:', dashboardPlanIDs);
    console.log('[RAW LOG] Modal plan IDs:', modalPlanIDs);
  }
  window.logPlanIDs = window.logPlanIDs || logPlanIDs;

const selectedPlanByProvider = {};

function selectPlanById(id) {
  const activeProvider = providerClasses.find(cls => slider.classList.contains(cls));

  if (!id || !activeProvider) {
    console.warn('[PLAN CLICK BLOCKED]', { id, activeProvider });
    return;
  }

  console.log('%c[SELECT] START', 'color:blue;font-weight:bold', { id, activeProvider });

  document.querySelectorAll(`.plan-box.selected[data-provider="${activeProvider}"]`)
    .forEach(p => {
      p.classList.remove('selected');
      console.log('[SELECT] Cleared:', p.dataset.id);
    });

  selectedPlanByProvider[activeProvider] = id;

  let selectedPlanObj = null;
  if (window.cachedPlans && Array.isArray(window.cachedPlans)) {
    selectedPlanObj = window.cachedPlans.find(p => 
      p.plan_id === id && 
      p.provider?.toLowerCase() === (activeProvider === 'ninemobile' ? '9mobile' : activeProvider.toLowerCase())
    );
  }

  let planToSave;

  if (selectedPlanObj) {
    console.log('[SELECT] Using cached plan object for:', id);

    planToSave = {
      planId:     selectedPlanObj.plan_id || selectedPlanObj.planId || id,
      price:      Number(selectedPlanObj.price) || 0,
      dataAmount: selectedPlanObj.data_amount || selectedPlanObj.data || "N/A",
      validity:   selectedPlanObj.validity || selectedPlanObj.duration || "N/A",
      type:       selectedPlanObj.planType || selectedPlanObj.category || "STANDARD",
      category:   selectedPlanObj.category || "NORMAL",
      daily_purchase_count: Number(selectedPlanObj.daily_purchase_count) || 0,
    };
  } else {
    console.warn('[SELECT] No cached plan found → falling back to DOM parsing');

    const dashPlan = plansRow.querySelector(`.plan-box[data-id="${id}"][data-provider="${activeProvider}"]`);
    if (!dashPlan) {
      console.error('[SELECT] Dashboard plan element not found:', id);
      return;
    }

    dashPlan.classList.add('selected');
    console.log('[SELECT] Dashboard selected (fallback):', id);

    const divs = dashPlan.querySelectorAll('div');
    const priceText   = divs[0]?.textContent?.trim() || '0';
    const dataAmount  = divs[1]?.textContent?.trim() || 'N/A';
    const validity    = divs[2]?.textContent?.trim() || 'N/A';

    planToSave = {
      planId: id,
      price: parseFloat(priceText.replace(/[₦,\s]/g, '')) || 0,
      dataAmount,
      validity,
      type: 'GIFTING',           // fallback default – you can try to improve this later
      category: 'NORMAL',
      daily_purchase_count: 0
    };
  }

  let state = {};
  try {
    state = JSON.parse(localStorage.getItem('userState') || '{}');
  } catch (e) {}

  state.selectedPlan = planToSave;
  localStorage.setItem('userState', JSON.stringify(state));
  localStorage.setItem('lastSelectedPlan', JSON.stringify(planToSave));

  console.log('%c[SELECT] Full plan saved!', 'color:lime;font-weight:bold', planToSave);

  const dashPlan = plansRow.querySelector(`.plan-box[data-id="${id}"][data-provider="${activeProvider}"]`);
  if (dashPlan) {
    dashPlan.classList.add('selected');
  }

  const modalPlan = allPlansModal.querySelector(`.plan-box[data-id="${id}"][data-provider="${activeProvider}"]`);
  if (modalPlan) {
    modalPlan.classList.add('selected');
  }

  document.querySelectorAll('.plan-box').forEach(p => {
    const amount = p.querySelector('.plan-amount');
    if (!amount) return;
    if (p.classList.contains('selected') && 
        p.dataset.provider === activeProvider && 
        !p.closest('.plan-modal-content')) {
      amount.classList.add('plan-price');
    } else {
      amount.classList.remove('plan-price');
    }
  });

  syncSpecialPlanGradientState();

  updateContinueState?.();
  saveUserState?.();
  saveCurrentAppState?.();

  console.log('%c[SELECT] COMPLETE', 'color:green;font-size:15px');
}
/* ---------- ATTACH PLAN LISTENERS (MOBILE-FRIENDLY) ---------- */

  function attachPlanListeners() {
    document.querySelectorAll('.plan-box').forEach(p => {
      p.removeEventListener('click', handlePlanClick);
      p.addEventListener('click', handlePlanClick);
    });
  }
  window.attachPlanListeners = window.attachPlanListeners || attachPlanListeners;

function handlePlanClick(e) {
  const plan =
    e.currentTarget?.classList?.contains('plan-box')
      ? e.currentTarget
      : e.target.closest('.plan-box');

  if (!plan) return;

  const id = String(plan.getAttribute('data-id') || '').trim();

  const activeProvider =
    plan.dataset.provider ||
    providerClasses.find(cls => slider.classList.contains(cls));

  const isModalClick = !!plan.closest('.plan-modal-content');

  const dashPlan = Array.from(
    plansRow.querySelectorAll('.plan-box')
  ).find(p =>
    p.getAttribute('data-id') === id &&
    p.dataset.provider === activeProvider
  );

  const isDashSelected =
    !!(dashPlan && dashPlan.classList.contains('selected'));

  /* ------------------ Reselect guard ------------------ */
  if (isModalClick && isDashSelected) {
    e.stopPropagation();
    ModalManager.closeModal('allPlansModal');
    console.log('[FIXED] Reselect detected → modal closed:', id, activeProvider);
    return;
  }

  /* ------------------ Modal click ------------------ */
  if (isModalClick) {
    e.stopPropagation(); // 🔥 Prevent event bubbling
    selectPlanById(id);

    const dashPlans = Array.from(
      plansRow.querySelectorAll('.plan-box')
    );

    const first = dashPlans[0];
    const sameAsFirst =
      first &&
      first.getAttribute('data-id') === id &&
      first.dataset.provider === activeProvider;

    if (!sameAsFirst) {
      const cloneForDashboard = plan.cloneNode(true);

      cloneForDashboard.classList.remove(...providerClasses);
      cloneForDashboard.classList.add(activeProvider);
      cloneForDashboard.dataset.provider = activeProvider;

      let subType = '';
      if (activeProvider === 'mtn')
        subType = id.includes('awoof') ? 'awoof' : id.includes('gifting') ? 'gifting' : '';
      else if (activeProvider === 'airtel')
        subType = id.includes('awoof') ? 'awoof' : id.includes('cg') ? 'cg' : '';
      else if (activeProvider === 'glo')
        subType = id.includes('cg') ? 'cg' : id.includes('gifting') ? 'gifting' : '';

      cloneForDashboard.querySelector('.plan-type-tag')?.remove();

      if (subType && activeProvider !== 'ninemobile') {
        const tag = document.createElement('span');
        tag.className = 'plan-type-tag';
        tag.textContent = subType[0].toUpperCase() + subType.slice(1);
        cloneForDashboard.appendChild(tag);
      }

      plansRow.insertBefore(cloneForDashboard, plansRow.firstChild);

      const allDashPlans = plansRow.querySelectorAll('.plan-box');
      if (allDashPlans.length > 2) plansRow.removeChild(allDashPlans[2]);

      cloneForDashboard.addEventListener('click', handlePlanClick);

      console.log('[FIXED] Modal → Dashboard clone:', id, activeProvider);
    } else {
      first.classList.add('selected');
      console.log('[FIXED] First dashboard reused:', id, activeProvider);
    }

    saveUserState();
    saveCurrentAppState();
    ModalManager.closeModal('allPlansModal');
    return;
  }

  /* ------------------ Dashboard click ------------------ */
  e.stopPropagation(); // 🔥 Prevent event bubbling
  selectPlanById(id);
  syncSpecialPlanGradientState();

  return; // 🔥 CRITICAL FIX: Stop further execution
}

window.handlePlanClick = window.handlePlanClick || handlePlanClick;



/* ---------- RE-ATTACH LISTENERS AFTER RENDERS ---------- */



/* ---------- PROVIDER SWITCH HOOK ---------- */

const originalSelectProvider = selectProvider;

selectProvider = function (providerClass) {
  originalSelectProvider(providerClass);

  const lastId = selectedPlanByProvider[providerClass];
  if (lastId) {
    setTimeout(() => selectPlanById(lastId), 50);
  }

  setTimeout(() => attachPlanListeners(), 100);

  console.log('[PROVIDER] Switched to:', providerClass);
};

/* ---------- INITIALIZE ---------- */

attachPlanListeners();

  function updateContactOrCancel() {
    if (phoneInput.value.length > 0) {
      contactBtn.innerHTML = cancelSVG;
      const cancelBtn = contactBtn.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.removeEventListener('mousedown', handleCancelClick);
        cancelBtn.addEventListener('mousedown', handleCancelClick);
      }
    } else {
      contactBtn.innerHTML = contactSVG;
    }
    window.updateContactOrCancel = window.updateContactOrCancel || updateContactOrCancel;

    function handleCancelClick(e) {
      e.preventDefault();
      phoneInput.value = '';
      contactBtn.innerHTML = contactSVG;
      phoneInput.focus();
      updateContinueState();
      saveUserState();
      saveCurrentAppState();
    }
  }
  window.updateContactOrCancel = window.updateContactOrCancel || updateContactOrCancel;

  function updateContinueState() {
    const phoneValid = isValidPhone(phoneInput.value);
    if (phoneValid && isProviderSelected() && isPlanSelected()) {
      continueBtn.disabled = false;
      continueBtn.classList.add('active');
    } else {
      continueBtn.disabled = true;
      continueBtn.classList.remove('active');
    }
  }
  window.updateContinueState = window.updateContinueState || updateContinueState;

  

async function findPlanById(planId, provider) {
  const plans = await getAllPlans();
  return plans.find(p => 
    p.plan_id === planId && 
    p.provider.toLowerCase() === provider.toLowerCase()
  );
}




function initializeProviderAndPlans() {
  let providerToUse = null;

  if (history.state?.selectedProvider) {
    providerToUse = history.state.selectedProvider;
  } else if (sessionStorage.getItem('__fg_app_state_v2')) {
    try {
      const saved = JSON.parse(sessionStorage.getItem('__fg_app_state_v2'));
      if (saved.selectedProvider) providerToUse = saved.selectedProvider;
    } catch (e) {}
  } else if (localStorage.getItem('userState')) {
    try {
      const userState = JSON.parse(localStorage.getItem('userState'));
      if (userState.provider) providerToUse = userState.provider;
    } catch (e) {}
  }

  if (!providerToUse) {
    providerToUse = 'mtn';
    console.log('[INIT] No saved provider → defaulting to MTN (first visit)');
  } else {
    console.log('[INIT] Restored provider from state:', providerToUse);
  }

  const providerBox = document.querySelector(`.provider-box.${providerToUse}`);
  if (!providerBox) {
    console.error('[INIT] Provider box not found for:', providerToUse);
    return;
  }

  providers.forEach(p => p.classList.remove('active'));
  providerBox.classList.add('active');

  slider.className = `slider ${providerToUse}`;
  slider.innerHTML = `
    <img src="${svgPaths[providerToUse]}" alt="${providerToUse.toUpperCase()}" class="provider-icon" />
    <div class="provider-name">${providerToUse === 'ninemobile' ? '9MOBILE' : providerToUse.toUpperCase()}</div>
  `;
  moveSliderTo(providerBox);

  providerClasses.forEach(cls => plansRow.classList.remove(cls));
  plansRow.classList.add(providerToUse);

  plansRow.querySelectorAll('.plan-box').forEach(plan =>
    plan.classList.remove('selected', ...providerClasses)
  );

  renderDashboardPlans(providerToUse);
  renderModalPlans(providerToUse);
  attachPlanListeners();
  logPlanIDs();

  console.log('[INIT] Provider fully initialized:', providerToUse);
}

function restoreEverything() {
  const saved = JSON.parse(sessionStorage.getItem('__fg_app_state_v2') || '{}');
  console.log('[DEBUG] restoreEverything: Starting restore', saved);

  if (saved.selectedProvider) {
    const providerBox = document.querySelector(`.provider-box.${saved.selectedProvider}`);
    if (providerBox && !providerBox.classList.contains('active')) {
      selectProvider(saved.selectedProvider);
    }
  }

  setTimeout(() => {
    const activeProvider = saved.selectedProvider || 'mtn';
    const plansRow = document.querySelector('.plans-row');
    const seeAllBtn = plansRow?.querySelector('.see-all-plans');
    if (!plansRow || !seeAllBtn) {
      restorePhoneNumber(saved);
      updateContinueState();
      return;
    }

    if (saved.selectedPlanId) {
      renderModalPlans(activeProvider);

      const modalPlan = document.querySelector(`#allPlansModal .plan-box[data-id="${saved.selectedPlanId}"]`);
      if (modalPlan) {
        document.querySelectorAll('.plan-box.selected').forEach(p => {
          p.classList.remove('selected', ...providerClasses);
        });

        const currentPlans = Array.from(plansRow.children).filter(el =>
          el.classList.contains('plan-box') && !el.classList.contains('see-all-plans')
        );

        const originalFirstPlan = currentPlans[0];
        const originalSecondPlan = currentPlans[1];

        if (originalSecondPlan) {
          originalSecondPlan.remove();
        }

        const newFirstPlan = modalPlan.cloneNode(true);
        newFirstPlan.classList.remove(...providerClasses);
        newFirstPlan.classList.add(activeProvider, 'selected');

        const planId = saved.selectedPlanId;
        let subType = '';
        if (activeProvider === 'mtn') {
          subType = planId.includes('awoof') ? 'awoof' : planId.includes('gifting') ? 'gifting' : '';
        } else if (activeProvider === 'airtel') {
          subType = planId.includes('awoof') ? 'awoof' : planId.includes('cg') ? 'cg' : '';
        } else if (activeProvider === 'glo') {
          subType = planId.includes('cg') ? 'cg' : planId.includes('gifting') ? 'gifting' : '';
        }

        if (subType && activeProvider !== 'ninemobile') {
          const existingTag = newFirstPlan.querySelector('.plan-type-tag');
          if (existingTag) existingTag.remove();
          
          const tag = document.createElement('span');
          tag.className = 'plan-type-tag';
          tag.textContent = subType.charAt(0).toUpperCase() + subType.slice(1);
          newFirstPlan.appendChild(tag);
        }

        plansRow.insertBefore(newFirstPlan, originalFirstPlan);

        modalPlan.classList.add('selected', activeProvider);

        attachPlanListeners();

        console.log(`[restoreEverything] Plan restored to #1: ${saved.selectedPlanId}`);
      } else {
        console.warn('[restoreEverything] Modal plan not found:', saved.selectedPlanId);
      }
    }

    restorePhoneNumber(saved);

    attachPlanListeners(); // Safe to call again
    updateContactOrCancel(); // Update cancel button based on phone
    updateContinueState(); // Enable/disable continue



    console.log('[restoreEverything] Full restore complete');
  }, 650);
}

function restorePhoneNumber(saved) {
  if (!saved.phoneNumber) return;

  const phoneInput = document.getElementById('phone-input');
  if (!phoneInput) {
    console.warn('[restorePhoneNumber] Input not found');
    return;
  }

  let rawNumber = normalizePhone(saved.phoneNumber); // Assume normalizePhone exists; define if not
  const formatted = formatNigeriaNumber(rawNumber, false, false).value;

  phoneInput.value = formatted;
  console.log('[restorePhoneNumber] Set formatted value:', formatted, 'Raw:', rawNumber);

  phoneInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

  updateContactOrCancel();
  updateContinueState();

  const isValid = isValidPhone(formatted);
  console.log('[restorePhoneNumber] Validation:', isValid ? 'PASS' : 'FAIL', 'Length:', rawNumber.length);
}

function normalizePhone(formatted) {
  if (!formatted) return '';
  return formatted.replace(/\s/g, '').replace(/[^0-9]/g, '').slice(0, 11);
}


initializeProviderAndPlans();
restoreEverything(); 
updateContinueState();
  let touchStartX = 0, touchStartY = 0, isScrolling = false;

  const debouncedSelectProvider = debounce((providerClass) => {
    if (!isScrolling) {
      console.log('[DEBUG] debouncedSelectProvider: Triggered for provider:', providerClass);
      selectProvider(providerClass);
    }
  }, 300);

  providers.forEach(box => {
    box.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isScrolling = false;
      console.log('[DEBUG] provider-box touchstart: Start X:', touchStartX, 'Y:', touchStartY);
    });

    box.addEventListener('touchmove', (e) => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = Math.abs(touchX - touchStartX);
      const deltaY = Math.abs(touchY - touchStartY);
      if (deltaX > 10 || deltaY > 10) {
        isScrolling = true;
        console.log('[DEBUG] provider-box touchmove: Detected scrolling, deltaX:', deltaX, 'deltaY:', deltaY);
      }
    });

    box.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isScrolling) {
        const selectedProvider = providerClasses.find(cls => box.classList.contains(cls));
        if (selectedProvider) {
          debouncedSelectProvider(selectedProvider);
          console.log('[DEBUG] provider-box touchend: Provider tapped:', selectedProvider);
        }
      }
    });

    box.addEventListener('click', (e) => {
      e.stopPropagation();
      const selectedProvider = providerClasses.find(cls => box.classList.contains(cls));
      if (selectedProvider) {
        debouncedSelectProvider(selectedProvider);
        console.log('[DEBUG] provider-box click: Provider clicked:', selectedProvider);
      }
    });
  });

  phoneInput.addEventListener('keypress', (e) => {
    if (e.key === '+') {
      e.preventDefault();
      console.log('[DEBUG] phoneInput keypress: Blocked + key');
    }
  });

  phoneInput.addEventListener('beforeinput', (e) => {
  const rawInput = phoneInput.value.replace(/\s/g, '');
  const willPrependZero = rawInput.length === 0 && e.data && /^[789]$/.test(e.data);
  if ((rawInput.length >= 11 || (rawInput.length >= 10 && willPrependZero)) && e.data && /\d/.test(e.data)) {
    e.preventDefault();
    console.log('[DEBUG] phoneInput beforeinput: Blocked input beyond 11 digits, current:', rawInput, 'willPrependZero:', willPrependZero);
    return;
  }
  if (e.data && !/^\d$/.test(e.data)) {
    e.preventDefault();
    console.log('[DEBUG] phoneInput beforeinput: Blocked non-digit input:', e.data);
  }
});

  phoneInput.addEventListener('keydown', (e) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v'].includes(e.key.toLowerCase())) {
      return;
    }
    if (!allowedKeys.includes(e.key)) {
      e.preventDefault();
      console.log('[DEBUG] phoneInput keydown: Blocked non-allowed key:', e.key);
    }
  });

  function normalizePhone(input) {
    let cleaned = input.replace(/[\s-]/g, '').replace(/^\+234/, '234');
    if (cleaned.startsWith('234')) {
      cleaned = '0' + cleaned.slice(3);
    }
    if (cleaned.length <= 1 && /^[789]/.test(cleaned)) {
      cleaned = '0' + cleaned;
    }
    if (cleaned.length === 10 && /^(90|91|80|81|70|71)/.test(cleaned)) {
      cleaned = '0' + cleaned;
    }
    if (cleaned.length > 11) {
      return null;
    }
    return cleaned;
  }

  phoneInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
    console.log('[DEBUG] phoneInput paste: Raw pasted data:', pastedData);

    const normalized = normalizePhone(pastedData);
    if (!normalized) {
      phoneInput.classList.add('invalid');
      console.log('[DEBUG] phoneInput paste: Blocked invalid number:', pastedData);
      alert('Please paste a valid Nigerian phone number (e.g., +2348031234567 or 08031234567).');
      return;
    }

    const { value: formatted, cursorOffset } = formatNigeriaNumber(normalized, false, true);
    if (!formatted) {
      phoneInput.classList.add('invalid');
      console.log('[DEBUG] phoneInput paste: Invalid formatted number:', normalized);
      alert('Invalid phone number format. Please paste a valid Nigerian number.');
      return;
    }

    phoneInput.value = formatted;
    console.log('[DEBUG] phoneInput paste: Accepted and formatted:', formatted);

    const newCursorPosition = formatted.length;
    phoneInput.setSelectionRange(newCursorPosition, newCursorPosition);

    if (normalized.length >= 4) {
      const provider = detectProvider(normalized);
      if (provider) {
        const providerClass = provider.toLowerCase() === '9mobile' ? 'ninemobile' : provider.toLowerCase();
        selectProvider(providerClass);
        console.log('[DEBUG] phoneInput paste: Detected provider:', provider, 'Class:', providerClass);
      }
    }

    const prefix = normalized.slice(0, 4);
    const validPrefixes = Object.values(providerPrefixes).flat();
    phoneInput.classList.toggle('invalid', normalized.length >= 4 && !validPrefixes.includes(prefix));

    updateContactOrCancel();
    updateContinueState();
    saveUserState();
    saveCurrentAppState();

    if (normalized.length === 11 && isNigeriaMobile(normalized)) {
      phoneInput.blur();
      console.log('[RAW LOG] phoneInput paste: Keyboard closed, valid Nigeria number:', normalized);
    }
  });

  phoneInput.addEventListener('input', debounce((e) => {
  const cursorPosition = phoneInput.selectionStart;
  const rawInput = phoneInput.value.replace(/\s/g, '');
  const isInitialDigit = rawInput.length === 1 && /^[789]$/.test(rawInput);
  const isDelete = e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward';

  if (!rawInput && isDelete) {
    phoneInput.classList.remove('invalid');
    updateContactOrCancel();
    updateContinueState();
    saveUserState();
    saveCurrentAppState();
    console.log('[DEBUG] phoneInput input: Input cleared, no validation');
    return;
  }

  const normalized = normalizePhone(rawInput);
  if (!normalized && rawInput) {
    phoneInput.value = rawInput;
    phoneInput.classList.add('invalid');
    console.log('[DEBUG] phoneInput input: Invalid number, keeping raw input:', rawInput);
    updateContactOrCancel();
    updateContinueState();
    saveUserState();
    saveCurrentAppState();
    return;
  }

  let finalNormalized = normalized;
  if (normalized.length > 11) {
    finalNormalized = normalized.slice(0, 11);
    console.log('[DEBUG] phoneInput input: Truncated to 11 digits:', finalNormalized);
  }

  const { value: formatted, cursorOffset } = formatNigeriaNumber(finalNormalized, isInitialDigit, false);
  phoneInput.value = formatted;

  let newCursorPosition = cursorPosition;
  if (isInitialDigit) {
    newCursorPosition = 2; // Place cursor after '07', '08', or '09'
  } else if (finalNormalized.length >= 4 && finalNormalized.length <= 7) {
    if (cursorPosition > 4) newCursorPosition += 1;
  } else if (finalNormalized.length > 7) {
    if (cursorPosition > 4) newCursorPosition += 1;
    if (cursorPosition > 7) newCursorPosition += 1;
  }
  newCursorPosition = Math.min(newCursorPosition, formatted.length);
  phoneInput.setSelectionRange(newCursorPosition, newCursorPosition);

  if (finalNormalized.length >= 4) {
    const provider = detectProvider(finalNormalized);
    if (provider) {
      const providerClass = provider.toLowerCase() === '9mobile' ? 'ninemobile' : provider.toLowerCase();
      selectProvider(providerClass);
      console.log('[DEBUG] phoneInput input: Detected provider:', provider, 'Class:', providerClass);
    }
  }

  const prefix = finalNormalized.slice(0, 4);
  const validPrefixes = Object.values(providerPrefixes).flat();
  phoneInput.classList.toggle('invalid', finalNormalized.length >= 4 && !validPrefixes.includes(prefix));

  updateContactOrCancel();
  updateContinueState();
  saveCurrentAppState();

  if (finalNormalized.length === 11 && isNigeriaMobile(finalNormalized)) {
    phoneInput.blur();
    console.log('[RAW LOG] phoneInput input: Keyboard closed, valid Nigeria number:', finalNormalized);
  }
}, 50));
phoneInput.maxLength = 13;  // 11 digits + 2 spaces in formatted value

  continueBtn.addEventListener('click', async () => {
  if (continueBtn.disabled) return;

  console.log('%c[CHECKOUT] Continue clicked — preparing data', 'color:cyan;font-weight:bold');

  const activeProviderClass = providerClasses.find(cls => slider.classList.contains(cls));
  if (!activeProviderClass) {
    showToast('Please select a network provider', 'error');
    return;
  }

  const providerDisplay = activeProviderClass === 'ninemobile' ? '9MOBILE' : activeProviderClass.toUpperCase();

  const selectedPlanBox = plansRow.querySelector('.plan-box.selected');
  if (!selectedPlanBox) {
    showToast('Please select a data plan', 'error');
    return;
  }

  const planId = selectedPlanBox.dataset.id;
  if (!planId) {
    showToast('Invalid plan selected', 'error');
    return;
  }

  const rawPhone = normalizePhone(phoneInput.value);
  if (!rawPhone || rawPhone.length !== 11) {
    showToast('Please enter a valid phone number', 'error');
    return;
  }

  const formattedPhone = formatNigeriaNumber(rawPhone).value;

  const allPlans = await loadAllPlansOnce();
  const fullPlan = allPlans.find(p => 
    p.plan_id === planId && 
    p.provider?.toLowerCase() === (activeProviderClass === 'ninemobile' ? '9mobile' : activeProviderClass)
  );

  if (!fullPlan) {
    console.error('[CHECKOUT] Plan not found in cache:', planId, activeProviderClass);
    showToast('Plan details not available. Please try again.', 'error');
    return;
  }

  const checkoutData = {
    provider: providerDisplay,
    planId: fullPlan.plan_id,
    planName: `${fullPlan.data || fullPlan.data_amount} ${fullPlan.category || ''}`.trim(),
    dataAmount: fullPlan.data || fullPlan.data_amount || 'N/A',
    validity: fullPlan.validity || fullPlan.duration || '30 Days',
    price: Number(fullPlan.price),
    number: formattedPhone,
    rawNumber: rawPhone,
    planType: fullPlan.category || 'GIFTING'
  };

  console.log('%c[CHECKOUT] Opening modal with FULL data', 'color:lime;font-weight:bold', checkoutData);



  window.openCheckoutModal(checkoutData);
});

 

  let startY = 0, currentY = 0, translateY = 0, dragging = false;
const pullThreshold = 120;

function handleTouchStart(e) {
  if (allPlansModalContent.scrollTop > 0) return;
  dragging = true;
  startY = e.touches[0].clientY;
  translateY = 0;
  allPlansModalContent.style.transition = 'none';
}

function handleTouchMove(e) {
  if (!dragging) return;
  currentY = e.touches[0].clientY;
  let diff = currentY - startY;
  if (diff > 0) {
    let resistance = diff < 60 ? 1 : diff < 120 ? 0.8 : 0.6;
    translateY = diff * resistance;
    allPlansModalContent.style.transform = `translateY(${translateY}px)`;
    e.preventDefault();
  }
}

function handleTouchEnd() {
  if (!dragging) return;
  dragging = false;

  allPlansModalContent.style.transition = '';

  if (translateY > pullThreshold) {
    ModalManager.closeModal('allPlansModal');
  } else {
    allPlansModalContent.style.transform = 'translateY(0)';
  }

  setTimeout(() => {
    allPlansModalContent.style.opacity = '';
    allPlansModalContent.style.transform = '';
    allPlansModalContent.style.visibility = '';
  }, 100);
}

pullHandle?.addEventListener('touchstart', handleTouchStart);
pullHandle?.addEventListener('touchmove', handleTouchMove, { passive: false });
pullHandle?.addEventListener('touchend', handleTouchEnd);
allPlansModalContent.addEventListener('touchstart', handleTouchStart);
allPlansModalContent.addEventListener('touchmove', handleTouchMove, { passive: false });
allPlansModalContent.addEventListener('touchend', handleTouchEnd);





  const contactSVG = `<img src="/frontend/svg/contact-icon.svg" alt="Contact Icon" class="contact-btn contact-btn-svg" />`;
  const cancelSVG = `<button class="cancel-btn" type="button" aria-label="Clear number" tabindex="0" style="background: none; border: none; padding: 0; margin: 0;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#bfc7d3"/><path d="M8 8l8 8M16 8l-8 8" stroke="#021827" stroke-width="2" stroke-linecap="round"/></svg></button>`;

  contactBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!phoneInput) {
      console.error('[ERROR] contactBtn: #phone-input not found in DOM');
      alert('Error: Phone input field not found. Please check the DOM.');
      return;
    }

    if (!contactBtn) {
      console.error('[ERROR] contactBtn: .contact-btn not found in DOM');
      alert('Error: Contact button not found. Please check the DOM.');
      return;
    }

    if (contactBtn.querySelector('.cancel-btn')) {
      phoneInput.value = '';
      contactBtn.innerHTML = contactSVG;
      phoneInput.focus();
      updateContactOrCancel();
      updateContinueState();
      saveUserState();
      saveCurrentAppState();
      console.log('[DEBUG] contactBtn: Cancel button clicked, input cleared');
      return;
    }

    const isSupported = 'contacts' in navigator && 'ContactsManager' in window;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isSecure = window.location.protocol === 'https:';
    console.log('[DEBUG] contactBtn: Feature detection - Supported:', isSupported, 'Android:', isAndroid, 'Secure:', isSecure);

    if (!isSecure) {
      alert('The Contact Picker API requires HTTPS. Please serve the site over HTTPS.');
      console.log('[DEBUG] contactBtn: Non-secure context detected');
      return;
    }

    if (!isSupported) {
      alert('The Contact Picker API is not supported in this browser. Please use Chrome 80 or later on an Android device.');
      console.log('[DEBUG] contactBtn: Contact Picker API not supported');
      return;
    }

    if (!isAndroid) {
      alert('The Contact Picker API is only supported on Android devices.');
      console.log('[DEBUG] contactBtn: Not detected as Android device');
      return;
    }

    try {
      const supportedProperties = await navigator.contacts.getProperties();
      console.log('[DEBUG] contactBtn: Supported properties:', supportedProperties);

      if (!supportedProperties.includes('tel')) {
        console.log('[DEBUG] contactBtn: Telephone property not supported');
        alert('The Contact Picker API does not support telephone numbers on this device.');
        return;
      }

      const props = ['tel'];
      const opts = { multiple: false };
      const contacts = await navigator.contacts.select(props, opts);
      console.log('[DEBUG] contactBtn: Contacts selected:', contacts);

      if (contacts.length === 0) {
        console.log('[DEBUG] contactBtn: Contact selection cancelled');
        return;
      }

      const contact = contacts[0];
      if (!contact.tel || contact.tel.length === 0) {
        console.log('[DEBUG] contactBtn: No phone number selected in contact:', contact);
        alert('No phone number found for the selected contact.');
        return;
      }

      const rawPhone = contact.tel[0];
      console.log('[DEBUG] contactBtn: Raw phone number from contact:', rawPhone);
      const normalized = normalizePhone(rawPhone);
      console.log('[DEBUG] contactBtn: Normalized phone number:', normalized);

      if (!normalized) {
        console.log('[DEBUG] contactBtn: Invalid phone number:', rawPhone);
        alert('Please select a valid Nigerian phone number (e.g., +234 or 0 followed by a valid prefix).');
        return;
      }

      const { value: formatted, cursorOffset } = formatNigeriaNumber(normalized, false, true);
      console.log('[DEBUG] contactBtn: Formatted phone number:', formatted, 'Cursor offset:', cursorOffset);

      if (!formatted) {
        console.log('[DEBUG] contactBtn: Formatted phone number is empty or invalid');
        alert('Invalid phone number format. Please select a valid Nigerian number.');
        return;
      }

      phoneInput.value = formatted;
      console.log('[DEBUG] contactBtn: Set phoneInput.value to:', formatted);

      const newCursorPosition = formatted.length;
      phoneInput.setSelectionRange(newCursorPosition, newCursorPosition);
      console.log('[DEBUG] contactBtn: Cursor set to position:', newCursorPosition);

      if (normalized.length >= 4) {
        const provider = detectProvider(normalized);
        console.log('[DEBUG] contactBtn: Detected provider:', provider);
        if (provider) {
          const providerClass = provider.toLowerCase() === '9mobile' ? 'ninemobile' : provider.toLowerCase();
          debounce(() => {
            selectProvider(providerClass);
            console.log('[DEBUG] contactBtn: Provider selected:', providerClass);
          }, 100)();
        }
      }

      const prefix = normalized.slice(0, 4);
      const validPrefixes = Object.values(providerPrefixes).flat();
      phoneInput.classList.toggle('invalid', normalized.length >= 4 && !validPrefixes.includes(prefix));
      console.log('[DEBUG] contactBtn: Phone validation - Prefix:', prefix, 'Valid:', validPrefixes.includes(prefix));

      updateContactOrCancel();
      updateContinueState();
      saveUserState();
      saveCurrentAppState();

      if (normalized.length === 11 && isNigeriaMobile(normalized)) {
        phoneInput.blur();
        console.log('[RAW LOG] contactBtn: Keyboard closed, valid Nigeria number:', normalized);
      }
    } catch (err) {
      console.error('[ERROR] contactBtn: Error in contact selection:', err.name, err.message);
      if (err.name === 'NotAllowedError') {
        alert('Contact access denied. Please enable contact permissions in Android Settings > Apps > Chrome > Permissions > Contacts.');
      } else {
        alert(`Failed to access contacts: ${err.message}. Ensure contact permissions are enabled and try again.`);
      }
    }
  });

  updateContactOrCancel();
  updateContinueState();
  handleResize();





if (window.__recentTxInitialized) {
  console.log('[recent-tx] Already initialized — skipping');
} else {
  window.__recentTxInitialized = true;

  (async () => {
    const recentTransactionsList = document.querySelector('.recent-transactions-list');
    const recentTransactionsSection = document.querySelector('.recent-transactions');

    if (!recentTransactionsList || !recentTransactionsSection) {
      console.warn('[recent-tx] Required elements not found');
      return;
    }

    window.svgShapes = {
      mtn: `<svg class="yellow-circle-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#FFD700"/></svg>`,
      airtel: `<svg class="airtel-rect-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="6" width="20" height="12" rx="4" fill="#e4012b"/></svg>`,
      glo: `<svg class="glo-diamond-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,12 12,22 2,12" fill="#00B13C"/></svg>`,
      ninemobile: `<svg class="ninemobile-triangle-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><polygon points="12,3 21,21 3,21" fill="#7DB700"/></svg>`,
      receive: `<svg class="bank-icon" width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 9v9h16V9l-8-5-8 5zm4 4h8v2H8v-2zm0 4h4v2H8v-2z" fill="#00cc00" stroke="#fff" stroke-width="1"/></svg>`
    };

    function normalizePhone(phone) {
      return phone?.replace(/\s+/g, '').replace(/^0/, '+234') || '';
    }

    function toLocalPhone(phone) {
  if (!phone) return '';
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('+234')) return '0' + phone.slice(4);
  if (phone.startsWith('234') && phone.length === 13) return '0' + phone.slice(3);
  return phone;
}

window.toLocalPhone = toLocalPhone; // Expose globally if needed

    function renderRecentTransactions(transactions = []) {
      recentTransactionsList.innerHTML = '';

      if (!transactions.length) {
        recentTransactionsSection.classList.remove('active');
        return;
      }

      const dataSuccessTxs = transactions.filter(tx => {
  const status = (tx.status || '').toLowerCase();
  const hasPhone = !!(tx.phone?.trim());
  return status === 'success'
      && hasPhone
      && ['AWOOF', 'CG', 'GIFTING', 'SPECIAL', 'STANDARD'];
}).slice(0, 5);

      if (!dataSuccessTxs.length) {
        recentTransactionsSection.classList.remove('active');
        return;
      }

      recentTransactionsSection.classList.add('active');

      dataSuccessTxs.forEach(tx => {
        const txDiv = document.createElement('div');
        txDiv.className = 'recent-transaction-item';

        const displayName = tx.provider === 'ninemobile'
          ? '9mobile'
          : tx.provider
            ? tx.provider.charAt(0).toUpperCase() + tx.provider.slice(1).toLowerCase()
            : 'Unknown';

        let dataAmount = tx.data_amount || tx.dataAmount || '';

if (!dataAmount && tx.description) {
  const match = tx.description.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);
  if (match) dataAmount = match[0].toUpperCase();
}

if (!dataAmount) dataAmount = 'Data Bundle';

        const providerKey = tx.provider?.toLowerCase() === '9mobile' ? 'ninemobile' : tx.provider?.toLowerCase();
        const svg = window.svgShapes[providerKey] || '';

        txDiv.innerHTML = `
          <span class="tx-desc">${toLocalPhone(tx.phone)} - ${dataAmount}</span>
          <span class="tx-provider">${svg} ${displayName}</span>
        `;

        txDiv.setAttribute('role', 'button');
        txDiv.setAttribute('aria-label', `Reuse transaction for ${tx.phone} on ${displayName}`);

        txDiv.addEventListener('click', () => {
          const phoneInput = document.getElementById('phone-input');
          if (!phoneInput) {
            alert('Phone input field not found.');
            return;
          }

          const localPhone = toLocalPhone(tx.phone);
phoneInput.value = localPhone;
phoneInput.dispatchEvent(new Event('input', { bubbles: true }));

          const normalizedPhone = tx.phone.replace(/^\+234/, '0');
          const provider = detectProvider(normalizedPhone);

          if (provider) {
            const providerClass = provider.toLowerCase() === '9mobile' ? 'ninemobile' : provider.toLowerCase();
            debounce(() => {
              selectProvider(providerClass);
              console.log('[DEBUG] Provider auto-selected:', providerClass);
            }, 100)();
          }

          if (window.updateContactOrCancel) window.updateContactOrCancel();
          if (window.updateContinueState) window.updateContinueState();
          if (window.saveUserState) window.saveUserState();
          if (window.saveCurrentAppState) window.saveCurrentAppState();

          phoneInput.blur();
        });

        recentTransactionsList.appendChild(txDiv);
      });

      console.log('[recent-tx] Rendered', dataSuccessTxs.length, 'successful data transactions');
    }

    let recentTransactions = [];

    const serverRecent = window.__SERVER_USER_DATA__?.recentDataTx || [];

    if (serverRecent.length) {
      recentTransactions = serverRecent;
      console.log('[recent-tx] Using server-embedded recentDataTx:', recentTransactions.length, 'items');
    } else {
      try {
        const stored = localStorage.getItem('recentDataTx');
        if (stored) {
          recentTransactions = JSON.parse(stored);
          if (!Array.isArray(recentTransactions)) recentTransactions = [];
          console.log('[recent-tx] Using localStorage recentDataTx:', recentTransactions.length, 'items');
        }
      } catch (e) {
        console.warn('[recent-tx] localStorage parse error', e);
      }
    }

    if (!recentTransactions.length) {
      try {
        const res = await fetch(`${window.__SEC_API_BASE}/api/transactions?limit=50`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          recentTransactions = (data.items || []).filter(tx =>
            tx?.phone?.trim() &&
            (tx.status || '').toLowerCase() === 'success' &&
            ['AWOOF', 'CG', 'GIFTING', 'special', 'STANDARD'].includes(tx.category)
          ).slice(0, 5);
          console.log('[recent-tx] Fetched from API as fallback:', recentTransactions.length);
        }
      } catch (err) {
        console.error('[recent-tx] API fallback failed', err);
      }
    }

    recentTransactions = recentTransactions.filter(tx => tx && tx.phone && tx.phone.trim() !== '');

    try {
      localStorage.setItem('recentDataTx', JSON.stringify(recentTransactions));
      window.recentTransactions = recentTransactions;
    } catch (e) {
      console.warn('[recent-tx] Save failed', e);
    }

    renderRecentTransactions(recentTransactions);
    window.renderRecentTransactions = renderRecentTransactions;
    console.log('%c[recent-tx] INITIALIZED — single run guaranteed', 'color:lime;font-weight:bold');
  })();
}

/* ===========================================================
   PIN modal — unified keypad + keyboard input + toast system
   =========================================================== */
(function () {
  function init() {
    const setupPinBtn = document.querySelector('.card.pin'); // Dashboard pin card
    const pinModal = document.getElementById('pinModal');
    const closePinModal = document.getElementById('closePinModal');
    const accountPinStatus = document.getElementById('accountPinStatus');

    if (!pinModal) {
      console.warn('[PIN] pinModal not found — PIN flow disabled.');
      return;
    }
    const pinTitleEl = pinModal.querySelector('.pin-header h2');
    const pinSubtitleEl = pinModal.querySelector('.firewall-icon p');
    const pinInputs = Array.from(document.querySelectorAll('.pin-inputs input'));
    const keypadButtons = Array.from(document.querySelectorAll('.pin-keypad button'));
    const deleteKey = document.getElementById('deleteKey');

    if (!pinTitleEl || !pinSubtitleEl || pinInputs.length === 0) {
      console.warn('[PIN] Some modal sub-elements are missing. Check selectors.');
    }

    let currentPin = "";
    let firstPin = "";
    let step = "create"; // "create" | "confirm" | "reauth"
    let processing = false; // prevents double submits

const toastContainerId = 'flexgig_toast_container';
let activeToast = null;
let activeTimer = null;

function ensureToast() {
  if (!document.getElementById(toastContainerId + '_style')) {
    const style = document.createElement('style');
    style.id = toastContainerId + '_style';
    style.textContent = `
      #${toastContainerId} {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        pointer-events: none;
      }
      .flexgig-toast {
        pointer-events: auto;
        padding: 13px 18px;
        border-radius: 10px;
        color: #fff;
        font-weight: 600;
        font-size: 14.5px;
        max-width: 85vw;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);

        transform: translateX(120%);
        opacity: 0;
        transition: transform .35s ease, opacity .25s ease;
      }
      .flexgig-toast.show {
        transform: translateX(0);
        opacity: 1;
      }
      .flexgig-toast.success { background: linear-gradient(135deg,#4caf50,#43a047); }
      .flexgig-toast.error   { background: linear-gradient(135deg,#f44336,#e53935); }
      .flexgig-toast.info    { background: linear-gradient(135deg,#2196f3,#1e88e5); }
    `;
    document.head.appendChild(style);
  }

  let container = document.getElementById(toastContainerId);
  if (!container) {
    container = document.createElement('div');
    container.id = toastContainerId;
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'success', duration = 3000) {
  const container = ensureToast();

  /* 🔪 HARD RESET — THIS IS THE KEY */
  if (activeTimer) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
  if (activeToast) {
    activeToast.remove(); // NO delayed removal
    activeToast = null;
  }

  const toast = document.createElement('div');
  toast.className = `flexgig-toast ${type}`;
  toast.textContent = message;

  container.innerHTML = '';
  container.appendChild(toast);
  activeToast = toast;

  requestAnimationFrame(() => toast.classList.add('show'));

  activeTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      if (activeToast === toast) activeToast = null;
    }, 300);
    activeTimer = null;
  }, duration);

  toast.onclick = () => {
    if (activeTimer) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
    activeToast = null;
  };
}

window.showToast = showToast;



    function updatePinInputs() {
      pinInputs.forEach((inp, idx) => {
        if (idx < currentPin.length) {
          inp.classList.add('filled');
          inp.value = '*';
        } else {
          inp.classList.remove('filled');
          inp.value = '';
        }
      });
    }

    function resetInputs() {
      currentPin = "";
      pinInputs.forEach(input => {
        input.classList.remove("filled");
        input.value = "";
      });
    }

    function openModalAsCreate() {
      pinModal.classList.remove('hidden');
      step = 'create';
      if (pinTitleEl) pinTitleEl.textContent = 'Create PIN';
      if (pinSubtitleEl) pinSubtitleEl.textContent = 'Create a 4-digit PIN';
      resetInputs();
    }

    async function openPinModalForReauth() {
      try {
        const res = await fetch('https://api.flexgig.com.ng/api/session', {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) {
          console.error('[dashboard.js] openPinModalForReauth: Session invalid');
          window.location.href = '/';
          return;
        }
        const { user } = await res.json();
        pinModal.classList.remove('hidden');

        if (!user.pin) {
          if (pinTitleEl) pinTitleEl.textContent = 'Create PIN';
          if (pinSubtitleEl) pinSubtitleEl.textContent = 'Create a 4-digit PIN';
          step = 'create';
        } else {
          if (pinTitleEl) pinTitleEl.textContent = 'Re-enter PIN';
          if (pinSubtitleEl) pinSubtitleEl.textContent = 'Enter your 4-digit PIN to continue';
          step = 'reauth';
        }
        resetInputs();
        console.log('[dashboard.js] PIN modal opened for:', user.pin ? 're-authentication' : 'PIN creation');
      } catch (err) {
        console.error('[dashboard.js] openPinModalForReauth error:', err);
        window.location.href = '/';
      }
    }

    if (closePinModal) {
      closePinModal.addEventListener('click', () => {
        if (step === 'confirm') {
          step = 'create';
          if (pinTitleEl) pinTitleEl.textContent = 'Create PIN';
          if (pinSubtitleEl) pinSubtitleEl.textContent = 'Create a 4-digit PIN';
          resetInputs();
        } else {
          pinModal.classList.add('hidden');
          resetInputs();
        }
        processing = false;
      });
    }

    function inputDigit(digit) {
      if (processing) return;
      if (!/^[0-9]$/.test(digit)) return;
      if (currentPin.length >= 4) return;
      currentPin += digit;
      updatePinInputs();
      if (currentPin.length === 4) {
        handlePinCompletion();
      }
    }

    function handleDelete() {
      if (processing) return;
      if (currentPin.length === 0) return;
      currentPin = currentPin.slice(0, -1);
      updatePinInputs();
    }

  async function handlePinCompletion() {
  if (processing) return;
  if (currentPin.length !== 4) return;

  if (step === 'create') {
    firstPin = currentPin;
    step = 'confirm';
    if (pinTitleEl) pinTitleEl.textContent = 'Confirm PIN';
    if (pinSubtitleEl) pinSubtitleEl.textContent = 'Confirm your 4-digit PIN';
    resetInputs();
    return;
  }

  if (step === 'confirm') {
    if (currentPin !== firstPin) {
      console.warn('[PIN] mismatch on confirmation');
      showToast('PINs do not match — try again', 'error');
      step = 'create';
      if (pinTitleEl) pinTitleEl.textContent = 'Create PIN';
      if (pinSubtitleEl) pinSubtitleEl.textContent = 'Create a 4-digit PIN';
      resetInputs();
      localStorage.setItem('hasPin', 'false'); // PIN not set
      return;
    }

    processing = true;
    return withLoader(async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };

        const resetToken = (window.__rp_handlers && typeof window.__rp_handlers.getResetToken === 'function')
          ? window.__rp_handlers.getResetToken()
          : (window.__rp_reset_token || null);

        if (resetToken && step === 'confirmReset') { 
          headers['x-reset-token'] = resetToken; // only for reset PIN flow
        } else {
          const token = localStorage.getItem('token');
          if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('https://api.flexgig.com.ng/api/save-pin', {
          method: 'POST',
          headers,
          body: JSON.stringify({ pin: currentPin }),
          credentials: 'include',
        });

        if (!res.ok) throw new Error('Save PIN failed');

        console.log('[dashboard.js] PIN setup successfully');
        localStorage.setItem('hasPin', 'true'); // PIN successfully set

        try {
          if (window.__rp_reset_token) {
            delete window.__rp_reset_token;
          }
          if (window.__rp_handlers && typeof window.__rp_handlers.getResetToken === 'function') {
            window.__rp_handlers.getResetToken = () => null;
          }
        } catch (e) {
          console.debug('Error clearing __rp_reset_token', e);
        }

        onPinSetupSuccess();
        fetch('https://api.flexgig.com.ng/reauth/complete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }).catch(e => console.debug('[save-pin] reauth/complete error (non-fatal):', e));
        const dashboardPinCard = document.getElementById('dashboardPinCard');
        if (dashboardPinCard) dashboardPinCard.style.display = 'none';
        if (accountPinStatus) accountPinStatus.textContent = 'PIN set';
        showToast('PIN updated successfully', 'success', 2400);
        if (pinModal) pinModal.classList.add('hidden');
        resetInputs();

      } catch (err) {
        console.error('[dashboard.js] PIN save error:', err);
        showToast('Failed to save PIN. Try again.', 'error', 2200);
        localStorage.setItem('hasPin', 'false'); // PIN failed
        resetInputs();
      } finally {
        processing = false;
      }
    });
  }

  if (step === 'reauth') {
  return withLoader(async () => {
    processing = true;
    const tStart = performance.now();
    try {
      const res = await fetch('https://api.flexgig.com.ng/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: currentPin }),
        credentials: 'include',
      });
      console.log('[reauth] verify-pin status', res.status, 'ms', performance.now() - tStart);

      if (!res.ok) throw new Error('Invalid PIN');

      const payload = await res.json(); // ideally: { user: { username, fullName, ... } }
      const user = payload.user || {};

      if (pinModal) pinModal.classList.add('hidden');
      resetInputs();

      const userData = {
        email: user.email || '',
        firstName: user.fullName?.split(' ')[0] || '',
        username: user.username || '',
        phoneNumber: user.phoneNumber || '',
        address: user.address || '',
        profilePicture: user.profilePicture || '',
      };

      Promise.allSettled([
        (typeof updateGreetingAndAvatar === 'function') ? updateGreetingAndAvatar(userData.username, userData.firstName) : Promise.resolve(),
        (typeof loadUserProfile === 'function') ? loadUserProfile(userData) : Promise.resolve(),
        (typeof updateBalanceDisplay === 'function') ? updateBalanceDisplay() : Promise.resolve()
      ]).then(results => {
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.warn('[reauth] background update failed', idx, r.reason);
          }
        });
      });

      console.log('[dashboard.js] PIN re-auth: Session restored (client-side done)');

    } catch (err) {
      console.error('[dashboard.js] PIN re-auth error:', err);
      showToast('Invalid PIN or session. Redirecting to login...', 'error', 1800);
      setTimeout(() => (window.location.href = '/'), 1200);
    } finally {
      processing = false;
    }
  });
}

}

function onPinSetupSuccess() {
  console.log('[PIN Setup] Success - updating flags and UI');

  try {
    if (window.__rp_reset_token) {
      delete window.__rp_reset_token;
    }
    if (window.__rp_handlers && typeof window.__rp_handlers.getResetToken === 'function') {
      window.__rp_handlers.getResetToken = () => null;
    }
    console.debug('onPinSetupSuccess: cleared __rp_reset_token');
  } catch (e) {
    console.debug('onPinSetupSuccess: error clearing __rp_reset_token', e);
  }

  localStorage.setItem('hasPin', 'true');

  window.dispatchEvent(new CustomEvent('pin-status-changed', {
    detail: { hasPin: true }
  }));

  const pinCard = document.getElementById('dashboardPinCard');
  if (pinCard) {
    pinCard.style.display = 'none';
  }

  const accountPinStatusEl = document.getElementById('accountPinStatus');
  if (accountPinStatusEl) {
    accountPinStatusEl.textContent = 'PIN set. You can change your PIN here';
  }

  if (typeof notify === 'function') {
    notify('PIN set up successfully!', 'success');
  }
}




    keypadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const raw = (btn.dataset.value ?? btn.textContent).trim().toLowerCase();
        if (btn.id === 'deleteKey' || raw === 'del' || raw === 'delete' || raw === '⌫') {
          handleDelete();
          return;
        }
        if (/^[0-9]$/.test(raw)) {
          inputDigit(raw);
        }
      });
    });

    if (deleteKey) {
      deleteKey.addEventListener('click', handleDelete);
    }

    document.addEventListener('keydown', (e) => {
      if (pinModal.classList.contains('hidden')) return;

      if (/^[0-9]$/.test(e.key)) {
        inputDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (currentPin.length === 4) handlePinCompletion();
      }
    });

    if (setupPinBtn) {
      setupPinBtn.addEventListener('click', openModalAsCreate);
    }

    console.log('[PIN] initialized — modal found, inputs:', pinInputs.length, 'keypad buttons:', keypadButtons.length);
  } // end init()

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


function __fg_pin_clearAllInputs() {
  if (__fg_pin_inputCurrentEl) __fg_pin_inputCurrentEl.value = '';
  if (__fg_pin_inputNewEl) __fg_pin_inputNewEl.value = '';
  if (__fg_pin_inputConfirmEl) __fg_pin_inputConfirmEl.value = '';
}





(() => {
  const __fg_pin_log = {
    d: (...a) => console.debug('[PIN][debug]', ...a),
    i: (...a) => console.info('[PIN][info]', ...a),
    w: (...a) => console.warn('[PIN][warn]', ...a),
    e: (...a) => console.error('[PIN][error]', ...a),
  };

  const __fg_pin_securityPinModal = document.getElementById('securityPinModal');
  const __fg_pin_changePinForm = document.getElementById('changePinForm');
  const __fg_pin_resetPinBtn = document.getElementById('resetPinBtn');
  const __fg_pin_inputCurrentEl = document.getElementById('currentPin');
  const __fg_pin_inputNewEl = document.getElementById('newPin');
  const __fg_pin_inputConfirmEl = document.getElementById('confirmPin');

  const __fg_pin_nextFocusDelay = 60; // ms delay before focusing next input after auto-jump
  const __fg_pin_autoSubmitBlurDelay = 80; // ms delay after blur before auto-submitting

  function __fg_pin_notify(message, type = 'info', duration = 3200) {
    try {
      __fg_pin_log.i('[PIN notify]', { message, type });
      if (typeof window.showSlideNotification === 'function') {
        window.showSlideNotification(message, type, duration);
        return;
      }
    } catch (err) {
      __fg_pin_log.e('[notifyPin] error', err);
    }
  }

  function __fg_pin_showFieldError(field, message) {
    if (!field) return;
    __fg_pin_hideFieldError(field);
    const span = document.createElement('div');
    span.className = 'pin-field-error';
    span.setAttribute('role', 'alert');
    span.style.color = '#ffcccc';
    span.style.fontSize = '12px';
    span.style.marginTop = '6px';
    span.textContent = message;
    field.classList.add('pin-invalid');
    field.setAttribute('aria-invalid', 'true');
    if (field.parentNode) field.parentNode.insertBefore(span, field.nextSibling);
  }

  function __fg_pin_hideFieldError(field) {
    if (!field || !field.parentNode) return;
    const next = field.nextSibling;
    if (next && next.classList && next.classList.contains('pin-field-error')) {
      next.remove();
    }
    field.classList.remove('pin-invalid');
    field.removeAttribute('aria-invalid');
  }

  function __fg_pin_clearAllFieldErrors() {
    [__fg_pin_inputCurrentEl, __fg_pin_inputNewEl, __fg_pin_inputConfirmEl].forEach(
      (f) => {
        if (f) __fg_pin_hideFieldError(f);
      }
    );
  }

  async function __fg_pin_getCurrentUid() {
  try {
    if (typeof window.getSession === 'function') {
      const s = await window.getSession();
      __fg_pin_log.d('getSession result', s);
      if (s && s.user && s.user.uid) return { uid: s.user.uid, session: s };
    }
    const res = await fetch('https://api.flexgig.com.ng/api/session', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) {
      __fg_pin_log.w('session fetch failed', await res.text());
      return null;
    }
    const { user } = await res.json();
    if (user && user.uid) {
      __fg_pin_log.d('session API used', user);
      return { uid: user.uid, session: user };
    }
    __fg_pin_log.w('no session/uid found');
    return null;
  } catch (err) {
    __fg_pin_log.e('getPinCurrentUid error', err);
    return null;
  }
}

  const __fg_pin_TRY_TABLES = ['profiles', 'users', 'accounts'];
  const __fg_pin_TRY_COLUMNS = [
    'pin',
    'account_pin',
    'accountPin',
    'pinCode',
    'pin_hash',
    'pin_hash_text',
  ];
  async function __fg_pin_findStoredPin({ uid }) {
  if (!uid) {
    __fg_pin_log.w('No uid for findStoredPin');
    return null;
  }

  try {
    const res = await fetch('https://api.flexgig.com.ng/api/check-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ userId: uid })  // Pass for verification
    });
    if (!res.ok) {
      __fg_pin_log.e('Error checking PIN existence:', await res.text());
      return null;
    }
    const { hasPin } = await res.json();
    if (hasPin) {
      __fg_pin_log.d('PIN found in users.pin');
      return { table: 'users', column: 'pin' };
    }
    __fg_pin_log.w('No stored PIN found');
    return null;
  } catch (err) {
    __fg_pin_log.e('Error checking PIN:', err);
    return null;
  }
}


  async function __fg_pin_updateStoredPin(uid, table, column, newPin) {
  if (table !== 'users' || column !== 'pin') {
    __fg_pin_log.e('Invalid updateStoredPin params', { table, column });
    return { ok: false, error: 'invalid_params' };
  }
  try {
    const res = await fetch('https://api.flexgig.com.ng/api/save-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify({ pin: newPin }),
      credentials: 'include',
    });
    if (!res.ok) {
      const { error } = await res.json();
      __fg_pin_log.e('Error saving PIN:', error?.message || await res.text());
      return { ok: false, error: error?.message || 'Failed to save PIN' };
    }
    __fg_pin_log.i('PIN updated successfully');

    try {
      localStorage.setItem('hasPin', 'true');
      if (typeof setupInactivity === 'function') setupInactivity();
    } catch(e) {
      console.warn('Failed to update hasPin locally', e);
    }

    return { ok: true };

  } catch (err) {
    __fg_pin_log.e('Error updating PIN:', err);
    return { ok: false, error: err.message };
  }
}

  function __fg_pin_bindStrictPinInputs() {
    const maxLen = 4;
    const inputs = [
      __fg_pin_inputCurrentEl,
      __fg_pin_inputNewEl,
      __fg_pin_inputConfirmEl,
    ].filter(Boolean);
    if (!inputs.length) {
      __fg_pin_log.d('bindStrictPinInputs: no inputs present yet');
      return;
    }

    function __fg_pin_nextInputOf(el) {
      if (!el) return null;
      if (el === __fg_pin_inputCurrentEl) return __fg_pin_inputNewEl;
      if (el === __fg_pin_inputNewEl) return __fg_pin_inputConfirmEl;
      return null;
    }

    inputs.forEach((el) => {
      if (!el) return;
      if (el.__fg_pin_bound) return;
      el.__fg_pin_bound = true;

      el.setAttribute('inputmode', 'numeric');
      el.setAttribute('pattern', '[0-9]*');
      el.setAttribute('maxlength', String(maxLen));
      el.setAttribute('autocomplete', 'off');

      el.addEventListener('input', (ev) => {
        const before = el.value || '';
        const cleaned = before.replace(/\D/g, '').slice(0, maxLen);
        if (before !== cleaned) {
          __fg_pin_log.d('input sanitized', { id: el.id, before, cleaned });
          el.value = cleaned;
        }
        __fg_pin_hideFieldError(el);

        if (cleaned.length === maxLen) {
          const next = __fg_pin_nextInputOf(el);
          if (next) {
            setTimeout(() => {
              try {
                next.focus();
                next.select && next.select();
              } catch (e) {
                __fg_pin_log.d('next.focus failed', e);
              }
            }, __fg_pin_nextFocusDelay);
          } else if (el === __fg_pin_inputConfirmEl) {
            try {
              __fg_pin_inputConfirmEl.blur();
              __fg_pin_inputNewEl && __fg_pin_inputNewEl.blur && __fg_pin_inputNewEl.blur();
              __fg_pin_inputCurrentEl &&
                __fg_pin_inputCurrentEl.blur &&
                __fg_pin_inputCurrentEl.blur();
              __fg_pin_log.d('confirm filled -> blurred inputs to hide keyboard before submit');
            } catch (berr) {
              __fg_pin_log.d('blur error', berr);
            }

            setTimeout(() => {
              __fg_pin_autoSubmitIfValid();
            }, __fg_pin_autoSubmitBlurDelay);
          }
        }
      });

      el.addEventListener('keypress', (ev) => {
        if (!/^[0-9]$/.test(ev.key)) {
          __fg_pin_log.d('keypress blocked non-digit', { id: el.id, key: ev.key });
          ev.preventDefault();
        }
      });

      el.addEventListener('paste', (ev) => {
        const pasted = (ev.clipboardData || window.clipboardData).getData('text') || '';
        const digits = pasted.replace(/\D/g, '').slice(0, maxLen);
        if (!digits.length) {
          __fg_pin_log.d('paste blocked no digits', { id: el.id, pasted });
          ev.preventDefault();
          return;
        }
        ev.preventDefault();
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newVal = (el.value.slice(0, start) + digits + el.value.slice(end))
          .replace(/\D/g, '')
          .slice(0, maxLen);
        el.value = newVal;
        const caret = Math.min(start + digits.length, maxLen);
        el.setSelectionRange(caret, caret);
        __fg_pin_log.d('paste accepted', { id: el.id, digits, newVal });
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

      __fg_pin_log.i('bound strict PIN handlers to', el.id);
    });
  }

  function __fg_pin_autoSubmitIfValid() {
    if (!__fg_pin_changePinForm) return;
    const cur = String((__fg_pin_inputCurrentEl && __fg_pin_inputCurrentEl.value) || '').trim();
    const neu = String((__fg_pin_inputNewEl && __fg_pin_inputNewEl.value) || '').trim();
    const conf = String((__fg_pin_inputConfirmEl && __fg_pin_inputConfirmEl.value) || '').trim();

    if (!/^\d{4}$/.test(cur)) {
      __fg_pin_showFieldError(__fg_pin_inputCurrentEl, 'Enter current 4-digit PIN');
      __fg_pin_notify('Enter your current 4-digit PIN', 'error');
      return;
    }
    if (!/^\d{4}$/.test(neu)) {
      __fg_pin_showFieldError(__fg_pin_inputNewEl, 'New PIN must be 4 digits');
      __fg_pin_notify('New PIN must be 4 digits', 'error');
      return;
    }
    if (neu === cur) {
      __fg_pin_showFieldError(__fg_pin_inputNewEl, 'New PIN must be different');
      __fg_pin_notify('New PIN must be different from current PIN', 'error');
      return;
    }
    if (neu !== conf) {
      __fg_pin_showFieldError(__fg_pin_inputConfirmEl, 'Confirm PIN does not match');
      __fg_pin_notify('New PIN and confirm PIN do not match', 'error');
      return;
    }

    try {
      __fg_pin_inputConfirmEl && __fg_pin_inputConfirmEl.blur && __fg_pin_inputConfirmEl.blur();
      __fg_pin_inputNewEl && __fg_pin_inputNewEl.blur && __fg_pin_inputNewEl.blur();
      __fg_pin_inputCurrentEl &&
        __fg_pin_inputCurrentEl.blur &&
        __fg_pin_inputCurrentEl.blur();
      __fg_pin_log.d('autoSubmitIfValid: blurred inputs to hide keyboard');
    } catch (b) {
      __fg_pin_log.d('autoSubmit blur error', b);
    }

    setTimeout(() => {
      try {
        if (typeof __fg_pin_changePinForm.requestSubmit === 'function')
          __fg_pin_changePinForm.requestSubmit();
        else __fg_pin_changePinForm.dispatchEvent(new Event('submit', { cancelable: true }));
        __fg_pin_log.d('autoSubmitIfValid: requestSubmit invoked');
      } catch (err) {
        __fg_pin_log.e('autoSubmitIfValid error', err);
      }
    }, __fg_pin_autoSubmitBlurDelay);
  }

  if (__fg_pin_changePinForm) {
  __fg_pin_changePinForm.addEventListener(
    'submit',
    async (ev) => {
      try {
        ev.preventDefault();
        __fg_pin_log.d('Change PIN submit handler started');

        __fg_pin_clearAllFieldErrors();

        const cur = String((__fg_pin_inputCurrentEl && __fg_pin_inputCurrentEl.value) || '').trim();
        const neu = String((__fg_pin_inputNewEl && __fg_pin_inputNewEl.value) || '').trim();
        const conf = String((__fg_pin_inputConfirmEl && __fg_pin_inputConfirmEl.value) || '').trim();

        __fg_pin_log.d('submitted values', { cur, neu, conf });

        if (!/^\d{4}$/.test(cur)) {
          __fg_pin_log.w('current pin invalid format');
          __fg_pin_showFieldError(__fg_pin_inputCurrentEl, 'Enter your current 4-digit PIN');
          __fg_pin_notify('Enter your current 4-digit PIN', 'error');
          return;
        }
        if (!/^\d{4}$/.test(neu)) {
          __fg_pin_log.w('new pin invalid format');
          __fg_pin_showFieldError(__fg_pin_inputNewEl, 'New PIN must be 4 digits');
          __fg_pin_notify('New PIN must be 4 digits', 'error');
          return;
        }
        if (neu === cur) {
          __fg_pin_log.w('new equals current');
          __fg_pin_showFieldError(__fg_pin_inputNewEl, 'New PIN must be different');
          __fg_pin_notify('New PIN must be different from current PIN', 'error');
          return;
        }
        if (neu !== conf) {
          __fg_pin_log.w('confirm does not match new');
          __fg_pin_showFieldError(__fg_pin_inputConfirmEl, 'Confirm PIN does not match');
          __fg_pin_notify('New PIN and confirm PIN do not match', 'error');
          return;
        }

        const sessionInfo = await __fg_pin_getCurrentUid();
        if (!sessionInfo || !sessionInfo.uid) {
          __fg_pin_log.e('no user session available to change PIN');
          __fg_pin_notify('You must be signed in to change PIN', 'error');
          return;
        }
        const uid = sessionInfo.uid;
        __fg_pin_log.d('session uid', uid);

        __fg_pin_notify('Verifying current PIN...', 'info');
        const found = await __fg_pin_findStoredPin({ uid }); // Note: Pass object { uid }
        if (!found) {
          __fg_pin_log.w('no stored pin record located');
          __fg_pin_notify(
            'No existing PIN found. Redirecting to reset...',
            'error'
          );
          setTimeout(() => {
          }, 1200);
          return;
        }

        try {
          const verifyRes = await fetch('https://api.flexgig.com.ng/api/verify-pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify({ pin: cur }),
            credentials: 'include',
          });
          if (!verifyRes.ok) {
            const { error } = await verifyRes.json();
            __fg_pin_log.w('current PIN verification failed', error);
            __fg_pin_showFieldError(__fg_pin_inputCurrentEl, error?.message || 'Current PIN is incorrect');
            __fg_pin_clearAllInputs();
            return;
          }
        } catch (err) {
          __fg_pin_log.e('Error verifying PIN:', err);
          console.log('Current PIN is incorrect. Try again.', 'error');
          return;
        }

        __fg_pin_notify('Updating PIN...', 'info');
        const upd = await __fg_pin_updateStoredPin(uid, found.table, found.column, neu);
        if (upd && upd.ok) {
          __fg_pin_log.i('pin update succeeded');
          __fg_pin_notify('PIN changed successfully', 'success');
          try {
            __fg_pin_inputConfirmEl &&
              __fg_pin_inputConfirmEl.blur &&
              __fg_pin_inputConfirmEl.blur();
            __fg_pin_inputNewEl && __fg_pin_inputNewEl.blur && __fg_pin_inputNewEl.blur();
            __fg_pin_inputCurrentEl &&
              __fg_pin_inputCurrentEl.blur &&
              __fg_pin_inputCurrentEl.blur();
            __fg_pin_log.d('blurred inputs after update success');
          } catch (b) {
            __fg_pin_log.d('blur after update error', b);
          }

          if (__fg_pin_inputCurrentEl) __fg_pin_inputCurrentEl.value = '';
          if (__fg_pin_inputNewEl) __fg_pin_inputNewEl.value = '';
          if (__fg_pin_inputConfirmEl) __fg_pin_inputConfirmEl.value = '';
          if (window.ModalManager && typeof window.ModalManager.closeModal === 'function') {
            window.ModalManager.closeModal('securityPinModal');
            __fg_pin_log.i('Closed PIN modal via ModalManager');
          } else {
            __fg_pin_securityPinModal?.classList.remove('active');
            __fg_pin_securityPinModal?.setAttribute('aria-hidden', 'true');
            __fg_pin_log.w('ModalManager not available, closed PIN modal directly');
          }
        } else {
          __fg_pin_log.e('pin update failed', upd && upd.error);
          __fg_pin_notify('Failed to update PIN. Please try again later.', 'error');
        }
      } catch (err) {
        __fg_pin_log.e('Change PIN submit error', err);
        __fg_pin_notify('Unexpected error while changing PIN', 'error');
      }
    },
    { passive: false }
  );
    __fg_pin_log.i('Change PIN form handler attached (strict)');
  } else {
    __fg_pin_log.d('changePinForm not present on page yet');
  }

  if (__fg_pin_resetPinBtn) {
    __fg_pin_resetPinBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      __fg_pin_log.i('resetPinBtn clicked - redirecting to reset flow');
      __fg_pin_notify('Redirecting to PIN reset flow', 'info');
    });
  }

  document.addEventListener('security:pin-modal-opened', () => {
    try {
      __fg_pin_bindStrictPinInputs();
      __fg_pin_log.i('Bound strict PIN inputs on security:pin-modal-opened event');
    } catch (e) {
      __fg_pin_log.d('bindStrictPinInputs error on modal open', e);
    }
  });

  window.__fg_debugPinModule = {
    __fg_pin_findStoredPin,
    __fg_pin_updateStoredPin,
    __fg_pin_bindStrictPinInputs,
    __fg_pin_notify,
    __fg_pin_autoSubmitIfValid,
  };

  __fg_pin_log.i('Security PIN integration loaded');
})();


/* Dashboard PIN and Security Integration */
(function (supabase) {
  const DEBUG = true;
  const log = {
    d: (...a) => { if (DEBUG) console.debug('[PIN][debug]', ...a); },
    i: (...a) => { if (DEBUG) console.info('[PIN][info]', ...a); },
    w: (...a) => { if (DEBUG) console.warn('[PIN][warn]', ...a); },
    e: (...a) => { if (DEBUG) console.error('[PIN][error]', ...a); },
  };

  const q = (sel, base = document) => base.querySelector(sel);

  const pinModal = q('#pinModal');
  const securityPinModal = q('#securityPinModal');
  const pinForm = q('#pinForm');
  const changePinForm = q('#changePinForm');
  const pinInputs = pinModal?.querySelectorAll('input[data-fg-pin]');
  const pinAlert = q('#pinAlert');
  const pinAlertMsg = q('#pinAlertMsg');
  const securityPinRow = q('#securityPinRow');
  const securityModal = q('#securityModal');
  const pinVerifyModal = q('#pinVerifyModal');
  const pinVerifyForm = q('#pinVerifyForm');
  const pinVerifyInputs = pinVerifyModal?.querySelectorAll('input[data-fg-pin]');
  const pinVerifyAlert = q('#pinVerifyAlert');
  const pinVerifyAlertMsg = q('#pinVerifyAlertMsg');
  const inactivityModal = q('#inactivityModal');
  const inactivityConfirmBtn = q('#inactivityConfirmBtn');

  let lastModalSource = null; // Track context (e.g., 'security', 'checkout', 'inactivity')
  let inactivityTimer = null; // Timer for 10-minute inactivity
  let inactivityPopupTimer = null; // Timer for 30-second popup

  function debounce(fn, ms) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  }

  function notify(msg, type = 'info', target = pinAlert, msgEl = pinAlertMsg) {
    if (target && msgEl) {
      target.classList.remove('hidden');
      target.classList.remove('success', 'error', 'info');
      target.classList.add(type);
      msgEl.textContent = msg;
      setTimeout(() => target.classList.add('hidden'), 3000);
    }
  }
  window.notify = window.notify || notify;

async function getUid({ waitForSession = true, waitMs = 500 } = {}) {
  try {
    let session = null;
    try {
      session = await safeCall(getSession);
    } catch (e) {
      session = null;
    }

    if (!session && waitForSession && typeof getOrCreateSessionPromise === 'function') {
      try {
        const p = getOrCreateSessionPromise();
        session = await Promise.race([
          p,
          new Promise(resolve => setTimeout(() => resolve(null), waitMs))
        ]);
      } catch (e) {
        session = null;
      }
    }

    const uid = session?.user?.uid || session?.user?.id || localStorage.getItem('userId') || null;
    if (!uid) {
      console.debug('[PIN] getUid: No user yet — returning null (not throwing).');
      return null;
    }
    return { uid };
  } catch (err) {
    console.error('[PIN] getUid unexpected error (returning null):', err);
    return null;
  }
}
window.getUid = window.getUid || getUid;


  async function findStoredPin(uid) {
  try {
    const response = await fetch('https://api.flexgig.com.ng/api/check-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ userId: uid })  // Pass for verification
    });
    if (!response.ok) {
      console.error('[PinModal] Failed to check PIN:', await response.text());
      return null;
    }
    const { hasPin } = await response.json();
    if (hasPin) {
      console.log('[PinModal] PIN found in users.pin');
      return { table: 'users', column: 'pin' };
    }
    console.log('[PinModal] No PIN found');
    return null;
  } catch (err) {
    console.error('[PinModal] Error checking PIN:', err);
    return null;
  }
}

async function updateStoredPin(uid, newPin) {
  console.log('[DEBUG] updateStoredPin CALLED with uid:', uid, 'pin:', newPin);
  return withLoader(async () => {
    try {
      const response = await fetch('https://api.flexgig.com.ng/api/save-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId: uid, pin: newPin })  // Pass userId
      });

      if (!response.ok) {
        let errorMsg = 'Failed to update PIN';
        try {
          const { error } = await response.json();
          if (error?.message) errorMsg = error.message;
        } catch (_) {}
        console.error('[PinModal] PIN update failed:', errorMsg);
        return { ok: false, error: errorMsg };
      }

      console.log('[PinModal] PIN updated successfully');
      return { ok: true };
    } catch (err) {
      console.error('[PinModal] Error updating PIN:', err);
      return { ok: false, error: err.message };
    }
  });
}




  window.checkPinExists = async function (callback, context = null) {
    const info = await getUid();
    if (!info || !info.uid) {
      notify('You must be signed in to perform this action', 'error');
      return false;
    }
    const pinExists = await findStoredPin(info.uid);
    lastModalSource = context;
    if (!pinExists) {
      window.ModalManager.openModal('pinModal');
      pinForm?.addEventListener('submit', function onPinSet() {
        pinForm.removeEventListener('submit', onPinSet);
        callback(false); // PIN was just set
      }, { once: true });
      return false;
    }
    callback(true);
    return true;
  };

  function bindPinInputs(inputs, form, modal, alert, alertMsg) {
    const maxLen = 1;
    const pinLength = 4;
    const debounceFocus = debounce((input, next) => {
      if (next && input.value.length >= maxLen) next.focus();
    }, 50);

    inputs.forEach((input, i) => {
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('pattern', '[0-9]*');
      input.setAttribute('maxlength', maxLen);
      input.autocomplete = 'one-time-code';

      input.addEventListener('input', () => {
        const before = input.value || '';
        const cleaned = before.replace(/\D/g, '').slice(0, maxLen);
        if (before !== cleaned) {
          input.value = cleaned;
          log.d('[input]', input.dataset.fgPin, { before, cleaned });
        }
        const next = i < inputs.length - 1 ? inputs[i + 1] : null;
        debounceFocus(input, next);
      });

      input.addEventListener('input', () => {
        const allFilled = Array.from(inputs).every(inp => inp.value.length === maxLen);
        if (allFilled && i === inputs.length - 1) {
          form.requestSubmit();
          inputs.forEach(inp => inp.blur());
        }
      });

      input.addEventListener('keypress', (ev) => {
        if (!/^[0-9]$/.test(ev.key)) {
          ev.preventDefault();
          log.d('[keypress] blocked', input.dataset.fgPin, ev.key);
        }
      });

      input.addEventListener('paste', (ev) => {
        ev.preventDefault();
        const pasted = (ev.clipboardData || window.clipboardData).getData('text');
        const digits = pasted.replace(/\D/g, '').slice(0, pinLength);
        if (digits.length) {
          for (let j = 0; j < digits.length && i + j < inputs.length; j++) {
            inputs[i + j].value = digits[j];
          }
          const target = digits.length >= pinLength ? inputs[inputs.length - 1] : inputs[i + digits.length];
          target?.focus();
          if (digits.length >= pinLength) {
            form.requestSubmit();
            inputs.forEach(inp => inp.blur());
          }
        }
      });
    });

    const keypadButtons = modal.querySelectorAll('.pin-keypad button[data-key]');
    keypadButtons.forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.key;
        const activeInput = Array.from(inputs).find(inp => !inp.value);
        if (activeInput) {
          activeInput.value = key;
          const event = new Event('input', { bubbles: true });
          activeInput.dispatchEvent(event);
        }
      });
    });

    const deleteKey = modal.querySelector('#deleteKey, #deleteVerifyKey');
    if (deleteKey) {
      deleteKey.addEventListener('click', () => {
        const lastFilled = Array.from(inputs).filter(inp => inp.value).pop();
        if (lastFilled) {
          lastFilled.value = '';
          lastFilled.focus();
        }
      });
    }
  }


  function initPinModal() {
    if (pinForm && pinInputs.length) {
      bindPinInputs(pinInputs, pinForm, pinModal, pinAlert, pinAlertMsg);
      pinForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const pin = Array.from(pinInputs).map(input => input.value).join('');
  if (!/^\d{4}$/.test(pin)) {
    notify('PIN must be 4 digits', 'error');
    pinInputs.forEach(inp => inp.value = ''); // Clear inputs on error
    return;
  }
  const info = await getUid();
  if (!info || !info.uid) {
    notify('You must be signed in to set PIN', 'error');
    pinInputs.forEach(inp => inp.value = ''); // Clear inputs on error
    return;
  }
  const found = await findStoredPin(info.uid) || { table: 'profiles', column: 'pin' };
  notify('Setting PIN...', 'info');
  const upd = await updateStoredPin(info.uid, pin);  // Updated call (removed table/column if not needed)
  if (upd.ok) {
    notify('PIN set successfully', 'success');
    pinInputs.forEach(inp => inp.value = '');
    window.ModalManager.closeModal('pinModal');
    if (lastModalSource === 'security') {
      window.ModalManager.openModal('securityModal');
    } else if (lastModalSource === 'checkout') {
      window.ModalManager.openModal('pinVerifyModal');
    }
  } else {
    notify('Failed to set PIN. Try again.', 'error');
    pinInputs.forEach(inp => inp.value = ''); // Clear inputs on error
  }
});
    }
  }

  function initPinVerifyModal() {
    if (pinVerifyForm && pinVerifyInputs.length) {
      bindPinInputs(pinVerifyInputs, pinVerifyForm, pinVerifyModal, pinVerifyAlert, pinVerifyAlertMsg);
      pinVerifyForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const pin = Array.from(pinVerifyInputs).map(input => input.value).join('');
  if (!/^\d{4}$/.test(pin)) {
    notify('PIN must be 4 digits', 'error', pinVerifyAlert, pinVerifyAlertMsg);
    pinVerifyInputs.forEach(inp => inp.value = ''); // Clear inputs on error
    return;
  }
  const info = await getUid();
  if (!info || !info.uid) {
    notify('You must be signed in to verify PIN', 'error', pinVerifyAlert, pinVerifyAlertMsg);
    pinVerifyInputs.forEach(inp => inp.value = ''); // Clear inputs on error
    return;
  }
  await reAuthenticateWithPin(info.uid, pin, (success) => {
    if (success) {
      pinVerifyInputs.forEach(inp => inp.value = '');
      window.ModalManager.closeModal('pinVerifyModal');
      if (lastModalSource === 'checkout') {
        notify('Payment processing...', 'info');
      }
    } else {
      notify('Incorrect PIN. Please try again.', 'error', pinVerifyAlert, pinVerifyAlertMsg);
      pinVerifyInputs.forEach(inp => inp.value = ''); // Clear inputs on error
    }
  });
});
    }
  }

  function initSecurityPinModal() {
    if (securityPinRow) {
      securityPinRow.addEventListener('click', async () => {
        const info = await getUid();
        if (!info || !info.uid) {
          notify('You must be signed in to manage PIN', 'error');
          return;
        }
        lastModalSource = 'security';
        await window.checkPinExists((hasPin) => {
          if (hasPin) {
            window.ModalManager.openModal('securityPinModal');
          }
        }, 'security');
      });
    }
    if (changePinForm) {
      changePinForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const currentPin = q('#currentPin').value.trim();
        const newPin = q('#newPin').value.trim();
        const confirmPin = q('#confirmPin').value.trim();
        if (!/^\d{4}$/.test(currentPin)) {
          notify('Current PIN must be 4 digits', 'error');
          return;
        }
        if (!/^\d{4}$/.test(newPin)) {
          notify('New PIN must be 4 digits', 'error');
          return;
        }
        if (newPin === currentPin) {
          notify('New PIN must be different from current PIN', 'error');
          return;
        }
        if (newPin !== confirmPin) {
          notify('New PIN and confirm PIN do not match', 'error');
          return;
        }
        const info = await getUid();
        if (!info || !info.uid) {
          notify('You must be signed in to change PIN', 'error');
          return;
        }
        const found = await findStoredPin(info.uid);
        if (!found) {
          notify('Cannot verify PIN. Use Reset PIN.', 'error');
          return;
        }
        await reAuthenticateWithPin(info.uid, currentPin, async (success) => {
          if (!success) {
            console.log('Current PIN is incorrect', 'error');
            return;
          }
          notify('Updating PIN...', 'info');
          const upd = await updateStoredPin(info.uid, newPin);
          if (upd.ok) {
            notify('PIN changed successfully', 'success');
            q('#currentPin').value = '';
            q('#newPin').value = '';
            q('#confirmPin').value = '';
            window.ModalManager.closeModal('securityPinModal');
            if (lastModalSource === 'security') {
              window.ModalManager.openModal('securityModal');
            }
          } else {
            notify('Failed to update PIN. Try again.', 'error');
          }
        });
      });
    }
    const resetPinBtn = q('#resetPinBtn');
    if (resetPinBtn) {
      resetPinBtn.addEventListener('click', () => {
        notify('Redirecting to PIN reset flow', 'info');
      });
    }
  }



  function boot() {
  log.d('Booting PIN and security module');
  initPinModal();
  initPinVerifyModal();
  initSecurityPinModal();
  if (window.__reauth && typeof window.__reauth.setupInactivity === 'function') {
    window.__reauth.setupInactivity();
  }

      
      

 }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  setTimeout(boot, 1000);
}
})(supabaseClient);









const updateProfileBtn = document.getElementById('updateProfileBtn'); // dashboard
const settingsUpdateBtn = document.getElementById('openUpdateProfile'); // settings
const updateProfileModal = document.getElementById('updateProfileModal');
const updateProfileForm = document.getElementById('updateProfileForm');
const profilePictureInput = document.getElementById('profilePicture');
const profilePicturePreview = document.getElementById('profilePicturePreview');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const phoneNumberInput = document.getElementById('phoneNumber');
const emailInput = document.getElementById('email');
const addressInput = document.getElementById('address');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const fullNameError = document.getElementById('fullNameError');
const usernameError = document.getElementById('usernameError');
const phoneNumberError = document.getElementById('phoneNumberError');
const addressError = document.getElementById('addressError');
const profilePictureError = document.getElementById('profilePictureError');
let isUsernameAvailable = false;
let lastModalSource = null; // can be 'dashboard' or 'settings'


const requiredElements = {
  updateProfileModal,
  updateProfileForm,
  profilePictureInput,
  profilePicturePreview,
  fullNameInput,
  usernameInput,
  phoneNumberInput,
  emailInput,
  addressInput,
  saveProfileBtn,
  fullNameError,
  usernameError,
  phoneNumberError,
  addressError,
  profilePictureError
};

for (const [key, element] of Object.entries(requiredElements)) {
  if (!element) {
    console.error(`[ERROR] Missing DOM element: ${key}`);
  }
}

if (updateProfileBtn) {
  updateProfileBtn.addEventListener('click', () => {
    lastModalSource = 'dashboard';
    openUpdateProfileModal();
  });
}






const updateProfileCard = document.querySelector('.card.update-profile');
if (updateProfileCard) {
  updateProfileCard.addEventListener('click', () => {
    console.log('[DEBUG] Update Profile card clicked');
    openUpdateProfileModal({});
  });
}

function ensureFileInFormData(formData, inputEl, fieldName = 'profilePicture') {
  try {
    const existing = formData.get(fieldName);
    if (existing instanceof File) return; // already included
  } catch (e) { /* ignore */ }

  if (inputEl && inputEl.files && inputEl.files[0]) {
    formData.set(fieldName, inputEl.files[0], inputEl.files[0].name);
  }
}

if (updateProfileForm) {
  updateProfileForm.removeEventListener && 
  updateProfileForm.removeEventListener('submit', 
  updateProfileForm.__submitHandler);

  updateProfileForm.__submitHandler = async function (e) {
    e.preventDefault();

    if (!saveProfileBtn || saveProfileBtn.disabled) {
      console.log('[DEBUG] updateProfileForm: submit aborted (disabled)');
      return;
    }

    Object.keys(fieldTouched).forEach(key => {
      const inputMap = {
        fullName: fullNameInput,
        username: usernameInput,
        phoneNumber: phoneNumberInput,
        address: addressInput,
        profilePicture: profilePictureInput
      };
      const el = inputMap[key];
      fieldTouched[key] = !!(el && !el.disabled);
    });

    validateProfileForm(true);
    if (saveProfileBtn.disabled) {
      console.log('[DEBUG] updateProfileForm: invalid after validation');
      return;
    }

    const originalBtnContent = saveProfileBtn.innerHTML; // Save original button content
    saveProfileBtn.disabled = true;

    withLoader(async () => {

    try {
      const formData = new FormData(updateProfileForm);

      formData.set('email', localStorage.getItem('userEmail') || '');

      const fullNameVal = (fullNameInput && fullNameInput.value.trim()) || 
      localStorage.getItem('fullName') || '';
      const usernameVal = (usernameInput && usernameInput.value.trim()) || 
      localStorage.getItem('username') || '';
      const addressVal = (addressInput && addressInput.value.trim()) || 
      localStorage.getItem('address') || '';

      let phoneRaw = '';
      if (phoneNumberInput && phoneNumberInput.value) phoneRaw = 
      phoneNumberInput.value.replace(/\s/g, '');
      else phoneRaw = (localStorage.getItem('phoneNumber') || '').replace(/\s/g, 
      '');

      formData.set('fullName', fullNameVal);
      formData.set('username', usernameVal);
      formData.set('address', addressVal);
      formData.set('phoneNumber', phoneRaw);

      if (profilePictureInput && profilePictureInput.files[0]) {
        formData.set('profilePicture', profilePictureInput.files[0]);
      }

      const debugObj = {};
      for (const [k, v] of formData.entries()) {
        debugObj[k] = v instanceof File ? `File: ${v.name} (${v.type}, ${v.size})` : v;
      }
      console.log('[DEBUG] updateProfileForm: sending', debugObj);

      const response = await 
fetch('https://api.flexgig.com.ng/api/profile/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: formData,
        credentials: 'include'
      });

      let rawText = '';
      let parsedData = null;
      try {
        rawText = await response.text();
        parsedData = rawText ? JSON.parse(rawText) : null;
      } catch (e) {
        console.warn('[WARN] updateProfileForm: Response is not valid JSON');
      }

      function extractServerMessage(obj, fallback) {
        if (!obj) return fallback || '';
        if (typeof obj === 'string') return obj;
        if (typeof obj.error === 'string') return obj.error;
        if (typeof obj.message === 'string') return obj.message;
        if (obj.error && typeof obj.error.message === 'string') return obj.error.message;
        if (obj.message && typeof obj.message === 'object' && typeof obj.message.message === 'string') return obj.message.message;
        for (const k of ['error', 'errors', 'message', 'detail']) {
          const v = obj[k];
          if (typeof v === 'string') return v;
          if (v && typeof v.message === 'string') return v.message;
        }
        try {
          const s = JSON.stringify(obj);
          return s.length > 300 ? s.slice(0, 300) + '…' : s;
        } catch (e) {
          return fallback || String(obj);
        }
      }

      if (!response.ok) {
        console.error('[ERROR] updateProfileForm: Failed response', response.status, parsedData || rawText);
        const serverMsg = extractServerMessage(parsedData, rawText || `HTTP ${response.status}`);
        throw new Error(serverMsg || `HTTP ${response.status}`);
      }



      localStorage.setItem('fullName', fullNameVal);
      localStorage.setItem('username', usernameVal);
      localStorage.setItem('phoneNumber', phoneRaw);
      localStorage.setItem('address', addressVal);
      localStorage.setItem('firstName', fullNameVal.split(' ')[0] || 'User');

      let tempProfilePicture = localStorage.getItem('profilePicture') || '';
      if (profilePictureInput && profilePictureInput.files[0]) {
        tempProfilePicture = URL.createObjectURL(profilePictureInput.files[0]);
        localStorage.setItem('profilePicture', tempProfilePicture); // Temporary; server fetch will overwrite
      }

      const firstnameEl = document.getElementById('firstname');
      const avatarEl = document.getElementById('avatar');
      if (firstnameEl && avatarEl) {
        const displayName = usernameVal || (fullNameVal.split(' ')[0] || 'User');
        firstnameEl.textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        const isValidTempPicture = tempProfilePicture && /^(data:image\/|https?:\/\/|\/|blob:)/i.test(tempProfilePicture); // Allow blob: for local URL
        if (isValidTempPicture) {
          avatarEl.innerHTML = `<img src="${tempProfilePicture}" alt="Profile Picture" class="avatar-img" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
          avatarEl.innerHTML = '';
          avatarEl.textContent = displayName.charAt(0).toUpperCase();
        }
      }

      const notification = document.getElementById('notification') || document.getElementById('profileUpdateNotification');
      if (notification) {
        notification.textContent = 'Profile updated successfully!';
        onProfileUpdateSuccess();
invalidateProfileCache();             // allow next call to fetch fresh
loadProfileToSettings(true);          // force fresh fetch & UI update

        notification.classList.add('active');
        setTimeout(() => notification.classList.remove('active'), 3000);
      }

      closeUpdateProfileModal();

      await loadUserProfile(true);

        } catch (err) {
      console.error('[ERROR] updateProfileForm:', err);
      const readable = (err && (err.message || err.toString())) || String(err);
      if (readable.toLowerCase().includes('username')) {
        if (usernameError) {
          usernameError.textContent = 'Username is already taken';
          usernameError.classList.add('active');
          usernameInput.classList.add('invalid');
        }
      } else {
        const generalError = document.createElement('div');
        generalError.className = 'error-message active';
        generalError.textContent = `Failed to update profile: ${readable}`;
        updateProfileForm.prepend(generalError);
        setTimeout(() => generalError.remove(), 4000);
      }
  } finally {
      saveProfileBtn.disabled = false;
      saveProfileBtn.innerHTML = originalBtnContent; // Restore original content
    }
  });
  };

  updateProfileForm.addEventListener('submit', 
updateProfileForm.__submitHandler);
}

function onProfileUpdateSuccess() {
    console.log('[Profile Update] Success - updating flags and UI');
    
    localStorage.setItem('profileCompleted', 'true');
    
    const profileCard = document.getElementById('dashboardUpdateProfileCard');
    if (profileCard) {
        profileCard.style.display = 'none';
    }
    
    if (typeof notify === 'function') {
        notify('Profile updated successfully!', 'success');
    }
}

function isValidPrefixPartial(cleaned) {
  if (!cleaned) return true;
  const allPrefixes = Object.values(providerPrefixes || {}).flat();
  if (!allPrefixes.length) return true;

  const first3 = cleaned.slice(0, 3);
  const first4 = cleaned.slice(0, 4);

  if (cleaned.length >= 4) {
    return allPrefixes.includes(first4);
  }
  if (cleaned.length === 3) {
    return allPrefixes.some(p => p.slice(0, 3) === first3);
  }
  return true;
}

function isNigeriaMobileProfile(phone) {
  const cleaned = (phone || '').replace(/\s/g, '');
  if (!/^\d{11}$/.test(cleaned)) return false;
  if (!/^0[789]/.test(cleaned)) return false;
  const prefix4 = cleaned.slice(0, 4);
  const allPrefixes = Object.values(providerPrefixes || {}).flat();
  return allPrefixes.includes(prefix4);
}

function normalizePhoneProfile(input) {
  if (!input) return '';
  const digits = input.replace(/\D/g, '');
  if (/^234[789]/.test(digits)) return '0' + digits.slice(3, 14);
  if (/^[789]/.test(digits)) return '0' + digits;
  return digits;
}

function formatNigeriaNumberProfile(input, isInitialDigit = false, isPaste = false) {
  const normalized = normalizePhoneProfile(input);
  if (!normalized) return { value: '', cursorOffset: 0 };
  let formatted = normalized;
  if (isInitialDigit && !normalized.startsWith('0')) formatted = '0' + normalized;
  if (formatted.length > 11) formatted = formatted.slice(0, 11);

  const parts = formatted.replace(/\s/g, '');
  if (parts.length <= 4) return { value: parts, cursorOffset: isPaste ? parts.length : 0 };
  if (parts.length <= 8) return { value: parts.slice(0, 4) + ' ' + parts.slice(4), cursorOffset: isPaste ? parts.length + 1 : 0 };
  return { value: parts.slice(0, 4) + ' ' + parts.slice(4, 8) + ' ' + parts.slice(8), cursorOffset: isPaste ? parts.length + 2 : 0 };
}

function validatePhoneNumberField(inputElement, errorElement) {
  const raw = (inputElement.value || '').replace(/\s/g, '');
  let error = '';

  const showFinalErrors = !!fieldTouched.phoneNumber || document.activeElement !== inputElement;

  if (raw && !/^\d*$/.test(raw)) {
    error = 'Phone number must contain only digits';
  } else {
    const startsWith234 = raw.startsWith('234');

    if (startsWith234 && raw.length === 3) {
      if (errorElement) { errorElement.textContent = ''; errorElement.classList.remove('active'); }
      if (inputElement) inputElement.classList.remove('invalid');
      return true;
    }

    let normalizedForChecks = raw;
    if (startsWith234 && raw.length > 3) {
      normalizedForChecks = '0' + raw.slice(3); // e.g. 234803... -> 0803...
    }

    const normLen = normalizedForChecks.length;
    const rawLen = raw.length;

    if (rawLen === 1 && /^[1456]$/.test(raw)) {
      error = `Phone number cannot start with ${raw}`;
    } else if (startsWith234 && rawLen >= 4 && /^[1456]$/.test(normalizedForChecks[1])) {
      error = `Phone number cannot start with ${normalizedForChecks[1]}`;
    } else {
      if (!startsWith234) {
        if (normLen >= 2 && /^0[1456]/.test(normalizedForChecks)) {
          error = `Phone number cannot start with ${normalizedForChecks[1]}`;
        }
      }
    }

    if (!error) {
      if (normLen >= 3 && !isValidPrefixPartial(normalizedForChecks)) {
        if (showFinalErrors || normLen >= 4) {
          error = 'Invalid Nigerian phone number prefix';
        }
      }
    }

    if (!error && showFinalErrors) {
      if (normLen > 0 && normLen < 11) {
        error = 'Phone number must be 11 digits';
      }
    }

    if (!error && normLen === 11 && !isNigeriaMobileProfile(normalizedForChecks)) {
      error = 'Invalid Nigerian phone number';
    }
  }

  if (errorElement) {
    errorElement.textContent = error;
    errorElement.classList.toggle('active', !!error);
  }
  if (inputElement) {
    inputElement.classList.toggle('invalid', !!error);
  }
  return !error;
}




function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

let __usernameAvailabilityController = null;

/**
 * checkUsernameAvailability(username, { signal })
 * returns boolean
 */
async function checkUsernameAvailability(username, signal = undefined) {
  if (!username || !/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
    isUsernameAvailable = false;
    return false;
  }

  try { if (__usernameAvailabilityController) __usernameAvailabilityController.abort(); } catch (e) { /* ignore */ }
  __usernameAvailabilityController = new AbortController();
  const controller = __usernameAvailabilityController;
  const fetchSignal = signal || controller.signal;

  try {
    const resp = await fetch('https://api.flexgig.com.ng/api/profile/check-username', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      },
      body: JSON.stringify({ username }),
      signal: fetchSignal
    });

    const text = await resp.text().catch(() => '');
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { /* ignore */ }

    if (!resp.ok) {
      console.warn('[WARN] checkUsernameAvailability: non-OK', resp.status, text);
      isUsernameAvailable = false;
      return false;
    }

    const available = !!(data && data.available);
    isUsernameAvailable = available;
    return available;
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return false;
    }
    console.error('[ERROR] checkUsernameAvailability:', err && err.message ? err.message : err);
    isUsernameAvailable = false;
    return false;
  } finally {
    if (controller === __usernameAvailabilityController) __usernameAvailabilityController = null;
  }
}


const fieldTouched = {
  fullName: false,
  username: false,
  phoneNumber: false,
  address: false,
  profilePicture: false
};

function validateProfileForm(showErrors = true) {
  

  const isFullNameValid = !fieldTouched.fullName || validateField('fullName');
  const isUsernameValid = !fieldTouched.username || validateField('username');
  const isPhoneNumberValid = !fieldTouched.phoneNumber || validateField('phoneNumber');
  const isAddressValid = !fieldTouched.address || validateField('address');
  const isProfilePictureValid = !fieldTouched.profilePicture || validateField('profilePicture');

  const isFormValid = isFullNameValid && isUsernameValid && isPhoneNumberValid && isAddressValid && isProfilePictureValid;
  if (saveProfileBtn) {
    saveProfileBtn.disabled = !isFormValid;
  }

  console.log('[DEBUG] validateProfileForm:', { isFormValid, showErrors, fieldTouched });
}

function validateField(field) {
  const inputMap = {
    fullName: fullNameInput,
    username: usernameInput,
    phoneNumber: phoneNumberInput,
    address: addressInput,
    profilePicture: profilePictureInput
  };
  const errorMap = {
    fullName: fullNameError,
    username: usernameError,
    phoneNumber: phoneNumberError,
    address: addressError,
    profilePicture: profilePictureError
  };

  if (!fieldTouched[field]) return true;

  const inputElement = inputMap[field];
  const errorElement = errorMap[field];

  if (inputElement && inputElement.disabled) {
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('active');
    }
    if (inputElement) inputElement.classList.remove('invalid');
    return true;
  }

  if (!inputElement || !errorElement) {
    console.warn(`[WARN] validateField: Skipping validation for ${field} - elements not found (modal may not be open)`);
    return true;
  }

  const value = inputElement?.value || '';

  let isValid = true;


  switch (field) {
case 'fullName': {
  const trimmed = (inputElement.value || '').trim();
  let error = '';

  if (!trimmed) {
    errorElement.textContent = '';
    errorElement.classList.remove('active');
    inputElement.classList.remove('invalid');
    break;
  }

  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    error = 'Full name must contain only letters';
  }
  else if (
    trimmed.length > 0 &&
    trimmed.length < 2 &&
    (fieldTouched.fullName || document.activeElement !== inputElement)
  ) {
    error = 'Full name must be at least 2 characters';
  }

  if (error) {
    errorElement.textContent = error;
    errorElement.classList.add('active');
    inputElement.classList.add('invalid');
    isValid = false;
  } else {
    errorElement.textContent = '';
    errorElement.classList.remove('active');
    inputElement.classList.remove('invalid');
  }
  break;
}




    case 'username': {
  const raw = (inputElement.value || '');
  const value = raw.trim(); // validation uses trimmed form
  let err = '';

  if (!value) {
    errorElement.textContent = '';
    errorElement.classList.remove('active', 'error', 'available');
    inputElement.classList.remove('invalid');
    isValid = true;
    break;
  }

  const lastUpdate = localStorage.getItem('lastUsernameUpdate');
  const currentUsername = localStorage.getItem('username') || '';
  if (value !== currentUsername && lastUpdate) {
    err = 'Username cannot be changed after initial setup';
    errorElement.textContent = err;
    errorElement.classList.add('active', 'error');
    inputElement.classList.add('invalid');
    isValid = false;
    break;
  }

  if (/^\d/.test(value)) {
    err = 'Username cannot start with a number';
  } else if (/^_/.test(value)) {
    err = 'Username cannot start with underscore';
  } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    err = 'Username can only contain letters, numbers, or underscores';
  } else if (value.length > 15) {
    err = 'Username cannot exceed 15 characters';
  } else if (value.length < 3 && (fieldTouched.username || document.activeElement !== inputElement)) {
    err = 'Username must be at least 3 characters';
  }

  if (err) {
    errorElement.textContent = err;
    errorElement.classList.add('active', 'error');
    inputElement.classList.add('invalid');
    isValid = false;
    break;
  }

  if (value === currentUsername) {
    errorElement.textContent = '';
    errorElement.classList.remove('active', 'error', 'available');
    inputElement.classList.remove('invalid');
    isValid = true;
  } else {
    if (isUsernameAvailable === true) {
      errorElement.textContent = `${value} is available`;
      errorElement.classList.add('active', 'available');
      errorElement.classList.remove('error');
      inputElement.classList.remove('invalid');
      isValid = true;
    } else if (isUsernameAvailable === false) {
      errorElement.textContent = `${value} is already taken`;
      errorElement.classList.add('active', 'error');
      inputElement.classList.add('invalid');
      isValid = false;
    } else {
      errorElement.textContent = '';
      errorElement.classList.remove('active', 'error', 'available', 'checking');
      inputElement.classList.remove('invalid');
      isValid = true;
    }
  }
  break;
}

    case 'phoneNumber': {
  const cleaned = value.replace(/\s/g, '');
  let error = '';

  if (cleaned && (fieldTouched.phoneNumber || document.activeElement !== inputElement)) {
    if (!/^\d*$/.test(cleaned)) {
      error = 'Phone number must contain only digits';
    } else if (/^0[1456]/.test(cleaned)) {
      error = 'Nigerian phone numbers cannot start with 1, 4, 5, or 6';
    } else if (cleaned.length >= 4 && !Object.values(providerPrefixes).flat().includes(cleaned.slice(0, 4))) {
      error = 'Invalid Nigerian phone number prefix';
    } else if (cleaned.length > 0 && cleaned.length < 11) {
      error = 'Phone number must be 11 digits';
    } else if (cleaned.length === 11 && !isNigeriaMobileProfile(cleaned)) {
      error = 'Invalid Nigerian phone number';
    }
  }

  errorElement.textContent = error;
  errorElement.classList.toggle('active', !!error);
  inputElement.classList.toggle('invalid', !!error);
  isValid = !error;
  break;
}
    case 'address': {
  const raw = inputElement.value || '';
  const trimmed = raw.trim();
  const showFinalErrors = !!fieldTouched.address || document.activeElement !== inputElement;

  const allowedRe = /^[a-zA-Z0-9\s,.\-#]*$/;

  let error = '';

  if (raw.startsWith(' ')) {
    error = 'Address cannot start with a space';
  }
  else if (raw && !allowedRe.test(raw)) {
    const invalid = raw.split('').filter(ch => !/[a-zA-Z0-9\s,.\-#]/.test(ch));
    const uniq = [...new Set(invalid)];
    error = `Address contains invalid character${uniq.length > 1 ? 's' : ''}: ${uniq.join('')}`;
  }
  else if (showFinalErrors && trimmed && trimmed.length < 5) {
    error = 'Address must be at least 5 characters long';
  }

  if (error) {
    errorElement.textContent = error;
    errorElement.classList.add('active');
    inputElement.classList.add('invalid');
    isValid = false;
  } else {
    errorElement.textContent = '';
    errorElement.classList.remove('active');
    inputElement.classList.remove('invalid');
    isValid = true;
  }
  break;
}


    case 'profilePicture':
      if (inputElement.files && inputElement.files.length > 0) {
        const file = inputElement.files[0];
        if (!file.type.startsWith('image/')) {
          errorElement.textContent = 'Profile picture must be an image';
          errorElement.classList.remove('hidden');
          isValid = false;
        } else if (file.size > 2 * 1024 * 1024) { // e.g. 2MB limit
          errorElement.textContent = 'Profile picture must be less than 2MB';
          errorElement.classList.remove('hidden');
          isValid = false;
        } else {
          errorElement.textContent = '';
          errorElement.classList.add('hidden');
        }
      } else {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
      }
      break;
  }
  return isValid;
}

function detachProfileListeners() {
  const inputs = [fullNameInput, usernameInput, phoneNumberInput, addressInput /* profilePictureInput not included because you have a global change handler */];
  inputs.forEach((el) => {
    if (!el) return;
    const handlers = el.__profileHandlers || {};
    Object.entries(handlers).forEach(([type, fn]) => {
      try {
        if (typeof fn === 'function') el.removeEventListener(type, fn);
      } catch (err) {
        console.warn('detachProfileListeners: removeEventListener failed', el, type, err);
      }
    });
    el.__profileHandlers = {}; // reset
  });

  if (updateProfileForm && updateProfileForm.__submitHandlerAttached) {
    updateProfileForm.removeEventListener('submit', updateProfileForm.__submitHandler);
    updateProfileForm.__submitHandlerAttached = false;
  }
}

function attachProfileListeners() {
  detachProfileListeners();

if (fullNameInput && !fullNameInput.disabled) {

  try {
    const prev = fullNameInput.__profileHandlers || {};
    if (prev.input) fullNameInput.removeEventListener('input', prev.input);
    if (prev.blur) fullNameInput.removeEventListener('blur', prev.blur);
  } catch (e) { /* ignore */ }
  
  const fullNameInputHandler = () => {
    const before = fullNameInput.value || '';
    if (/^\s+/.test(before)) {
      const caret = fullNameInput.selectionStart || 0;
      const newVal = before.replace(/^\s+/, '');
      fullNameInput.value = newVal;
      const shift = before.length - newVal.length;
      const newCaret = Math.max(0, caret - shift);
      fullNameInput.setSelectionRange(newCaret, newCaret);
    }

    const trimmed = (fullNameInput.value || '').trim();

    if (!trimmed) {
      if (fullNameError) {
        fullNameError.textContent = '';
        fullNameError.classList.remove('active');
      }
      fullNameInput.classList.remove('invalid');
      validateProfileForm(false);
      return;
    }

    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      if (fullNameError) {
        fullNameError.textContent = 'Full name must contain only letters';
        fullNameError.classList.add('active');
      }
      fullNameInput.classList.add('invalid');
    } else {
      if (fullNameError && !fieldTouched.fullName) {
        fullNameError.textContent = '';
        fullNameError.classList.remove('active');
      }
      fullNameInput.classList.remove('invalid');
    }

    validateProfileForm(false);
  };

  const fullNameBlurHandler = () => {
    fieldTouched.fullName = true;
    fullNameInput.value = (fullNameInput.value || '').trim();
    validateField('fullName');
    validateProfileForm(true);
  };

  fullNameInput.addEventListener('input', fullNameInputHandler);
  fullNameInput.addEventListener('blur', fullNameBlurHandler);

  fullNameInput.__profileHandlers = {
    ...(fullNameInput.__profileHandlers || {}),
    input: fullNameInputHandler,
    blur: fullNameBlurHandler
  };
}



if (usernameInput && !usernameInput.disabled) {
  try {
    const prev = usernameInput.__profileHandlers || {};
    if (prev.input) usernameInput.removeEventListener('input', prev.input);
    if (prev.blur) usernameInput.removeEventListener('blur', prev.blur);
    if (prev.focus) usernameInput.removeEventListener('focus', prev.focus);
  } catch (e) { /* ignore */ }

  try { usernameInput.maxLength = 15; } catch (e) {}

  const errEl = usernameError;
  let pendingSeq = 0; // incremental sequence to ignore stale responses

  function cancelPendingCheck() {
    pendingSeq++;
  }

  function showCheckingUI() {
    if (!errEl) return;
    errEl.textContent = 'Checking availability...';
    errEl.classList.remove('error', 'available');
    errEl.classList.add('checking', 'active');
    usernameInput.classList.remove('invalid', 'valid');
    isUsernameAvailable = null;
  }

  const runAvailabilityCheck = debounce(async () => {
    const mySeq = ++pendingSeq; // this run's id
    const valueNow = (usernameInput.value || '').trim();

    if (!valueNow || valueNow.length < 3) return;

    if (valueNow.length > 15) {
      cancelPendingCheck();
      if (errEl) {
        errEl.textContent = 'Username cannot exceed 15 characters';
        errEl.classList.remove('checking', 'available');
        errEl.classList.add('error', 'active');
      }
      usernameInput.classList.add('invalid');
      isUsernameAvailable = false;
      return;
    }

    let ok = false;
    try {
      ok = await checkUsernameAvailability(valueNow);
    } catch (e) {
      ok = false;
    }

    if (mySeq !== pendingSeq) return;

    if (ok) {
      isUsernameAvailable = true;
      if (errEl) {
        errEl.textContent = `${valueNow} is available`;
        errEl.classList.remove('error', 'checking');
        errEl.classList.add('available', 'active');
      }
      usernameInput.classList.remove('invalid');
      usernameInput.classList.add('valid');
    } else {
      isUsernameAvailable = false;
      if (errEl) {
        errEl.textContent = `${valueNow} is already taken`;
        errEl.classList.remove('checking', 'available');
        errEl.classList.add('error', 'active');
      }
      usernameInput.classList.remove('valid');
      usernameInput.classList.add('invalid');
    }

    validateProfileForm(false);
  }, 300); // tweak debounce delay as desired

  const usernameImmediateHandler = (e) => {
    const before = usernameInput.value || '';
    if (/^\s+/.test(before)) {
      const caret = usernameInput.selectionStart || 0;
      const newVal = before.replace(/^\s+/, '');
      usernameInput.value = newVal;
      const shift = before.length - newVal.length;
      const newCaret = Math.max(0, caret - shift);
      usernameInput.setSelectionRange(newCaret, newCaret);
    }

    const raw = usernameInput.value || '';
    const val = raw.trim();

    if (errEl) errEl.classList.remove('error', 'checking', 'available');

    if (!val) {
      cancelPendingCheck();
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('active'); }
      usernameInput.classList.remove('invalid', 'valid');
      isUsernameAvailable = null;
      validateProfileForm(false);
      return;
    }

    if (val.length > 15) {
      cancelPendingCheck();
      if (errEl) {
        errEl.textContent = 'Username cannot exceed 15 characters';
        errEl.classList.remove('checking', 'available');
        errEl.classList.add('error', 'active');
      }
      usernameInput.classList.add('invalid');
      isUsernameAvailable = false;
      validateProfileForm(false);
      return;
    }

    if (/^\d/.test(val)) {
      cancelPendingCheck();
      if (errEl) { errEl.textContent = 'Username cannot start with a number'; errEl.classList.add('active', 'error'); }
      usernameInput.classList.add('invalid');
      isUsernameAvailable = false;
      validateProfileForm(false);
      return;
    }
    if (/^_/.test(val)) {
      cancelPendingCheck();
      if (errEl) { errEl.textContent = 'Username cannot start with underscore'; errEl.classList.add('active', 'error'); }
      usernameInput.classList.add('invalid');
      isUsernameAvailable = false;
      validateProfileForm(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]*$/.test(val)) {
      cancelPendingCheck();
      if (errEl) { errEl.textContent = 'Username can only contain letters, numbers, or underscores'; errEl.classList.add('active', 'error'); }
      usernameInput.classList.add('invalid');
      isUsernameAvailable = false;
      validateProfileForm(false);
      return;
    }

    if (val.length < 3 && !(fieldTouched.username || document.activeElement !== usernameInput)) {
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('active', 'error'); }
      usernameInput.classList.remove('invalid');
      isUsernameAvailable = null;
      cancelPendingCheck();
      validateProfileForm(false);
      return;
    }

    showCheckingUI();
    runAvailabilityCheck();
  };

  usernameInput.addEventListener('input', usernameImmediateHandler);

  usernameInput.addEventListener('focus', () => {
    const note = document.getElementById('usernameNote');
    if (note) {
      note.classList.add('active');
      setTimeout(() => note.classList.remove('active'), 2500);
    }
  });

  usernameInput.addEventListener('blur', async () => {
    fieldTouched.username = true;
    validateField('username'); // will show min-length error if needed

    const val = (usernameInput.value || '').trim();
    const currentUsername = localStorage.getItem('username') || '';

    if (val && /^[a-zA-Z0-9_]{3,15}$/.test(val) && val !== currentUsername) {
      const mySeq = ++pendingSeq;
      let ok = false;
      try {
        ok = await checkUsernameAvailability(val);
      } catch (e) {
        ok = false;
      }
      if (mySeq !== pendingSeq) return; // stale
      if (ok) {
        isUsernameAvailable = true;
        if (errEl) { errEl.textContent = `${val} is available`; errEl.classList.remove('error','checking'); errEl.classList.add('available','active'); }
        usernameInput.classList.remove('invalid'); usernameInput.classList.add('valid');
      } else {
        isUsernameAvailable = false;
        if (errEl) { errEl.textContent = `${val} is already taken`; errEl.classList.remove('checking','available'); errEl.classList.add('error','active'); }
        usernameInput.classList.remove('valid'); usernameInput.classList.add('invalid');
      }
    }

    validateProfileForm(true);
  });

  usernameInput.__profileHandlers = {
    ...(usernameInput.__profileHandlers || {}),
    input: usernameImmediateHandler
  };
}




if (phoneNumberInput && !phoneNumberInput.disabled) {
  const phonePasteHandler = (ev) => {
    ev.preventDefault();
    const pasted = (ev.clipboardData || window.clipboardData).getData('text') || '';
    const digits = pasted.replace(/\D/g, '').slice(0, 14);
    if (!digits) return;

    const normalized = normalizePhoneProfile(digits).slice(0, 11);
    const formatted = formatNigeriaNumberProfile(normalized, false, true).value;
    phoneNumberInput.value = formatted;
    phoneNumberInput.setSelectionRange(formatted.length, formatted.length);

    fieldTouched.phoneNumber = true;
    validatePhoneNumberField(phoneNumberInput, phoneNumberError);
    validateProfileForm(false);

    if (normalized.length === 11 && isNigeriaMobileProfile(normalized)) {
      phoneNumberInput.blur();
    }
  };

  const phoneInputHandler = debounce((e) => {
    const rawNoSpaces = (phoneNumberInput.value || '').replace(/\s/g, '');
    const isDelete = e && (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward');

    if (!rawNoSpaces) {
      phoneNumberInput.classList.remove('invalid');
      if (phoneNumberError) { phoneNumberError.textContent = ''; phoneNumberError.classList.remove('active'); }
      validateProfileForm(false);
      return;
    }

    if (/^[1456]$/.test(rawNoSpaces)) {
      phoneNumberInput.classList.add('invalid');
      if (phoneNumberError) {
        phoneNumberError.textContent = `Phone number cannot start with ${rawNoSpaces}`;
        phoneNumberError.classList.add('active');
      }
      validateProfileForm(false);
      return;
    }

    const normalized = normalizePhoneProfile(rawNoSpaces) || rawNoSpaces;
    const finalNormalized = normalized.slice(0, 11);
    const formatted = formatNigeriaNumberProfile(finalNormalized, /^[789]$/.test(rawNoSpaces), false).value;

    phoneNumberInput.value = formatted;
    phoneNumberInput.setSelectionRange(formatted.length, formatted.length);

    if (finalNormalized.length >= 3 && !isValidPrefixPartial(finalNormalized)) {
      phoneNumberInput.classList.add('invalid');
      if (phoneNumberError) {
        phoneNumberError.textContent = 'Invalid Nigerian phone number prefix';
        phoneNumberError.classList.add('active');
      }
      validateProfileForm(false);
      return;
    }

    phoneNumberInput.classList.remove('invalid');
    if (phoneNumberError) { phoneNumberError.textContent = ''; phoneNumberError.classList.remove('active'); }

    if (finalNormalized.length === 11) {
      fieldTouched.phoneNumber = true;
      validatePhoneNumberField(phoneNumberInput, phoneNumberError);
      validateProfileForm(false);
      if (isNigeriaMobileProfile(finalNormalized)) {
        phoneNumberInput.blur();
      }
    } else {
      validateProfileForm(false);
    }
  }, 60);

  const phoneBeforeInput = (e) => {
    if (e.data && !/^\d$/.test(e.data)) {
      if (!(e.data === '+' && phoneNumberInput.selectionStart === 0)) {
        e.preventDefault();
      }
    }
    if (e.data === '+' && phoneNumberInput.value.length === 0) {
      e.preventDefault();
      phoneNumberInput.value = '0';
      phoneNumberInput.setSelectionRange(1, 1);
    }
  };

  const phoneKeydown = (e) => {
    const allowed = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'
    ];
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v'].includes(e.key.toLowerCase())) return;
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
  };

  phoneNumberInput.addEventListener('beforeinput', phoneBeforeInput);
  phoneNumberInput.addEventListener('keydown', phoneKeydown);
  phoneNumberInput.addEventListener('paste', phonePasteHandler);
  phoneNumberInput.addEventListener('input', phoneInputHandler);
  phoneNumberInput.addEventListener('blur', () => {
    fieldTouched.phoneNumber = true;
    validatePhoneNumberField(phoneNumberInput, phoneNumberError);
    validateProfileForm(true);
  });

  phoneNumberInput.__profileHandlers = {
    beforeinput: phoneBeforeInput,
    keydown: phoneKeydown,
    paste: phonePasteHandler,
    input: phoneInputHandler,
    blur: null
  };

  phoneNumberInput.maxLength = 13; // allow for spaces in formatting
}

if (addressInput && !addressInput.disabled) {
  const liveHandler = () => {
    const v = addressInput.value || '';
    const allowedRe = /^[a-zA-Z0-9\s,.\-#]*$/;
    let error = '';

    if (v.startsWith(' ')) {
      error = 'Address cannot start with a space';
    } else if (!allowedRe.test(v)) {
      const invalid = v.split('').filter(ch => !/[a-zA-Z0-9\s,.\-#]/.test(ch));
      const uniq = [...new Set(invalid)];
      error = `Address contains invalid character${uniq.length > 1 ? 's' : ''}: ${uniq.join('')}`;
    }

    if (error) {
      if (addressError) {
        addressError.textContent = error;
        addressError.classList.add('active');
      }
      addressInput.classList.add('invalid');
    } else {
      if (addressError && !fieldTouched.address) {
        addressError.textContent = '';
        addressError.classList.remove('active');
      }
      addressInput.classList.remove('invalid');
    }

    validateProfileForm(false); // do not force length errors here
  };

  const blurHandler = () => {
    fieldTouched.address = true;
    addressInput.value = (addressInput.value || '').trim();
    validateField('address');
    validateProfileForm(true);
  };

  const debouncedHandler = debounce(liveHandler, 120);
  addressInput.addEventListener('input', debouncedHandler);
  addressInput.addEventListener('blur', blurHandler);

  addressInput.__profileHandlers = {
    ...(addressInput.__profileHandlers || {}),
    input: debouncedHandler,
    blur: blurHandler
  };
}



}


function openUpdateProfileModal(profile = {}) {
  if (!updateProfileModal || !updateProfileForm) {
    console.error('[ERROR] openUpdateProfileModal: Modal or form not found');
    return;
  }
 
  updateProfileModal.style.display = 'block';
  setTimeout(() => {
    updateProfileModal.classList.add('active');
    updateProfileModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }, 10);
 
  const fullName = profile?.fullName || localStorage.getItem('fullName') || (localStorage.getItem('userEmail') || '').split('@')[0] || '';
  const username = profile?.username || localStorage.getItem('username') || '';
  const phoneNumber = profile?.phoneNumber || localStorage.getItem('phoneNumber') || '';
  const email = profile?.email || localStorage.getItem('userEmail') || '';
  const address = profile?.address || localStorage.getItem('address') || '';
 
  if (fullNameInput) fullNameInput.value = fullName;
  if (usernameInput) usernameInput.value = username;
  if (phoneNumberInput) phoneNumberInput.value = phoneNumber ? formatNigeriaNumberProfile(phoneNumber).value : '';
  if (emailInput) emailInput.value = email;
  if (addressInput) addressInput.value = address;
 
  if (fullNameInput) fullNameInput.disabled = localStorage.getItem('fullNameEdited') === 'true';
  if (phoneNumberInput) phoneNumberInput.disabled = !!phoneNumber;
  if (emailInput) emailInput.disabled = true;
  if (addressInput) addressInput.disabled = !!(profile?.address || localStorage.getItem('address')?.trim());
  if (profilePictureInput) profilePictureInput.disabled = false; // always editable
 
  const profilePicture = localStorage.getItem('profilePicture') || '';
  const isValidProfilePicture = !!profilePicture && /^(data:image\/|https?:\/\/|\/|blob:)/i.test(profilePicture);
  const displayName = username || (fullName.split(' ')[0] || 'User');
 
  if (profilePicturePreview) {
    if (isValidProfilePicture) {
      profilePicturePreview.innerHTML = `<img src="${profilePicture}" alt="Profile Picture" class="avatar-img" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      profilePicturePreview.innerHTML = '';
      profilePicturePreview.textContent = displayName.charAt(0).toUpperCase();
    }
  }
 
  [fullNameError, usernameError, phoneNumberError, addressError, profilePictureError].forEach(errEl => {
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.remove('active', 'error', 'checking', 'available');
    }
  });
 
  [fullNameInput, usernameInput, phoneNumberInput, addressInput].forEach(inp => {
    if (inp) inp.classList.remove('invalid');
  });
 
  Object.keys(fieldTouched).forEach(k => fieldTouched[k] = false);
 
  detachProfileListeners();
  attachProfileListeners(); // attachProfileListeners should add input/blur/paste handlers for fullName/username/phone/address/profilePicture
 
 
  validateProfileForm(false);
 
  console.log('[DEBUG] openUpdateProfileModal: Modal opened', { fullName, username, phoneNumber, email });
}
window.openUpdateProfileModal = openUpdateProfileModal;

function closeUpdateProfileModal() {
    detachProfileListeners();

    const previousModal = ModalManager.getPreviousModal('updateProfileModal');

    ModalManager.closeModal('updateProfileModal');

    if (previousModal) {
        console.log('[DEBUG] Restoring previous modal:', previousModal);
        ModalManager.openModal(previousModal);
    }

    console.log('[DEBUG] updateProfileModal closed via ModalManager');
}

window.closeUpdateProfileModal = closeUpdateProfileModal;





if (profilePictureInput && profilePicturePreview) {
  profilePictureInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (profilePictureError) {
      profilePictureError.textContent = '';
      profilePictureError.classList.remove('active');
    }
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        if (profilePictureError) {
          profilePictureError.textContent = 'File size must be less than 2MB';
          profilePictureError.classList.add('active');
        }
        profilePicturePreview.innerHTML = '';
        profilePicturePreview.textContent = (usernameInput?.value || fullNameInput?.value.split(' ')[0] || 'User').charAt(0).toUpperCase();
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        if (profilePictureError) {
          profilePictureError.textContent = 'Only JPG, PNG, or GIF files are allowed';
          profilePictureError.classList.add('active');
        }
        profilePicturePreview.innerHTML = '';
        profilePicturePreview.textContent = (usernameInput?.value || fullNameInput?.value.split(' ')[0] || 'User').charAt(0).toUpperCase();
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        profilePicturePreview.innerHTML = `<img src="${reader.result}" alt="Profile Picture" class="avatar-img" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      };
      reader.readAsDataURL(file);
    } else {
      const displayName = usernameInput?.value || fullNameInput?.value.split(' ')[0] || 'User';
      profilePicturePreview.innerHTML = '';
      profilePicturePreview.textContent = displayName.charAt(0).toUpperCase();
    }
    fieldTouched.profilePicture = true;
    validateField('profilePicture');
    validateProfileForm(true);
  });
}




    document.querySelectorAll('.svg-inject').forEach(el =>
    fetch(el.src)
      .then(r => r.text())
      .then(svg => {
        el.outerHTML = svg;
      })
    );

(function () {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingsBack = document.getElementById('settingsBack');
  const closeSettings = document.getElementById('closeSettings');
  const openUpdateProfile = document.getElementById('openUpdateProfile');
  const logoutBtnModal = document.getElementById('logoutBtnModal');
  const helpSupportBtn = document.getElementById('helpSupportBtn');
  const securityBtn = document.getElementById('securityBtn');
  const themeToggle = document.getElementById('themeToggle');
  const settingsAvatar = document.getElementById('settingsAvatar');
  const settingsUsername = document.getElementById('settingsUsername');
  const settingsEmail = document.getElementById('settingsEmail');

  if (!settingsModal) return;

  function showModal() {
    settingsModal.style.display = 'flex';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden'; // Ensure body is also locked
    if (settingsBtn) settingsBtn.classList.add('active');
    console.log('[SettingsModal] showModal: Modal opened, scroll locked');
  }

  function hideModal() {
  settingsModal.style.setProperty('display', 'none', 'important');

  document.documentElement.style.setProperty('overflow', '', 'important');
  document.body.style.setProperty('overflow', '', 'important');

  if (settingsBtn) settingsBtn.classList.remove('active');

  console.log('[SettingsModal] hideModal: Modal closed, scroll restored');
}


  if (settingsBtn) settingsBtn.addEventListener('click', showModal);

  if (settingsBack) settingsBack.addEventListener('click', hideModal);
  if (closeSettings) closeSettings.addEventListener('click', hideModal);

  const settingsModalContent = settingsModal.querySelector('.settings-content');
  if (settingsModalContent) {
    settingsModalContent.addEventListener('click', (e) => e.stopPropagation());
  }

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) hideModal();
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.attributeName === 'style' &&
        settingsModal.style.display === 'none'
      ) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        console.log(
          '[SettingsModal] MutationObserver: Modal hidden externally, scroll restored'
        );
      }
    });
  });
  observer.observe(settingsModal, { attributes: true, attributeFilter: ['style'] });

  window.addEventListener('popstate', () => {
    if (settingsModal.style.display === 'flex') {
      hideModal();
      console.log('[SettingsModal] popstate: Modal closed due to back navigation');
    }
  });

function updateAvatar(el, newUrl, fallbackLetter) {
  if (!isValidImageSource(newUrl)) {
    if (el.innerHTML !== fallbackLetter) {
      el.innerHTML = fallbackLetter;
      el.classList.add('fade-in');
    }
    return;
  }

  const currentImg = el.querySelector('img');
  if (currentImg) {
    const currentSrc = currentImg.src.split('?')[0]; // Remove query params
    const newSrc = (newUrl.startsWith('http') ? newUrl : `${location.origin}${newUrl}`).split('?')[0];
    
    if (currentSrc === newSrc) {
      console.log('[updateAvatar] Same image already loaded, skipping');
      return;
    }
  }

  const img = new Image();
  img.src = newUrl.startsWith('/')
    ? `${location.protocol}//${location.host}${newUrl}`
    : newUrl;
  img.alt = "Profile";
  img.className = "avatar-img";
  img.style.cssText =
    "width:100%;height:100%;border-radius:50%;object-fit:cover;opacity:0;transition:opacity .3s ease;";

  img.onload = () => {
    el.innerHTML = "";
    el.appendChild(img);
    requestAnimationFrame(() => {
      img.style.opacity = "1";
    });
  };

  img.onerror = () => {
    if (el.innerHTML !== fallbackLetter) {
      el.innerHTML = fallbackLetter;
      el.classList.add("fade-in");
    }
  };
}

let _cachedProfilePromise = null;

function addCacheBuster(url) {
  if (!url) return url;
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('cb', Date.now().toString());
    return u.toString();
  } catch (e) {
    return url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now();
  }
}

function invalidateProfileCache() {
  _cachedProfilePromise = null;
}
window.invalidateProfileCache =  window.invalidateProfileCache || invalidateProfileCache;

window.addEventListener('storage', (ev) => {
  if (ev.key === 'profile_refreshed_at') {
    invalidateProfileCache();
    loadProfileToSettings().catch(() => {});
  }
});

let _profileLoadInProgress = false;
let _lastProfileLoadTime = 0;
const PROFILE_LOAD_COOLDOWN = 1000; // Don't reload within 1 second

async function loadProfileToSettings(force = false) {
  const settingsAvatar = document.getElementById('settingsAvatar');
  const settingsUsername = document.getElementById('settingsUsername');
  const settingsEmail = document.getElementById('settingsEmail');

  if (!settingsAvatar || !settingsUsername || !settingsEmail) {
    console.error('[ERROR] loadProfileToSettings: Missing DOM elements');
    return;
  }

  const now = Date.now();
  if (!force && _profileLoadInProgress) {
    console.log('[loadProfileToSettings] Already loading, skipping');
    return;
  }
  
  if (!force && (now - _lastProfileLoadTime) < PROFILE_LOAD_COOLDOWN) {
    console.log('[loadProfileToSettings] Cooldown active, skipping');
    return;
  }

  _profileLoadInProgress = true;
  _lastProfileLoadTime = now;

  try {
    const localProfile = {
      profilePicture: localStorage.getItem('profilePicture') || '',
      username: localStorage.getItem('username') || '',
      fullName: localStorage.getItem('fullName') || '',
      firstName: localStorage.getItem('firstName') || '',
      email: localStorage.getItem('userEmail') || '',
    };

    const hasUsefulCache = !!(localProfile.profilePicture || localProfile.username || localProfile.fullName || localProfile.email);

    const updateUI = (profile, useCacheBuster = false) => {
      const displayName =
        profile.username ||
        profile.firstName ||
        (profile.email ? profile.email.split('@')[0] : 'User');

      const avatarUrl = profile.profilePicture || '/frontend/img/avatar-placeholder.png';
      const fallbackLetter = (displayName.charAt(0) || 'U').toUpperCase();
      const finalAvatarUrl = useCacheBuster ? addCacheBuster(avatarUrl) : avatarUrl;

      const currentUsername = settingsUsername.textContent;
      const currentEmail = settingsEmail.textContent;

      if (currentUsername !== displayName) {
        settingsUsername.textContent = displayName;
        if (currentUsername && currentUsername !== 'Loading...') {
          settingsUsername.classList.add('fade-in');
        }
      }

      if (currentEmail !== (profile.email || 'Not set')) {
        settingsEmail.textContent = profile.email || 'Not set';
        if (currentEmail && currentEmail !== 'Loading...') {
          settingsEmail.classList.add('fade-in');
        }
      }

      updateAvatar(settingsAvatar, finalAvatarUrl, fallbackLetter);
    };

    if (hasUsefulCache) {
      updateUI(localProfile, false);
    }

    if (force) {
      _cachedProfilePromise = null;
    }

    if (!hasUsefulCache || force) {
      if (!_cachedProfilePromise || force) {
        _cachedProfilePromise = (async () => {
          try {
            const resp = await fetch(`https://api.flexgig.com.ng/api/profile?_=${Date.now()}`, {
              credentials: 'include',
              headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
              cache: 'no-store'
            });

            if (!resp.ok) {
              console.warn('[loadProfileToSettings] Server returned non-OK:', resp.status);
              return localProfile;
            }

            const serverProfile = await resp.json().catch(() => ({}));

            const mergedProfile = {
              profilePicture:
                serverProfile.profilePicture ||
                serverProfile.profile_picture ||
                serverProfile.avatar_url ||
                '',
              username: serverProfile.username || '',
              fullName: serverProfile.fullName || serverProfile.full_name || '',
              firstName:
                (serverProfile.fullName && serverProfile.fullName.split(' ')[0]) ||
                (serverProfile.full_name && serverProfile.full_name.split(' ')[0]) ||
                '',
              email: serverProfile.email || '',
            };

            const serverHasPin = serverProfile.hasPin ?? serverProfile.has_pin ?? serverProfile.hasPIN ?? null;
            if (serverHasPin !== null) {
              localStorage.setItem('hasPin', serverHasPin ? 'true' : 'false');
            }

            try {
              if (mergedProfile.profilePicture) localStorage.setItem('profilePicture', mergedProfile.profilePicture);
              if (mergedProfile.username) localStorage.setItem('username', mergedProfile.username);
              if (mergedProfile.fullName) {
                localStorage.setItem('fullName', mergedProfile.fullName);
                localStorage.setItem('firstName', mergedProfile.firstName || mergedProfile.fullName.split(' ')[0] || '');
              }
              if (mergedProfile.email) localStorage.setItem('userEmail', mergedProfile.email);
              localStorage.setItem('profile_refreshed_at', Date.now().toString());
            } catch (e) {
              console.warn('Could not save to localStorage', e);
            }

            return mergedProfile;
          } catch (err) {
            console.error('[ERROR] loadProfileToSettings fetch failed:', err);
            return localProfile;
          }
        })();
      }

      const finalProfile = await _cachedProfilePromise;

      if (!document.getElementById('settingsAvatar')) {
        console.warn('[loadProfileToSettings] DOM removed during fetch');
        return finalProfile;
      }

      updateUI(finalProfile, true);

      return finalProfile;
    }

    return localProfile;

  } finally {
    _profileLoadInProgress = false;
  }
}


window.loadProfileToSettings = window.loadProfileToSettings || loadProfileToSettings;


loadProfileToSettings().catch(e => console.warn('loadProfileToSettings failed', e));



  if (openUpdateProfile) {
    openUpdateProfile.addEventListener('click', () => {
      lastModalSource = 'settings';
      openUpdateProfileModal();
      hideModal(); // Ensure scroll is restored when opening another modal
    });
  }

  const profileOpenBtn = document.getElementById('profileopenbtn');
  if (profileOpenBtn) {
    const updateProfileModal = new bootstrap.Modal(
      document.getElementById('updateprofile')
    );
    profileOpenBtn.addEventListener('click', function () {
      updateProfileModal.show();
      hideModal(); // Ensure scroll is restored
    });
  }



if (logoutBtnModal) {
  logoutBtnModal.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (logoutBtnModal.disabled) return;
    logoutBtnModal.disabled = true;
    
    const originalText = logoutBtnModal.textContent;
    logoutBtnModal.textContent = 'Logging out...';
    
    showLoader();

    try {
      await fullClientLogout();
    } catch (err) {
      console.error('[modal logout] Full logout failed:', err);
      window.location.replace('/');
    } finally {
      try { 
        hideModal(); 
        hideLoader();
        logoutBtnModal.disabled = false;
        logoutBtnModal.textContent = originalText;
      } catch (_) {
      }
    }
  });
}

window.addEventListener('beforeunload', () => {
  try {
    window.currentUser = null;
    window.currentEmail = null;
    window.__rp_reset_token = null;
  } catch (e) {}
});

window.addEventListener('storage', (e) => {
  if (e.key === null || e.key === 'token' || e.key === 'user') {
    if (!e.newValue && e.oldValue) {
      console.log('[storage event] Detected logout from another tab');
      window.location.replace('/');
    }
  }
});



  function setDarkMode(enabled) {
    if (enabled) document.documentElement.classList.add('dark-mode');
    else document.documentElement.classList.remove('dark-mode');
    if (themeToggle) themeToggle.setAttribute('aria-pressed', !!enabled);
    localStorage.setItem('dark_mode', enabled ? '1' : '0');
  }

  const stored = localStorage.getItem('dark_mode');
  setDarkMode(stored === '1');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark-mode');
      setDarkMode(!isDark);
    });
  }

let _modalOpenTimer = null;
const obs = new MutationObserver(() => {
  if (settingsModal.style.display === 'flex') {
    if (_modalOpenTimer) clearTimeout(_modalOpenTimer);
    
    _modalOpenTimer = setTimeout(() => {
      loadProfileToSettings();
    }, 100); // Small delay to let modal finish opening
  }
});
obs.observe(settingsModal, { attributes: true, attributeFilter: ['style'] });
})();

const helpSupportBtn = document.getElementById('helpSupportBtn');
const helpSupportModal = document.getElementById('helpSupportModal');
const helpCloseBtn = helpSupportModal?.querySelector('.help-modal-close');
const settingsModal = document.getElementById('settingsModal');

if (helpSupportBtn && helpSupportModal) {
  helpSupportBtn.addEventListener('click', () => {
    console.log('Help & Support clicked');

    helpSupportModal.classList.add('active');
    document.body.classList.add('modal-open');
  });
}

if (helpCloseBtn) {
  helpCloseBtn.addEventListener('click', () => {
    console.log('Help & Support closed');
    helpSupportModal.classList.remove('active');
    document.body.classList.remove('modal-open');

    if (settingsModal) {
      settingsModal.style.display = 'flex';
    }
  });
}

helpSupportModal?.addEventListener('click', (e) => {
  if (e.target === helpSupportModal) {
    helpCloseBtn?.click();
  }
});

document.querySelectorAll('.contact-box').forEach((box) => {
  box.addEventListener('contextmenu', (e) => e.preventDefault());
});




/* ---------- Security modal behavior + WebAuthn integration ---------- */
/* ---------- Security modal behavior + WebAuthn integration ---------- */
/* ---------- Security modal behavior + WebAuthn integration ---------- */
/* ---------- Security modal behavior + WebAuthn integration ---------- */
(function (supabase) {
  /* Unique-scoped security modal module (prefix __sec_) */
  const __sec_DEBUG = true;
  const __sec_log = {
    d: (...a) => { if (__sec_DEBUG) console.debug('[__sec][debug]', ...a); },
    i: (...a) => { if (__sec_DEBUG) console.info('[__sec][info]', ...a); },
    w: (...a) => { if (__sec_DEBUG) console.warn('[__sec][warn]', ...a); },
    e: (...a) => { if (__sec_DEBUG) console.error('[__sec][error]', ...a); },
  };
  window.__sec_log = window.__sec_log || __sec_log; // expose for debugging

  __sec_log.d('Security module initializing with supabase:', !!supabase);

  const __sec_q = (sel) => {
    __sec_log.d('Querying selector:', sel);
    try { 
      const result = document.querySelector(sel);
      __sec_log.d('Query result for', sel, !!result);
      return result;
    }
    catch (err) { 
      __sec_log.e('bad selector', sel, err); 
      return null; 
    }
  };

  /* Elements — use your IDs */
  __sec_log.d('Querying all security elements');
  const __sec_modal = __sec_q('#securityModal');
  const __sec_closeBtn = __sec_q('#securityCloseBtn');
  const __sec_parentSwitch = __sec_q('#biometricsSwitch');
  const __sec_bioOptions = __sec_q('#biometricsOptions');
  const __sec_bioLogin = __sec_q('#bioLoginSwitch');
  const __sec_bioTx = __sec_q('#bioTxSwitch');
  const __sec_pinBtn = __sec_q('#pinToggleBtn');
  const __sec_pwdBtn = __sec_q('#changePwdBtn');
  const __sec_launcherBtn = __sec_q('#securityBtn');

  __sec_log.d('Modal elements queried:', {
    modal: !!__sec_modal,
    closeBtn: !!__sec_closeBtn,
    launcherBtn: !!__sec_launcherBtn,
    parentSwitch: !!__sec_parentSwitch
  });

  /* Storage keys */
  const __sec_KEYS = {
    biom: 'security_biom_enabled',
    bioLogin: 'security_bio_login',
    bioTx: 'security_bio_tx',
    balance: 'security_balance_visible'
  };
  __sec_log.d('Storage keys defined:', __sec_KEYS);
  window.__sec_KEYS = window.__sec_KEYS || __sec_KEYS; // expose for debugging

  /* Helpers */
const __sec_setChecked = (el, v) => {
  __sec_log.d('setChecked called for el:', el?.id || 'unknown', 'value:', v);
  if (!el) return;
  try {
    const boolV = !!v;

    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      try { el.checked = boolV; } catch (err) { __sec_log.w('setChecked: failed to set .checked', err); }
    }

    try { el.setAttribute('aria-checked', boolV ? 'true' : 'false'); } catch (err) { __sec_log.w('setChecked: aria set failed', err); }

    try {
      if (boolV) {
        el.classList.add('active');
        el.classList.remove('inactive');
      } else {
        el.classList.add('inactive');
        el.classList.remove('active');
      }
      el.dataset.active = boolV ? 'true' : 'false';
    } catch (err) {
      __sec_log.w('setChecked: class toggling failed', err);
    }

    __sec_log.d('setChecked applied:', {
      aria: el.getAttribute('aria-checked'),
      checked: (el instanceof HTMLInputElement) ? el.checked : undefined,
      classActive: !!(el.classList && el.classList.contains && el.classList.contains('active'))
    });
  } catch (err) {
    __sec_log.e('setChecked top-level error', err);
  }
};


const __sec_isChecked = (el) => {
  if (!el) return false;
  try {
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      const c = !!el.checked;
      __sec_log.d('isChecked (input) for', el.id || 'unknown', c);
      return c;
    }
    const aria = el.getAttribute && el.getAttribute('aria-checked');
    if (aria === 'true' || aria === 'false') {
      const c = aria === 'true';
      __sec_log.d('isChecked (aria) for', el.id || 'unknown', c);
      return c;
    }
    const hasActive = el.classList && el.classList.contains && el.classList.contains('active');
    __sec_log.d('isChecked (class fallback) for', el.id || 'unknown', hasActive);
    return !!hasActive;
  } catch (err) {
    __sec_log.e('isChecked error', err);
    return false;
  }
};


function __sec_toggleSwitch(el, forced) {
  __sec_log.d('toggleSwitch entry:', { el: el?.id || 'unknown', forced });
  if (!el) { 
    __sec_log.w('toggleSwitch: no element'); 
    return false; 
  }
  try {
    const cur = __sec_isChecked(el);
    const next = (typeof forced === 'boolean') ? forced : !cur;
    __sec_setChecked(el, next);
    __sec_log.d('toggleSwitch exit:', { cur, next });
    try {
      const ev = new CustomEvent('sec:switch-change', { detail: { id: el.id, checked: next } });
      el.dispatchEvent(ev);
    } catch (evErr) {
      __sec_log.d('toggleSwitch: event dispatch failed', evErr);
    }
    return next;
  } catch (err) {
    __sec_log.e('toggleSwitch error', err);
    return false;
  }
}



  /* UI lock helpers for async ops */
  function __sec_setBusy(el, busy = true) {
    __sec_log.d('setBusy called:', { el: el?.id || 'unknown', busy });
    if (!el) return;
    try { 
      el.disabled = !!busy; 
      __sec_log.d('setBusy disabled:', el.disabled);
    } catch (e) { 
      __sec_log.e('setBusy disable error:', e);
    }
    if (busy) { 
      el.setAttribute('aria-busy', 'true'); 
      __sec_log.d('setBusy aria-busy true');
    } else { 
      el.removeAttribute('aria-busy'); 
      __sec_log.d('setBusy aria-busy removed');
    }
  }

  /* Async: get current user (use stored authToken and sync with custom API) */
  async function __sec_getCurrentUser() {
    __sec_log.d('__sec_getCurrentUser: Starting');

    if (typeof window.getSession === 'function') {
      __sec_log.d('__sec_getCurrentUser: Attempting window.getSession');
      const session = await window.getSession();
      __sec_log.d('__sec_getCurrentUser: window.getSession result (raw)', session);
      if (session && session.user) {
        __sec_log.i('Retrieved session from getSession', session.user);
        return { user: session.user };
      } else {
        __sec_log.w('No valid session from getSession', session);
      }
    }

    __sec_log.d('__sec_getCurrentUser: Fetching /api/session with cookies');
    const res = await fetch('https://api.flexgig.com.ng/api/session', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    const raw = await res.text();
    __sec_log.d('__sec_getCurrentUser: /api/session raw body', raw);

    let parsed = null;
    try { 
      parsed = JSON.parse(raw); 
      __sec_log.d('__sec_getCurrentUser: JSON parse success');
    } catch (e) { 
      __sec_log.e('parse error', e); 
    }
    __sec_log.d('__sec_getCurrentUser: parsed', parsed);

    if (res.ok && parsed && parsed.user) {
      __sec_log.i('Retrieved session from /api/session', parsed.user);
      return { user: parsed.user };
    }

    if (res.status === 401) {
      __sec_log.i('Session expired, attempting refresh');
      const refreshRes = await fetch('https://api.flexgig.com.ng/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      const rawRefresh = await refreshRes.text();
      __sec_log.d('__sec_getCurrentUser: /auth/refresh raw body', rawRefresh);

      if (refreshRes.ok) {
        __sec_log.d('__sec_getCurrentUser: Refresh successful, retrying session');
        const retryRes = await fetch('https://api.flexgig.com.ng/api/session', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        const retryRaw = await retryRes.text();
        __sec_log.d('__sec_getCurrentUser: Retry raw body', retryRaw);
        let retryParsed = null;
        try { 
          retryParsed = JSON.parse(retryRaw); 
          __sec_log.d('__sec_getCurrentUser: Retry JSON parse success');
        } catch (e) { 
          __sec_log.e('Retry parse error', e); 
        }
        if (retryRes.ok && retryParsed && retryParsed.user) {
          __sec_log.i('Retrieved session after refresh', retryParsed.user);
          return { user: retryParsed.user };
        }
      } else {
        __sec_log.e('Refresh failed raw', rawRefresh);
      }
    }

    __sec_log.e('No valid session available');
    return null;
  }
  window.__sec_getCurrentUser = window.__sec_getCurrentUser || __sec_getCurrentUser;


  /* Animation helpers */
  let __sec_hideTimer = null;
  function __sec_clearHideTimer() { 
    __sec_log.d('clearHideTimer called, timer exists:', !!__sec_hideTimer);
    if (__sec_hideTimer) { 
      clearTimeout(__sec_hideTimer); 
      __sec_hideTimer = null; 
      __sec_log.d('clearHideTimer: cleared');
    }
  }

  function __sec_revealChildrenAnimated() {
    __sec_log.d('revealChildrenAnimated entry');
    if (!__sec_bioOptions) { 
      __sec_log.w('revealChildrenAnimated: bioOptions missing'); 
      return; 
    }
    __sec_clearHideTimer();
    __sec_log.d('revealChildrenAnimated: removing no-animate, setting hidden false');
    __sec_bioOptions.classList.remove('no-animate');
    __sec_bioOptions.hidden = false;
    requestAnimationFrame(() => {
      __sec_log.d('revealChildrenAnimated: adding show class');
      __sec_bioOptions.classList.add('show');
    });
    const rows = Array.from(__sec_bioOptions.querySelectorAll('.setting-row'));
    __sec_log.d('revealChildrenAnimated: rows found', rows.length);
    rows.forEach((row, i) => {
      row.classList.remove('visible');
      row.style.transitionDelay = `${i * 80}ms`;
    });
    requestAnimationFrame(() => {
      rows.forEach(row => row.classList.add('visible'));
      __sec_log.d('revealChildrenAnimated: visible class added to rows');
    });
  }

  function __sec_hideChildrenAnimated() {
    __sec_log.d('hideChildrenAnimated entry');
    if (!__sec_bioOptions) { 
      __sec_log.w('hideChildrenAnimated: bioOptions missing'); 
      return; 
    }
    __sec_clearHideTimer();
    const rows = Array.from(__sec_bioOptions.querySelectorAll('.setting-row'));
    __sec_log.d('hideChildrenAnimated: rows found', rows.length);
    rows.slice().reverse().forEach((row, idx) => {
      row.style.transitionDelay = `${idx * 60}ms`;
      row.classList.remove('visible');
    });
    const longest = rows.length * 60 + 220;
    __sec_log.d('hideChildrenAnimated: setting timeout', longest);
    __sec_hideTimer = setTimeout(() => {
      __sec_log.d('hideChildrenAnimated: timeout fired, removing show');
      __sec_bioOptions.classList.remove('show');
      rows.forEach(r => { r.style.transitionDelay = ''; });
      __sec_bioOptions.hidden = true;
      __sec_hideTimer = null;
    }, longest);
  }

  function __sec_revealChildrenNoAnimate() {
    __sec_log.d('revealChildrenNoAnimate entry');
    if (!__sec_bioOptions) { 
      __sec_log.w('revealChildrenNoAnimate: bioOptions missing'); 
      return; 
    }
    __sec_clearHideTimer();
    __sec_log.d('revealChildrenNoAnimate: removing show, adding no-animate');
    __sec_bioOptions.classList.remove('show');
    __sec_bioOptions.classList.add('no-animate');
    __sec_bioOptions.hidden = false;
    const rows = Array.from(__sec_bioOptions.querySelectorAll('.setting-row'));
    __sec_log.d('revealChildrenNoAnimate: rows found', rows.length);
    rows.forEach(row => { 
      row.classList.add('visible'); 
      row.style.transitionDelay = ''; 
    });
    requestAnimationFrame(() => {
      __sec_log.d('revealChildrenNoAnimate: adding show');
      __sec_bioOptions.classList.add('show');
    });
    setTimeout(() => {
      __sec_log.d('revealChildrenNoAnimate: removing no-animate');
      __sec_bioOptions.classList.remove('no-animate');
    }, 60);
  }

  /* Set biometric UI state */
  /* Set biometric UI state (fixed defaulting & no `|| true` bug) */
/* Set biometric UI state */
/* Set biometric UI state */
function __sec_setBiometrics(parentOn, animate = true) {
  __sec_log.d('setBiometrics entry:', { parentOn, animate });
  if (!__sec_parentSwitch) { 
    __sec_log.w('setBiometrics: parent switch element missing'); 
    return; 
  }

  __sec_setChecked(__sec_parentSwitch, parentOn);

  try {
    localStorage.setItem(__sec_KEYS.biom, parentOn ? '1' : '0');
    localStorage.setItem('biometricsEnabled', parentOn ? 'true' : 'false');
    __sec_log.d('setBiometrics: stored keys', { [__sec_KEYS.biom]: parentOn ? '1' : '0', biometricsEnabled: parentOn ? 'true' : 'false' });
  } catch (e) {
    __sec_log.e('setBiometrics: storage error', e);
  }

  if (parentOn) {
    if (__sec_bioLogin) {
      __sec_setChecked(__sec_bioLogin, true);
      try { localStorage.setItem(__sec_KEYS.bioLogin, '1'); localStorage.setItem('biometricForLogin', 'true'); } catch(e){ __sec_log.e('setBiometrics: bioLogin storage', e); }
    }
    if (__sec_bioTx) {
      __sec_setChecked(__sec_bioTx, true);
      try { localStorage.setItem(__sec_KEYS.bioTx, '1'); localStorage.setItem('biometricForTx', 'true'); } catch(e){ __sec_log.e('setBiometrics: bioTx storage', e); }
    }
    if (__sec_bioOptions) {
  __sec_revealChildrenNoAnimate();

  try {
    __sec_bioOptions.classList.add('show');
    __sec_bioOptions.hidden = false;
    __sec_bioOptions.style.display = '';
    const rows = Array.from(__sec_bioOptions.querySelectorAll('.setting-row'));
    rows.forEach(r => {
      r.classList.add('visible');
      r.style.transitionDelay = '';
    });
  } catch (e) {
    __sec_log.w('setBiometrics: enable options UI failed', e);
  }
}


    __sec_log.i('biom ON', { animate });
  } else {
    if (__sec_bioLogin) {
      __sec_setChecked(__sec_bioLogin, false);
      try { localStorage.setItem(__sec_KEYS.bioLogin, '0'); localStorage.setItem('biometricForLogin', 'false'); } catch(e){ __sec_log.e('setBiometrics: bioLogin storage', e); }
    }
    if (__sec_bioTx) {
      __sec_setChecked(__sec_bioTx, false);
      try { localStorage.setItem(__sec_KEYS.bioTx, '0'); localStorage.setItem('biometricForTx', 'false'); } catch(e){ __sec_log.e('setBiometrics: bioTx storage', e); }
    }
    if (__sec_bioOptions) {
      __sec_bioOptions.classList.remove('show');
      __sec_bioOptions.hidden = true;
      const rows = Array.from(__sec_bioOptions.querySelectorAll('.setting-row'));
      rows.forEach(r => { r.classList.remove('visible'); r.style.transitionDelay = ''; });
    }
    __sec_log.i('biom OFF', { animate });
  }

  __sec_log.d('setBiometrics exit');
}


/* If both child switches are off, turn the parent off */
let __sec_maybeDisableTimer = null;
function __sec_maybeDisableParentIfChildrenOff() {
  __sec_log.d('maybeDisableParentIfChildrenOff entry (debounced)');

  const DEBOUNCE_MS = 200; // adjust if you prefer longer

  if (__sec_maybeDisableTimer) clearTimeout(__sec_maybeDisableTimer);
  __sec_maybeDisableTimer = setTimeout(() => {
    try {
      if (!__sec_parentSwitch) { 
        __sec_log.w('maybeDisableParentIfChildrenOff: parent missing'); 
        return; 
      }
      if (!__sec_bioLogin || !__sec_bioTx) { 
        __sec_log.w('maybeDisableParentIfChildrenOff: children missing'); 
        return; 
      }

      const loginOn = __sec_isChecked(__sec_bioLogin);
      const txOn = __sec_isChecked(__sec_bioTx);
      __sec_log.d('maybeDisableParentIfChildrenOff: children state', { loginOn, txOn });

      if (!loginOn && !txOn && __sec_isChecked(__sec_parentSwitch)) {
        __sec_log.i('Both biometric children off — turning parent OFF (debounced)');
        if (typeof __sec_setBiometrics === 'function') {
          try {
            __sec_setBiometrics(false, true);
          } catch (e) {
            __sec_log.e('maybeDisableParentIfChildrenOff: __sec_setBiometrics threw', e);
            try {
              localStorage.setItem(__sec_KEYS.biom, '0');
              localStorage.setItem('biometricsEnabled', 'false');
            } catch (ee) { __sec_log.e('maybeDisableParentIfChildrenOff: persist fallback failed', ee); }
            if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, false);
            if (__sec_bioOptions) { __sec_bioOptions.classList.remove('show'); __sec_bioOptions.hidden = true; }
          }
        } else {
          try {
            localStorage.setItem(__sec_KEYS.biom, '0');
            localStorage.setItem('biometricsEnabled', 'false');
          } catch (e) { __sec_log.e('maybeDisableParentIfChildrenOff fallback storage failed', e); }
          if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, false);
          if (__sec_bioOptions) { __sec_bioOptions.classList.remove('show'); __sec_bioOptions.hidden = true; }
        }
      } else {
        __sec_log.d('maybeDisableParentIfChildrenOff: no action needed');
      }
    } catch (err) {
      __sec_log.e('maybeDisableParentIfChildrenOff error', err);
    } finally {
      __sec_log.d('maybeDisableParentIfChildrenOff exit');
    }
  }, DEBOUNCE_MS);
}



async function reconcileBiometricState() {
  __sec_log.d('reconcileBiometricState entry');

  const cred = (
    localStorage.getItem('credentialId') ||
    localStorage.getItem('webauthn-cred-id') ||
    localStorage.getItem('webauthn_cred') ||
    localStorage.getItem('__sec_credentialId') ||
    ''
  );

  if (!cred) {
    __sec_log.i('reconcile: no local credential found — clearing biometric flags');
    try {
      localStorage.setItem(__sec_KEYS.biom, '0');
      localStorage.setItem('biometricsEnabled', 'false');
      localStorage.setItem(__sec_KEYS.bioLogin, '0');
      localStorage.setItem(__sec_KEYS.bioTx, '0');
      localStorage.setItem('biometricForLogin', 'false');
      localStorage.setItem('biometricForTx', 'false');
    } catch (e) { __sec_log.e('reconcile: local clear failed', e); }
    if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, false);
    if (__sec_bioOptions) { __sec_bioOptions.classList.remove('show'); __sec_bioOptions.hidden = true; }
    return;
  }

  try {
    __sec_log.d('reconcile: have local cred, will check server only if we can resolve userId', { credentialIdSample: (cred && cred.slice ? cred.slice(0,20) : cred) });

    const safeGetSessionUserId = async (timeoutMs = 800) => {
      if (typeof getSession !== 'function') return null;
      try {
        const p = (async () => {
          try {
            const s = await getSession();
            return s && s.user && (s.user.id || s.user.uid || null);
          } catch (e) { return null; }
        })();
        const t = new Promise(r => setTimeout(() => r(null), timeoutMs));
        return await Promise.race([p, t]);
      } catch (e) {
        __sec_log.w('safeGetSessionUserId error', e);
        return null;
      }
    };

    const resolvedUserId = await getOrCreateSessionPromise(); // wait up to 4000ms for session
    if (!resolvedUserId) {
      __sec_log.i('reconcile: no userId available after short wait — skipping server check but preserving existing flags');
      
      try {
        const existingBiomEnabled = localStorage.getItem('biometricsEnabled') === 'true';
        const existingBioLogin = localStorage.getItem('biometricForLogin') === 'true';
        const existingBioTx = localStorage.getItem('biometricForTx') === 'true';
        
        __sec_log.d('reconcile: preserving existing state', { 
          existingBiomEnabled, 
          existingBioLogin, 
          existingBioTx 
        });
        
        if (existingBiomEnabled && (existingBioLogin || existingBioTx)) {
          if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, true);
          if (__sec_bioOptions) {
            __sec_revealChildrenNoAnimate();
            if (__sec_bioLogin) __sec_setChecked(__sec_bioLogin, existingBioLogin);
            if (__sec_bioTx) __sec_setChecked(__sec_bioTx, existingBioTx);
          }
        } else {
          if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, false);
          if (__sec_bioOptions) { 
            __sec_bioOptions.classList.remove('show'); 
            __sec_bioOptions.hidden = true; 
          }
        }
      } catch (e) { 
        __sec_log.e('reconcile: UI restore failed', e); 
      }
      
      return; // skip server call (will validate on next attempt when userId is available)
    }

    __sec_log.d('reconcile: resolved userId, calling /webauthn/auth/options', { userIdSample: resolvedUserId && resolvedUserId.slice ? resolvedUserId.slice(0,12) : resolvedUserId });
    const apiBase = (window.__SEC_API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : ''));
    const res = await (typeof window.__origFetch !== 'undefined' ? window.__origFetch : fetch)(apiBase + '/webauthn/auth/options', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId: cred, userId: resolvedUserId })
    });
    const text = await res.text().catch(()=> '');
    if (!res.ok) {
      __sec_log.w('reconcile: /webauthn/auth/options returned non-ok — clearing flags', { status: res.status, textSample: (text||'').slice(0,300) });
      try {
        localStorage.setItem(__sec_KEYS.biom, '0');
        localStorage.setItem('biometricsEnabled', 'false');
        localStorage.setItem(__sec_KEYS.bioLogin, '0');
        localStorage.setItem(__sec_KEYS.bioTx, '0');
        localStorage.setItem('biometricForLogin', 'false');
        localStorage.setItem('biometricForTx', 'false');
      } catch (e) { __sec_log.e('reconcile: persist clear failed', e); }
      if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, false);
      if (__sec_bioOptions) { __sec_bioOptions.classList.remove('show'); __sec_bioOptions.hidden = true; }
      try { throw new Error(text || `HTTP ${res.status}`); } catch(e) { throw e; }
    }

    const opts = text ? JSON.parse(text) : {};
    __sec_log.i('reconcile: server confirmed credential - marking biometrics enabled', { allowCount: opts.allowCredentials ? opts.allowCredentials.length : 0 });
    try {
      localStorage.setItem(__sec_KEYS.biom, '1');
      localStorage.setItem('biometricsEnabled', 'true');
      if (typeof restoreBiometricUI === 'function') restoreBiometricUI();
      if (typeof safeCall === 'function' && typeof notify === 'function') {
        safeCall(notify, 'Fingerprint set up successfully!', 'success');
      }
      
      const currentLogin = localStorage.getItem('biometricForLogin');
      const currentTx = localStorage.getItem('biometricForTx');
      
      if (currentLogin === null) {
        localStorage.setItem(__sec_KEYS.bioLogin, '1');
        localStorage.setItem('biometricForLogin', 'true');
      }
      if (currentTx === null) {
        localStorage.setItem(__sec_KEYS.bioTx, '1');
        localStorage.setItem('biometricForTx', 'true');
      }
    } catch (e) { __sec_log.e('reconcile: persist enabled flags failed', e); }
    
    if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, true);
    if (__sec_bioOptions) {
      __sec_revealChildrenNoAnimate();
      if (__sec_bioLogin) __sec_setChecked(__sec_bioLogin, localStorage.getItem('biometricForLogin') === 'true');
      if (__sec_bioTx) __sec_setChecked(__sec_bioTx, localStorage.getItem('biometricForTx') === 'true');
    }
  } catch (err) {
    __sec_log.w('reconcileBiometricState error', err);
  }
}


/* Initialize from storage */
async function __sec_initFromStorage() {
  __sec_log.d('initFromStorage entry (reconciled)');
  try {
    const rawBiom = localStorage.getItem(__sec_KEYS.biom); // '1' | '0' | null
    const rawLogin = localStorage.getItem(__sec_KEYS.bioLogin);
    const rawTx = localStorage.getItem(__sec_KEYS.bioTx);

    const legacyBiom = localStorage.getItem('biometricsEnabled');
    const legacyLogin = localStorage.getItem('biometricForLogin');
    const legacyTx = localStorage.getItem('biometricForTx');

    const biomStored = (rawBiom === '1') || (legacyBiom === 'true');
    const loginStored = (rawLogin === '1') || (legacyLogin === 'true');
    const txStored = (rawTx === '1') || (legacyTx === 'true');

    __sec_log.d('initFromStorage parsed:', { rawBiom, legacyBiom, rawLogin, legacyLogin, rawTx, legacyTx });

    if (__sec_parentSwitch) { __sec_setChecked(__sec_parentSwitch, !!biomStored); }
    if (__sec_bioOptions) {
      if (biomStored) {
        __sec_revealChildrenNoAnimate();
        if (__sec_bioLogin) __sec_setChecked(__sec_bioLogin, !!loginStored);
        if (__sec_bioTx) __sec_setChecked(__sec_bioTx, !!txStored);
      } else {
        if (__sec_bioLogin) __sec_setChecked(__sec_bioLogin, false);
        if (__sec_bioTx) __sec_setChecked(__sec_bioTx, false);
        __sec_bioOptions.classList.remove('show');
        __sec_bioOptions.hidden = true;
      }
    }

    try {
      await reconcileBiometricState(); // defined next — updates both key namespaces and UI
    } catch (re) {
      __sec_log.w('reconcileBiometricState failed (non-fatal)', re);
    }

    __sec_log.d('initFromStorage complete', { biomStored, loginStored, txStored });
  } catch (err) {
    __sec_log.e('initFromStorage error', err);
  }
}


__sec_log.d('Adding beforeunload listener');
window.addEventListener('beforeunload', () => {
  __sec_log.d('beforeunload triggered');
  try {
    if (__sec_parentSwitch) { 
      const val = __sec_isChecked(__sec_parentSwitch) ? '1' : '0';
      localStorage.setItem(__sec_KEYS.biom, val);
      __sec_log.d('beforeunload: stored biom', val);
    }
    if (__sec_bioLogin) { 
      const val = __sec_isChecked(__sec_bioLogin) ? '1' : '0';
      localStorage.setItem(__sec_KEYS.bioLogin, val);
      __sec_log.d('beforeunload: stored bioLogin', val);
    }
    if (__sec_bioTx) { 
      const val = __sec_isChecked(__sec_bioTx) ? '1' : '0';
      localStorage.setItem(__sec_KEYS.bioTx, val);
      __sec_log.d('beforeunload: stored bioTx', val);
    }
    
  } catch (e) { 
    __sec_log.e('beforeunload storage error', e);
  }
});


/* ========== Slide-in Notification ========== */
function showSlideNotification(message, type = "info") {
  __sec_log.d('showSlideNotification entry:', { message, type });
  let box = document.createElement("div");
  box.className = "slide-notification " + type;
  box.innerText = message;
  document.body.appendChild(box);
  __sec_log.d('showSlideNotification: box created and appended');

  requestAnimationFrame(() => {
    __sec_log.d('showSlideNotification: adding show class');
    box.classList.add("show");
  });

  setTimeout(() => {
    __sec_log.d('showSlideNotification: removing show class');
    box.classList.remove("show");
    setTimeout(() => {
      __sec_log.d('showSlideNotification: removing box');
      box.remove();
    }, 500);
  }, 3000);
  __sec_log.d('showSlideNotification exit');
}
window.showSlideNotification = window.showSlideNotification || showSlideNotification;



/* =========================
   PIN Submodule (integrated)
   ========================= */

  const __sec_PIN_ROW        = __sec_q('#securityPinRow');
  const __sec_PIN_MODAL      = __sec_q('#securityPinModal');
  const __sec_PIN_CLOSE_BTN  = __sec_q('#securityPinCloseBtn');
  const __sec_CHANGE_FORM    = __sec_q('#changePinForm');
  const __sec_RESET_BTN      = __sec_q('#resetPinBtn');
  const __sec_PIN_CURRENT    = __sec_q('#currentPin');
  const __sec_PIN_NEW        = __sec_q('#newPin');
  const __sec_PIN_CONFIRM    = __sec_q('#confirmPin');

const PIN_DEBUG = true; // set false when done debugging

function __sec_pin_notify(raw, type = 'info', duration = (type === 'error' ? 4000 : 2000)) {
  function dlog(...args) { if (!PIN_DEBUG) return; try { console.debug('[pin-notify]', ...args); } catch(_){} }

  let msg = '';
  try {
    if (raw instanceof Error) msg = raw.message || String(raw);
    else if (raw == null) msg = '';
    else if (typeof raw === 'string') msg = raw;
    else if (typeof raw === 'object') {
      if (typeof raw.message === 'string' && raw.message.trim()) msg = raw.message;
      else if (raw.error && typeof raw.error === 'object' && typeof raw.error.message === 'string') msg = raw.error.message;
      else if (raw.error && typeof raw.error === 'string') {
        try { const p = JSON.parse(raw.error); if (p?.message) msg = p.message; else msg = raw.error; } catch(e){ msg = raw.error; }
      } else if (Array.isArray(raw.errors) && raw.errors[0] && raw.errors[0].message) msg = raw.errors[0].message;
      else {
        try { msg = JSON.stringify(raw); } catch(e){ msg = String(raw); }
      }
    } else msg = String(raw);
  } catch (e) {
    msg = 'An error occurred. Try again.';
  }

  try {
    const t = (typeof msg === 'string' ? msg.trim() : msg);
    if (t && (t.startsWith('{') || t.startsWith('[') || (t.startsWith('"') && t.endsWith('"')))) {
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object') {
          if (parsed.message) msg = parsed.message;
          else if (parsed.error && parsed.error.message) msg = parsed.error.message;
          else msg = JSON.stringify(parsed);
        } else if (typeof parsed === 'string') {
          msg = parsed;
        }
      } catch (e) { /* ignore parse failure */ }
    }
  } catch (e) { /* ignore */ }

  msg = (typeof msg === 'string' ? msg.trim() : String(msg));
  if (!msg) msg = (type === 'error' ? 'An error occurred. Try again.' : '');

  dlog('__sec_pin_notify: normalized msg:', msg, 'type:', type, 'duration:', duration, 'rawPreview:', raw);

  try {
    const container = document.querySelector('#flexgig_slide_container') || document.querySelector('#toast_container');
    if (container) {
      Array.from(container.children).forEach((el) => {
        const isSticky = el.dataset?.serverId || el.classList?.contains('sticky');
        if (!isSticky) try { el.remove(); } catch (e) { dlog('failed to remove toast child', e); }
      });
    } else {
      document.querySelectorAll('.flexgig-toast, .toast, .slide-notification').forEach(el => {
        if (!el.classList.contains('sticky')) try { el.remove(); } catch(e) { dlog('removal fallback failed', e); }
      });
    }
  } catch (e) {
    dlog('notify cleanup error', e);
  }

  let delivered = false;

  function tryCall(fn, args, label) {
    try {
      fn.apply(null, args);
      dlog('notify: used', label, 'args:', args);
      return true;
    } catch (err) {
      dlog('notify: call failed for', label, 'error:', err);
      return false;
    }
  }

  try {
    if (typeof showSlideNotification === 'function') {
      delivered = tryCall(showSlideNotification, [msg, type, duration, { position: 'top-right' }], 'showSlideNotification(message, type, duration, opts)');
      if (!delivered) {
        delivered = tryCall(showSlideNotification, [{ message: msg, type, duration, position: 'top-right' }], 'showSlideNotification({message,...})');
      }
      if (delivered) return;
    }
  } catch (e) { dlog('showSlideNotification path error', e); }

  try {
    if (typeof showToast === 'function') {
      delivered = tryCall(showToast, [msg, type, duration], 'showToast(message, type, duration)');
      if (!delivered) {
        delivered = tryCall(showToast, [{ message: msg, type, duration }], 'showToast({message,...})');
      }
      if (delivered) return;
    }
  } catch (e) { dlog('showToast path error', e); }

  try {
    const fallbackId = '__fg_notify_fallback';
    let fallbackContainer = document.getElementById(fallbackId);
    if (!fallbackContainer) {
      fallbackContainer = document.createElement('div');
      fallbackContainer.id = fallbackId;
      fallbackContainer.style.position = 'fixed';
      fallbackContainer.style.top = '20px';
      fallbackContainer.style.right = '20px';
      fallbackContainer.style.zIndex = '13000';
      document.body.appendChild(fallbackContainer);
    }

    const el = document.createElement('div');
    el.textContent = msg; // textContent ensures object->String handled correctly
    el.style.background = (type === 'error' ? '#e53935' : '#333');
    el.style.color = '#fff';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.marginTop = '8px';
    el.style.maxWidth = '360px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.18)';
    fallbackContainer.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch(_) {} }, duration || 3000);
    dlog('notify: used fallback DOM toast');
    return;
  } catch (e) {
    console[type === 'error' ? 'error' : 'log'](msg);
    dlog('notify fallback to console, msg:', msg, 'error:', e);
    return;
  }
}


  async function __sec_pin_getUid() {
    try {
      if (typeof window.getSession === 'function') {
        const s = await window.getSession();
        __sec_log.d('[PIN] getSession', s);
        if (s && s.user && s.user.uid) return { uid: s.user.uid, session: s };
      }
      const stored = JSON.parse(localStorage.getItem('authTokenData') || '{}');
      if (stored && stored.user && stored.user.uid) return { uid: stored.user.uid, session: stored };
      const altUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (altUser && altUser.uid) return { uid: altUser.uid, session: altUser };
      __sec_log.w('[PIN] no uid found');
      return null;
    } catch (err) {
      __sec_log.e('[PIN] getUid error', err);
      return null;
    }
  }

  const __sec_PIN_TRY_TABLES  = ['profiles','users','accounts'];
  const __sec_PIN_TRY_COLUMNS = ['pin','account_pin','accountPin','pinCode','pin_hash','pin_hash_text'];

  async function __sec_pin_findStored(uid) {
  try {
    const response = await fetch('https://api.flexgig.com.ng/api/check-pin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) {
      console.error('[SecurityPin] Failed to check PIN:', await response.text());
      return null;
    }
    const { hasPin } = await response.json();
    return hasPin ? { table: 'users', column: 'pin' } : null;
  } catch (err) {
    console.error('[SecurityPin] Error checking PIN:', err);
    return null;
  }
}

  async function __sec_pin_updateStored(uid, newPin) {
  try {
    const response = await fetch('https://api.flexgig.com.ng/api/save-pin', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ pin: newPin }),
    });
    if (!response.ok) {
      console.error('[SecurityPin] PIN update failed:', await response.text());
      return { ok: false, error: 'Failed to update PIN' };
    }
    console.log('[SecurityPin] PIN updated successfully');
    return { ok: true };
  } catch (err) {
    console.error('[SecurityPin] Error updating PIN:', err);
    return { ok: false, error: err.message };
  }
}

  function __sec_pin_bindStrictInputs() {
    try {
      const maxLen = 4;
      const fields = [__sec_PIN_CURRENT, __sec_PIN_NEW, __sec_PIN_CONFIRM].filter(Boolean);
      if (!fields.length) {
        __sec_log.d('[PIN] no input fields found when binding');
        return;
      }
      fields.forEach((el) => {
        if (!el) return;
        if (el.__sec_pin_bound) return;
        el.__sec_pin_bound = true;
        el.setAttribute('inputmode','numeric');
        el.setAttribute('pattern','[0-9]*');
        el.setAttribute('maxlength', String(maxLen));
        el.autocomplete = 'one-time-code';

        el.addEventListener('input', () => {
          const before = el.value || '';
          const cleaned = before.replace(/\D/g,'').slice(0, maxLen);
          if (before !== cleaned) {
            __sec_log.d('[PIN] sanitized input', { id: el.id, before, cleaned });
            el.value = cleaned;
          }
        });

        el.addEventListener('keypress', (ev) => {
          if (!/^[0-9]$/.test(ev.key)) {
            __sec_log.d('[PIN] keypress blocked', { id: el.id, key: ev.key });
            ev.preventDefault();
          }
        });

        el.addEventListener('paste', (ev) => {
          const pasted = (ev.clipboardData || window.clipboardData).getData('text') || '';
          const digits = pasted.replace(/\D/g,'').slice(0, maxLen);
          if (!digits.length) {
            __sec_log.d('[PIN] paste blocked (no digits)', { id: el.id, pasted });
            ev.preventDefault();
            return;
          }
          ev.preventDefault();
          const start = el.selectionStart ?? el.value.length;
          const end = el.selectionEnd ?? el.value.length;
          const newVal = (el.value.slice(0, start) + digits + el.value.slice(end)).replace(/\D/g,'').slice(0, maxLen);
          el.value = newVal;
          const caret = Math.min(start + digits.length, maxLen);
          el.setSelectionRange(caret, caret);
          __sec_log.d('[PIN] paste accepted', { id: el.id, digits, newVal });
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });

        __sec_log.i('[PIN] bound strict handlers to', el.id);
      });
    } catch (err) {
      __sec_log.e('[PIN] bindStrictInputs error', err);
    }
  }

function getAuthToken() {
  try {
    if (typeof window.__SEC_AUTH_TOKEN === 'string' && window.__SEC_AUTH_TOKEN) return window.__SEC_AUTH_TOKEN;
    const keys = ['authToken','token','idToken','sessionToken','accessToken','__fg_token','__SEC_AUTH_TOKEN'];
    for (const k of keys) {
      try { const v = localStorage.getItem(k); if (v) return v; } catch (_) {}
    }
    const sess = window.__SEC_SESSION || window.__session || null;
    if (sess) {
      if (typeof sess === 'string') {
        try { const parsed = JSON.parse(sess); if (parsed?.token) return parsed.token; } catch(_) {}
      } else {
        if (sess?.token) return sess.token;
        if (sess?.user?.token) return sess.user.token;
      }
    }
  } catch (err) { /* swallow */ }
  return '';
}

async function fetchWithAuth(url, opts = {}) {
  const baseOpts = Object.assign({}, opts, { credentials: 'include' });
  let res = await fetch(url, baseOpts);
  if (res.status === 401 || res.status === 403) {
    const token = getAuthToken();
    if (!token) return res; // no fallback token available
    const headers = Object.assign({}, opts.headers || {}, { Authorization: `Bearer ${token}` });
    res = await fetch(url, Object.assign({}, opts, { headers, credentials: 'include' }));
  }
  return res;
}

function __sec_pin_wireHandlers() {
  const __sec_CHANGE_FORM   = __sec_q('#changePinForm');
  const __sec_RESET_BTN     = __sec_q('#resetPinBtn');
  const __sec_PIN_CURRENT   = __sec_q('#currentPin');
  const __sec_PIN_NEW       = __sec_q('#newPin');
  const __sec_PIN_CONFIRM   = __sec_q('#confirmPin');

  if (!__sec_CHANGE_FORM || !__sec_PIN_CURRENT || !__sec_PIN_NEW || !__sec_PIN_CONFIRM) {
    __sec_log.d('PIN elements not found, skipping wiring');
    return;
  }

  __sec_pin_bindStrictInputs();

  let confirmDebounceId = null;
  function confirmInputHandler(e) {
    if (confirmDebounceId) clearTimeout(confirmDebounceId);
    confirmDebounceId = setTimeout(() => {
      const newPin = __sec_PIN_NEW.value;
      if (e.target.value !== newPin && e.target.value.length === 4) {
        console.log('PINs do not match. Please retype.', 'warning', 1500);
      }
    }, 300);
  }
  __sec_PIN_CONFIRM.addEventListener('input', confirmInputHandler);

  async function onChangePinSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    const currentPin = __sec_PIN_CURRENT.value.trim();
    const newPin = __sec_PIN_NEW.value.trim();
    const confirmPin = __sec_PIN_CONFIRM.value.trim();

    toggleKeypadProcessing(true);

    try {
      await withLoader(async () => {
        if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmPin)) {
          throw new Error('All fields must be exactly 4 digits.');
        }
        if (newPin === currentPin) throw new Error('New PIN must be different from current PIN.');
        if (newPin !== confirmPin) throw new Error('Confirm PIN does not match new PIN.');

        const uid = await __sec_pin_getUid();
        if (!uid) throw new Error('Unable to retrieve account. Please refresh.');

const verifyRes = await fetchWithAuth(`${window.__SEC_API_BASE}/api/verify-pin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: currentPin, userId: uid })
});
if (!verifyRes.ok) {
  const body = await parseErrorResponse(verifyRes);
  console.warn('[PIN][warn] current PIN verification failed', body);

  __sec_pin_notify('Current PIN is incorrect. Try again.', 'error');

  try { window.__fg_pin_clearAllInputs(); } catch (_) { 
    document.querySelectorAll('#currentPin, #newPin, #confirmPin').forEach(el => { try { el.value = ''; } catch(_){} });
    const first = document.querySelector('#currentPin'); if (first) try { first.focus(); } catch(_){} 
  }

  throw new Error(body.message || `Verify PIN failed (${verifyRes.status})`);
}

const saveRes = await fetchWithAuth(`${window.__SEC_API_BASE}/api/save-pin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pin: newPin, userId: uid })
});
if (!saveRes.ok) {
  const body = await parseErrorResponse(saveRes);
  console.warn('[PIN][warn] save PIN failed', body);
  __sec_pin_notify('Failed to update PIN. Try again.', 'error');
  throw new Error(body.message || `Save PIN failed (${saveRes.status})`);
}


        localStorage.setItem('hasPin', 'true');
        window.dispatchEvent(new CustomEvent('pin-status-changed'));

        __sec_PIN_CURRENT.value = '';
        __sec_PIN_NEW.value = '';
        __sec_PIN_CONFIRM.value = '';
        __sec_PIN_CURRENT.focus();

        try {
          if (typeof ModalManager !== 'undefined' && typeof ModalManager.closeModal === 'function') {
            ModalManager.closeModal('securityPinModal');
            __sec_log.d('[PinModal] Closed via ModalManager');
          } else {
            const modal = __sec_q('#securityPinModal');
            if (modal) modal.style.display = 'none';
          }
        } catch (e) {
          __sec_log.d('[PinModal] close modal fallback used', e);
          const modal = __sec_q('#securityPinModal');
          if (modal) modal.style.display = 'none';
        }

        requestAnimationFrame(() => {
          console.log('PIN updated successfully!', 'success');
        });
      });
    } catch (error) {
      console.error('PIN change error:', error);
      let msg = error.message || 'Failed to change PIN.';
      if (/incorrect/i.test(msg) || msg.includes('INCORRECT_PIN')) {
        console.log('Incorrect current PIN. Please try again.');
      } else if (msg.includes('TOO_MANY_ATTEMPTS')) {
        msg = 'Too many attempts. Account locked temporarily.';
        try { localStorage.setItem('pinLockUntil', new Date(Date.now() + 5*60*1000).toISOString()); } catch (_) {}
      }
      __sec_pin_notify(msg, 'error');

      document.querySelectorAll('#currentPin, #newPin, #confirmPin').forEach(el => {
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 300);
      });
      __sec_PIN_CURRENT.focus();
    } finally {
      toggleKeypadProcessing(false);
    }
  }

  __sec_CHANGE_FORM.addEventListener('submit', onChangePinSubmit);

  if (__sec_RESET_BTN) {
    __sec_RESET_BTN.addEventListener('click', (ev) => {
      ev.preventDefault();
    });
  }

  __sec_pin_wireHandlers.cleanup = function cleanupPinHandlers() {
    try {
      __sec_PIN_CONFIRM.removeEventListener('input', confirmInputHandler);
    } catch (e) { /* ignore */ }
    try {
      __sec_CHANGE_FORM.removeEventListener('submit', onChangePinSubmit);
    } catch (e) { /* ignore */ }
  };

  __sec_log.d('PIN modal controls wired successfully');
}


/* ========== Convert rows to chevron buttons ========== */
function __sec_convertRowsToChevron() {
  if (__sec_pwdBtn) {
    __sec_pwdBtn.classList.add('chev-btn');
    __sec_pwdBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    __sec_pwdBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      __sec_log.i('change-password row clicked');
      if (typeof window.openChangePasswordModal === 'function') {
        try {
          window.openChangePasswordModal();
        } catch (err) {
          __sec_log.e('openChangePasswordModal threw', err);
          window.dispatchEvent(new CustomEvent('security:open-change-password'));
        }
      } else {
        window.dispatchEvent(new CustomEvent('security:open-change-password'));
      }
    });
  } else __sec_log.d('#changePwdBtn not present');
}

/* ========== Init / Boot ========== */
async function __sec_boot() {
  try {
    __sec_log.d('Booting security module');
    if (typeof window.getSession === 'function') {
      try { await window.getSession(); } catch (e) { __sec_log.d('getSession during boot failed', e); }
    }

    __sec_convertRowsToChevron();
    __sec_initFromStorage();
    __sec_wireEvents();

    __sec_pin_bindStrictInputs();
    __sec_pin_wireHandlers();  // Wires listeners without error

    __sec_log.i('security module booted (with WebAuthn & PIN integration)');
  } catch (err) {
    __sec_log.e('boot error', err);
  }
initializeSmartAccountPinButton();  // ← This line exists (or add if missing)
}

/* Initialize: reuse existing boot wiring */
if (document.readyState === 'loading') {
  __sec_log.d('DOM not ready, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', __sec_boot);
} else {
  __sec_log.d('DOM ready, booting immediately');
  setTimeout(__sec_boot, 0);
}
/* ---- WebAuthn register/authenticate flows ---- */
/* ---- WebAuthn utilities ---- */
function base64urlToArrayBuffer(base64url) {
  __sec_log.d('base64urlToArrayBuffer entry', { input: base64url });
  try {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob(base64 + padding);
    const buffer = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
    __sec_log.d('base64urlToArrayBuffer success', { input: base64url, outputLength: buffer.length });
    return buffer.buffer;
  } catch (err) {
    __sec_log.e('base64urlToArrayBuffer error', { input: base64url, err });
    throw new Error(`Failed to decode base64url: ${err.message}`);
  }
}

function arrayBufferToBase64url(buffer) {
  __sec_log.d('arrayBufferToBase64url entry', { bufferLength: buffer.byteLength });
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const result = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  __sec_log.d('arrayBufferToBase64url success', { inputLength: buffer.byteLength, outputLength: result.length });
  return result;
}

function uuidToArrayBuffer(uuid) {
  __sec_log.d('uuidToArrayBuffer entry', { uuid });
  const clean = uuid.replace(/-/g, '');
  if (clean.length !== 32) throw new Error(`Invalid UUID: ${uuid}`);
  const buffer = new Uint8Array(16);
  for (let i = 0; i < 16; i++) buffer[i] = parseInt(clean.substr(i * 2, 2), 16);
  __sec_log.d('uuidToArrayBuffer success', { input: uuid, outputLength: buffer.length });
  return buffer.buffer;
}

/* ---- Registration flow (instrumented + persists to localStorage immediately) ---- */
async function startRegistration(userId, username, displayName) {
  __sec_log.d('startRegistration entry', { userId, username, displayName });
  try {
    const currentUser = await __sec_getCurrentUser();
    __sec_log.d('startRegistration: Retrieved currentUser', { hasUser: !!currentUser?.user });
    if (!currentUser || !currentUser.user || !currentUser.user.uid) {
      throw new Error('No valid user session');
    }

    const apiBase = window.__SEC_API_BASE || "https://api.flexgig.com.ng";
    const optUrl = `${apiBase}/webauthn/register/options`;
    __sec_log.d('startRegistration: Fetching options from', optUrl);

    const optRes = await fetch(optUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, username, displayName }),
    });

    const optRaw = await optRes.text();
    __sec_log.d('startRegistration: Options response', { status: optRes.status, ok: optRes.ok, raw: optRaw });
    if (!optRes.ok) throw new Error(`Options failed: ${optRaw}`);

    const options = JSON.parse(optRaw);
    __sec_log.d('startRegistration: Parsed options', options);

    __sec_log.d('startRegistration: Converting challenge');
    options.challenge = new Uint8Array(base64urlToArrayBuffer(options.challenge));
    __sec_log.d('startRegistration: Challenge converted', { challengeLength: options.challenge.length });

    if (options.user?.id) {
      __sec_log.d('startRegistration: Converting user.id');
      try {
        options.user.id = new Uint8Array(base64urlToArrayBuffer(options.user.id));
        __sec_log.d('startRegistration: user.id base64url converted', { idLength: options.user.id.length });
      } catch (convErr) {
        __sec_log.w('startRegistration: base64url failed, trying uuid');
        options.user.id = new Uint8Array(uuidToArrayBuffer(userId));
        __sec_log.d('startRegistration: user.id uuid converted', { idLength: options.user.id.length });
      }
    }

    if (options.excludeCredentials) {
      __sec_log.d('startRegistration: Converting excludeCredentials', { count: options.excludeCredentials.length });
      options.excludeCredentials = options.excludeCredentials.map(c => {
        const converted = {
          ...c,
          id: new Uint8Array(base64urlToArrayBuffer(c.id))
        };
        __sec_log.d('startRegistration: Converted excludeCredential', { idLength: converted.id.length });
        return converted;
      });
    }

    __sec_log.d('startRegistration: Final publicKey options before create', {
      challengeLength: options.challenge?.length,
      userIdLength: options.user?.id?.length,
      excludeCount: options.excludeCredentials?.length || 0
    });

    __sec_log.i('startRegistration: Calling navigator.credentials.create');
    const cred = await navigator.credentials.create({ publicKey: options });
    __sec_log.d('startRegistration: Credential created', { id: cred?.id, type: cred?.type });
    console.log('[REG] credential created id:', cred.id);
    try {
      const transports = cred.response.getTransports ? cred.response.getTransports() : null;
      console.log('[REG] transports:', transports);
    } catch(e) {
      console.warn('[REG] getTransports threw', e);
    }
    console.log('[REG] rawId hex:', (function bufToHex(b){ const u=new Uint8Array(b); return Array.from(u).map(x=>x.toString(16).padStart(2,'0')).join(''); })(cred.rawId));

    if (!cred) throw new Error('No credential returned');

    const credential = {
      id: cred.id,
      rawId: arrayBufferToBase64url(cred.rawId),
      type: cred.type,
      response: {
        clientDataJSON: arrayBufferToBase64url(cred.response.clientDataJSON),
        attestationObject: arrayBufferToBase64url(cred.response.attestationObject),
        transports: cred.response.getTransports ? cred.response.getTransports() : []
      }
    };
    __sec_log.d('startRegistration: Prepared credential for verify', { id: credential.id, rawIdLength: credential.rawId.length });

    try {
      localStorage.setItem('credentialId', credential.rawId);
      localStorage.setItem('credentialSavedAt', new Date().toISOString());
      console.log('[CRED DEBUG] pre-verify setItem credentialId ->', localStorage.getItem('credentialId'));
      console.log('[CRED DEBUG] origin/domain:', location.origin, document.domain);
      console.trace('[CRED DEBUG] pre-verify write trace');
      console.assert(localStorage.getItem('credentialId') === credential.rawId, 'Pre-verify credentialId not persisted!');
      __sec_log.d('startRegistration: Pre-verify credentialId saved to localStorage', { rawIdLen: credential.rawId.length });
    } catch (e) {
      __sec_log.e('startRegistration: Failed to persist pre-verify credentialId to localStorage', { error: (e && e.message) || e });
    }

    const verifyUrl = `${apiBase}/webauthn/register/verify`;
    __sec_log.d('startRegistration: Verifying at', verifyUrl);
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credential }),
    });

    const verifyRaw = await verifyRes.text();
    __sec_log.d('startRegistration: Verify response', { status: verifyRes.status, ok: verifyRes.ok, raw: verifyRaw });
    if (!verifyRes.ok) {
      __sec_log.e('startRegistration: Verify failed — pre-verify value retained for inspection', { preverify: localStorage.getItem('credentialId') });
      throw new Error(`Verify failed: ${verifyRaw}`);
    }

    const verifyResult = JSON.parse(verifyRaw);
    __sec_log.i('startRegistration: Verify success', verifyResult);

    try {
      const serverId = verifyResult?.credentialId;
      if (serverId) {
        localStorage.setItem('credentialId', serverId);
        localStorage.setItem('credentialSavedAt', new Date().toISOString());
        console.log('[CRED DEBUG] post-verify setItem credentialId ->', localStorage.getItem('credentialId'));
        console.trace('[CRED DEBUG] post-verify write trace');
        console.assert(localStorage.getItem('credentialId') === serverId, 'Post-verify credentialId not persisted!');
        __sec_log.d('startRegistration: Server credentialId saved to localStorage', { serverId });
      } else {
        __sec_log.w('startRegistration: Server did not return credentialId — keeping pre-verify fallback', { fallback: localStorage.getItem('credentialId') });
      }
    } catch (e) {
      __sec_log.e('startRegistration: Failed to write server credentialId to localStorage', { error: (e && e.message) || e });
    }

    return verifyResult;
  } catch (err) {
    __sec_log.e('startRegistration error', {
      message: err.message,
      stack: err.stack,
      userId,
      username
    });
    try {
      const fallback = localStorage.getItem('credentialId');
      __sec_log.d('startRegistration: fallback credentialId (from localStorage) after error', { fallback });
    } catch (e) {
      __sec_log.e('startRegistration: reading fallback failed', { err: (e && e.message) || e });
    }
    throw err;
  } finally {
    __sec_log.d('startRegistration exit');
  }
}

/* ---- Authentication flow ---- */
async function startAuthentication(userId, action = 'reauth') {
  __sec_log.d('startAuthentication entry', { userId });
  try {
    const currentUser = await __sec_getCurrentUser();
    __sec_log.d('startAuthentication: Retrieved currentUser', { hasUser: !!currentUser?.user });
    if (!currentUser || !currentUser.user || !currentUser.user.uid) {
      throw new Error('No valid user session');
    }

    const apiBase = window.__SEC_API_BASE || "https://api.flexgig.com.ng";
    const optUrl = `${apiBase}/webauthn/auth/options`;
    __sec_log.d('startAuthentication: Fetching options from', optUrl);
    const optRes = await fetch(optUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!optRes.ok) {
  const txt = await optRes.text().catch(()=>'');
  __sec_log.w('verifyBiometrics: auth/options returned non-ok', { status: optRes.status, txtSample: (txt||'').slice(0,300) });
  if (optRes.status === 404 || /no authenticators found/i.test(txt || '')) {
    localStorage.setItem(__sec_KEYS.biom, '0');
    localStorage.setItem('biometricsEnabled', 'false');
    localStorage.setItem(__sec_KEYS.bioLogin, '0');
    localStorage.setItem(__sec_KEYS.bioTx, '0');
    localStorage.setItem('biometricForLogin', 'false');
    localStorage.setItem('biometricForTx', 'false');
    if (__sec_parentSwitch) __sec_setChecked(__sec_parentSwitch, false);
    if (__sec_bioOptions) { __sec_bioOptions.classList.remove('show'); __sec_bioOptions.hidden = true; }
  }
  throw new Error('Auth options fetch failed: ' + txt);
}

    const optRaw = await optRes.text();
    __sec_log.d('startAuthentication: Options response', { status: optRes.status, ok: optRes.ok, raw: optRaw });
    if (!optRes.ok) throw new Error(`Auth options failed: ${optRaw}`);

    const options = JSON.parse(optRaw);
    __sec_log.d('startAuthentication: Parsed options', options);

    __sec_log.d('startAuthentication: Converting challenge');
    function safeToUint8(val) {
  if (typeof val === 'string') return new Uint8Array(base64urlToArrayBuffer(val));
  if (val instanceof Uint8Array) return val;
  if (val instanceof ArrayBuffer) return new Uint8Array(val);
  if (ArrayBuffer.isView(val)) return new Uint8Array(val.buffer, val.byteOffset, val.byteLength);
  if (val && typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length > 0 && !isNaN(Number(keys[0]))) {
      const max = Math.max(...keys.map(Number));
      const arr = new Uint8Array(max + 1);
      for (const k of keys) arr[Number(k)] = val[k];
      return arr;
    }
    console.warn('[safeToUint8] Received non-decodable object, clearing biometric cache:', val);
    try {
      localStorage.removeItem('__cachedAuthOptions');
      window.__cachedAuthOptions = null;
      window.__cachedAuthOptionsFetchedAt = null;
    } catch (e) {}
    throw new Error(`Failed to decode base64url: expected string but got object (${JSON.stringify(val)?.slice(0, 80)})`);
  }
  if (val == null) throw new Error('Failed to decode base64url: value is null/undefined');
  return new Uint8Array(base64urlToArrayBuffer(String(val)));
}
    options.challenge = safeToUint8(options.challenge);
    __sec_log.d('startAuthentication: Challenge converted', { challengeLength: options.challenge.length });
    

    if (options.allowCredentials) {
      __sec_log.d('startAuthentication: Converting allowCredentials', { count: options.allowCredentials.length });
      options.allowCredentials = options.allowCredentials.map(c => {
        const converted = { ...c, id: safeToUint8(c.id) };
        __sec_log.d('startAuthentication: Converted allowCredential', { idLength: converted.id.length });
        return converted;
      });
    }

    __sec_log.d('startAuthentication: Final publicKey options before get', {
      challengeLength: options.challenge?.length,
      allowCount: options.allowCredentials?.length || 0
    });

    __sec_log.i('startAuthentication: Calling navigator.credentials.get');
    const assertion = await navigator.credentials.get({ publicKey: options });
    __sec_log.d('startAuthentication: Assertion received', { id: assertion?.id, type: assertion?.type });
    if (!assertion) throw new Error('No assertion returned');

    const credential = {
      id: assertion.id,
      rawId: arrayBufferToBase64url(assertion.rawId),
      type: assertion.type,
      response: {
        clientDataJSON: arrayBufferToBase64url(assertion.response.clientDataJSON),
        authenticatorData: arrayBufferToBase64url(assertion.response.authenticatorData),
        signature: arrayBufferToBase64url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? arrayBufferToBase64url(assertion.response.userHandle) : null
      }
    };
    __sec_log.d('startAuthentication: Prepared credential for verify', { id: credential.id, rawIdLength: credential.rawId.length });

    const verifyUrl = `${apiBase}/webauthn/auth/verify`;
    __sec_log.d('startAuthentication: Verifying at', verifyUrl);
    const verifyRes = await fetch(verifyUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, credential, action }),
    });
    const verifyRaw = await verifyRes.text();
    __sec_log.d('startAuthentication: Verify response', { status: verifyRes.status, ok: verifyRes.ok, raw: verifyRaw });
    if (!verifyRes.ok) throw new Error(`Auth verify failed: ${verifyRaw}`);

    const verifyResult = JSON.parse(verifyRaw);
    __sec_log.i('startAuthentication: Verify success', verifyResult);
    return verifyResult;
  } catch (err) {
    __sec_log.e('startAuthentication error', {
      message: err.message,
      stack: err.stack,
      userId
    });
    throw err;
  }
  __sec_log.d('startAuthentication exit');
}

window.startAuthentication = window.startAuthentication || startAuthentication;



/* ---- WebAuthn helper calls to server (list/revoke) ---- */
async function __sec_listAuthenticators(userId) {
  __sec_log.d('listAuthenticators entry', { userId });
  try {
    const currentUser = await __sec_getCurrentUser();
    __sec_log.d('listAuthenticators: Retrieved currentUser', { hasUser: !!currentUser?.user });
    if (!currentUser || !currentUser.user || !currentUser.user.uid) {
      __sec_log.w('listAuthenticators: No valid user session');
      return null;
    }

    const apiBase = window.__SEC_API_BASE || "https://api.flexgig.com.ng";
    const url = `${apiBase}/webauthn/authenticators/${encodeURIComponent(userId)}`;
    __sec_log.d('listAuthenticators: Fetching from', url);
    const r = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    const rRaw = await r.text();
    __sec_log.d('listAuthenticators: Response', { status: r.status, ok: r.ok, raw: rRaw });

    if (!r.ok) {
      __sec_log.w('listAuthenticators failed', r.status);
      return null;
    }

    const j = JSON.parse(rRaw);
    __sec_log.d('listAuthenticators success', j);
    return j;
  } catch (err) {
    __sec_log.e('listAuthenticators error', { err, userId });
    return null;
  }
  __sec_log.d('listAuthenticators exit');
}

async function __sec_revokeAuthenticator(userId, credentialID) {
  __sec_log.d('revokeAuthenticator entry', { userId, credentialID });
  try {
    const currentUser = await __sec_getCurrentUser();
    __sec_log.d('revokeAuthenticator: Retrieved currentUser', { hasUser: !!currentUser?.user });
    if (!currentUser || !currentUser.user || !currentUser.user.uid) {
      __sec_log.w('revokeAuthenticator: No valid user session');
      return false;
    }

    const apiBase = window.__SEC_API_BASE || "https://api.flexgig.com.ng";
    const url = `${apiBase}/webauthn/authenticators/${encodeURIComponent(userId)}/revoke`;
    __sec_log.d('revokeAuthenticator: Posting to', url);
    const r = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialID }),
    });

    const rRaw = await r.text();
    __sec_log.d('revokeAuthenticator: Response', { status: r.status, ok: r.ok, raw: rRaw });

    if (!r.ok) {
      __sec_log.w('revokeAuthenticator failed', credentialID, r.status);
      return false;
    }

    __sec_log.i('revokeAuthenticator success', credentialID);
    return true;
  } catch (err) {
    __sec_log.e('revokeAuthenticator error', { err, userId, credentialID });
    return false;
  }
  __sec_log.d('revokeAuthenticator exit');
}

/* Wire events (with WebAuthn integration) */
function __sec_wireEvents() {
  __sec_log.d('wireEvents entry');
  try {
    if (__sec_launcherBtn) {
      __sec_log.d('wireEvents: Wiring launcher (#securityBtn)');
      __sec_launcherBtn.addEventListener('click', (ev) => {
        __sec_log.d('launcher click event');
        ev.preventDefault();
        __sec_openModal();
      });
      __sec_log.d('launcher wired (#securityBtn)');
    } else {
      __sec_log.w('no launcher (#securityBtn) found; use controller.open() to open');
    }

    if (__sec_closeBtn) {
      __sec_log.d('wireEvents: Wiring close (#securityCloseBtn)');
      __sec_closeBtn.addEventListener('click', __sec_closeModal);
      __sec_log.d('close button wired (#securityCloseBtn)');
    } else {
      __sec_log.w('no close button (#securityCloseBtn) found');
    }
    if (__sec_closeBtn && __sec_modal) {
      __sec_log.d('wireEvents: Wiring modal close');
      __sec_closeBtn.addEventListener('click', (e) => {
        __sec_log.d('Security modal close button clicked');
        e.preventDefault();
        __sec_log.i('Security modal close button clicked');
        __sec_modal.classList.remove('show');
        __sec_modal.setAttribute('aria-hidden', 'true');
      });
    }

    document.addEventListener('keydown', (e) => {
      __sec_log.d('keydown event', { key: e.key, modalActive: __sec_modal && __sec_modal.classList.contains('active') });
      if (e.key === 'Escape' && __sec_modal && __sec_modal.classList.contains('active')) {
        __sec_log.i('Escape key pressed, closing modal');
        __sec_closeModal();
      }
    });

    if (__sec_parentSwitch) {
      __sec_log.d('wireEvents: Wiring parent switch (#biometricsSwitch)');
const __sec_parentHandler = async () => {
  __sec_log.d('__sec_parentHandler: Starting');

  return withLoader(async () => {
    try { __sec_setBusy(__sec_parentSwitch, true); } catch (e) { __sec_log.w('setBusy failed', e); }

    let wantOn = true;
    try {
      const currentlyChecked = !!(__sec_parentSwitch && __sec_isChecked(__sec_parentSwitch));
      wantOn = !currentlyChecked; // if currently off -> we want ON, and vice versa
      __sec_log.d('__sec_parentHandler: wantOn computed', { currentlyChecked, wantOn });
    } catch (e) {
      __sec_log.w('__sec_parentHandler: could not read current checked state, assuming ON request', e);
      wantOn = true;
    }

    const currentUser = await __sec_getCurrentUser();
    __sec_log.d('__sec_parentHandler: Retrieved currentUser', { hasUser: !!currentUser?.user });

    if (!currentUser || !currentUser.user || !currentUser.user.uid) {
      __sec_log.e('__sec_parentHandler: No current user or invalid session');
      try { __sec_setChecked(__sec_parentSwitch, false); } catch (e) {}
      try { __sec_setBusy(__sec_parentSwitch, false); } catch (e) {}
      alert('You must be signed in to enable biometrics. Please try logging in again.');
      window.location.href = '/';
      return;
    }

    const { user } = currentUser;
    __sec_log.d('__sec_parentHandler: Extracted user', { userId: user.uid });

    if (wantOn) {
      let hasPin = false;
      try {
        hasPin = localStorage.getItem('hasPin') === 'true';
      } catch (e) { __sec_log.w('localStorage.hasPin read failed', e); }

      if (!hasPin && (user && (user.hasPin || user.pin))) {
        hasPin = true;
      }

      if (!hasPin) {
        __sec_log.i('__sec_parentHandler: PIN not present, blocking biometric enable');
        try { showSlideNotification('Please set a PIN first before enabling biometrics', 'info'); } catch(e){}
        try { __sec_setChecked(__sec_parentSwitch, false); } catch (e) {}
        try { __sec_setBusy(__sec_parentSwitch, false); } catch (e) {}
        return; // abort early — no flinch, no network calls
      }

      __sec_log.i('Parent toggle ON requested — will revoke existing authenticators (best-effort) then register new');

      try {
        const auths = await __sec_listAuthenticators(user.uid).catch(err => {
          __sec_log.w('__sec_parentHandler: listAuthenticators failed', err);
          return [];
        });

        __sec_log.d('__sec_parentHandler: Authenticators found before ON', auths);

        if (Array.isArray(auths) && auths.length > 0) {
          for (const a of auths) {
            const credential_id = a.credential_id || a.credentialID || a.credentialId;
            if (!credential_id) {
              __sec_log.w('__sec_parentHandler: skipping invalid credential id', a);
              continue;
            }
            try {
              await __sec_revokeAuthenticator(user.uid, credential_id);
              __sec_log.i('__sec_parentHandler: revoked', credential_id);
            } catch (revokeErr) {
              __sec_log.w('__sec_parentHandler: revoke failed for', credential_id, revokeErr);
            }
          }
        } else {
          try {
            await __sec_revokeAuthenticator(user.uid, null);
            __sec_log.i('__sec_parentHandler: called revoke with null to ensure server reset');
          } catch (e) {
            __sec_log.w('__sec_parentHandler: revoke-with-null failed', e);
          }
        }
      } catch (err) {
        __sec_log.w('__sec_parentHandler: failed listing/revoking pre-existing authenticators (non-fatal)', err);
      }

      try {
        __sec_log.i('Starting fresh registration flow after revoke');
        const regResult = await startRegistration(user.uid, user.email || user.username || user.uid, user.fullName || user.email || user.uid);
        __sec_log.d('__sec_parentHandler: Registration result', regResult);

        __sec_setBiometrics(true, true);

        try { __sec_setChecked(__sec_parentSwitch, true); } catch(e){}
        __sec_log.i('Registration successful (parent ON)');
      } catch (err) {
        __sec_log.e('Registration failed after revoke', { err, uid: user.uid });
        try { __sec_setChecked(__sec_parentSwitch, false); } catch(e){}
        __sec_setBiometrics(false, false);
        alert('Biometric registration failed: ' + (err.message || 'unknown error'));
      } finally {
        try { __sec_setBusy(__sec_parentSwitch, false); } catch(e){}
      }

    } else {
      __sec_log.i('Parent toggle OFF requested — revoking and disabling biometrics');

      try {
        try {
          await __sec_revokeAuthenticator(user.uid, null);
        } catch (e) {
          __sec_log.w('__sec_parentHandler: revoke during disable returned error', e);
        }

        __sec_setBiometrics(false, false);
        try { __sec_setChecked(__sec_parentSwitch, false); } catch(e){}
        try { localStorage.removeItem('credentialId'); } catch(e){}
        try { invalidateAuthOptionsCache && invalidateAuthOptionsCache(); } catch(e){}

        __sec_log.i('Biometrics disabled (parent OFF)');
      } catch (err) {
        __sec_log.e('__sec_parentHandler: disabling failed', err);
        try { __sec_setChecked(__sec_parentSwitch, false); } catch(e){}
        __sec_setBiometrics(false, false);
      } finally {
        try { __sec_setBusy(__sec_parentSwitch, false); } catch(e){}
      }
    }

    __sec_log.d('__sec_parentHandler: Exit');
  }); // end withLoader
};


      __sec_parentSwitch.addEventListener('click', (e) => {
        __sec_log.d('parentSwitch click event');
        e.preventDefault();
        __sec_parentHandler();
      });
      __sec_parentSwitch.addEventListener('keydown', (e) => {
        __sec_log.d('parentSwitch keydown', { key: e.key });
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          __sec_parentHandler();
        }
      });
      if (__sec_parentSwitch) __sec_parentSwitch.__bioBound = true;
      if (__sec_parentSwitch) __sec_parentSwitch.__eventsAttached = true;
    } else {
      __sec_log.w('no parent switch (#biometricsSwitch) found');
    }

    if (__sec_bioLogin) {
      __sec_log.d('wireEvents: Wiring bioLogin (#bioLoginSwitch)');
      __sec_bioLogin.addEventListener('click', async (e) => {
        __sec_log.d('bioLogin click event');
        e.preventDefault();
        if (!__sec_parentSwitch || !__sec_isChecked(__sec_parentSwitch)) {
          __sec_log.d('bioLogin click ignored; parent OFF');
          showSlideNotification('Biometrics must be enabled first', 'info');
          __sec_parentHandler(); // Auto-enable parent
          return;
        }
        __sec_setBusy(__sec_bioLogin, true);
        const newState = __sec_toggleSwitch(__sec_bioLogin);
        __sec_log.d('bioLogin: New state', { newState });
        try {
          localStorage.setItem(__sec_KEYS.bioLogin, newState ? '1' : '0');
          localStorage.setItem('biometricForLogin', newState ? 'true' : 'false');
          __sec_log.i(`bioLogin ${newState ? 'enabled' : 'disabled'} (local only)`);
          showSlideNotification(`Login biometrics ${newState ? 'enabled' : 'disabled'}`, newState ? 'success' : 'info');
          if (!newState) __sec_maybeDisableParentIfChildrenOff();
        } catch (err) {
          __sec_log.e('bioLogin: Storage error', { err, newState });
          __sec_setChecked(__sec_bioLogin, false);
          localStorage.setItem(__sec_KEYS.bioLogin, '0');
          showSlideNotification('Failed to update login biometrics', 'error');
        } finally {
          __sec_setBusy(__sec_bioLogin, false);
        }
        __sec_log.d('bioLogin click handler exit');
      });

      __sec_bioLogin.addEventListener('keydown', (e) => {
        __sec_log.d('bioLogin keydown', { key: e.key });
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          __sec_bioLogin.click();
        }
      });
      if (__sec_bioLogin) __sec_bioLogin.__bioBound = true;
    } else {
      __sec_log.w('no bioLogin switch (#bioLoginSwitch) found');
    }

    if (__sec_bioTx) {
      __sec_log.d('wireEvents: Wiring bioTx (#bioTxSwitch)');
      __sec_bioTx.addEventListener('click', async (e) => {
        __sec_log.d('bioTx click event');
        e.preventDefault();
        if (!__sec_parentSwitch || !__sec_isChecked(__sec_parentSwitch)) {
          __sec_log.d('bioTx click ignored; parent OFF');
          showSlideNotification('Biometrics must be enabled first', 'info');
          __sec_parentHandler(); // Auto-enable parent
          return;
        }
        __sec_setBusy(__sec_bioTx, true);
        const newState = __sec_toggleSwitch(__sec_bioTx);
        __sec_log.d('bioTx: New state', { newState });
        try {
          localStorage.setItem(__sec_KEYS.bioTx, newState ? '1' : '0');
          localStorage.setItem('biometricForTx', newState ? 'true' : 'false');
          __sec_log.i(`bioTx ${newState ? 'enabled' : 'disabled'} (local only)`);
          showSlideNotification(`Transaction biometrics ${newState ? 'enabled' : 'disabled'}`, newState ? 'success' : 'info');
          if (!newState) __sec_maybeDisableParentIfChildrenOff();
        } catch (err) {
          __sec_log.e('bioTx: Storage error', { err, newState });
          __sec_setChecked(__sec_bioTx, false);
          localStorage.setItem(__sec_KEYS.bioTx, '0');
          showSlideNotification('Failed to update transaction biometrics', 'error');
        } finally {
          __sec_setBusy(__sec_bioTx, false);
        }
        __sec_log.d('bioTx click handler exit');
      });

      __sec_bioTx.addEventListener('keydown', (e) => {
        __sec_log.d('bioTx keydown', { key: e.key });
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          __sec_bioTx.click();
        }
      });
      if (__sec_bioTx) __sec_bioTx.__bioBound = true;
    } else {
      __sec_log.w('no bioTx switch (#bioTxSwitch) found');
    }

    

    __sec_log.i('events wired (with WebAuthn integration)');
  } catch (err) {
    __sec_log.e('wireEvents error', { err });
  }
  __sec_log.d('wireEvents exit');
}


/* ====== Defensive capture listeners to prevent flinch/no-PIN registration ======
   Paste this after __sec_wireEvents() runs (or at end of the function).
   It prevents any click/key handlers from firing if there's no PIN.        */
(function installPinGuard() {
  try {
    if (typeof __sec_parentSwitch === 'undefined') {
      console.warn('installPinGuard: __sec_parentSwitch not present yet');
      return;
    }

    function hasPin() {
      try { return localStorage.getItem('hasPin') === 'true'; } catch (e) { return false; }
    }

    function blockAndNotify(e, msg) {
      try {
        e.preventDefault();
        e.stopImmediatePropagation(); // ensure we stop other handlers
      } catch (err) {}
      try { __sec_setChecked(__sec_parentSwitch, false); } catch (err) {}
      try { showSlideNotification(msg || 'Please set a PIN first before enabling biometrics', 'info'); } catch (err) { console.log(msg || 'Please set a PIN first before enabling biometrics'); }
      return false;
    }

    __sec_parentSwitch.addEventListener('click', function (e) {
      if (!hasPin()) {
        return blockAndNotify(e, 'Please set a PIN first before enabling biometrics.');
      }
    }, { capture: true, passive: false });

    __sec_parentSwitch.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (!hasPin()) {
          return blockAndNotify(e, 'Please set a PIN first before enabling biometrics.');
        }
      }
    }, { capture: true, passive: false });

    const childGuards = [__sec_bioLogin, __sec_bioTx].filter(Boolean);
    childGuards.forEach((childEl) => {
      childEl.addEventListener('click', function (e) {
        try {
          const parentChecked = __sec_parentSwitch && __sec_isChecked && __sec_isChecked(__sec_parentSwitch);
          if (!parentChecked && !hasPin()) {
            return blockAndNotify(e, 'Please set a PIN first to enable biometric options.');
          }
        } catch (err) {}
      }, { capture: true, passive: false });

      childEl.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') {
          const parentChecked = __sec_parentSwitch && __sec_isChecked && __sec_isChecked(__sec_parentSwitch);
          if (!parentChecked && !hasPin()) {
            return blockAndNotify(e, 'Please set a PIN first to enable biometric options.');
          }
        }
      }, { capture: true, passive: false });
    });

    console.debug('installPinGuard: guard installed for parent and child switches');
  } catch (err) {
    console.error('installPinGuard failed', err);
  }
})();

/* Open/close modal with focus handling */
let __sec_lastActiveElement = null;
function __sec_openModal() {
  if (!__sec_modal) {
    __sec_log.e('openModal: #securityModal not found');
    return;
  }
  __sec_lastActiveElement = document.activeElement;
  __sec_modal.classList.add('active');
  __sec_modal.setAttribute('aria-hidden', 'false');
  try { __sec_modal.scrollTop = 0; } catch (e) {}
  if (__sec_parentSwitch && typeof __sec_parentSwitch.focus === 'function') {
    __sec_parentSwitch.focus();
  }
  __sec_log.i('modal opened');
}

function __sec_closeModal() {
  if (!__sec_modal) return;
  __sec_modal.classList.remove('active');
  __sec_modal.setAttribute('aria-hidden', 'true');
  if (__sec_lastActiveElement && typeof __sec_lastActiveElement.focus === 'function') {
    __sec_lastActiveElement.focus();
  }
  __sec_log.i('modal closed');
}

/* Expose safe controller */
window.__secModalController = {
  open: __sec_openModal,
  close: __sec_closeModal,
  getState: () => ({
    biom: localStorage.getItem(__sec_KEYS.biom),
    bioLogin: localStorage.getItem(__sec_KEYS.bioLogin),
    bioTx: localStorage.getItem(__sec_KEYS.bioTx),
    balance: localStorage.getItem(__sec_KEYS.balance)
  })
};
})(supabaseClient);



/* ---------------------------
   Top slide-in notifier utils
   --------------------------- */
function ensureTopNotifier() {
  if (document.getElementById('fg-top-notifier')) return document.getElementById('fg-top-notifier');
  const el = document.createElement('div');
  el.id = 'fg-top-notifier';
  el.innerHTML = `<div class="msg" aria-live="polite"></div>
                  <div class="countdown" style="display:none"></div>
                  <div class="close" title="Dismiss">✕</div>`;
  document.body.appendChild(el);
  el.querySelector('.close').addEventListener('click', () => hideTopNotifier());
  return el;
}

function stringifyMessage(m) {
  if (m == null) return '';
  if (typeof m === 'string') return m;
  try {
    if (m.message || m.error) return (m.message || m.error) + (m.meta ? ` — ${JSON.stringify(m.meta)}` : '');
    return typeof m.toString === 'function' ? m.toString() : JSON.stringify(m);
  } catch (e) {
    return JSON.stringify(m);
  }
}

function showTopNotifier(message, type = 'info', { autoHide = true, duration = 6000, countdownUntil = null } = {}) {
  const n = ensureTopNotifier();
  n.className = ''; // reset classes
  n.classList.add(type);
  n.querySelector('.msg').textContent = stringifyMessage(message);
  const countdownEl = n.querySelector('.countdown');
  if (countdownUntil) {
    countdownEl.style.display = '';
    updateCountdownDisplay(countdownEl, countdownUntil);
    startGlobalLockoutTicker(countdownEl, countdownUntil);
  } else {
    countdownEl.style.display = 'none';
  }
  requestAnimationFrame(() => n.classList.add('show'));
  if (autoHide && !countdownUntil) {
    setTimeout(() => hideTopNotifier(), duration);
  }
}


function hideTopNotifier() {
  const n = document.getElementById('fg-top-notifier');
  if (!n) return;
  n.classList.remove('show');
  if (window.__fg_top_notifier_interval) {
    clearInterval(window.__fg_top_notifier_interval);
    window.__fg_top_notifier_interval = null;
  }
}

/* ---------------------------
   Lockout countdown helpers
   --------------------------- */
function updateCountdownDisplay(el, untilIso) {
  const until = new Date(untilIso);
  const diff = Math.max(0, until - Date.now());
  if (diff <= 0) {
    el.textContent = '';
    return;
  }
  const s = Math.floor(diff / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  el.textContent = `${mm}m ${String(ss).padStart(2,'0')}s`;
}

function startGlobalLockoutTicker(countdownEl, untilIso) {
  if (window.__fg_top_notifier_interval) {
    clearInterval(window.__fg_top_notifier_interval);
  }
  window.__fg_top_notifier_interval = setInterval(() => {
    updateCountdownDisplay(countdownEl, untilIso);
    if (new Date(untilIso) <= new Date()) {
      clearInterval(window.__fg_top_notifier_interval);
      window.__fg_top_notifier_interval = null;
      hideTopNotifier();
      try { localStorage.removeItem('pin_lockout_until'); } catch(e){}
      enableReauthInputs(true);
    }
  }, 1000);
}

/* Simple helpers to disable/enable PIN inputs + keypad */
function disableReauthInputs(disabled = true) {
  try {
    const inputs = document.querySelectorAll('.reauthpin-inputs input');
    const keys = document.querySelectorAll('.reauthpin-keypad button');
    inputs.forEach(i => i.disabled = disabled);
    keys.forEach(k => k.disabled = disabled);
  } catch (e) { /* ignore */ }
}

function enableReauthInputs() { disableReauthInputs(false); }

/* Persist lockout until */
function persistLockout(untilIso) {
  try { localStorage.setItem('pin_lockout_until', untilIso); } catch(e){}
}

/* When page / modal opens, call this to resume any lockout countdown */
function resumeLockoutIfAny() {
  try {
    const untilIso = localStorage.getItem('pin_lockout_until');
    if (!untilIso) return;
    const until = new Date(untilIso);
    if (until > new Date()) {
      disableReauthInputs(true);
      showTopNotifier('Too many incorrect PINs — locked until', 'error', { autoHide: false, countdownUntil: untilIso });
    } else {
      localStorage.removeItem('pin_lockout_until');
      enableReauthInputs();
    }
  } catch(e){ console.error('resumeLockoutIfAny', e); }
}

/* Open Forget PIN flow (send OTP first, then open Reset PIN modal) */
async function openForgetPinFlow() {
  try {
    if (window.__rp_handlers && typeof window.__rp_handlers.onTrigger === 'function') {
      await window.__rp_handlers.onTrigger();
      return;
    }

    if (window.__rp_handlers && typeof window.__rp_handlers.onTriggerClicked === 'function') {
      await window.__rp_handlers.onTriggerClicked();
      return;
    }

    const email = (window.currentUser?.email) ||
                  localStorage.getItem('userEmail') ||
                  prompt('Enter your account email to receive OTP:');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      alert('Valid email required to send OTP.');
      return;
    }

    const endpoint = `${window.API_BASE || 'https://api.flexgig.com.ng'}/auth/resend-otp`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const body = await resp.json();
    if (!resp.ok) throw new Error(body.error?.message || body.message || 'Failed to send OTP');

    if (window.notify) window.notify('success', `OTP sent to ${email}`, { title: 'OTP sent' });
    else alert(`OTP sent to ${email}`);

    if (window.ModalManager && typeof window.ModalManager.openModal === 'function') {
      ModalManager.openModal('resetPinModal');
      return;
    }
    const modal = document.getElementById('resetPinModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    } else {
      alert('OTP sent, but could not open Reset PIN modal.');
    }
  } catch (err) {
    console.error('openForgetPinFlow error:', err);
    if (window.notify) window.notify('error', err.message, { title: 'Reset PIN error' });
    else alert(err.message || 'Error starting reset-PIN flow.');
  }
}





/* -----------------------------
   Reauth + Inactivity (perfected version)
   - NO logs (console or on-screen)
   - Resilient shouldReauth fallback
   - Debounced mobile events
   - Defensive safeCall usage
   - Biometrics registration/disable added
   - ARIA/accessibility boosts
   - Prod IDLE_TIME (10 min)
   - Backend-aligned fetches (userId body)
----------------------------- */
(function () {
  function safeQuery(id) {
    try {
      return document.getElementById(id);
    } catch (e) {
      return null;
    }
  }

  function isValidImageSource(src) {
    return !!src && /^(data:image\/|https?:\/\/|\/|blob:)/i.test(src);
  }

  function safeCall(fn, ...args) {
    try {
      if (typeof fn === 'function') return fn(...args);
    } catch (e) {}
    return undefined;
  }
  window.safeCall = window.safeCall || safeCall; // expose globally if needed

let reauthModal,
    biometricView,
    pinView,
    reauthAvatar,
    reauthName,
    reauthAlert,
    reauthAlertMsg,
    deleteReauthKey,
    verifyBiometricBtn,
    switchToPin,
    switchToBiometric,
    logoutLinkBio,
    logoutLinkPin,
    forgetPinLinkBio,
    forgetPinLinkPin,
    promptModal,
    yesBtn;

let __fg_pin_securityPinModal = null;
let __fg_pin_changePinForm = null;
let __fg_pin_resetPinBtn = null;
let __fg_pin_inputCurrentEl = null;
let __fg_pin_inputNewEl = null;
let __fg_pin_inputConfirmEl = null;

function cacheDomRefs() {
  console.log('cacheDomRefs called');
  reauthModal = safeQuery('reauthModal');
  biometricView = safeQuery('biometricView');
  pinView = safeQuery('pinView');
  reauthAvatar = safeQuery('reauthAvatar');
  reauthName = safeQuery('reauthName');
  reauthAlert = safeQuery('reauthAlert');
  reauthAlertMsg = safeQuery('reauthAlertMsg');
  deleteReauthKey = safeQuery('deleteReauthKey');
  verifyBiometricBtn = safeQuery('verifyBiometricBtn');
  switchToPin = safeQuery('switchToPin');
  switchToBiometric = safeQuery('switchToBiometric');
  logoutLinkBio = safeQuery('logoutLinkBio');
  logoutLinkPin = safeQuery('logoutLinkPin');
  forgetPinLinkBio = safeQuery('forgetPinLinkBio');
  forgetPinLinkPin = safeQuery('forgetPinLinkPin');
  promptModal = safeQuery('inactivityPrompt');
  yesBtn = safeQuery('yesActiveBtn');

  __fg_pin_securityPinModal = safeQuery('securityPinModal');
  __fg_pin_changePinForm   = safeQuery('changePinForm');
  __fg_pin_resetPinBtn      = safeQuery('resetPinBtn');
  __fg_pin_inputCurrentEl   = safeQuery('currentPin');
  __fg_pin_inputNewEl       = safeQuery('newPin');
  __fg_pin_inputConfirmEl   = safeQuery('confirmPin');

  console.log(
    'Cached refs - pinView:', !!pinView,
    'deleteReauthKey:', !!deleteReauthKey,
    'pinModal:', !!__fg_pin_securityPinModal,
    'pinForm:', !!__fg_pin_changePinForm
  );
}
window.cacheDomRefs = window.cacheDomRefs || cacheDomRefs; // expose if needed


  let currentPin = '';     // Optional global used by some PIN handlers
  let firstPin = '';
  let step = 'reauth';     // 'create' | 'confirm' | 'reauth'
  let processing = false;


    function getReauthInputs() {
    console.log('getReauthInputs called');
    try {
      if (pinView && pinView.querySelectorAll) {
        const inputs = Array.from(pinView.querySelectorAll('.reauthpin-inputs input'));
        console.log('Found inputs:', inputs.length);
        return inputs;
      }
    } catch (e) {
      console.error('Error in getReauthInputs:', e);
    }
    console.log('No inputs found');
    return [];
  }

    const keypadButtons = Array.from(document.querySelectorAll('.pin-keypad button'));
function toggleKeypadProcessing(disabled) {
  console.log('toggleKeypadProcessing:', disabled);
  keypadButtons.forEach(btn => { btn.disabled = disabled; btn.style.opacity = disabled ? '0.5' : '1'; });
  if (deleteReauthKey) { deleteReauthKey.disabled = disabled; deleteReauthKey.style.opacity = disabled ? '0.5' : '1'; }
  const inputs = getReauthInputs();
  inputs.forEach(i => { i.disabled = disabled; });
}
window.toggleKeypadProcessing = window.toggleKeypadProcessing || toggleKeypadProcessing; // expose if needed

async function handlePinCompletion() {
  console.log('handlePinCompletion started (new robust flow)');

  if (processing) {
    console.log('Already processing — ignoring');
    return;
  }

  const pin = currentPin;
  if (!/^\d{4}$/.test(pin)) {
    console.log('Invalid PIN length:', pin && pin.length);
    showTopNotifier('PIN must be 4 digits', 'error');
    return;
  }

  if (inGraceWindow()) {
    console.log('Using local reauth grace window — skipping server round-trip');
    try {
      if (typeof onSuccessfulReauth === 'function') {
        await onSuccessfulReauth({ code: 'SUCCESS', token: null, meta: { method: 'pin', grace: true } });
      }
      if (typeof guardedHideReauthModal === 'function') {
        await guardedHideReauthModal();
      }
      if (typeof resetReauthInputs === 'function') resetReauthInputs();
      try {
        window.dispatchEvent(new CustomEvent('fg:reauth-success', { detail: { method: 'pin', grace: true } }));
      } catch (e) { console.debug('fg:reauth-success dispatch failed', e); }
    } catch (e) {
      console.warn('Local grace post-success flow error', e);
      showTopNotifier('Error completing authentication. Please try again.', 'error');
    } finally {
      processing = false;
      toggleKeypadProcessing(false);
    }
    return;
  }

  processing = true;
  toggleKeypadProcessing(true); // Disable UI immediately

  const controller = new AbortController();
  const TIMEOUT_MS = 30000;
  const timeoutId = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, TIMEOUT_MS);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Reauth timeout')), TIMEOUT_MS + 50)
  );

  const workPromise = withLoader(async () => {
    try {
      const uidInfo = await getUid({ waitForSession: true, waitMs: 500 }) || {};
      const userId = uidInfo?.uid || localStorage.getItem('userId') || null;
      if (!userId) {
        console.warn('handlePinCompletion: userId not available yet (session loading).');
        showTopNotifier('Session still loading — please try PIN again in a moment', 'error');
        return; // finally will handle unlock
      }

      let res;
      try {
        res = await fetch('https://api.flexgig.com.ng/api/reauth-pin', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          body: JSON.stringify({ userId, pin }),
          signal: controller.signal
        });
      } catch (fetchErr) {
        if (fetchErr && fetchErr.name === 'AbortError') {
          throw new Error('Reauth timeout');
        }
        throw fetchErr;
      }

      let payload = null;
      try { payload = await res.json(); } catch (e) { payload = null; }

      if (res.ok) {
        console.log('[DEBUG] PIN verification successful');

        try { setLastPinReauthTs(); } catch (e) { /* ignore */ }

        try {
          if (typeof onSuccessfulReauth === 'function') {
            await onSuccessfulReauth(payload);
          }
          if (typeof guardedHideReauthModal === 'function') {
            await guardedHideReauthModal();
          }
          if (typeof resetReauthInputs === 'function') resetReauthInputs();
          try {
            window.dispatchEvent(new CustomEvent('fg:reauth-success', { detail: { method: 'pin' } }));
          } catch (e) { console.debug('fg:reauth-success dispatch failed', e); }
          try { localStorage.removeItem('pin_lockout_until'); } catch (e) {}
        } catch (e) {
          console.warn('Post-PIN verification error', e);
          showTopNotifier('Error completing authentication. Please try again.', 'error');
        }
        return;
      }

      const serverMsg = (payload && (payload.message || payload.error)) || (await res.text().catch(() => '')) || `HTTP ${res.status}`;
      const serverCode = payload && payload.code ? payload.code : null;
      const meta = payload && payload.meta ? payload.meta : {};

      console.warn('PIN verify server error', { status: res.status, code: serverCode, msg: serverMsg, meta });

      switch (serverCode) {
        case 'INCORRECT_PIN_ATTEMPT': {
          const left = meta?.attemptsLeft ?? null;
          showTopNotifier(left ? `Incorrect PIN — ${left} attempt(s) left` : (payload?.message || 'Incorrect PIN'), 'error');
          const wrap = document.querySelector('.reauthpin-inputs');
          if (wrap) {
            wrap.classList.add('fg-shake');
            setTimeout(() => wrap.classList.remove('fg-shake'), 400);
          }
          break;
        }
        case 'TOO_MANY_ATTEMPTS':
        case 'TOO_MANY_ATTEMPTS_EMAIL': {
          let untilIso = meta?.lockoutUntil || null;
          if (!untilIso) {
            const ra = res.headers.get('Retry-After');
            if (ra) {
              const sec = parseInt(ra, 10);
              if (!isNaN(sec)) untilIso = new Date(Date.now() + sec * 1000).toISOString();
            }
          }
          if (untilIso) {
            persistLockout(untilIso);
            disableReauthInputs(true);
            showTopNotifier(payload?.message || 'Too many incorrect PINs — locked', 'error', { autoHide: false, countdownUntil: untilIso });
          } else {
            showTopNotifier(payload?.message || 'Too many incorrect PINs — locked', 'error', { autoHide: false });
          }
          break;
        }
        case 'PIN_ENTRY_LIMIT_EXCEEDED': {
          showTopNotifier(payload?.message || 'PIN entry limit reached — use Forget PIN', 'error', { autoHide: false });
          setTimeout(() => openForgetPinFlow(), 800);
          break;
        }
        case 'ACCOUNT_FLAGGED': {
          showTopNotifier(
            'Your account has been temporarily restricted. Please contact support.',
            'error',
            { autoHide: false }
          );
          if (typeof guardedHideReauthModal === 'function') {
            await guardedHideReauthModal();
          }
          break;
        }
        default: {
          showTopNotifier(payload?.message || serverMsg || 'PIN verification failed', 'error');
        }
      }

      if (!['TOO_MANY_ATTEMPTS', 'TOO_MANY_ATTEMPTS_EMAIL', 'PIN_ENTRY_LIMIT_EXCEEDED'].includes(serverCode)) {
        if (typeof resetReauthInputs === 'function') resetReauthInputs();
        currentPin = '';
      } else {
        if (meta?.lockoutUntil) {
          persistLockout(meta.lockoutUntil);
          disableReauthInputs(true);
        }
      }
    } catch (err) {
      console.error('handlePinCompletion network/error', err);
      const msg = (err && err.message === 'Reauth timeout') ? 'Request timed out — please try again' : 'Network error. Please try again.';
      showTopNotifier(msg, 'error');
      if (typeof resetReauthInputs === 'function') resetReauthInputs();
      currentPin = '';
    } finally {
    }
  });

  try {
    await Promise.race([workPromise, timeoutPromise]);
    console.log('handlePinCompletion resolved successfully');
  } catch (err) {
    console.error('handlePinCompletion timed out or errored:', err);
    if (err && err.message === 'Reauth timeout') {
      showTopNotifier('Request timed out — please try again', 'error');
    } else {
    }
  } finally {
    clearTimeout(timeoutId);
    processing = false;
    toggleKeypadProcessing(false);
  }
}




    function initReauthKeypad() {
    console.log('initReauthKeypad started');
    cacheDomRefs(); // ensure pinView & deleteReauthKey are up-to-date
    if (!pinView) {
      console.error('pinView not found in initReauthKeypad');
      return;
    }
    console.log('pinView found');

    const inputs = getReauthInputs(); // four readonly inputs in your HTML
    const keypadButtons = pinView.querySelectorAll('.reauthpin-keypad button');
    console.log('Keypad buttons found:', keypadButtons.length);
    const localDelete = pinView.querySelector('#deleteReauthKey');
deleteReauthKey = localDelete; // expose to module/global so other helpers can use it

    console.log('Local delete found:', !!localDelete);

    if (pinView.__keypadBound) {
      console.log('Keypad already bound, resetting');
      try { resetReauthInputs(); } catch (e) {
        console.error('Error resetting in bound check:', e);
        inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
      }
      return;
    }
    pinView.__keypadBound = true;
    console.log('Binding keypad');

function refreshInputsUI() {
  console.log('refreshInputsUI called, currentPin:', currentPin, 'inputs length:', inputs.length);
  
  if (pinView.__lastRefresh && (Date.now() - pinView.__lastRefresh) < 50) {
    console.log('refreshInputsUI debounced (too soon)');
    return;
  }
  pinView.__lastRefresh = Date.now();

  /*
  if (typeof updatePinInputs === 'function') {
    try { 
      console.log('Calling existing updatePinInputs');
      updatePinInputs(); 
      return; 
    } catch (e) {
      console.error('Error in updatePinInputs:', e);
    }
  }
  */
  
  inputs.forEach((inp, idx) => {
    console.log(`Updating input ${idx}: value='${inp.value}', setting to ${currentPin && idx < currentPin.length ? '•' : ''}`);
    if (currentPin && idx < currentPin.length) {
      inp.value = '•';
      inp.classList.add('filled');
    } else {
      inp.value = '';
      inp.classList.remove('filled');
    }
  });
  console.log('UI refreshed for inputs (fallback masking)');
}

    keypadButtons.forEach((btn, index) => {
      console.log('Setting up button', index, 'text:', btn.textContent.trim());
      btn.onclick = () => {
        console.log('Button clicked, index:', index);
        const raw = (btn.getAttribute('data-key') || btn.dataset.value || btn.textContent || '').trim();
        const action = (btn.getAttribute('data-action') || btn.dataset.action || '').trim();
        console.log('Button raw:', raw, 'action:', action);

        if (action === 'clear' || raw.toLowerCase() === 'c') {
          console.log('Clear action');
          if (typeof resetReauthInputs === 'function') {
            try { resetReauthInputs(); } catch (e) {
              console.error('Error in resetReauthInputs:', e);
            }
          } else if (typeof resetInputs === 'function') {
            try { resetInputs(); } catch (e) {
              console.error('Error in resetInputs:', e);
            }
          } else {
            currentPin = '';
            refreshInputsUI();
          }
          return;
        }

        if (action === 'back' || btn.id === 'deleteReauthKey' || raw === '⌫' || raw.toLowerCase() === 'del') {
          console.log('Delete action');
          if (typeof handleDelete === 'function') {
            try { handleDelete(); } catch (e) {
              console.error('Error in handleDelete:', e);
            }
          } else {
            if (currentPin && currentPin.length > 0) {
              currentPin = currentPin.slice(0, -1);
              console.log('CurrentPin after delete fallback:', currentPin);
              refreshInputsUI();
            } else {
              const filled = Array.from(inputs).filter(i => i.value);
              if (filled.length) {
                const last = filled[filled.length - 1];
                last.value = '';
                last.classList.remove('filled');
                console.log('Cleared last input fallback');
              }
            }
          }
          return;
        }

        if (/^[0-9]$/.test(raw)) {
          console.log('Digit pressed:', raw);
          if (typeof inputDigit === 'function') {
            try { 
              console.log('Calling existing inputDigit');
              inputDigit(raw); 
            } catch (e) { 
              console.error('Error in inputDigit:', e);
            }
            refreshInputsUI();
          } else {
            if (currentPin.length < 4) {
              currentPin += raw;
              console.log('CurrentPin after add fallback:', currentPin);
              refreshInputsUI();
              if (currentPin.length === 4) {
                console.log('PIN complete in fallback, calling handlePinCompletion');
                handlePinCompletion(); // Now defined
              }
            } else {
              console.log('PIN already full, ignoring');
            }
          }
        } else {
          console.log('Non-digit button clicked:', raw);
        }
      };
    });

    if (deleteReauthKey) {
      console.log('Setting up explicit delete click');
      deleteReauthKey.onclick = () => {
        console.log('Explicit delete clicked');
        if (typeof handleDelete === 'function') {
          try { handleDelete(); } catch (e) {
            console.error('Error in explicit handleDelete:', e);
          }
        } else {
          if (currentPin.length > 0) {
            currentPin = currentPin.slice(0, -1);
            console.log('CurrentPin after explicit delete:', currentPin);
          }
          refreshInputsUI();
        }
      };
    }

if (!pinView.__keydownHandler) {
  console.log('Attaching keyboard handler (visibility-guarded)');

  function isReauthModalVisible() {
    try {
      if (!reauthModal) return false;
      if (typeof reauthModalOpen !== 'undefined') {
        if (reauthModalOpen) return true;
        if (!reauthModalOpen) return false;
      }
      if (reauthModal.classList && reauthModal.classList.contains('hidden')) return false;
      const cs = getComputedStyle(reauthModal);
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')) return false;
      if (reauthModal.offsetParent === null) return false;
      return true;
    } catch (err) {
      return false;
    }
  }

  pinView.__keydownHandler = (e) => {
    if (!isReauthModalVisible()) return;

    try {
      const active = document.activeElement;
      if (active && reauthModal && !reauthModal.contains(active)) {
        return;
      }
    } catch (err) {
    }

    if (/^[0-9]$/.test(e.key)) {
      if (typeof inputDigit === 'function') {
        try { inputDigit(e.key); } catch (err) { /* swallow */ }
        try { refreshInputsUI(); } catch (err) {}
      } else {
        if (currentPin.length < 4) {
          currentPin += e.key;
          try { refreshInputsUI(); } catch (err) {}
          if (currentPin.length === 4) {
            handlePinCompletion();
          }
        }
      }
    } else if (e.key === 'Backspace') {
      if (typeof handleDelete === 'function') {
        try { handleDelete(); } catch (err) {}
      } else {
        if (currentPin.length > 0) {
          currentPin = currentPin.slice(0, -1);
          try { refreshInputsUI(); } catch (err) {}
        }
      }
    } else if (e.key === 'Enter') {
      handlePinCompletion();
    }
  };

  document.addEventListener('keydown', pinView.__keydownHandler, true);
}


    console.log('Initial reset in initReauthKeypad');
    try {
      if (typeof resetReauthInputs === 'function') {
        console.log('Calling existing resetReauthInputs');
        resetReauthInputs();
      }
      else {
        console.log('Defining fallback resetReauthInputs');
        resetReauthInputs = function () { 
          console.log('Fallback resetReauthInputs called');
          inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); }); 
        };
      }
    } catch (e) {
      console.error('Error in initial reset:', e);
      inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
    }
    refreshInputsUI();
    console.log('initReauthKeypad completed');
  }

  

function reauthWarmBiometric() {
  const LOCAL_KEY = '__fg_reauthBioWarmup';
  const now = Date.now();

  const modal = document.getElementById('reauthModal');
  if (!modal || modal.classList.contains('hidden')) return;

  try {
    const cached = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    const last = cached.timestamp || 0;

    if (now - last > 60_000) {
      if (!window.__cachedAuthOptionsLock) {
        try {
          const options = window.prefetchAuthOptions && window.prefetchAuthOptions();
          if (options) {
            localStorage.setItem(
              LOCAL_KEY,
              JSON.stringify({ timestamp: now, authOptions: options })
            );
            window.__cachedAuthOptions = options; // optional: in-memory cache
            console.debug('[reauth] Biometric warmed & cached');
          }
        } catch (e) {
          console.warn('[reauth] Biometric warmup failed', e);
        }
      }
    }
  } catch (e) {
    console.warn('[reauth] Reauth warmup localStorage error', e);
  }
}



async function initReauthModal({ show = false, context = 'reauth' } = {}) {

console.debug('BOOT LOG: initReauthModal start (show=' + String(show) + ')'); // at top of initReauthModal

  console.debug('initReauthModal called', { show, context });
  cacheDomRefs();

try {
  const LOCAL_KEY = 'fg_reauth_required_v1';
  const pending = localStorage.getItem(LOCAL_KEY);
  if (pending && (typeof show === 'undefined' || show === false)) {
    console.debug('initReauthModal: local reauth pending -> forcing show');
    show = true;
  }
} catch (e) {
  /* ignore localStorage errors */
}


  async function buildUser() {
    try {
      const cached = localStorage.getItem('userData');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!parsed.profilePicture) {
            parsed.profilePicture = localStorage.getItem('profilePicture') || '';
          }
          return parsed;
        } catch (e) { console.warn('userData parse failed', e); }
      }
      const session = await safeCall(__sec_getCurrentUser) || {};
      const sUser = session.user || {};
const existingUserData = (() => {
  try { return JSON.parse(localStorage.getItem('userData') || '{}'); } catch(e) { return {}; }
})();

const userObj = {
  username: sUser.username || sUser.email || '',
  fullName: sUser.fullName || '',
  profilePicture: sUser.profilePicture || '',
  id: sUser.uid || sUser.id || '',
  hasPin: !!(sUser.hasPin || sUser.pin || (localStorage.getItem('hasPin') || '').toLowerCase() === 'true'),
  wallet_balance: sUser.wallet_balance ?? existingUserData.wallet_balance ?? null,
  cachedAt: Date.now()
};
try { localStorage.setItem('userData', JSON.stringify(userObj)); } catch(e){ console.warn('Could not cache userData', e); }
      return userObj;
    } catch (err) {
      console.error('buildUser failed', err);
      return { username: 'User', fullName: '', profilePicture: localStorage.getItem('profilePicture') || '', id: '', hasPin: false };
    }
  }

  const user = await buildUser();

 function attachPrefetchOnGesture(el) {
  if (!el || el.__prefetchBound) return;
  el.__prefetchBound = true;
}


  function idToUint8(storedId) {
    if (!storedId) return null;
    try {
      if (typeof storedId === 'string') {
        return (window.fromBase64Url ? window.fromBase64Url(storedId) : (function(s){
          s = s.replace(/-/g, '+').replace(/_/g, '/');
          while (s.length % 4) s += '=';
          const bin = atob(s);
          const arr = new Uint8Array(bin.length);
          for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
          return arr;
        })(storedId));
      } else if (ArrayBuffer.isView(storedId)) {
        return new Uint8Array(storedId.buffer || storedId);
      } else if (storedId instanceof ArrayBuffer) {
        return new Uint8Array(storedId);
      }
    } catch (e) { console.warn('idToUint8 conversion failed', e); }
    return null;
  }

async function tryBiometricWithCachedOptions() {
  const raw = window.__cachedAuthOptions || null;
  if (!raw) return { ok: false, reason: 'no-cache' };

  const storedId = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id') || localStorage.getItem('webauthn_cred') || '';

  function base64UrlToUint8(s) {
    if (!s) return null;
    try {
      if (typeof window.idToUint8 === 'function') return window.idToUint8(s);
      if (typeof window.fromBase64Url === 'function') {
        const v = window.fromBase64Url(s);
        return (v instanceof Uint8Array) ? v : new Uint8Array(v);
      }
      const pad = (4 - (s.length % 4)) % 4;
      const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
      const bin = atob(base64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch (e) {
      console.warn('[tryBiometricWithCachedOptions] base64UrlToUint8 failed', e);
      return null;
    }
  }

  function numericObjectToUint8(obj) {
    try {
      const keys = Object.keys(obj);
      if (!keys.length) return null;
      let max = -1;
      for (let k of keys) {
        const n = parseInt(k, 10);
        if (!Number.isNaN(n)) max = Math.max(max, n);
      }
      if (max < 0) return null;
      const out = new Uint8Array(max + 1);
      for (let i = 0; i <= max; i++) out[i] = typeof obj[i] === 'number' ? obj[i] & 0xff : 0;
      return out;
    } catch (e) {
      return null;
    }
  }

  function ensureUint8(value) {
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value) && value.buffer) return new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength || value.length);
    if (typeof value === 'string') return base64UrlToUint8(value);
    try {
      if (value && Array.isArray(value.data)) return new Uint8Array(value.data);
    } catch (e) {}
    try {
      const conv = numericObjectToUint8(value);
      if (conv) return conv;
    } catch (e) {}
    return null;
  }

  const publicKey = {};
  if ('rpId' in raw) publicKey.rpId = raw.rpId;
  if ('timeout' in raw) publicKey.timeout = raw.timeout;
  if ('userVerification' in raw) publicKey.userVerification = raw.userVerification;
  if ('extensions' in raw) publicKey.extensions = raw.extensions;

  try {
    const ch = ensureUint8(raw.challenge);
    if (ch) {
      publicKey.challenge = ch;
    } else if (raw.challenge && typeof raw.challenge === 'object') {
      const n = numericObjectToUint8(raw.challenge);
      if (n) publicKey.challenge = n;
      else publicKey.challenge = raw.challenge; // will be caught by validation below
    } else {
      publicKey.challenge = (typeof raw.challenge === 'string') ? base64UrlToUint8(raw.challenge) : raw.challenge;
    }
  } catch (e) {
    console.warn('[tryBiometricWithCachedOptions] challenge conversion failed', e);
    publicKey.challenge = null;
  }

  try {
    const rawAllow = Array.isArray(raw.allowCredentials) ? raw.allowCredentials : [];
    const allow = [];

    for (let i = 0; i < rawAllow.length; i++) {
      const c = rawAllow[i];
      if (!c) continue;
      const item = {};
      item.type = c.type || 'public-key';
      item.transports = c.transports || (c.transports === undefined ? ['internal'] : c.transports);
      const idBuf = ensureUint8(c.id) || (typeof c.id === 'string' ? base64UrlToUint8(c.id) : null);
      if (idBuf) item.id = idBuf;
      else item.id = c.id; // keep as-is if we can't convert (fallback)
      allow.push(item);
    }

    if ((!allow || allow.length === 0) && storedId) {
      const idBuf = ensureUint8(storedId);
      if (idBuf) allow.push({ type: 'public-key', id: idBuf, transports: ['internal'] });
    } else if (storedId && allow.length) {
      try {
        const idBuf = ensureUint8(storedId);
        if (idBuf) {
          let found = false;
          for (const a of allow) {
            const aId = ensureUint8(a.id);
            if (!aId) continue;
            if (aId.length === idBuf.length) {
              let eq = true;
              for (let j = 0; j < aId.length; j++) if (aId[j] !== idBuf[j]) { eq = false; break; }
              if (eq) { found = true; break; }
            }
          }
          if (!found) allow.unshift({ type: 'public-key', id: idBuf, transports: ['internal'] });
        }
      } catch (e) { /* ignore equality errors */ }
    }

    publicKey.allowCredentials = allow;
  } catch (e) {
    console.warn('[tryBiometricWithCachedOptions] allowCredentials normalization failed', e);
    publicKey.allowCredentials = raw.allowCredentials || [];
  }

  if (!publicKey.challenge || !(publicKey.challenge instanceof Uint8Array || publicKey.challenge instanceof ArrayBuffer || (ArrayBuffer.isView(publicKey.challenge) && publicKey.challenge.buffer))) {
    console.warn('[tryBiometricWithCachedOptions] invalid challenge type after conversion', publicKey.challenge);
    return { ok: false, reason: 'bad-challenge', debug: publicKey.challenge };
  }

  window.__cachedAuthOptionsLock = true;
  window.__cachedAuthOptionsLockSince = Date.now();

  try {
    const assertion = await navigator.credentials.get({ publicKey });

try {
  const cdj = assertion.response.clientDataJSON;
  const text = new TextDecoder().decode(
    cdj instanceof ArrayBuffer ? cdj : cdj.buffer ? new Uint8Array(cdj.buffer) : cdj
  );
  const parsed = JSON.parse(text);
  const usedChallenge = parsed.challenge; // base64url string as the browser received it

  if (usedChallenge) {
    const raw = localStorage.getItem('__bioChallengeHistory');
    const hist = raw ? JSON.parse(raw) : [];
    const idx = hist.indexOf(usedChallenge);

    if (idx !== -1) {
      const remaining = hist.filter(c => c !== usedChallenge);
      localStorage.setItem('__bioChallengeHistory', JSON.stringify(remaining));
      console.log('[bio] ✅ Matched + consumed challenge at history index', idx, '— remaining:', remaining.length);
    } else {
      console.warn('[bio] ⚠️ Used challenge not found in local history (may still pass via server candidates)');
    }
  }
} catch (e) {
  console.warn('[bio] Could not parse clientDataJSON for challenge tracking:', e);
}

return { ok: true, assertion };
  } catch (err) {
    console.warn('navigator.credentials.get failed with cached options', err);
    return { ok: false, reason: 'get-failed', error: err };
  } finally {
    setTimeout(() => {
      try { window.__cachedAuthOptionsLock = false; window.__cachedAuthOptionsLockSince = 0; } catch (e) {}
    }, 80);
  }
}

window.tryBiometricWithCachedOptions = tryBiometricWithCachedOptions; // expose for testing/debugging


 (function bindPinBiometricBtn() {
  const bioBtn = document.getElementById('pinBiometricBtn');
  if (!bioBtn) return;

  function isBiometricLoginEnabled() {
    if (!('PublicKeyCredential' in window)) return false;

    const storedCred = localStorage.getItem('credentialId') || 
                       localStorage.getItem('webauthn-cred-id') || 
                       localStorage.getItem('webauthn_cred') || '';
    if (!storedCred) return false;

    const biomKey = (window.__sec_KEYS && window.__sec_KEYS.biom) || 'biometricsEnabled';
    const mainBiomFlag = localStorage.getItem(biomKey);
    if (!(mainBiomFlag === '1' || mainBiomFlag === 'true')) return false;

    const bioLoginKey = (window.__sec_KEYS && window.__sec_KEYS.bioLogin) || 'biometricForLogin';
    const bioLoginFlag = localStorage.getItem(bioLoginKey) || 
                         localStorage.getItem('__sec_bioLogin') || 
                         localStorage.getItem('security_bio_login') || '';
    return ['true', '1', 'yes'].includes(bioLoginFlag.toLowerCase());
  }

  try { 
    bioBtn.style.display = isBiometricLoginEnabled() ? 'inline-flex' : 'none';
  } catch (e) {}

  if (bioBtn.__bound) return;
  bioBtn.__bound = true;

  function bufToB64Url(buf) {
    return (window.toBase64Url ? window.toBase64Url(buf) : (function(b){
      const bytes = new Uint8Array(b);
      let str = '';
      for (let i=0;i<bytes.length;i++) str += String.fromCharCode(bytes[i]);
      return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    })(buf));
  }

  bioBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    console.debug('[reauth] pinBiometricBtn clicked');

    if (!isBiometricLoginEnabled()) {
      console.warn('[reauth] biometric not enabled at click');
      try { safeCall(notify, 'Biometric login not available – use PIN', 'warn', reauthAlert, reauthAlertMsg); } catch(e){}
      return;
    }

    showLoader();
    try { safeCall(notify, 'Touch your fingerprint sensor...', 'info', reauthAlert, reauthAlertMsg); } catch(e){}

    try {
      if (typeof openPinModalForReauth === 'function') safeCall(openPinModalForReauth);
      else reauthModal?.classList.remove('hidden');
    } catch(e){}

    try {
      if (typeof enableReauthInputs === 'function') enableReauthInputs();
      else {
        const inputs = Array.from(document.querySelectorAll('.reauthpin-inputs input'));
        inputs.forEach(i => i.disabled = false);
      }
    } catch(e){}

    const cachedAttempt = await tryBiometricWithCachedOptions();

    if (!cachedAttempt.ok) {
      hideLoader();
      try { clearReauthInputs?.(); } catch(e) {
        const inputs = Array.from(document.querySelectorAll('.reauthpin-inputs input'));
        inputs.forEach(i => { i.value = ''; i.classList.remove('filled'); });
      }
      try { safeCall(notify, 'Biometric challenge expired – please try again or use PIN.', 'info', reauthAlert, reauthAlertMsg); } catch(e){}
      try { getReauthInputs()[0]?.focus(); } catch(e){}
      return;
    }

    try { simulatePinEntry?.({ stagger:0, expectedCount:4, fillAll:true }); } catch(e){}

    const assertion = cachedAttempt.assertion;
    const payload = {
      id: assertion.id,
      rawId: bufToB64Url(assertion.rawId),
      type: assertion.type,
      response: {
        authenticatorData: bufToB64Url(assertion.response.authenticatorData),
        clientDataJSON: bufToB64Url(assertion.response.clientDataJSON),
        signature: bufToB64Url(assertion.response.signature),
        userHandle: assertion.response.userHandle ? bufToB64Url(assertion.response.userHandle) : null
      }
    };

    let userId = null;
    try {
      const sessionData = await safeCall(getSession);
      userId = sessionData?.user?.uid || sessionData?.user?.id || null;
    } catch(e){ console.warn('[reauth] getSession failed', e); }

    let verifyRes;
    try {
      verifyRes = await fetch((window.__SEC_API_BASE || API_BASE || '') + '/webauthn/auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId, action: 'reauth' })
      });
    } catch (err) {
      hideLoader();
      try { clearReauthInputs?.(); } catch(e){}
      try { safeCall(notify, 'Verification failed – network error. Please try again.', 'error', reauthAlert, reauthAlertMsg); } catch(e){}
      return;
    }

    if (!verifyRes?.ok) {
      hideLoader();
      try { clearReauthInputs?.(); } catch(e){}
      try {
        const errText = await verifyRes.text().catch(()=>verifyRes.statusText||`HTTP ${verifyRes.status}`);
        const mismatchDetected = /no stored challenge|challenge.*mismatch|unexpected.*challenge|invalid.*challenge/i.test(errText);
        if (mismatchDetected) safeCall(notify, 'Biometric challenge expired – please try again or use PIN.', 'warning', reauthAlert, reauthAlertMsg);
        else safeCall(notify, `Biometric verification failed: ${errText || 'Server error'}`, 'error', reauthAlert, reauthAlertMsg);
      } catch(e){}
      return;
    }

    let verifyData;
    try { verifyData = await verifyRes.json().catch(()=>({})); } catch(e){ verifyData = {}; }

    if (verifyData?.verified) {
      console.log('[reauth] Biometrics verification successful');
      try { safeCall(__sec_getCurrentUser); } catch(e){}
      try { onSuccessfulReauth?.(); } catch(e){ console.warn('[reauth] post-verification error', e); }
      finally { hideLoader(); }
      return;
    } else {
      hideLoader();
      try { clearReauthInputs?.(); } catch(e){}
      try { safeCall(notify, 'Biometric verification failed', 'error', reauthAlert, reauthAlertMsg); } catch(e){}
      return;
    }
  });

  window.addEventListener('storage', (e) => {
    if (['biometricsEnabled','biometricForLogin','credentialId'].includes(e.key)) {
      try { bioBtn.style.display = isBiometricLoginEnabled() ? 'inline-flex' : 'none'; } catch(e){}
    }
  });
  document.addEventListener('fg:switch-changed', (e) => {
    if (['bioLoginSwitch', 'biometricsSwitch'].includes(e.detail?.id)) {
      try { bioBtn.style.display = isBiometricLoginEnabled() ? 'inline-flex' : 'none'; } catch(e) {}
    }
  });
})();




  try {
    const displayName = user.username || (user.fullName || '').split(' ')[0] || 'User';
    if (reauthName) reauthName.textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    const profilePicture = user.profilePicture || localStorage.getItem('profilePicture') || '';
    if (reauthAvatar) {
      if (isValidImageSource(profilePicture)) {
        reauthAvatar.src = `${profilePicture}?v=${Date.now()}`;
        reauthAvatar.style.display = '';
      } else {
        reauthAvatar.style.display = 'none';
      }
    }
  } catch (e) { console.warn('avatar/name set failed', e); }

const reauthStatus = await shouldReauth(context);
if (!reauthStatus.needsReauth) {
  console.log('[DEBUG] No reauth needed; proceeding with success flow');
  try {
    if (typeof onSuccessfulReauth === 'function') {
      onSuccessfulReauth(); // no await — closes instantly, cleanup in background
    }
    console.log('[DEBUG] Reauth modal hidden (no reauth needed)');
  } catch (err) {
    console.warn('[reauth] Post-reauth check success error', err);
    if (typeof showBanner === 'function') {
      showBanner('Authentication completed, but an internal error occurred. Please refresh if issues persist.');
    }
  }
  return true;
}



  try {
    if (biometricView) biometricView.style.display = 'none';
    if (pinView) pinView.style.display = 'block';
    if (switchToBiometric) switchToBiometric.style.display = 'none';
    if (switchToPin) switchToPin.style.display = 'none';
  } catch (e) { console.warn('force pin view failed', e); }

  try { typeof resumeLockoutIfAny === 'function' && resumeLockoutIfAny(); } catch (e){}

  try {
    const inputs = getReauthInputs();
    if (typeof bindPinInputs === 'function') {
      safeCall(bindPinInputs, inputs, pinView, reauthModal, reauthAlert, reauthAlertMsg);
    }
    if (pinView && !pinView.__reauthSubmitBound) {
      pinView.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const inputs = getReauthInputs();
        const pin = inputs.map(i => i.value).join('');
        if (!/^\d{4}$/.test(pin)) {
          safeCall(notify, 'Invalid PIN', 'error', reauthAlert, reauthAlertMsg);
          return;
        }
        const uidInfo = await safeCall(__sec_getCurrentUser) || {};
        if (!uidInfo || !uidInfo.user || !uidInfo.user.uid) {
          safeCall(notify, 'Session error', 'error', reauthAlert, reauthAlertMsg);
          setTimeout(() => window.location.href = '/', 1500);
          return;
        }
        await safeCall(reAuthenticateWithPin, uidInfo.user.uid, pin, async (success) => {
  if (success) {
    resetReauthInputs();
    safeCall(__sec_getCurrentUser);
    try { await Promise.resolve(onSuccessfulReauth && onSuccessfulReauth()); } catch (err) {
      console.warn('[reauth] onSuccessfulReauth failed', err);
    }
    await guardedHideReauthModal();
  } else {
    resetReauthInputs();
    safeCall(notify, 'PIN authentication failed', 'error', reauthAlert, reauthAlertMsg);
  }
});


      });
      pinView.__reauthSubmitBound = true;
    }
  } catch (e) { console.error('PIN bind error', e); }

  try {
    if (deleteReauthKey && !deleteReauthKey.__bound) {
      deleteReauthKey.addEventListener('click', () => {
        const inputs = getReauthInputs();
        for (let i = inputs.length - 1; i >= 0; i--) {
          if (inputs[i].value) {
            inputs[i].value = '';
            const prev = inputs[i - 1];
            if (prev && prev.focus) prev.focus();
            else inputs[i].focus();
            break;
          }
        }
      });
      deleteReauthKey.__bound = true;
    }
  } catch (e) { console.warn('delete key bind failed', e); }

  try {
    if (verifyBiometricBtn && !verifyBiometricBtn.__bound) {
      attachPrefetchOnGesture(verifyBiometricBtn);
      verifyBiometricBtn.addEventListener('click', async () => {
        const cachedAttempt = await tryBiometricWithCachedOptions();
        if (cachedAttempt.ok) {
          bioVerifyAndFinalize(cachedAttempt.assertion).catch(err => {
            console.error('bioVerifyAndFinalize error', err);
            safeCall(notify, 'Biometric verification failed', 'error');
          });
          return;
        }
        window.prefetchAuthOptions && window.prefetchAuthOptions();
        safeCall(notify, 'Preparing biometric auth — try again (or use PIN)', 'info');
      });
      verifyBiometricBtn.__bound = true;
      console.debug('verifyBiometricBtn bound');
    }
  } catch (e) { console.warn('verifyBiometricBtn bind failed', e); }

async function bioVerifyAndFinalize(assertion) {
  try {
    function bufToB64Url(buf) {
      return (window.toBase64Url ? window.toBase64Url(buf) : (function(b){
        var bytes = new Uint8Array(b);
        var str = '';
        for (var i=0;i<bytes.length;i++) str += String.fromCharCode(bytes[i]);
        return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      })(buf));
    }

    const buildPayloadFromAssertion = (a) => ({
      id: a.id,
      rawId: bufToB64Url(a.rawId),
      type: a.type,
      response: {
        authenticatorData: bufToB64Url(a.response.authenticatorData),
        clientDataJSON: bufToB64Url(a.response.clientDataJSON),
        signature: bufToB64Url(a.response.signature),
        userHandle: a.response.userHandle ? bufToB64Url(a.response.userHandle) : null
      }
    });

    async function fetchFreshOptions(uid, storedId) {
      try {
        const res = await fetch((window.__SEC_API_BASE || API_BASE) + '/webauthn/auth/options', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({ userId: uid, credentialId: storedId, context: 'reauth' })
        });
        if (!res.ok) {
          console.warn('[webauthn] fresh options fetch failed', res.status);
          return null;
        }
        return await res.json();
      } catch (err) {
        console.warn('[webauthn] fresh options fetch error', err);
        return null;
      }
    }

    function buildPublicKeyFromOpts(freshOpts) {
      const publicKey = {};
      if ('rpId' in freshOpts) publicKey.rpId = freshOpts.rpId;
      if ('userVerification' in freshOpts) publicKey.userVerification = freshOpts.userVerification;
      if ('timeout' in freshOpts) publicKey.timeout = freshOpts.timeout;
      if ('extensions' in freshOpts) publicKey.extensions = freshOpts.extensions;

      let rawCh = freshOpts.challenge || freshOpts.challengeBase64 || freshOpts.challengeBytes || freshOpts.challenge_raw || freshOpts.challengeValue || null;
      const chU8 = ensureUint8FromMaybeObject(rawCh) || (typeof rawCh === 'string' ? (function(s){
        try {
          if (!s) return null;
          let t = s.replace(/-/g,'+').replace(/_/g,'/');
          while (t.length % 4) t += '=';
          const bin = atob(t);
          const out = new Uint8Array(bin.length);
          for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
          return out;
        } catch(e) { return null; }
      })(rawCh) : null);
      if (!chU8) return null;
      publicKey.challenge = chU8;

      const rawAllow = Array.isArray(freshOpts.allowCredentials) ? freshOpts.allowCredentials : (freshOpts.allow || []);
      const allow = [];
      for (let c of rawAllow) {
        if (!c) continue;
        const item = { type: c.type || 'public-key', transports: c.transports || ['internal'] };
        const idU8 = ensureUint8FromMaybeObject(c.id) || (typeof c.id === 'string' ? (function(s){
          try {
            let t = s.replace(/-/g,'+').replace(/_/g,'/');
            while (t.length % 4) t += '=';
            const bin = atob(t);
            const out = new Uint8Array(bin.length);
            for (let j=0;j<bin.length;j++) out[j] = bin.charCodeAt(j);
            return out;
          } catch(e) { return null; }
        })(c.id) : null);
        if (idU8) item.id = idU8;
        else item.id = c.id;
        allow.push(item);
      }
      publicKey.allowCredentials = allow;
      return publicKey;
    }

    async function tryConditionalAuth(freshOpts) {
      try {
        if (!('credentials' in navigator) || typeof navigator.credentials.get !== 'function') {
          return { ok: false, reason: 'no-credentials-api' };
        }
        const publicKey = buildPublicKeyFromOpts(freshOpts);
        if (!publicKey) return { ok: false, reason: 'bad-publickey' };

        const getOpts = { publicKey, mediation: 'conditional' };
        try {
          const res = await navigator.credentials.get(getOpts);
          if (!res) return { ok: false, reason: 'no-credential-returned' };
          return { ok: true, assertion: res, conditional: true };
        } catch (err) {
          console.debug('[webauthn] conditional mediation failed or unsupported', err && err.message);
          return { ok: false, reason: 'conditional-failed', error: err };
        }
      } catch (e) {
        console.warn('[webauthn] tryConditionalAuth error', e);
        return { ok: false, reason: 'exception', error: e };
      }
    }

    async function doImmediateGetFromFreshOpts(freshOpts) {
      try {
        const publicKey = buildPublicKeyFromOpts(freshOpts);
        if (!publicKey) return { ok: false, reason: 'bad-publickey' };

        window.__cachedAuthOptionsLock = true;
        window.__cachedAuthOptionsLockSince = Date.now();

        try {
          const newAssertion = await navigator.credentials.get({ publicKey });
          return { ok: true, assertion: newAssertion };
        } finally {
          setTimeout(() => {
            try { window.__cachedAuthOptionsLock = false; window.__cachedAuthOptionsLockSince = 0; } catch (e) {}
          }, 80);
        }
      } catch (err) {
        console.warn('[webauthn] immediate navigator.credentials.get failed', err);
        return { ok: false, error: err };
      }
    }

    const session = await safeCall(getSession);
    const uid = session?.user?.uid || session?.user?.id || null;
    if (!uid) {
      console.warn('[bio] no session uid found before verify');
      safeCall(notify, 'Unable to find your session. Please try again.', 'error');
      return false;
    }
    const storedId = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id') || null;
    if (!storedId) {
      console.warn('[bio] no stored credentialId');
      safeCall(notify, 'No biometric credential found. Please use PIN.', 'error');
      return false;
    }

    let currentPayload = buildPayloadFromAssertion(assertion);

    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;

      let verifyRes;
      try {
        verifyRes = await withLoader(async () => {
          showSlideNotification('Verifying fingerprint — logging you in...', 'info');
          return await fetch((window.__SEC_API_BASE || API_BASE) + '/webauthn/auth/verify', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...currentPayload, userId: uid, action: 'reauth' })
          });
        });
      } catch (err) {
        console.error('[bio] network/withLoader error during verify', err);
        safeCall(notify, 'Verification failed — network error. Please try again.', 'error');
        return false;
      }

      if (!verifyRes) {
        console.error('[bio] verifyRes falsy after fetch');
        safeCall(notify, 'Verification failed — no response from server.', 'error');
        return false;
      }

      if (!verifyRes.ok) {
        const errText = await verifyRes.text().catch(() => verifyRes.statusText || `HTTP ${verifyRes.status}`);
        console.warn('[bio] server responded non-OK:', verifyRes.status, errText);

        const mismatchDetected = /no stored challenge|challenge.*mismatch|unexpected.*challenge|invalid.*challenge/i.test(errText);

        if (mismatchDetected && attempt < maxAttempts) {
          console.debug('[bio] server reported challenge mismatch; attempting conditional (silent) retry if available');

          const freshOpts = await fetchFreshOptions(uid, storedId);
          if (!freshOpts) {
            console.warn('[webauthn] failed to fetch fresh options for retry');
            safeCall(notify, 'Unable to refresh biometric challenge. Please try again.', 'error');
            return false;
          }

          const cond = await tryConditionalAuth(freshOpts);
          if (cond.ok && cond.assertion) {
            console.debug('[webauthn] conditional mediation supplied assertion; retrying verify');
            currentPayload = buildPayloadFromAssertion(cond.assertion);
            continue;
          }

          safeCall(notify, 'Please touch your fingerprint sensor again to retry biometric authentication.', 'info');

          /*
          const immediateResult = await doImmediateGetFromFreshOpts(freshOpts);
          if (immediateResult.ok && immediateResult.assertion) {
            currentPayload = buildPayloadFromAssertion(immediateResult.assertion);
            continue; // retry verify
          } else {
            safeCall(notify, 'Biometric authentication failed — please try again or use PIN.', 'error');
            return false;
          }
          */

          return false;
        }

        safeCall(notify, `Biometric verification failed: ${errText || 'Server error'}`, 'error');
        return false;
      }

      let verifyData;
      try {
        verifyData = await verifyRes.json();
      } catch (err) {
        console.warn('[bio] failed to parse verify JSON', err);
        safeCall(notify, 'Verification failed — invalid server response.', 'error');
        return false;
      }

      if (verifyData?.verified) {
        console.log('[DEBUG] Biometrics verification successful in bioVerifyAndFinalize');
        try {
          if (window.fgReauth && typeof window.fgReauth.completeReauth === 'function') {
            try {
              await window.fgReauth.completeReauth();
            } catch (err) {
              console.warn('[bio] fgReauth.completeReauth failed, proceeding to restore UI', err);
            }
          }

          try { safeCall(__sec_getCurrentUser); } catch (e) { /* ignore */ }

          if (typeof onSuccessfulReauth === 'function') {
            onSuccessfulReauth(); // no await — closes instantly, cleanup in background
          }
          console.log('[DEBUG] Reauth modal hidden after successful biometrics verification in bioVerifyAndFinalize');

          try {
            if (typeof hideLoader === 'function') hideLoader(true);
          } catch (e) { /* ignore */ }

          return true;
        } catch (err) {
          try { setReauthActive(false); } catch (e) {}
          try { if (typeof hideLoader === 'function') hideLoader(true); } catch (e) {}
          console.error('[bio] unexpected error in verify success path', err);
          if (typeof safeCall === 'function' && typeof notify === 'function') {
            safeCall(notify, 'Error completing authentication. Please try again.', 'error');
          }
          return false;
        }
      } else {
        console.warn('[bio] verify returned ok but not verified', verifyData);
        safeCall(notify, 'Biometric verification failed.', 'error');
        return false;
      }
    }

    console.warn('[bio] max retry attempts reached');
    try { invalidateAuthOptionsCache && invalidateAuthOptionsCache(); window.prefetchAuthOptions && window.prefetchAuthOptions(); } catch(e) {}
    safeCall(notify, 'Biometric authentication failed — please try again or use PIN.', 'error');
    return false;

  } catch (err) {
    console.error('[bio] bioVerifyAndFinalize error', err);
    safeCall(notify, 'Biometric verification error.', 'error');
    return false;
  }
}




  try { if (switchToPin) switchToPin.style.display = 'none'; if (switchToBiometric) switchToBiometric.style.display = 'none'; } catch(e){}

try {
  [logoutLinkBio, logoutLinkPin].forEach((link) => {
    if (!link || link.__bound) return;

    link.addEventListener('click', async (ev) => {
      ev.preventDefault();
      
      if (link.classList.contains('logging-out')) return;
      link.classList.add('logging-out');
      
      const originalText = link.textContent;
      link.textContent = 'Logging out...';
      
      showLoader();

      try {
        await fullClientLogout();
      } catch (err) {
        console.error('[logout link] Full logout failed:', err);
        window.location.replace('/');
      } finally {
        try {
          hideLoader();
          link.classList.remove('logging-out');
          link.textContent = originalText;
        } catch (_) {}
      }
    });
    
    link.__bound = true;
  });

  [forgetPinLinkBio, forgetPinLinkPin].forEach((link) => {
    if (!link || link.__bound) return;

    link.addEventListener('click', async (ev) => {
      ev.preventDefault();
      
      if (link.classList.contains('processing')) return;
      link.classList.add('processing');
      
      const originalText = link.textContent;
      link.textContent = 'Processing...';

      try {
        try {
          localStorage.removeItem('reauthPending');
        } catch (_) {}

        const resolveEmail = async () => {
          try {
            if (typeof currentEmail === 'string' && currentEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
              return currentEmail;
            }
          } catch (_) {}

          try {
            if (window.currentUser?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(window.currentUser.email)) {
              return window.currentUser.email;
            }
          } catch (_) {}

          try {
            if (window.__SERVER_USER_DATA__?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(window.__SERVER_USER_DATA__.email)) {
              return window.__SERVER_USER_DATA__.email;
            }
          } catch (_) {}

          try {
            const sources = [
              localStorage.getItem('userEmail'),
              localStorage.getItem('email'),
              localStorage.getItem('currentEmail')
            ];
            
            try {
              const loginState = JSON.parse(localStorage.getItem('loginState') || '{}');
              if (loginState.email) sources.push(loginState.email);
            } catch (_) {}

            for (const email of sources) {
              if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return email;
              }
            }
          } catch (_) {}

          try {
            const base = (window.API_BASE || window.__SEC_API_BASE || 'https://api.flexgig.com.ng').replace(/\/$/, '');
            const sessionResp = await fetch(`${base}/api/session`, {
              method: 'GET',
              credentials: 'include',
              headers: { 'Accept': 'application/json' }
            });

            if (sessionResp.ok) {
              const sessionData = await sessionResp.json();
              if (sessionData.user?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sessionData.user.email)) {
                return sessionData.user.email;
              }
            }
          } catch (_) {}

          return '';
        };

        let emailToUse = await resolveEmail();

        if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
          const promptMsg = 'Enter your account email to receive OTP for PIN reset:';
          const userInput = prompt(promptMsg);
          
          if (!userInput) {
            return;
          }

          const trimmedInput = userInput.trim().toLowerCase();
          
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedInput)) {
            if (typeof notify === 'function') {
              notify('warn', 'Please enter a valid email address', { title: 'Invalid Email' });
            } else {
              alert('Please enter a valid email address');
            }
            return;
          }
          
          emailToUse = trimmedInput;
        }

        console.log('[forgetPin] Sending OTP to:', emailToUse);

        if (window.__rp_handlers?.onTrigger) {
          try {
            await window.__rp_handlers.onTrigger(ev);
            console.log('[forgetPin] Handler onTrigger executed successfully');
            return;
          } catch (e) {
            console.debug('[forgetPin] Handler onTrigger failed, falling back:', e);
          }
        }

        if (window.__rp_handlers?.onTriggerClicked) {
          try {
            await window.__rp_handlers.onTriggerClicked(ev);
            console.log('[forgetPin] Handler onTriggerClicked executed successfully');
            return;
          } catch (e) {
            console.debug('[forgetPin] Handler onTriggerClicked failed, falling back:', e);
          }
        }

        const base = (window.API_BASE || window.__SEC_API_BASE || 'https://api.flexgig.com.ng').replace(/\/$/, '');
        
        const resp = await fetch(`${base}/auth/resend-otp`, {
          method: 'POST',
          credentials: 'include',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email: emailToUse })
        });

        let body;
        try {
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            body = await resp.json();
          } else {
            body = await resp.text();
          }
        } catch (parseErr) {
          console.error('[forgetPin] Response parse error:', parseErr);
          body = null;
        }

        if (!resp.ok) {
          const errorMsg = (body?.error?.message || body?.message || body || `Failed to send OTP (${resp.status})`);
          console.error('[forgetPin] OTP send failed:', errorMsg);
          
          if (typeof notify === 'function') {
            notify('error', errorMsg, { title: 'Failed to Send OTP' });
          } else {
            alert(`Failed to send OTP: ${errorMsg}`);
          }
          return;
        }

        console.log('[forgetPin] OTP sent successfully');

        let modalOpened = false;

        try {
          if (window.ModalManager?.openModal) {
            window.ModalManager.openModal('resetPinModal');
            modalOpened = true;
            console.log('[forgetPin] Modal opened via ModalManager');
          }
        } catch (e) {
          console.debug('[forgetPin] ModalManager.openModal failed:', e);
        }

        if (!modalOpened) {
          try {
            const modal = document.getElementById('resetPinModal');
            if (modal) {
              modal.classList.remove('hidden');
              modal.style.display = 'flex';
              modal.setAttribute('aria-hidden', 'false');
              
              modal.style.zIndex = '9999';
              
              modalOpened = true;
              console.log('[forgetPin] Modal opened via DOM manipulation');
            }
          } catch (e) {
            console.debug('[forgetPin] DOM modal open failed:', e);
          }
        }

        if (!modalOpened) {
          try {
            const modal = document.getElementById('resetPinModal');
            if (modal && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
              const bsModal = new bootstrap.Modal(modal);
              bsModal.show();
              modalOpened = true;
              console.log('[forgetPin] Modal opened via Bootstrap');
            }
          } catch (e) {
            console.debug('[forgetPin] Bootstrap modal open failed:', e);
          }
        }

        if (modalOpened) {
          try {
            if (window.__rp_handlers?.wire) {
              window.__rp_handlers.wire();
              console.log('[forgetPin] Modal handlers wired');
            }
          } catch (e) {
            console.debug('[forgetPin] Modal wire failed:', e);
          }
        } else {
          console.warn('[forgetPin] Failed to open modal - no method succeeded');
        }

        if (typeof notify === 'function') {
          notify('success', `OTP sent to ${emailToUse}. Please check your email.`, { 
            title: 'OTP Sent',
            duration: 5000 
          });
        } else {
          alert(`OTP sent to ${emailToUse}. Please check your email.`);
        }

      } catch (e) {
        console.error('[forgetPin] Unexpected error:', e);
        
        if (typeof notify === 'function') {
          notify('error', e.message || 'Failed to start PIN reset flow', { 
            title: 'Error' 
          });
        } else {
          alert(e.message || 'Failed to start PIN reset flow');
        }
      } finally {
        try {
          link.classList.remove('processing');
          link.textContent = originalText;
        } catch (_) {}
      }
    });
    
    link.__bound = true;
  });

} catch (e) {
  console.error('[logout/forget setup] Fatal error:', e);
}

window.performLogout = async function() {
  try {
    await logoutFlow();
  } catch (e) {
    console.error('[performLogout] Error:', e);
    window.location.replace('/');
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    try {
      window.__rp_reset_token = null;
    } catch (_) {}
  }
});


if (!pinView || pinView.__keypadBound) {
  console.log('Skipping keypad init (already bound or no pinView)');
} else {
  try { initReauthKeypad(); } catch (e) { console.warn('initReauthKeypad failed', e); }
}

try {
  if (!show) {
  if (isCanonicalReauthPending()) {
    console.debug('initReauthModal: skip hide because canonical reauth pending');
    return true;
  }

  const _rm = (typeof document !== 'undefined') ? document.getElementById('reauthModal') : null;
  try { if (_rm) _rm.classList.add('hidden'); } catch (e) {}

  reauthModalOpen = false;

  const _pm = (typeof document !== 'undefined') ? document.getElementById('promptModal') : null;
  try { if (_pm) _pm.classList.add('hidden'); } catch (e) {}

  return true;
}




    try { localStorage.setItem('reauthPending', Date.now().toString()); } catch(e){}

    if (reauthModal) {
      reauthModal.classList.remove('hidden');
      reauthModalOpen = true;
      try { if (idleTimeout) { clearTimeout(idleTimeout); idleTimeout = null; } } catch(e){}
      reauthModal.setAttribute('aria-modal', 'true');
      reauthModal.setAttribute('role', 'dialog');
      const firstInput = getReauthInputs()[0];
      if (firstInput && firstInput.focus) try { firstInput.focus(); } catch(e){}
      try { trapFocus && trapFocus(reauthModal); } catch(e){}
    }
  } catch (e) { console.warn('modal visibility handling failed', e); }

  console.debug('initReauthModal completed');
}



  /* -----------------------
     Focus Trap for Modals (new!)
     - Prevents tab out of modal
     ----------------------- */
  function trapFocus(modal) {
    console.log('trapFocus called for modal');
    if (!modal) {
      console.log('No modal for trapFocus');
      return;
    }
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    console.log('Focusable elements in trap:', focusable.length);

    modal.addEventListener('keydown', (ev) => {
      if (ev.key === 'Tab') {
        if (ev.shiftKey) {
          if (document.activeElement === first) {
            ev.preventDefault();
            last.focus();
            console.log('Shift-tab wrapped to last');
          }
        } else {
          if (document.activeElement === last) {
            ev.preventDefault();
            first.focus();
            console.log('Tab wrapped to first');
          }
        }
      }
    });
  }

/* -----------------------
   Enhanced registerBiometrics (replace existing)
   - Uses server options (server.js already changed)
   - Defensive client-side enforcement (platform + required UV)
   - Persists credentialId, biometricsEnabled, biometricForLogin, biometricForTx
----------------------- */
/* -----------------------
   Register Biometrics (debug)
   ----------------------- */
function base64UrlToBuffer(base64Url) {
  let base64 = (base64Url || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  const str = atob(base64);
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
  return buf.buffer;
}
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i] & 0xff);
  let b64 = btoa(binary);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function persistCredentialId(id) {
  try {
    console.log('[CRED DEBUG] persistCredentialId: Attempting to store credentialId ->', id);
    localStorage.setItem('credentialId', id);
    sessionStorage.setItem('credentialId', id);
    document.cookie = `fg_credentialId=${encodeURIComponent(id)};path=/;max-age=${60*60};SameSite=Lax`;
    const reads = {
      local: (() => { try { return localStorage.getItem('credentialId'); } catch(e){return `ERR:${e.message}`;} })(),
      session: (() => { try { return sessionStorage.getItem('credentialId'); } catch(e){return `ERR:${e.message}`;} })(),
      cookie: (() => { try { return (document.cookie.match(/(?:^|;\s*)fg_credentialId=([^;]+)/)||[])[1] || null } catch(e){return `ERR:${e.message}`;} })()
    };
    console.log('[CRED DEBUG] persistCredentialId: reads after write:', reads);
    try {
      console.assert(reads.local === id, 'localStorage did not persist credentialId!');
      console.assert(reads.session === id, 'sessionStorage did not persist credentialId!');
    } catch (assertErr) {
      console.warn('[CRED DEBUG] persistCredentialId: assertion failed (expected persistence):', assertErr);
    }
    return reads;
  } catch (err) {
    console.error('[CRED DEBUG] persistCredentialId: Unexpected storage error', err);
    return { error: err.message };
  }
}

function dumpCredentialStorage() {
  try {
    const local = (() => { try { return localStorage.getItem('credentialId'); } catch(e){return `ERR:${e.message}`;} })();
    const session = (() => { try { return sessionStorage.getItem('credentialId'); } catch(e){return `ERR:${e.message}`;} })();
    const cookie = (() => { try { return (document.cookie.match(/(?:^|;\s*)fg_credentialId=([^;]+)/)||[])[1] || null } catch(e){return `ERR:${e.message}`;} })();
    console.log('[CRED DEBUG] dumpCredentialStorage ->', { local, session, cookie, origin: location.origin, host: location.host, time: new Date().toISOString() });
    return { local, session, cookie };
  } catch (err) {
    console.error('[CRED DEBUG] dumpCredentialStorage error', err);
    return null;
  }
}

async function registerBiometrics() {
  console.log('%c[registerBiometrics] CALLED', 'color:#0ff;font-weight:bold');
  return withLoader(async () => {
    try {
      if (!('PublicKeyCredential' in window)) throw new Error('WebAuthn not supported by this browser');

      console.log('[registerBiometrics] fetching session for UID...');
      const session = await safeCall(getSession);
      const uid = session?.user?.id || session?.user?.uid;
      console.log('[registerBiometrics] session =>', session ? { uid: session.user?.id || session.user?.uid, email: session.user?.email } : null);
      if (!uid) throw new Error('No user id available (session empty)');

      const apiBase = window.__SEC_API_BASE || '';
      console.log('[registerBiometrics] POST ->', `${apiBase}/webauthn/register/options`, 'body:', { userId: uid });

      const optRes = await fetch(`${apiBase}/webauthn/register/options`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });

      console.log('[registerBiometrics] Options fetch status:', optRes.status, optRes.statusText);
      const optText = await optRes.text();
      let options;
      try {
        options = JSON.parse(optText);
      } catch (e) {
        console.error('[registerBiometrics] Failed to parse options JSON:', optText);
        throw new Error('Invalid options JSON from server');
      }
      console.log('[registerBiometrics] RAW options:', options);

      if (!options.challenge) throw new Error('No challenge returned from server');

      options.challenge = base64UrlToBuffer(options.challenge);
      if (options.user && options.user.id) {
        try {
          options.user.id = base64UrlToBuffer(options.user.id);
        } catch (e) {
          console.warn('[registerBiometrics] user.id conversion failed, leaving as-is', e);
        }
      }
      if (Array.isArray(options.excludeCredentials)) {
        console.log('[registerBiometrics] excludeCredentials count', options.excludeCredentials.length);
        options.excludeCredentials = options.excludeCredentials.map(c => ({ ...c, id: base64UrlToBuffer(c.id) }));
      }
      options.timeout = options.timeout || 60000;
      console.log('[registerBiometrics] Final publicKey options prepared (challenge bytes, excludeCount):', {
        challengeLen: options.challenge ? options.challenge.byteLength : null,
        excludeCount: Array.isArray(options.excludeCredentials) ? options.excludeCredentials.length : 0,
        authenticatorSelection: options.authenticatorSelection || null
      });

      console.log('%c[registerBiometrics] calling navigator.credentials.create()', 'color:yellow');
      const credential = await navigator.credentials.create({ publicKey: options });
      console.log('[registerBiometrics] navigator.credentials.create() returned:', credential);
      if (!credential) throw new Error('navigator.credentials.create() returned null');

      const credToSend = {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: bufferToBase64Url(credential.response.attestationObject)
        },
        transports: credential.response.getTransports ? credential.response.getTransports() : []
      };
      console.log('[registerBiometrics] credToSend (sanitized):', {
        id: credToSend.id,
        rawIdLen: credToSend.rawId.length,
        transports: credToSend.transports
      });

      console.log('[registerBiometrics] POST ->', `${apiBase}/webauthn/register/verify`);
      const verifyRes = await fetch(`${apiBase}/webauthn/register/verify`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, credential: credToSend })
      });

      console.log('[registerBiometrics] Verify response status:', verifyRes.status);
      const verifyText = await verifyRes.text();
      let verifyJson;
      try {
        verifyJson = JSON.parse(verifyText);
      } catch (e) {
        console.error('[registerBiometrics] Failed to parse verify JSON:', verifyText);
        throw new Error('Invalid verify response from server');
      }
      console.log('[registerBiometrics] Verify server result:', verifyJson);

      if (verifyJson && verifyJson.credentialId) {
        const id = verifyJson.credentialId;
        const reads = persistCredentialId(id);
        console.log('%c[registerBiometrics] STORED credentialId (server gave):', 'color:lime', id, 'readsAfter:', reads);
      } else {
        console.warn('[registerBiometrics] Server did not return credentialId');
      }

      restoreBiometricUI();

      safeCall(notify, 'Biometric registration successful!', 'success');


      console.log('%c[registerBiometrics] DONE', 'color:lime');
      return { success: true, result: verifyJson };
    } catch (err) {
      console.error('%c[registerBiometrics] ERROR:', 'color:red', err);
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        return { success: false, cancelled: true, error: err.message };
      }
      safeCall(notify, `Registration failed: ${err.message || err}`, 'error');
      return { success: false, error: err.message || String(err) };
    }
  });
}

window.registerBiometrics = window.registerBiometrics || registerBiometrics;


/* -----------------------
   Disable Biometrics (new!)
   - Call from settings: __reauth.disableBiometrics()
   - Revokes server-side, clears local
   ----------------------- */

async function disableBiometrics() {
  console.log('disableBiometrics (optimistic update) called');

  try {
    localStorage.removeItem('credentialId');
    localStorage.removeItem('webauthn-cred-id');
    localStorage.setItem('biometricForLogin', 'false');
    localStorage.setItem('biometricForTx', 'false');

    try {
      var bioBtn = document.getElementById('bioBtn') || document.querySelector('.biometric-button');
      if (bioBtn) bioBtn.style.display = 'none';
    } catch (e) { /* ignore UI errors */ }

    safeCall(notify, 'Biometric disabled locally — revoking on server...', 'info');
  } catch (e) {
    console.warn('Local clear failed', e);
  }

  (async function(){
    try {
      var session = await safeCall(getSession);
      var uid = session && (session.user && (session.user.id || session.user.uid));
      if (!uid) {
        safeCall(notify, 'Could not revoke on server: missing session', 'error');
        return;
      }

      var apiBase = window.__SEC_API_BASE || API_BASE || '';

      var res = await fetch(apiBase + '/webauthn/authenticators/' + encodeURIComponent(uid) + '/revoke', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: null })
      });

      if (!res.ok) {
        var txt = await res.text();
        console.error('[disableBiometrics] revoke failed', txt);
        safeCall(notify, 'Server revoke failed: ' + (txt || res.statusText), 'error');
        return;
      }

      var data = await res.json();
      safeCall(notify, 'Biometric revoked on server', 'success');
      restoreBiometricUI();
      console.log('[disableBiometrics] revoke response', data);
    } catch (err) {
      console.error('[disableBiometrics] background revoke error', err);
      safeCall(notify, 'Server revoke failed (network)', 'error');
    }
  })();

  return { success: true };
}

window.disableBiometrics = window.disableBiometrics || disableBiometrics;


/* -----------------------
   bindBiometricSettings for role="switch" buttons
   Call: bindBiometricSettings({
     parentSelector:'#biometricsSwitch',
     childLoginSelector:'#bioLoginSwitch',
     childTxSelector:'#bioTxSwitch',
     optionsContainerSelector:'#biometricsOptions'
   });
----------------------- */
function bindBiometricSettings({
  parentSelector = '#biometricsSwitch',
  childLoginSelector = '#bioLoginSwitch',
  childTxSelector = '#bioTxSwitch',
  optionsContainerSelector = '#biometricsOptions'
} = {}) {
  const parent = document.querySelector(parentSelector);
  const childLogin = document.querySelector(childLoginSelector);
  const childTx = document.querySelector(childTxSelector);
  const optionsContainer = document.querySelector(optionsContainerSelector);

  if (!parent || !childLogin || !childTx || !optionsContainer) {
    console.warn('Biometric elements not found');
    return null;
  }

  function setOptionsVisible(visible) {
    optionsContainer.style.display = visible ? 'block' : 'none';
  }

  function readFlag(key) {
    return localStorage.getItem(key) === 'true';
  }

  function writeFlag(key, val) {
  try { localStorage.setItem(key, val ? 'true' : 'false'); } catch (e) { console.warn('writeFlag: legacy write failed', e); }

  try {
    if (window.__sec_KEYS && typeof window.__sec_KEYS === 'object') {
      if (key === 'biometricsEnabled' && __sec_KEYS.biom) {
        localStorage.setItem(__sec_KEYS.biom, val ? '1' : '0');
      } else if (key === 'biometricForLogin' && __sec_KEYS.bioLogin) {
        localStorage.setItem(__sec_KEYS.bioLogin, val ? '1' : '0');
      } else if (key === 'biometricForTx' && __sec_KEYS.bioTx) {
        localStorage.setItem(__sec_KEYS.bioTx, val ? '1' : '0');
      }
    }
  } catch (e) {
    console.warn('writeFlag: secure-ns write failed', e);
  }

  try { if (typeof syncFromStorage === 'function') setTimeout(syncFromStorage, 0); } catch (e) {}
}


  function setSwitch(btn, on) {
  if (!btn) return;
  const current = btn.getAttribute('aria-checked') === 'true';
  if (current === Boolean(on)) return;

  btn.setAttribute('aria-checked', on ? 'true' : 'false');
  btn.classList.toggle('active', !!on);
  btn.classList.toggle('inactive', !on);

  try {
    const id = btn.id || '';
    if (id === 'biometricsSwitch') {
      const opts = document.getElementById('biometricsOptions');
      if (opts) opts.hidden = !on;
    }
  } catch (e) {}

  try {
    btn.dispatchEvent(new CustomEvent('fg:switch-changed', { detail: { id: btn.id, checked: !!on }, bubbles: true }));
  } catch (e) {}
}


  function syncFromStorage() {
  const secKeys = (window.__sec_KEYS && typeof window.__sec_KEYS === 'object') ? window.__sec_KEYS : { biom:'', bioLogin:'', bioTx:'' };

  const secureBiom = secKeys.biom ? localStorage.getItem(secKeys.biom) === '1' : false;
  const legacyBiom = readFlag('biometricsEnabled');
  const enabled = secureBiom || legacyBiom;

  try {
    if (secKeys.biom) localStorage.setItem(secKeys.biom, enabled ? '1' : '0');
    localStorage.setItem('biometricsEnabled', enabled ? 'true' : 'false');
  } catch (e) { console.warn('syncFromStorage: write failed', e); }

  setSwitch(parent, enabled);
  setOptionsVisible(enabled);

  if (enabled) {
    const secureLogin = secKeys.bioLogin ? localStorage.getItem(secKeys.bioLogin) === '1' : false;
    const secureTx = secKeys.bioTx ? localStorage.getItem(secKeys.bioTx) === '1' : false;

    const login = secureLogin || readFlag('biometricForLogin');
    const tx = secureTx || readFlag('biometricForTx');

    try {
      if (secKeys.bioLogin) localStorage.setItem(secKeys.bioLogin, login ? '1' : '0');
      if (secKeys.bioTx) localStorage.setItem(secKeys.bioTx, tx ? '1' : '0');
      localStorage.setItem('biometricForLogin', login ? 'true' : 'false');
      localStorage.setItem('biometricForTx', tx ? 'true' : 'false');
    } catch(e) { console.warn('syncFromStorage child persist failed', e); }

    setSwitch(childLogin, login);
    setSwitch(childTx, tx);
  } else {
    setSwitch(childLogin, false);
    setSwitch(childTx, false);
    try {
      if (secKeys.bioLogin) localStorage.setItem(secKeys.bioLogin, '0');
      if (secKeys.bioTx) localStorage.setItem(secKeys.bioTx, '0');
      localStorage.setItem('biometricForLogin', 'false');
      localStorage.setItem('biometricForTx', 'false');
    } catch(e) {}
  }
}



async function handleParentToggle(wantOn) {
  if (parent.__bioProcessing) return;
  parent.__bioProcessing = true;

  parent.disabled = true;

  try {
    if (wantOn) {
      const hasPin = localStorage.getItem('hasPin') === 'true';
      if (!hasPin) {
        notify && notify('Please set a PIN first before enabling biometrics.', 'info');
        try { setSwitch(parent, false); } catch (e) {}
        return;
      }
    }

    await withLoader(async () => {
      if (wantOn) {
        let res;
        try {
          res = await registerBiometrics();
        } catch (err) {
          console.error('registerBiometrics threw', err);
          writeFlag && writeFlag('biometricsEnabled', false);
          try { setSwitch(parent, false); } catch (e) {}
          setOptionsVisible && setOptionsVisible(false);
          safeCall(notify, 'Biometric setup failed (network/server error)', 'error');
          return;
        }

        if (res && res.success) {
          writeFlag && writeFlag('biometricsEnabled', true);
          writeFlag && writeFlag('biometricForLogin', true);
          writeFlag && writeFlag('biometricForTx', true);

          if (res.credentialId) {
            try { localStorage.setItem('credentialId', String(res.credentialId)); } catch (e) { console.warn('storing credentialId failed', e); }
          }

          try { setSwitch(parent, true); } catch (e) {}
          try { setSwitch(childLogin, true); } catch (e) {}
          try { setSwitch(childTx, true); } catch (e) {}
          setOptionsVisible && setOptionsVisible(true);

          try { window.prefetchAuthOptions && window.prefetchAuthOptions(); } catch (e) { console.warn('prefetchAuthOptions failed', e); }

          safeCall(notify, 'Biometrics enabled', 'success');
        } else {
          writeFlag && writeFlag('biometricsEnabled', false);
          writeFlag && writeFlag('biometricForLogin', false);
          writeFlag && writeFlag('biometricForTx', false);

          try { setSwitch(parent, false); } catch (e) {}
          try { setSwitch(childLogin, false); } catch (e) {}
          try { setSwitch(childTx, false); } catch (e) {}
          setOptionsVisible && setOptionsVisible(false);

          const msg = res?.cancelled ? 'Biometric setup cancelled' : (res?.error || 'Biometric setup failed');
          safeCall(notify, msg, 'info');
        }
      } else {
        try {
          await disableBiometrics();
        } catch (err) {
          console.error('disableBiometrics error', err);
          safeCall(notify, `Failed to disable biometrics: ${err?.message || err}`, 'error');
        }

        writeFlag && writeFlag('biometricsEnabled', false);
        writeFlag && writeFlag('biometricForLogin', false);
        writeFlag && writeFlag('biometricForTx', false);

        try { localStorage.removeItem('credentialId'); } catch (e) { console.warn('remove credentialId failed', e); }
        try { invalidateAuthOptionsCache && invalidateAuthOptionsCache(); } catch (e) {}

        try { setSwitch(parent, false); } catch (e) {}
        try { setSwitch(childLogin, false); } catch (e) {}
        try { setSwitch(childTx, false); } catch (e) {}
        setOptionsVisible && setOptionsVisible(false);

        safeCall(notify, 'Biometrics disabled', 'info');
      }
    }); // end withLoader
  } catch (err) {
    console.error('Parent toggle error (outer):', err);
    writeFlag && writeFlag('biometricsEnabled', false);
    try { setSwitch(parent, false); } catch (e) {}
    setOptionsVisible && setOptionsVisible(false);
    safeCall(notify, `Toggle failed: ${err?.message || err}`, 'error');
  } finally {
    parent.__bioProcessing = false;
    parent.disabled = false;
    try { syncFromStorage && syncFromStorage(); } catch (e) { console.warn('syncFromStorage failed', e); }
  }
}

function maybeDisableParentIfChildrenOff() {
  try {
    const p = document.getElementById('biometricsSwitch');
    const c1 = document.getElementById('bioLoginSwitch');
    const c2 = document.getElementById('bioTxSwitch');

    if (!p || !c1 || !c2) return false;

    const loginOn = c1.getAttribute('aria-checked') === 'true';
    const txOn    = c2.getAttribute('aria-checked') === 'true';

    const parentOn = p.getAttribute('aria-checked') === 'true';
    if (!loginOn && !txOn && parentOn) {
      if (typeof handleParentToggle === 'function') {
        setTimeout(() => { try { handleParentToggle(false); } catch (e) { console.warn('handleParentToggle(false) failed', e); } }, 0);
      } else {
        writeFlag('biometricsEnabled', false);
        try { localStorage.removeItem('credentialId'); } catch (e) {}
        setSwitch(p, false);
        const opts = document.getElementById('biometricsOptions');
        if (opts) opts.hidden = true;
        safeCall(notify, 'Biometrics disabled because all options were turned off', 'info');
      }
      return true;
    }
    return false;
  } catch (e) {
    console.warn('maybeDisableParentIfChildrenOff error', e);
    return false;
  }
}


  function bindChild(btn, key, label) {
  if (!btn || btn.__bioBound) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const cur = btn.getAttribute('aria-checked') === 'true';
    const wantOn = !cur;

    if (wantOn && !readFlag('biometricsEnabled')) {
      safeCall(notify, `${label} requires biometrics enabled first`, 'info');
      if (typeof handleParentToggle === 'function') {
        handleParentToggle(true);
      }
      return;
    }

    setSwitch(btn, wantOn);

    writeFlag(key, wantOn);

    setTimeout(() => {
      try { maybeDisableParentIfChildrenOff(); } catch (err) { console.warn('maybeDisableParentIfChildrenOff failed', err); }
    }, 0);

    console.log(`[bio] ${key} toggled to ${wantOn ? 'ON' : 'OFF'} (local only)`);
    safeCall(notify, `${label} biometrics ${wantOn ? 'enabled' : 'disabled'}`, wantOn ? 'success' : 'info');
  });

  btn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });

  btn.__bioBound = true;
}




  if (!parent.__bioBound) {
    parent.addEventListener('click', (e) => {
      e.preventDefault();
      const currently = parent.getAttribute('aria-checked') === 'true';
      handleParentToggle(!currently);
    });
    parent.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        parent.click();
      }
    });
    parent.__bioBound = true;
  }

  bindChild(childLogin, 'biometricForLogin', 'Login');
  bindChild(childTx, 'biometricForTx', 'Transaction');

  window.addEventListener('storage', (e) => {
  if (['biometricsEnabled', 'biometricForLogin', 'biometricForTx', 'credentialId', 'hasPin'].includes(e.key)) {
    setTimeout(syncFromStorage, 50); // Existing sync
    setupInactivity();
    if (['biometricsEnabled', 'credentialId'].includes(e.key) && localStorage.getItem('biometricsEnabled') === 'true') {
      prefetchAuthOptions();
    }
  }
});


  syncFromStorage();

  return { parent, childLogin, childTx, optionsContainer, syncFromStorage };
}


/* -----------------------
   Call on DOMContentLoaded with your selectors
----------------------- */
document.addEventListener('DOMContentLoaded', () => {
  bindBiometricSettings({
    parentSelector: '#biometricsSwitch',
    childLoginSelector: '#bioLoginSwitch',
    childTxSelector: '#bioTxSwitch',
    optionsContainerSelector: '#biometricsOptions'
  });
});


  /* -----------------------
     Small helpers
     ----------------------- */
  function switchViews(toBiometric = false) {
    console.log('switchViews called, toBiometric:', toBiometric);
    try {
      if (toBiometric) {
        if (biometricView) biometricView.style.display = 'block';
        if (pinView) pinView.style.display = 'none';
        verifyBiometricBtn.focus();
        console.log('Switched to biometric');
      } else {
        if (biometricView) biometricView.style.display = 'none';
        if (pinView) pinView.style.display = 'block';
        const firstInput = getReauthInputs()[0];
        if (firstInput) firstInput.focus();
        console.log('Switched to PIN');
        initReauthKeypad();
      }
    } catch (e) {
      console.error('Error in switchViews:', e);
    }
    resetReauthInputs();
  }

  function resetReauthInputs() {
    console.log('resetReauthInputs called');
    currentPin = ''; // Reset global PIN
    try {
      const inputs = getReauthInputs();
      inputs.forEach(inp => {
        inp.value = '';
        inp.classList.remove('filled');
      });
      console.log('Inputs reset');
    } catch (e) {
      console.error('Error in resetReauthInputs:', e);
    }
  }

  /* -----------------------
   Inactivity logic (Mobile + Desktop)
   ----------------------- */

const PROMPT_TIMEOUT = 5000;
const PROMPT_AUTO_CLOSE = true;
let reauthModalOpen = false; // Track if reauth is open to pause idle
try { localStorage.setItem('lastActive', String(lastActive)); } catch (e) {}

let lastResetCall = 0;
const RESET_DEBOUNCE_MS = /Mobi|Android/i.test(navigator.userAgent) ? 500 : 150;
let __inactivitySetupDone = false;


function shouldReauthLocal(context = 'reauth') {
  const storedHasPin = String(localStorage.getItem('hasPin') || '').toLowerCase() === 'true';
  const storedBiometricsEnabled = String(localStorage.getItem('biometricsEnabled') || '').toLowerCase() === 'true';
  const storedBioLogin = String(localStorage.getItem('biometricForLogin') || '').toLowerCase() === 'true';
  const storedBioTx = String(localStorage.getItem('biometricForTx') || '').toLowerCase() === 'true';
  const storedCredentialId = localStorage.getItem('credentialId') || '';

  const webAuthnSupported = typeof window !== 'undefined' && ('PublicKeyCredential' in window);
  const hasBiometricFlag = storedBiometricsEnabled && webAuthnSupported && storedCredentialId.length > 0;

  const isBioApplicable = hasBiometricFlag && (
    (context === 'login' && storedBioLogin) ||
    (context === 'transaction' && storedBioTx) ||
    (context === 'reauth' && (storedBioLogin || storedBioTx))
  );

  const hasPin = storedHasPin;
  const needsReauth = Boolean(hasPin || isBioApplicable);
  const method = isBioApplicable ? 'biometric' : (hasPin ? 'pin' : null);

  return { needsReauth, method };
}

async function shouldReauth(context = 'reauth') {
  const localCheck = shouldReauthLocal(context);
  if (localCheck.needsReauth) return localCheck; // return immediately if localStorage triggers reauth

  try {
    const session = await safeCall(getSession);
    const sessionHasPin = !!(session && session.user && (session.user.hasPin || session.user.pin));
    const hasPin = sessionHasPin || localCheck.method === 'pin';
    const needsReauth = Boolean(hasPin || localCheck.method === 'biometric');
    const method = localCheck.method === 'biometric' ? 'biometric' : (hasPin ? 'pin' : null);
    return { needsReauth, method };
  } catch (err) {
    return localCheck; // fallback to local-only decision if server fails
  }
}

window.shouldReauth = window.shouldReauth || shouldReauth; // expose globally if needed





const FG_EXPECTED_KEY = 'fg_expected_reauth_at';
const FG_REAUTH_FLAG = 'fg_reauth_required_v1'; // cross-tab canonical key

function setExpectedReauthAt(ts) {
  try { localStorage.setItem(FG_EXPECTED_KEY, String(ts)); } catch (e) {}
}
function clearExpectedReauthAt() {
  try { localStorage.removeItem(FG_EXPECTED_KEY); } catch (e) {}
}
function getExpectedReauthAt() {
  try { return Number(localStorage.getItem(FG_EXPECTED_KEY) || 0); } catch (e) { return 0; }
}
function hasCanonicalLocalFlag() {
  try { return !!localStorage.getItem(FG_REAUTH_FLAG); } catch (e) { return false; }
}



try { localStorage.setItem('lastActive', String(lastActive)); } catch (e) {}

let __reauthPromptShowing = false;
const INTERACTION_EVENTS = ['mousemove','keydown','click','scroll','touchstart','touchend','touchmove','pointerdown'];


(function() {
  'use strict';
  
  const SOFT_IDLE_MS = 5 * 60 * 1000;  // 5 minutes (user inactive while visible)
  const HARD_IDLE_MS = 30 * 60 * 1000; // 30 minutes (tab hidden)
  const RESET_DEBOUNCE_MS = /Mobi|Android/i.test(navigator.userAgent) ? 500 : 150;
  
  const KEYS = {
    LAST_ACTIVE: 'lastActive',
    PAGE_HIDDEN_AT: 'pageHiddenAt',
    EXPECTED_REAUTH_AT: 'fg_expected_reauth_at',
    REAUTH_REQUIRED: 'fg_reauth_required_v1'
  };
  
  let softIdleTimeout = null;
  let hardIdleTimeout = null;
  let promptTimeout = null; // Track prompt auto-dismiss timeout
  let lastActivityTimestamp = Date.now();
  let pageHiddenTimestamp = null;
  let lastResetCall = 0;
  let setupComplete = false;
  let promptShowing = false;
  
  const ACTIVITY_EVENTS = [
    'mousedown', 'mousemove', 'keydown', 'scroll', 
    'touchstart', 'touchend', 'touchmove', 'click'
  ];
  
  function setItem(key, value) {
    try { 
      localStorage.setItem(key, String(value)); 
    } catch (e) { 
      console.warn(`[IDLE] Failed to set ${key}`, e); 
    }
  }
  
  function getItem(key, defaultValue = 0) {
    try { 
      return Number(localStorage.getItem(key)) || defaultValue; 
    } catch (e) { 
      return defaultValue; 
    }
  }
  
  function removeItem(key) {
    try { 
      localStorage.removeItem(key); 
    } catch (e) {}
  }
  
  function setExpectedReauthAt(timestamp) {
    setItem(KEYS.EXPECTED_REAUTH_AT, timestamp);
  }
  
  function getExpectedReauthAt() {
    return getItem(KEYS.EXPECTED_REAUTH_AT, 0);
  }
  
  function clearExpectedReauthAt() {
    removeItem(KEYS.EXPECTED_REAUTH_AT);
  }
  
  function hasCanonicalReauthFlag() {
    try {
      return !!JSON.parse(localStorage.getItem(KEYS.REAUTH_REQUIRED) || 'null');
    } catch (e) {
      return false;
    }
  }
  
  function isReauthModalOpen() {
    if (window.__reauthModalOpen === true) return true;
    if (window.reauthModalOpen === true) return true;
    
    const reauthModal = document.getElementById('reauthModal') || 
                        document.querySelector('.reauth-modal') ||
                        document.querySelector('[data-reauth-modal]');
    
    if (reauthModal && !reauthModal.classList.contains('hidden')) {
      return true;
    }
    
    return false;
  }
  
  function startSoftIdleTimer() {
    if (softIdleTimeout) {
      clearTimeout(softIdleTimeout);
      softIdleTimeout = null;
    }
    
    if (document.visibilityState !== 'visible') {
      console.log('[IDLE] Soft timer NOT started (page hidden)');
      return;
    }
    
    if (isReauthModalOpen()) {
      console.log('[IDLE] Soft timer NOT started (reauth modal open)');
      return;
    }
    
    console.log('[IDLE] Soft timer started (1 min countdown)');
    
    softIdleTimeout = setTimeout(async () => {
      console.log('⏰ [SOFT IDLE] 2 minute of inactivity');
      
      if (isReauthModalOpen()) {
        console.log('[SOFT IDLE] Reauth modal already open, skipping prompt');
        return;
      }
      
      try {
        await showInactivityPrompt();
      } catch (e) {
        console.error('[SOFT IDLE] Failed to show prompt', e);
      }
    }, SOFT_IDLE_MS);
  }
  
  function stopSoftIdleTimer() {
    if (softIdleTimeout) {
      clearTimeout(softIdleTimeout);
      softIdleTimeout = null;
      console.log('[IDLE] Soft timer STOPPED');
    }
  }
  
  function scheduleHardIdleCheck() {
    if (hardIdleTimeout) {
      clearTimeout(hardIdleTimeout);
      hardIdleTimeout = null;
    }
    
    const hiddenAt = getItem(KEYS.PAGE_HIDDEN_AT, Date.now());
    const elapsed = Date.now() - hiddenAt;
    const remaining = Math.max(0, HARD_IDLE_MS - elapsed);
    
    console.log(`[IDLE] Hard idle scheduled for ${Math.round(remaining / 1000 / 60)} minutes`);
    
    hardIdleTimeout = setTimeout(async () => {
      console.log('🔥 [HARD IDLE] 2 minutes threshold reached');
      
      if (document.visibilityState === 'hidden') {
        console.log('[HARD IDLE] Page still hidden - will show reauth when visible');
        return;
      }
      
      try {
        await triggerHardIdleReauth();
      } catch (e) {
        console.error('[HARD IDLE] Failed to trigger reauth', e);
      }
    }, remaining);
  }

async function createServerLockInBackground(reason) {
  try {
    const success = await requireReauthLock(reason);
    
    if (success) {
      console.log(`[LOCK] ✅ Supabase lock created (reason: ${reason})`);
    } else {
      console.warn(`[LOCK] ⚠️ Supabase lock creation returned false (reason: ${reason})`);
    }
  } catch (err) {
    console.error(`[LOCK] ❌ Failed to create Supabase lock (reason: ${reason}):`, err);
  }
}
  
async function triggerHardIdleReauth() {
  console.log('🔒 [HARD IDLE] Triggering reauth modal');
  
  stopSoftIdleTimer();
  if (promptTimeout) {
    clearTimeout(promptTimeout);
    promptTimeout = null;
  }
  
  const localCheck = shouldReauthLocal('reauth');
  if (localCheck.needsReauth) {
    await showReauthModalSafe({ context: 'reauth', reason: 'hard-idle' });
    
    createServerLockInBackground('hard_idle_timeout');
    return;
  }
  
  try {
    const serverCheck = await checkServerReauthStatus();
    if (serverCheck && (serverCheck.needsReauth || serverCheck.reauthRequired)) {
      await showReauthModalSafe({ context: 'reauth', reason: 'hard-idle' });
      
      createServerLockInBackground('hard_idle_timeout');
    }
  } catch (e) {
    console.warn('[HARD IDLE] Server check failed', e);
  }
}
  function onUserActivity() {
    if (document.visibilityState !== 'visible') {
      return;
    }
    
    if (isReauthModalOpen()) {
      return;
    }
    
    const now = Date.now();
    if (now - lastResetCall < RESET_DEBOUNCE_MS) {
      return;
    }
    lastResetCall = now;
    
    lastActivityTimestamp = now;
    setItem(KEYS.LAST_ACTIVE, now);
    
    startSoftIdleTimer();
  }
  
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      console.log('[IDLE] Page HIDDEN - starting hard idle tracking');
      
      stopSoftIdleTimer();
      
      if (promptTimeout) {
        clearTimeout(promptTimeout);
        promptTimeout = null;
      }
      
      pageHiddenTimestamp = Date.now();
      setItem(KEYS.PAGE_HIDDEN_AT, pageHiddenTimestamp);
      
      setExpectedReauthAt(pageHiddenTimestamp + HARD_IDLE_MS);
      
      scheduleHardIdleCheck();
      
    } else if (document.visibilityState === 'visible') {
      console.log('[IDLE] Page VISIBLE - checking thresholds');
      
      checkHardIdleOnVisible();
      
      if (!hasCanonicalReauthFlag() && !isReauthModalOpen()) {
        startSoftIdleTimer();
      }
    }
  }
  
async function checkHardIdleOnVisible() {
  if (hasCanonicalReauthFlag()) {
    console.log('[IDLE] Canonical reauth flag present - showing modal');
    await showReauthModalSafe({ context: 'reauth', reason: 'hard-idle' });
    
    createServerLockInBackground('hard_idle_on_return');
    return;
  }
  
  const expected = getExpectedReauthAt();
  if (expected && Date.now() >= expected) {
    console.log('[IDLE] Expected reauth time exceeded - showing modal');
    
    await showReauthModalSafe({ context: 'reauth', reason: 'hard-idle' });
    
    createServerLockInBackground('hard_idle_on_return');
    return;
  }
  
  const hiddenAt = getItem(KEYS.PAGE_HIDDEN_AT, 0);
  if (hiddenAt) {
    const awayTime = Date.now() - hiddenAt;
    console.log(`[IDLE] User was away for ${Math.round(awayTime / 1000 / 60)} minutes`);
    
    if (awayTime >= HARD_IDLE_MS) {
      console.log('🔥 [HARD IDLE] Threshold exceeded on return');
      
      removeItem(KEYS.PAGE_HIDDEN_AT);
      clearExpectedReauthAt();
      pageHiddenTimestamp = null;
      
      await showReauthModalSafe({ context: 'reauth', reason: 'hard-idle' });
      
      createServerLockInBackground('hard_idle_exceeded');
      return;
    }
    
    console.log('✅ [IDLE] Threshold not exceeded - resuming normally');
    removeItem(KEYS.PAGE_HIDDEN_AT);
    clearExpectedReauthAt();
    pageHiddenTimestamp = null;
  }
}
  
async function showInactivityPrompt() {
  if (promptShowing) {
    console.log('[PROMPT] Already showing, skipping');
    return;
  }
  
  if (isReauthModalOpen()) {
    console.log('[PROMPT] Reauth modal is open, skipping prompt');
    return;
  }
  
  promptShowing = true;
  
  try {
    const localCheck = shouldReauthLocal('reauth');
    if (!localCheck.needsReauth) {
      console.log('[PROMPT] Reauth not needed, skipping');
      promptShowing = false;
      return;
    }
    
    try {
      const serverCheck = await checkServerReauthStatus();
      if (serverCheck && (serverCheck.needsReauth || serverCheck.reauthRequired)) {
        console.log('[PROMPT] Server requires immediate reauth - skipping prompt');
        await showReauthModalSafe({ context: 'reauth', reason: 'server-required' });
        return;
      }
    } catch (e) {
      console.warn('[PROMPT] Server check failed', e);
    }
    
    console.log('[PROMPT] Showing inactivity prompt (5s countdown to reauth)');
    
    const promptModal = document.getElementById('inactivityPrompt');
    
    if (!promptModal) {
      console.warn('[PROMPT] Prompt modal not found - showing reauth modal instead');
      await showReauthModalSafe({ context: 'inactivity' });
      return;
    }
    
    console.log('[PROMPT] Found prompt modal:', promptModal.id || promptModal.className);
    
    promptModal.classList.remove('hidden');
    promptModal.setAttribute('aria-modal', 'true');
    promptModal.setAttribute('role', 'dialog');
    
    const yesBtn = promptModal.querySelector('#yesActiveBtn, .yes-btn, [data-yes]');
    if (yesBtn) {
      try { yesBtn.focus(); } catch(e) {}
    }
    
    promptTimeout = setTimeout(async () => {
      console.log('[PROMPT] 5 seconds elapsed - showing reauth modal');
      
      promptModal.classList.add('hidden');
      promptModal.removeAttribute('aria-modal');
      promptModal.removeAttribute('role');
      
      promptShowing = false;
      
      stopSoftIdleTimer();
      
      try {
        await showReauthModalSafe({ context: 'reauth', reason: 'soft-idle-timeout' });
      } catch (e) {
        console.error('[PROMPT] Failed to show reauth modal after timeout', e);
      }
      
      createServerLockInBackground('soft_idle_timeout');
      
    }, 5000); // 5 seconds
    
    if (!promptModal.__handlersAttached) {
      if (yesBtn) {
        yesBtn.addEventListener('click', () => {
          console.log('[PROMPT] User clicked "Yes, I\'m here" - dismissing prompt');
          
          if (promptTimeout) {
            clearTimeout(promptTimeout);
            promptTimeout = null;
          }
          
          promptModal.classList.add('hidden');
          promptModal.removeAttribute('aria-modal');
          promptModal.removeAttribute('role');
          
          promptShowing = false;
          
          startSoftIdleTimer();
        });
      }
      
      promptModal.__handlersAttached = true;
    }
    
    console.log('[PROMPT] Prompt visible - will show reauth modal in 5 seconds if no response');
    
  } catch (err) {
    console.error('[PROMPT] Error showing prompt', err);
  } finally {
    if (!promptTimeout) {
      promptShowing = false;
    }
  }
}

document.getElementById('reauthModal')?.addEventListener('transitionend', () => {
  if (!document.getElementById('reauthModal').classList.contains('hidden')) {
    reauthWarmBiometric();
  }
});

setInterval(() => {
  const modal = document.getElementById('reauthModal');
  if (modal && !modal.classList.contains('hidden')) {
    reauthWarmBiometric();
  }
}, 30_000);

  
    async function showReauthModalSafe(options = {}) {
    try {
      console.log('[IDLE] Stopping all timers - reauth modal will be shown');
      stopSoftIdleTimer();
      if (hardIdleTimeout) {
        clearTimeout(hardIdleTimeout);
        hardIdleTimeout = null;
      }
      if (promptTimeout) {
        clearTimeout(promptTimeout);
        promptTimeout = null;
      }

      try {
        if (window.__persistentReauthLock && typeof window.__persistentReauthLock.setLock === 'function') {
          console.log('[IDLE] Setting persistent reauth lock, reason:', options.reason || 'reauth-required');
          window.__persistentReauthLock.setLock(options.reason || 'reauth-required');
        }
      } catch (e) {
        console.warn('[IDLE] Failed to set persistent reauth lock (continuing):', e);
      }
      
      if (window.__reauth && typeof window.__reauth.showReauthModal === 'function') {
        await window.__reauth.showReauthModal(options.context || 'reauth');
      } else if (typeof showReauthModal === 'function') {
        await showReauthModal(options.context || 'reauth');
      } else if (typeof initReauthModal === 'function') {
        await initReauthModal({ show: true, context: options.context || 'reauth' });
      } else {
        console.error('[IDLE] No reauth modal function available');
      }
    } catch (e) {
      console.error('[IDLE] Failed to show reauth modal', e);
    }
  }

  
  function shouldReauthLocal(context = 'reauth') {
    try {
      if (typeof window.shouldReauthLocal === 'function') {
        return window.shouldReauthLocal(context);
      }
      
      const hasPin = localStorage.getItem('hasPin') === 'true';
      const biometricsEnabled = localStorage.getItem('biometricsEnabled') === 'true';
      const credentialId = localStorage.getItem('credentialId') || '';
      
      const needsReauth = hasPin || (biometricsEnabled && credentialId);
      const method = (biometricsEnabled && credentialId) ? 'biometric' : (hasPin ? 'pin' : null);
      
      return { needsReauth, method };
    } catch (e) {
      return { needsReauth: false, method: null };
    }
  }
  
async function checkServerReauthStatus() {
  console.log('[IDLE] Checking reauth status via Supabase (direct)');

  try {
    const result = await checkReauthLock();

    return {
      needsReauth: result.required,
      reason: result.reason || null,
      expiresAt: result.expiresAt || null
    };
  } catch (err) {
    console.warn('[IDLE] Supabase reauth check failed', err);
    return { needsReauth: false };
  }
}
window.checkServerReauthStatus = checkServerReauthStatus; // expose globally if needed
  
  async function setupInactivity() {
    if (setupComplete) {
      console.log('[IDLE] Already initialized, skipping');
      return;
    }
    
    console.log('[IDLE] Initializing idle detection system');
    
    try {
      const check = shouldReauthLocal('reauth');
      if (!check.needsReauth) {
        console.log('[IDLE] No reauth needed (no PIN/bio) - skipping setup');
        return;
      }
    } catch (e) {
      console.warn('[IDLE] Pre-check failed, continuing anyway', e);
    }
    
    lastActivityTimestamp = Date.now();
    setItem(KEYS.LAST_ACTIVE, lastActivityTimestamp);
    
    ACTIVITY_EVENTS.forEach(eventType => {
      try {
        document.addEventListener(eventType, onUserActivity, { passive: true, capture: true });
      } catch (e) {
        try {
          document.addEventListener(eventType, onUserActivity);
        } catch (e2) {
          console.warn(`[IDLE] Failed to attach ${eventType}`, e2);
        }
      }
    });
    
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
    
    await checkHardIdleOnVisible();
    
    if (document.visibilityState === 'visible' && !hasCanonicalReauthFlag() && !isReauthModalOpen()) {
      startSoftIdleTimer();
    }
    
    setupComplete = true;
    console.log('[IDLE] Setup complete');
  }
  
  function resetIdleTimer() {
    console.log('[IDLE] Resetting all timers');
    
    const now = Date.now();
    lastActivityTimestamp = now;
    lastResetCall = now;
    
    setItem(KEYS.LAST_ACTIVE, now);
    removeItem(KEYS.PAGE_HIDDEN_AT);
    clearExpectedReauthAt();
    
    pageHiddenTimestamp = null;
    promptShowing = false;
    
    stopSoftIdleTimer();
    if (hardIdleTimeout) {
      clearTimeout(hardIdleTimeout);
      hardIdleTimeout = null;
    }
    if (promptTimeout) {
      clearTimeout(promptTimeout);
      promptTimeout = null;
    }
    
    if (document.visibilityState === 'visible' && !isReauthModalOpen()) {
      startSoftIdleTimer();
    }
  }
  
  function cleanupInactivity() {
    console.log('[IDLE] Cleaning up');
    
    ACTIVITY_EVENTS.forEach(eventType => {
      document.removeEventListener(eventType, onUserActivity, { capture: true });
    });
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    
    stopSoftIdleTimer();
    if (hardIdleTimeout) {
      clearTimeout(hardIdleTimeout);
      hardIdleTimeout = null;
    }
    if (promptTimeout) {
      clearTimeout(promptTimeout);
      promptTimeout = null;
    }
    
    removeItem(KEYS.LAST_ACTIVE);
    removeItem(KEYS.PAGE_HIDDEN_AT);
    clearExpectedReauthAt();
    
    setupComplete = false;
    promptShowing = false;
  }
  
  window.__idleDetection = {
    setup: setupInactivity,
    reset: resetIdleTimer,
    cleanup: cleanupInactivity,
    
    getState: () => ({
      softIdleActive: !!softIdleTimeout,
      hardIdleActive: !!hardIdleTimeout,
      promptActive: !!promptTimeout,
      promptShowing: promptShowing,
      lastActivity: lastActivityTimestamp,
      pageHidden: pageHiddenTimestamp,
      reauthModalOpen: isReauthModalOpen(),
      setupComplete
    })
  };
  
  window.setupInactivity = setupInactivity;
  window.resetIdleTimer = resetIdleTimer;
  window.showInactivityPrompt = showInactivityPrompt;
  
})();

(function autoInit() {
  function tryInit() {
    if (typeof window.shouldReauthLocal === 'function' || 
        typeof window.shouldReauth === 'function') {
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          if (window.__idleDetection) {
            window.__idleDetection.setup();
          }
        });
      } else {
        if (window.__idleDetection) {
          window.__idleDetection.setup();
        }
      }
    } else {
      setTimeout(tryInit, 100);
    }
  }
  
  tryInit();
})();


(function() {
  'use strict';
  
  const LOCK_KEY = 'fg_reauth_lock_v2'; // Persistent lock flag
  const BROADCAST_CHANNEL_NAME = 'fg-reauth-sync';
  const STALE_LOCK_MS = 10 * 60 * 1000; // Consider lock stale after 10 minutes (safety)
  
  let broadcastChannel = null;
  let lockCheckInterval = null;
  
  
/**
 * Check for active reauth lock — now uses Supabase directly (no /reauth/status endpoint)
 * Returns the same shape as before for compatibility
 */
async function checkServerLock() {
  console.log('[REAUTH-LOCK] Checking lock status via Supabase');

  try {
    const result = await checkReauthLock(); // ← uses your existing direct helper

    if (result.required) {
      return {
        locked: true,
        reason: result.reason || 'timeout',
        token: null, // no token needed anymore (Supabase row acts as token)
        expiresAt: result.expiresAt // optional: pass expiry if you want to use it
      };
    }

    console.log('[REAUTH-LOCK] No active lock found');
    return null;
  } catch (err) {
    console.error('[REAUTH-LOCK] Supabase lock check failed:', err);
    return null; // fail open — assume no lock
  }
}
window.checkServerLock = checkServerLock; // expose globally if needed
  
  /**
 * Notify "server" (now Supabase) to set reauth lock
 * - This is now a thin wrapper around the direct Supabase upsert
 */
async function setServerLock(reason = 'client-idle') {
  console.log('[REAUTH-LOCK] Setting lock via Supabase (reason:', reason, ')');
  
  const success = await requireReauthLock(reason);
  
  if (success) {
    console.log('[REAUTH-LOCK] Supabase lock set successfully');
    return { ok: true }; // mimic old return shape for compatibility
  } else {
    console.warn('[REAUTH-LOCK] Supabase lock set failed');
    return null;
  }
}

/**
 * Notify "server" (now Supabase) to clear reauth lock
 * - Thin wrapper around direct Supabase delete
 */
async function clearServerLock() {
  console.log('[REAUTH-LOCK] Clearing lock via Supabase');
  
  const success = await clearReauthLock();
  
  if (success) {
    console.log('[REAUTH-LOCK] Supabase lock cleared successfully');
    return true; // mimic old return shape
  } else {
    console.warn('[REAUTH-LOCK] Supabase lock clear failed');
    return false;
  }
}
  
  
  /**
   * Create a lock object with metadata
   */
  function createLock(reason = 'unknown') {
    return {
      locked: true,
      reason: reason,
      timestamp: Date.now(),
      token: generateToken()
    };
  }
  
  /**
   * Generate unique token for lock
   */
  function generateToken() {
    try {
      if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
    
    return `lock_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Set reauth lock (persist to localStorage)
   */
  function setLocalReauthLock(reason = 'reauth-required') {
    try {
      const lock = createLock(reason);
      localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
      console.log('[REAUTH-LOCK] Lock set:', lock);
      
      broadcastLockChange('lock', lock);
      
      try {
        localStorage.setItem('fg_reauth_required_v1', JSON.stringify(lock));
      } catch (e) {}
      
      return lock;
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to set lock:', e);
      return null;
    }
  }
  
  /**
   * Clear reauth lock
   */
  function clearLocalReauthLock() {
    try {
      const oldLock = getLocalReauthLock();
      localStorage.removeItem(LOCK_KEY);
      console.log('[REAUTH-LOCK] Local lock cleared');
      
      broadcastLockChange('unlock', null);
      
      try {
        localStorage.removeItem('fg_reauth_required_v1');
        localStorage.removeItem('reauthPending');
      } catch (e) {}
      
      return oldLock;
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to clear local lock:', e);
      return null;
    }
  }
  
  /**
   * Get current reauth lock
   */
  function getLocalReauthLock() {
    try {
      const raw = localStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      
      const lock = JSON.parse(raw);
      
      if (Date.now() - lock.timestamp > STALE_LOCK_MS) {
        console.warn('[REAUTH-LOCK] Lock is stale, removing');
        clearReauthLock();
        return null;
      }
      
      return lock;
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to get lock:', e);
      return null;
    }
  }
  
  /**
   * Check if reauth is locked
   */
  function isReauthLocked() {
    const lock = getLocalReauthLock();
    return !!(lock && lock.locked);
  }
  
  
  /**
   * Initialize BroadcastChannel for cross-tab sync
   */
  function initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel === 'undefined') {
        console.warn('[REAUTH-LOCK] BroadcastChannel not supported');
        return;
      }
      
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      
      broadcastChannel.onmessage = (event) => {
        try {
          const { type, lock } = event.data;
          console.log('[REAUTH-LOCK] Received broadcast:', type, lock);
          
          if (type === 'lock') {
            handleLockReceived(lock);
          } else if (type === 'unlock') {
            handleUnlockReceived();
          }
        } catch (e) {
          console.error('[REAUTH-LOCK] Broadcast message error:', e);
        }
      };
      
      console.log('[REAUTH-LOCK] BroadcastChannel initialized');
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to init BroadcastChannel:', e);
    }
  }
  
  /**
   * Broadcast lock change to other tabs
   */
  function broadcastLockChange(type, lock) {
    try {
      if (!broadcastChannel) return;
      
      broadcastChannel.postMessage({ type, lock });
      console.log('[REAUTH-LOCK] Broadcasted:', type);
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to broadcast:', e);
    }
  }
  
  /**
   * Handle lock received from another tab
   */
  async function handleLockReceived(lock) {
    console.log('[REAUTH-LOCK] Lock received from another tab');
    
    if (!isReauthModalVisible()) {
      try {
        await showReauthModalSafe({ 
          context: 'reauth', 
          reason: lock?.reason || 'cross-tab-lock' 
        });
      } catch (e) {
        console.error('[REAUTH-LOCK] Failed to show modal on lock receive:', e);
      }
    }
  }
  
  /**
   * Handle unlock received from another tab
   */
  function handleUnlockReceived() {
    console.log('[REAUTH-LOCK] Unlock received from another tab');
    
    if (isReauthModalVisible()) {
      try {
        hideReauthModalSafe();
      } catch (e) {
        console.error('[REAUTH-LOCK] Failed to hide modal on unlock receive:', e);
      }
    }
  }
  
  
  /**
   * Listen for storage events (fallback if BroadcastChannel not available)
   */
  function initStorageListener() {
    window.addEventListener('storage', (event) => {
      if (event.key !== LOCK_KEY) return;
      
      console.log('[REAUTH-LOCK] Storage event detected:', event.newValue);
      
      if (event.newValue) {
        try {
          const lock = JSON.parse(event.newValue);
          handleLockReceived(lock);
        } catch (e) {
          console.error('[REAUTH-LOCK] Failed to parse lock from storage event:', e);
        }
      } else {
        handleUnlockReceived();
      }
    });
    
    console.log('[REAUTH-LOCK] Storage listener initialized');
  }
  
  
  /**
   * Check lock on page load (with server sync)
   */
  async function checkLockOnLoad() {
    console.log('[REAUTH-LOCK] Checking lock on page load (client + server)');
    
    const localLock = getLocalReauthLock();
    
    if (localLock && localLock.locked) {
      console.log('[REAUTH-LOCK] Found local lock, showing modal:', localLock);
      
      try {
        await showReauthModalSafe({ 
          context: 'reauth', 
          reason: localLock.reason || 'persisted-lock' 
        });
      } catch (e) {
        console.error('[REAUTH-LOCK] Failed to show modal on load:', e);
      }
      return; // Local lock found, no need to check server
    }
    
    console.log('[REAUTH-LOCK] No local lock, checking server...');
    
    try {
      const serverLock = await checkServerLock();
      
      if (serverLock && serverLock.locked) {
        console.log('[REAUTH-LOCK] Server lock found, syncing to client:', serverLock);
        
        const lock = setLocalReauthLock(serverLock.reason || 'server-lock');
        
        try {
          await showReauthModalSafe({ 
            context: 'reauth', 
            reason: serverLock.reason || 'server-lock' 
          });
        } catch (e) {
          console.error('[REAUTH-LOCK] Failed to show modal after server sync:', e);
        }
      } else {
        console.log('[REAUTH-LOCK] No lock found (client or server)');
      }
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to check server lock:', e);
    }
  }
  
  /**
   * Check lock on visibility change (tab switch)
   */
  async function checkLockOnVisibilityChange() {
    if (document.visibilityState !== 'visible') return;
    
    console.log('[REAUTH-LOCK] Checking lock on visibility change');
    
    const lock = getLocalReauthLock();
    
    if (lock && lock.locked && !isReauthModalVisible()) {
      console.log('[REAUTH-LOCK] Lock exists but modal not visible, showing:', lock);
      
      try {
        await showReauthModalSafe({ 
          context: 'reauth', 
          reason: lock.reason || 'visibility-check' 
        });
      } catch (e) {
        console.error('[REAUTH-LOCK] Failed to show modal on visibility:', e);
      }
    }
  }
  
  /**
   * Periodic lock check (safety net)
   */
  function startLockCheckInterval() {
    if (lockCheckInterval) {
      clearInterval(lockCheckInterval);
    }
    
    let modalVisibleWithoutLockCount = 0;
    
    lockCheckInterval = setInterval(() => {
      const lock = getLocalReauthLock();
      const modalVisible = isReauthModalVisible();
      
      if (lock && lock.locked && !modalVisible) {
        console.warn('[REAUTH-LOCK] Lock/modal mismatch detected - showing modal');
        modalVisibleWithoutLockCount = 0; // Reset counter
        showReauthModalSafe({ 
          context: 'reauth', 
          reason: lock.reason || 'periodic-check' 
        });
      }
      
      if (!lock && modalVisible) {
        modalVisibleWithoutLockCount++;
        console.warn(`[REAUTH-LOCK] Modal visible without lock (count: ${modalVisibleWithoutLockCount}/3)`);
        
        if (modalVisibleWithoutLockCount >= 3) {
          console.warn('[REAUTH-LOCK] Modal visible without lock for 15+ seconds - hiding');
          hideReauthModalSafe();
          modalVisibleWithoutLockCount = 0;
        }
      } else {
        modalVisibleWithoutLockCount = 0;
      }
    }, 5000); // Check every 5 seconds
    
    console.log('[REAUTH-LOCK] Periodic lock check started');
  }
  
  function stopLockCheckInterval() {
    if (lockCheckInterval) {
      clearInterval(lockCheckInterval);
      lockCheckInterval = null;
      console.log('[REAUTH-LOCK] Periodic lock check stopped');
    }
  }
  
  
  /**
   * Check if reauth modal is visible
   */
  function isReauthModalVisible() {
    if (window.__reauthModalOpen === true) return true;
    if (window.reauthModalOpen === true) return true;
    
    const reauthModal = document.getElementById('reauthModal') || 
                        document.querySelector('.reauth-modal') ||
                        document.querySelector('[data-reauth-modal]');
    
    if (reauthModal && !reauthModal.classList.contains('hidden')) {
      return true;
    }
    
    return false;
  }

  window.isReauthModalVisible = isReauthModalVisible; // expose globally if needed
  
  /**
   * Show reauth modal (safe wrapper)
   */
  async function showReauthModalSafe(options) {
    try {
      if (window.__REAUTH_COMPLETING__) {
        console.log('[REAUTH-LOCK] showReauthModalSafe suppressed — reauth completing');
        return;
      }
      console.log('[REAUTH-LOCK] Showing reauth modal');
      
      if (window.__reauth && typeof window.__reauth.showReauthModal === 'function') {
        await window.__reauth.showReauthModal(options.context || 'reauth');
      } else if (typeof showReauthModal === 'function') {
        await showReauthModal(options.context || 'reauth');
      } else if (typeof initReauthModal === 'function') {
        await initReauthModal({ show: true, context: options.context || 'reauth' });
      } else {
        console.error('[REAUTH-LOCK] No reauth modal function available');
      }
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to show reauth modal:', e);
    }
  }
  
  /**
   * Hide reauth modal (safe wrapper)
   */
  function hideReauthModalSafe() {
    try {
      console.log('[REAUTH-LOCK] Hiding reauth modal');
      
      if (typeof guardedHideReauthModal === 'function') {
        guardedHideReauthModal();
      } else if (window.__reauth && typeof window.__reauth.hideReauthModal === 'function') {
        window.__reauth.hideReauthModal();
      } else {
        const reauthModal = document.getElementById('reauthModal');
        if (reauthModal) {
          reauthModal.classList.add('hidden');
        }
      }
    } catch (e) {
      console.error('[REAUTH-LOCK] Failed to hide reauth modal:', e);
    }
  }
  
  
  /**
   * Trigger reauth lock (call this when reauth is needed)
   */
  function triggerReauthLock(reason = 'reauth-required') {
    console.log('[REAUTH-LOCK] Triggering reauth lock, reason:', reason);
    
    const lock = setLocalReauthLock(reason);
    
    showReauthModalSafe({ context: 'reauth', reason });
    
    if (window.__idleDetection && typeof window.__idleDetection.reset === 'function') {
      if (window.__idleDetection.getState) {
        const state = window.__idleDetection.getState();
        console.log('[REAUTH-LOCK] Idle detection state:', state);
      }
    }
    
    return lock;
  }
  
  /**
   * Clear reauth lock after successful authentication
   */
  function completeReauthUnlock() {
    console.log('[REAUTH-LOCK] Completing reauth unlock');
    
    clearLocalReauthLock();
    
    hideReauthModalSafe();
    
    if (window.__idleDetection && typeof window.__idleDetection.reset === 'function') {
      window.__idleDetection.reset();
    }
    
    try {
      window.dispatchEvent(new CustomEvent('reauth:unlocked', {
        detail: { timestamp: Date.now() }
      }));
    } catch (e) {}
  }
  
  
  function initPersistentReauthLock() {
    console.log('[REAUTH-LOCK] Initializing persistent reauth lock system');
    
    initBroadcastChannel();
    initStorageListener();
    
    checkLockOnLoad();
    
    document.addEventListener('visibilitychange', checkLockOnVisibilityChange, { passive: true });
    
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        console.log('[REAUTH-LOCK] Page restored from bfcache');
        checkLockOnLoad();
      }
    }, { passive: true });
    
    startLockCheckInterval();
    
    console.log('[REAUTH-LOCK] Initialization complete');
  }
  
  
  window.__persistentReauthLock = {
    setLock: setLocalReauthLock,
    clearLock: clearLocalReauthLock,
    getLock: getLocalReauthLock,
    isLocked: isReauthLocked,
    
    trigger: triggerReauthLock,
    complete: completeReauthUnlock,
    
    isModalVisible: isReauthModalVisible,
    
    getState: () => ({
      locked: isReauthLocked(),
      lock: getReauthLock(),
      modalVisible: isReauthModalVisible(),
      broadcastChannelActive: !!broadcastChannel
    })
  };
  
  window.isReauthLocked = isReauthLocked;
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersistentReauthLock);
  } else {
    initPersistentReauthLock();
  }
  
})();




window.__cachedAuthOptions = null;

async function prefetchAuthOptionsFor(uid, context = 'reauth') {
  try {
    const apiBase = window.__SEC_API_BASE || '';
    const credentialId = localStorage.getItem('credentialId') || null;
    const endpoint = credentialId ? '/webauthn/auth/options' : '/webauthn/auth/options';
    const body = credentialId ? { userId: uid, credentialId, context } : { userId: uid, context };

    const res = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Options fetch failed ${res.status}`);

    const opts = await res.json();

    opts.challenge = (function base64ToBuf(s){
      let b = s.replace(/-/g,'+').replace(/_/g,'/');
      const pad = b.length % 4; if (pad) b += '='.repeat(4-pad);
      const str = atob(b);
      const arr = new Uint8Array(str.length);
      for(let i=0;i<str.length;i++) arr[i]=str.charCodeAt(i);
      return arr.buffer;
    })(opts.challenge);

    if (Array.isArray(opts.allowCredentials) && opts.allowCredentials.length) {
      opts.allowCredentials = opts.allowCredentials.map(c => ({ ...c, id: (function base64ToBuf(s){
        let b = s.replace(/-/g,'+').replace(/_/g,'/');
        const pad = b.length % 4; if (pad) b += '='.repeat(4-pad);
        const str = atob(b);
        const arr = new Uint8Array(str.length);
        for(let i=0;i<str.length;i++) arr[i]=str.charCodeAt(i);
        return arr.buffer;
      })(c.id) }));
    } else {
      delete opts.allowCredentials; // ensure discoverable behavior
    }

    opts.userVerification = opts.userVerification || 'required';
    opts.timeout = opts.timeout || 60000;

    window.__cachedAuthOptions = opts;
    console.log('[PREFETCH] cached auth options ready', {
      rpId: opts.rpId, allowCount: opts.allowCredentials ? opts.allowCredentials.length : 'omitted', time: new Date().toISOString()
    });
    return opts;
  } catch (e) {
    console.error('[PREFETCH] failed to fetch auth options', e);
    window.__cachedAuthOptions = null;
    throw e;
  }
}



/* -----------------------
   Verify Biometrics (new!)
   - Performs WebAuthn authentication for login or checkout
   ----------------------- */
/* -----------------------
   Verify Biometrics (patched)
   - Ensures all verifications reuse the same credential created by the parent
   - Prevents browser from prompting for “new passkey”
   ----------------------- */
/* -----------------------
   Verify Biometrics (patched)
   - Ensures all verifications reuse the same credential created by the parent
   - Prevents browser from prompting for “new passkey”
   ----------------------- */
/* -----------------------
   Verify Biometrics (debug)
   ----------------------- */


(function(){
  if (!window.fromBase64Url) {
    window.fromBase64Url = function (b64url) {
      try {
        if (b64url == null) return new ArrayBuffer(0);

        if (b64url instanceof ArrayBuffer) return b64url;
        if (ArrayBuffer.isView(b64url)) return b64url.buffer;

        if (typeof b64url === 'object' && Array.isArray(b64url.data)) {
          return new Uint8Array(b64url.data).buffer;
        }

        if (typeof b64url !== 'string') {
          console.warn('[webauthn] fromBase64Url expected string, got', typeof b64url, b64url);
          return b64url;
        }

        let s = b64url.replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        const str = atob(s);
        const arr = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
        return arr.buffer;
      } catch (err) {
        console.warn('[webauthn] fromBase64Url error', err, b64url);
        return new ArrayBuffer(0);
      }
    };
  }

  if (!window.toBase64Url) {
    window.toBase64Url = function (buffer) {
      if (!buffer) return '';
      const bytes = new Uint8Array(buffer);
      let str = '';
      for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };
  }




(function(){
  (async function initWebAuthnSession(){
    try {
      if (typeof getSession === 'function') {
        var sess = await safeCall(getSession);
        var uid = sess && sess.user && (sess.user.uid || sess.user.id);
        if (uid) {
          window.__webauthn_userId = uid;
        }
      }
      var stored = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id');
      if ((window.__webauthn_userId) && stored) {
        try { window.prefetchAuthOptions && window.prefetchAuthOptions(); } catch(e){}
      }
    } catch (e) {
      console.warn('[initWebAuthnSession] failed', e);
    }
  })();
})();


  window.prefetchAuthOptions = window.prefetchAuthOptions || (async function prefetchAuthOptions() {
    try {
      if (window.__prefetchInFlight) return;
      window.__prefetchInFlight = true;

      const storedId = localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id');
      if (!storedId) {
        window.__prefetchInFlight = false;
        return;
      }

      const res = await fetch((window.__SEC_API_BASE || API_BASE) + '/webauthn/auth/options', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: storedId, userId: (window.__webauthn_userId || null) })
      });

      if (!res.ok) {
        console.warn('[prefetchAuthOptions] options fetch not ok', await res.text());
        window.__prefetchInFlight = false;
        return;
      }

      const publicKey = await res.json();

      try {
        if (publicKey.challenge && typeof publicKey.challenge === 'string') {
          const ch = window.fromBase64Url(publicKey.challenge);
          if (ch) publicKey.challenge = new Uint8Array(ch);
        }
        if (Array.isArray(publicKey.allowCredentials)) {
          publicKey.allowCredentials = publicKey.allowCredentials.map(function(c){
            try {
              const idVal = (typeof c.id === 'string') ? window.fromBase64Url(c.id) : (ArrayBuffer.isView(c.id) ? c.id.buffer : (c.id instanceof ArrayBuffer ? c.id : null));
              return {
                type: c.type || 'public-key',
                transports: c.transports || ['internal'],
                id: idVal ? new Uint8Array(idVal) : idVal
              };
            } catch (e) {
              return { type: c.type || 'public-key', transports: c.transports || ['internal'], id: c.id };
            }
          });
        }

      } catch (e) {
        console.warn('[prefetchAuthOptions] conversion error', e);
      }

      window.__cachedAuthOptions = publicKey;
      window.__cachedAuthOptionsFetchedAt = Date.now();
      console.log('[prefetchAuthOptions] cached auth options ready');
    } catch (err) {
      console.warn('[prefetchAuthOptions] failed', err);
    } finally {
      window.__prefetchInFlight = false;
    }
  });

  try {
    var bioBtnEl = document.getElementById('bioBtn') || document.querySelector('.biometric-button') || document.querySelector('[data-bio-button]');
    if (bioBtnEl) {
      const debouncedPrefetch = (function(){
        let locked = false;
        return function(){
          if (locked) return;
          locked = true;
          try {
            console.log('[prefetchAuthOptions] debounced trigger');
            window.prefetchAuthOptions && window.prefetchAuthOptions();
          } catch(e){
            console.warn('[prefetchAuthOptions] debounced call failed', e);
          }
          setTimeout(()=> { locked = false; }, 250);
        };
      })();

      ['pointerdown','mouseenter','click','touchstart','focus'].forEach(function(ev){
        try { bioBtnEl.addEventListener(ev, debouncedPrefetch, { passive: true }); } catch(e){
          try { bioBtnEl.addEventListener(ev, debouncedPrefetch); } catch(err){ /* ignore */ }
        }
      });

      try {
        document.addEventListener('modal:reauth:open', function(){ 
          try {
            console.log('[prefetchAuthOptions] modal open trigger');
            window.prefetchAuthOptions && window.prefetchAuthOptions();
          } catch(e){ console.warn('prefetchAuthOptions on modal open failed', e); }
        }, { passive: true });
      } catch(e) {
        try {
          document.addEventListener('modal:reauth:open', function(){ 
            try {
              console.log('[prefetchAuthOptions] modal open trigger');
              window.prefetchAuthOptions && window.prefetchAuthOptions();
            } catch(e){ console.warn('prefetchAuthOptions on modal open failed', e); }
          });
        } catch(err){}
      }
    }
    if (localStorage.getItem('credentialId') || localStorage.getItem('webauthn-cred-id')) {
      setTimeout(function(){ 
        try { 
          console.log('[prefetchAuthOptions] timed initial prefetch');
          window.prefetchAuthOptions(); 
        } catch(e){ console.warn('initial prefetch failed', e); }
      }, 200);
    }
  } catch (e) {
    console.warn('bindPrefetchToBioBtn error', e);
  }
})();






async function verifyBiometrics(uid, context = 'reauth') {
  if (window.__biometricInFlight) {
    console.warn('[verifyBiometrics] Blocked: biometric already in flight');
    throw new Error('Biometric already in progress');
  }

  window.__biometricInFlight = true;
  console.log('%c[verifyBiometrics] Called', 'color:#0ff;font-weight:bold');

  try {
    let userId = uid;

    if (!userId) {
      try {
        const cached = localStorage.getItem('userData');
        if (cached) {
          const parsed = JSON.parse(cached);
          userId = parsed.uid || parsed.user?.id || parsed.user?.uid;
          console.log('[verifyBiometrics] Using UID from cache:', userId);
        }
      } catch (err) {
        console.warn('[verifyBiometrics] Failed to read cached UID', err);
      }
    }

    if (!userId) {
      const session = await safeCall(getSession);
      userId = session?.user?.id || session?.user?.uid;
      console.log('[verifyBiometrics] Fallback UID from getSession:', userId);
    }

    if (!userId) throw new Error('No user ID available for biometric verification');

    let publicKey = window.__cachedAuthOptions;

    if (!publicKey || !publicKey.challenge) {
      console.log('[verifyBiometrics] No valid pre-warmed options → fetching fresh');
      publicKey = await warmBiometricOptions(userId, context, { force: true });
    }

    if (!publicKey || !publicKey.challenge) {
      throw new Error('Failed to obtain WebAuthn options from server');
    }

    const pk = structuredClone(publicKey);

    if (!(pk.challenge instanceof Uint8Array)) {
      console.warn('[verifyBiometrics] Fixing challenge type:', typeof pk.challenge);
      const converted = fromBase64Url(pk.challenge);
      if (!(converted instanceof ArrayBuffer) || converted.byteLength === 0) {
        throw new Error('Invalid challenge: could not convert to valid buffer');
      }
      pk.challenge = new Uint8Array(converted);
    }

    if (Array.isArray(pk.allowCredentials) && pk.allowCredentials.length > 0) {
      const fixedCreds = [];
      for (const cred of pk.allowCredentials) {
        if (!cred.id) {
          console.warn('[verifyBiometrics] Skipping credential with missing id');
          continue;
        }
        if (!(cred.id instanceof Uint8Array)) {
          console.warn('[verifyBiometrics] Fixing credential id type:', typeof cred.id);
          const converted = fromBase64Url(cred.id);
          if (!(converted instanceof ArrayBuffer) || converted.byteLength === 0) {
            console.warn('[verifyBiometrics] Skipping invalid credential id');
            continue;
          }
          cred.id = new Uint8Array(converted);
        }
        fixedCreds.push(cred);
      }
      pk.allowCredentials = fixedCreds;

      if (pk.allowCredentials.length === 0) {
        throw new Error('No valid registered credentials found');
      }
    }

    pk.userVerification = 'required';
    pk.timeout = 60000;

    console.log('[verifyBiometrics] Final options ready for prompt', {
      challengeLength: pk.challenge.byteLength,
      challengeType: pk.challenge.constructor.name,
      allowCredCount: pk.allowCredentials?.length || 0,
      allowCredIdsValid: pk.allowCredentials?.every(c => c.id instanceof Uint8Array) || false
    });

    const assertion = await navigator.credentials.get({ publicKey: pk });

    if (!assertion) {
      throw new Error('No assertion returned from authenticator');
    }

    return await withLoader(async () => {
      const payload = {
        id: assertion.id,
        rawId: toBase64Url(assertion.rawId),
        type: assertion.type,
        response: {
          authenticatorData: toBase64Url(assertion.response.authenticatorData),
          clientDataJSON: toBase64Url(assertion.response.clientDataJSON),
          signature: toBase64Url(assertion.response.signature),
          userHandle: assertion.response.userHandle
            ? toBase64Url(assertion.response.userHandle)
            : null
        },
        userId
      };

      const verifyRes = await fetch(`${window.__SEC_API_BASE}/webauthn/auth/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, action: 'reauth' })
      });

      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        console.error('[verifyBiometrics] Verify failed', verifyRes.status, errText);
        throw new Error(`Server verify failed: ${errText}`);
      }

      const verifyData = await verifyRes.json();
      console.log('[verifyBiometrics] Verify success', verifyData);

      try {
        if (typeof onSuccessfulReauth === 'function') onSuccessfulReauth(); // no await
        if (typeof notify === 'function') notify('Authentication successful', 'success');

        try {
          if (typeof hideTinyReauthNotice === 'function') hideTinyReauthNotice();
          window.dispatchEvent(
            new CustomEvent('fg:reauth-success', { detail: { method: 'biometrics' } })
          );
        } catch (e) {
          console.debug('verifyBiometrics: dispatch fg:reauth-success failed', e);
        }
      } catch (err) {
        console.warn('[reauth] Post-biometrics verification error', err);
      }

      return { success: true, data: verifyData };
    });

  } catch (err) {
    console.error('[verifyBiometrics] Error', err);
    if (typeof notify === 'function') notify(`Biometric error: ${err.message}`, 'error');

    switchViews(false); // fallback to PIN
    return { success: false, error: err.message };
  } finally {
    window.__biometricInFlight = false;
  }
}

window.verifyBiometrics = window.verifyBiometrics || verifyBiometrics;

function simulatePinEntry(opts = {}) {
  const stagger = typeof opts.stagger === 'number' ? opts.stagger : 150;
  const expectedCount = typeof opts.expectedCount === 'number' ? opts.expectedCount : 4;
  const fillAll = !!opts.fillAll; // new flag: fill all inputs at once
  const debugTag = '[DEBUG-BIO simulatePinEntry]';

  console.log(`${debugTag} start; options:`, { stagger, expectedCount, fillAll });

  return new Promise((resolve) => {
    try {
      const selectors = [
        '.reauthpin-inputs input',
        '.pin-input',
        'input.pin',
        '.pin > input',
        '.pin-inputs input',
        'input[id^="pin"]',
      ];
      let inputs = [];
      for (const s of selectors) {
        inputs = Array.from(document.querySelectorAll(s));
        if (inputs && inputs.length) {
          console.log(`${debugTag} found inputs with selector "${s}" (count=${inputs.length})`);
          break;
        }
      }

      if (!inputs || inputs.length === 0) {
        console.warn(`${debugTag} No PIN inputs found; trying visible input fallback`);
        inputs = Array.from(document.querySelectorAll('input')).filter(i => i.offsetParent !== null).slice(0, expectedCount);
      }

      if (!inputs || inputs.length === 0) {
        console.warn(`${debugTag} still no inputs found; aborting simulatePinEntry`);
        resolve(false);
        return;
      }

      if (inputs.length !== expectedCount) {
        console.warn(`${debugTag} unexpected PIN input count: ${inputs.length} (expected ${expectedCount})`);
      }

      try { inputs[0] && inputs[0].scrollIntoView && inputs[0].scrollIntoView({ block: 'center' }); } catch(e){}

      let liveNode = null;
      try {
        liveNode = document.getElementById('__debug_pin_live') || (() => {
          const n = document.createElement('div');
          n.id = '__debug_pin_live';
          n.setAttribute('aria-live', 'polite');
          n.style.position = 'fixed';
          n.style.left = '-9999px';
          n.style.width = '1px';
          n.style.height = '1px';
          document.body.appendChild(n);
          return n;
        })();
      } catch (e) { liveNode = null; }

      if (fillAll || stagger <= 0) {
        try {
          inputs.forEach((input, index) => {
            try { input.disabled = false; } catch(e){}
            try { input.style.visibility = input.style.visibility || 'visible'; } catch(e){}
            input.classList.add('filled', 'simulated-pin');
            try { input.value = '•'; } catch(e){}
            try {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } catch(e){}
            if (liveNode) liveNode.textContent = `Simulated PIN: ${index + 1}/${inputs.length} filled`;
          });
          console.log(`${debugTag} filled all inputs synchronously`);
        } catch (e) {
          console.warn(`${debugTag} synchronous fill error`, e);
        }
        setTimeout(() => {
          if (liveNode) try { liveNode.textContent = 'Simulated PIN complete'; } catch(e){}
          resolve(true);
        }, 50);
        return;
      }

      inputs.forEach((input, index) => {
        setTimeout(() => {
          try {
            try { input.disabled = false; } catch (e) {}
            try { input.style.visibility = input.style.visibility || 'visible'; } catch (e) {}
            input.classList.add('filled', 'simulated-pin');
            try { input.value = '•'; } catch (e) {}
            try {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              try { input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Unidentified' })); } catch(e){}
            } catch (e) { console.warn(`${debugTag} event dispatch failed`, e); }
            if (liveNode) liveNode.textContent = `Simulated PIN: ${index + 1}/${inputs.length} filled`;
            console.log(`${debugTag} filled input[${index}] id="${input.id || '(no-id)'}"`);
          } catch (err) {
            console.warn(`${debugTag} simulate error for index ${index}`, err);
          }
        }, index * stagger);
      });

      const totalDelay = Math.max(0, (inputs.length - 1) * stagger) + 120;
      setTimeout(() => {
        if (liveNode) try { liveNode.textContent = 'Simulated PIN complete'; } catch(e){}
        console.log(`${debugTag} complete after ${totalDelay}ms`);
        resolve(true);
      }, totalDelay);
    } catch (err) {
      console.error(`${debugTag} unexpected error`, err);
      resolve(false);
    }
  });
}


window.simulatePinEntry = window.simulatePinEntry || simulatePinEntry;



window.dumpCredentialStorage = dumpCredentialStorage;
window.persistCredentialId = persistCredentialId;



  

 

async function showReauthModal(context = 'reauth') {
  console.log('showReauthModal called', { context });
  cacheDomRefs();
  if (!reauthModal) {
    console.error('showReauthModal: reauthModal missing');
    return;
  }

  try {
    const reauthStatus = await shouldReauth(context);
    console.log('showReauthModal: reauthStatus', reauthStatus);

    if (!reauthStatus.needsReauth) {
      console.log('showReauthModal: no reauth required - calling success handler');
      try {
        if (typeof onSuccessfulReauth === 'function') {
          onSuccessfulReauth(); // no await — closes instantly, cleanup in background
        }
      } catch (err) {
        console.warn('[reauth] Post-reauth check success error', err);
        if (typeof showBanner === 'function') {
          showBanner('Authentication completed, but an internal error occurred. Please refresh if issues persist.');
        }
      }
      return;
    }

    if (reauthStatus.method === 'biometric') {
      console.log('showReauthModal: biometric available (manual only, no auto trigger)');
      await initReauthModal({ show: true, context, biometricAvailable: true });
      return;
    }

    await initReauthModal({ show: true, context });

  } catch (err) {
    console.error('showReauthModal unexpected error', err);
    if (typeof guardedHideReauthModal === 'function') {
      await guardedHideReauthModal();
    }
  }
}


/* ---------------------------
   Reauth cross-tab sync module – fully Supabase-native
   - uses BroadcastChannel + storage event fallback
   - persists reauth state across reloads / hard reloads
   - NO backend fetches anymore (all via Supabase reauth_locks)
----------------------------*/
(function () {
  const LOCAL_KEY = 'fg_reauth_required_v1';       // storage key
  const BC_NAME = 'fg-reauth';                     // BroadcastChannel name
  const CHECK_STATUS_INTERVAL_MS = 30000;           // optional background poll (now Supabase)
  const STALE_MS = 1000 * 60 * 10;                 // consider stale after 10min

  let bc = null;
  try { if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel(BC_NAME); } catch(e){ bc = null; }

  function makeToken() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 't_' + String(Math.floor(Math.random() * 1e9)) + '_' + Date.now();
  }

  function buildStoredObj({ token=null, ts=null, reason=null } = {}) {
    return { token: token || makeToken(), ts: ts || Date.now(), reason: reason || 'unknown' };
  }

  function writeLocal(obj) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(obj)); } catch (e) {}
    try { if (bc) bc.postMessage({ type: 'require', payload: obj }); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_KEY, newValue: JSON.stringify(obj) })); } catch(e){}
  }

  function clearLocal(token) {
    try {
      const cur = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null');
      if (!cur) { localStorage.removeItem(LOCAL_KEY); }
      else if (!token || String(cur.token) === String(token)) localStorage.removeItem(LOCAL_KEY);
    } catch (e) { try { localStorage.removeItem(LOCAL_KEY); } catch(e){} }
    try { if (bc) bc.postMessage({ type: 'clear', payload: { token } }); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_KEY, newValue: null })); } catch(e){}
  }

  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { return null; }
  }

  async function showReauthModalLocal({ fromStorageObj } = {}) {
    try {
      if (window.__REAUTH_COMPLETING__) {
        console.log('[reauth] showReauthModalLocal suppressed — reauth completing');
        return;
      }
      cacheDomRefs();
      if (typeof initReauthModal === 'function') {
        await initReauthModal({ show: true, context: 'reauth' });
      } else {
        if (reauthModal && reauthModal.classList) reauthModal.classList.remove('hidden');
      }
      try { reauthModalOpen = true; setReauthActive(true); } catch (e) {}
      try { localStorage.setItem('fg_reauth_active_tab', (fromStorageObj && fromStorageObj.token) || makeToken()); } catch(e){}
    } catch (e) {}
  }

  function hideReauthModalLocal() {
    try {
      (async () => {
        try { await guardedHideReauthModal(); } catch (e) { console.warn('[reauth] hideReauthModalLocal guard error', e); }
      })();
    } catch (e) { console.warn('[reauth] hideReauthModalLocal error', e); }
  }

  async function requireReauth(reason) {
    const obj = buildStoredObj({ reason });
    writeLocal(obj);

    try { setExpectedReauthAt(Date.now()); } catch (e) { /* ignore */ }

    try {
      const success = await requireReauthLock(reason);
      if (success) {
        console.log('[REAUTH] Supabase lock set successfully (reason:', reason, ')');
      } else {
        console.warn('[REAUTH] Supabase lock set returned false (reason:', reason, ')');
      }
    } catch (err) {
      console.error('[REAUTH] Supabase requireReauth failed:', err);
    }

    showReauthModalLocal({ fromStorageObj: obj });
  }

  async function completeReauth() {
    let ok = false;
    try {
      ok = await clearReauthLock();
      if (ok) {
        console.log('[REAUTH] Supabase lock cleared successfully');
      } else {
        console.warn('[REAUTH] Supabase clear returned false');
      }
    } catch (err) {
      console.error('[REAUTH] Supabase completeReauth failed:', err);
      ok = false;
    }

    const stored = readLocal();
    clearLocal(stored && stored.token);

    try { clearExpectedReauthAt(); } catch (e) { /* ignore */ }

    hideReauthModalLocal();
    return ok;
  }

  function onStorageEvent(e) {
    if (e.key !== LOCAL_KEY) return;
    const newVal = e.newValue ? JSON.parse(e.newValue) : null;
    if (newVal) {
      showReauthModalLocal({ fromStorageObj: newVal });
    } else {
      hideReauthModalLocal();
    }
  }

  function onBroadcastMessage(m) {
    try {
      if (!m || !m.data) return;
      const { type, payload } = m.data;
      if (type === 'require') {
        showReauthModalLocal({ fromStorageObj: payload });
      } else if (type === 'clear') {
        hideReauthModalLocal();
      }
    } catch (e) {}
  }

  async function initCrossTabReauth() {
    console.debug('BOOT LOG: initCrossTabReauth init');
    window.addEventListener('storage', onStorageEvent, false);
    if (bc) bc.onmessage = onBroadcastMessage;

    const stored = readLocal();
    if (stored) {
      if (Date.now() - (stored.ts || 0) > STALE_MS) {
        try {
          const lockStatus = await checkReauthLock();
          if (lockStatus.required) {
            writeLocal(buildStoredObj({ 
              token: stored.token, 
              ts: Date.now(), 
              reason: lockStatus.reason || stored.reason 
            }));
            showReauthModalLocal({ fromStorageObj: lockStatus });
            return;
          }
          clearLocal(stored.token);
        } catch (e) {
          console.warn('[REAUTH] Stale check via Supabase failed:', e);
        }
      }
      showReauthModalLocal({ fromStorageObj: stored });
    }

    setInterval(async () => {
      try {
        if (!isReauthModalVisible()) return;

        const storedNow = readLocal();
        if (!storedNow) return; // nothing to check

        const lockStatus = await checkReauthLock();
        if (!lockStatus.required) {
          clearLocal(storedNow.token);
          hideReauthModalLocal();
        }
      } catch (e) {
        console.warn('[REAUTH] Periodic Supabase check failed:', e);
      }
    }, CHECK_STATUS_INTERVAL_MS);
  }

  window.fgReauth = {
    requireReauth,
    completeReauth,
    isReauthRequired: () => !!readLocal()
  };

  try { initCrossTabReauth(); } catch (e) {}
})();






  async function forceInactivityCheck() {
    console.log('forceInactivityCheck called');
    if (idleTimeout) {
      clearTimeout(idleTimeout);
      idleTimeout = null;
    }
    await showInactivityPrompt();
  }

async function onSuccessfulReauth() {
  window.__REAUTH_COMPLETING__ = true;

  reauthModalOpen = false;
  try { cacheDomRefs(); } catch (e) {}

  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('fg_reauth_required_v1') || 'null'); } catch (e) {}
  const token = stored && stored.token ? String(stored.token) : null;
  try { localStorage.removeItem('fg_reauth_required_v1'); } catch (e) {}
  try { localStorage.removeItem('reauthPending'); } catch (e) {}

  try {
    if (reauthModal) {
      reauthModal.classList.add('hidden');
      try { reauthModal.removeAttribute('aria-modal'); } catch (e) {}
      try { reauthModal.removeAttribute('role'); } catch (e) {}
      if ('inert' in HTMLElement.prototype) {
        try { reauthModal.inert = false; } catch (e) {}
      } else {
        try { reauthModal.removeAttribute('aria-hidden'); reauthModal.style.pointerEvents = ''; } catch (e) {}
      }
    }
    const _pm = document.getElementById('promptModal');
    if (_pm) {
      try { _pm.classList.add('hidden'); _pm.removeAttribute('aria-hidden'); _pm.style.pointerEvents = ''; } catch (e) {}
    }
  } catch (e) { console.warn('[reauth] instant modal hide error', e); }

  try { setReauthActive(false); } catch (e) {}
  try { if (typeof resetReauthInputs === 'function') resetReauthInputs(); } catch (e) {}
  try { if (typeof disableReauthInputs === 'function') disableReauthInputs(false); } catch (e) {}
  try { if (typeof hideLoader === 'function') hideLoader(); } catch (e) {}
  try {
    if (window.__cachedAuthOptionsLock) {
      window.__cachedAuthOptionsLock = false;
      window.__cachedAuthOptionsLockSince = 0;
    }
  } catch (e) {}
  try {
    if (window.__simulatePinInterval) { clearInterval(window.__simulatePinInterval); window.__simulatePinInterval = null; }
    if (window.__simulatePinTimeout) { clearTimeout(window.__simulatePinTimeout); window.__simulatePinTimeout = null; }
  } catch (e) {}
  if (window.__persistentReauthLock) {
    try { window.__persistentReauthLock.clearLock(); } catch (e) {}
  }
  window.__REAUTH_LOCKED__ = false;

  if (window.__idleDetection) { try { window.__idleDetection.reset(); } catch (e) {} }
  try { if (typeof resetIdleTimer === 'function') resetIdleTimer(); } catch (e) {}

  try {
    const appRoot = document.querySelector('main') || document.body;
    if (appRoot && typeof appRoot.focus === 'function') appRoot.focus();
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('fg:reauth-success', { detail: { method: 'reauth' } }));
  } catch (e) {}
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('fg-reauth');
      bc.postMessage({ type: 'clear', payload: { token } });
    }
  } catch (e) {}
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: 'fg_reauth_required_v1', newValue: null }));
  } catch (e) {}

  Promise.resolve().then(async () => {
    try {
      let serverCleared = false;
      if (window.fgReauth && typeof window.fgReauth.completeReauth === 'function') {
        try {
          const r = await window.fgReauth.completeReauth().catch(() => null);
          serverCleared = (r === true || r === undefined || r === null) ? true : Boolean(r);
        } catch (e) { serverCleared = false; }
      } else {
        serverCleared = await clearReauthLock();
      }
      try { clearExpectedReauthAt(); } catch (e) {}
      console.log('[reauth] background server clear:', serverCleared ? 'ok' : 'failed');
    } catch (e) {
      console.warn('[reauth] background server clear error:', e);
    }

try {
      if (typeof window.__resetPlansState === 'function') {
        window.__resetPlansState();
      } else {
        if (typeof __plansLoaded !== 'undefined') __plansLoaded = false;
      }
      if (typeof fetchPlans === 'function') await fetchPlans();
      if (typeof dispatchPlansUpdateEvent === 'function') dispatchPlansUpdateEvent();
      if (typeof loadLatestHistoryAsFallback === 'function') try { loadLatestHistoryAsFallback(); } catch (e) {}
      if (typeof loadAdminFullHistory === 'function') try { loadAdminFullHistory(); } catch (e) {}
      console.log('[reauth] background data rehydration done');
    } catch (e) {
      console.warn('[reauth] background data rehydration failed:', e);
    }
    window.__REAUTH_COMPLETING__ = false;
  });

  return true;
}

window.__resetPlansState = function () {
  try {
    __plansLoaded = false;
    __allPlansCache = [];
  } catch (e) {}
};


  /* -----------------------
     Boot sequence
     ----------------------- */
  (async function initFlow() {
    console.debug('BOOT LOG: initFlow starting'); // at initFlow start
    console.log('initFlow started');
    try {
      {
  let pending = false;
  try { pending = !!JSON.parse(localStorage.getItem('fg_reauth_required_v1') || 'null'); } catch(e) {}
  await initReauthModal({ show: pending });
}

    } catch (e) {
      console.error('Error in initReauthModal boot:', e);
    }
    try {
      await setupInactivity();
    } catch (e) {
      console.error('Error in setupInactivity boot:', e);
    }
    console.log('initFlow completed');
  })();

window.__reauth = window.__reauth || {};

Object.assign(window.__reauth, {
  initReauthModal,
  setupInactivity,
  forceInactivityCheck,
  onSuccessfulReauth,
  showReauthModal,
  registerBiometrics,
  disableBiometrics, // New!
  verifyBiometrics,
  shouldReauth
});

try { if (!window.initReauthModal) window.initReauthModal = initReauthModal; } catch (e) {}
try { if (!window.setupInactivity) window.setupInactivity = setupInactivity; } catch (e) {}
try { if (!window.forceInactivityCheck) window.forceInactivityCheck = forceInactivityCheck; } catch (e) {}
try { if (!window.showReauthModal) window.showReauthModal = showReauthModal; } catch (e) {}
try { if (!window.onSuccessfulReauth) window.onSuccessfulReauth = onSuccessfulReauth; } catch (e) {}
try { if (!window.registerBiometrics) window.registerBiometrics = registerBiometrics; } catch (e) {}
try { if (!window.disableBiometrics) window.disableBiometrics = disableBiometrics; } catch (e) {}

})();

(function attachStablePhoneFormatter_Last(){
  if (window.__phoneLiveFormatterInstalled) {
    return;
  }
  window.__phoneLiveFormatterInstalled = true;

  function formatProgressiveNG(digits){
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return digits.replace(/(\d{4})(\d+)/, '$1 $2');
    return digits.replace(/(\d{4})(\d{3})(\d+)/, '$1 $2 $3');
  }

  function getPhoneEl() {
    return document.getElementById('phone-input');
  }

  function attachTo(el){
    if (!el) return false;
    if (el.__stableFormatterAttached) return true;
    el.__stableFormatterAttached = true;

    try { window.__phoneLiveFormatterAttached = true; } catch(e){}
    console.log('%c📱 Phone Formatter Active', 'color: lime; font-weight: bold;');

    var composing = false;

    el.addEventListener('compositionstart', function(){ composing = true; }, false);
    el.addEventListener('compositionend', function(){ composing = false; scheduleFormat(); }, false);

    var scheduled = null;
    function scheduleFormat(){
      if (composing) return;
      if (scheduled) return;
      scheduled = setTimeout(function(){
        scheduled = null;
        try { applyFormatting(el); } catch(err){ console.error('phone format err', err); }
      }, 0);
    }

    function applyFormatting(inputEl){
      var selStart = inputEl.selectionStart || 0;
      var rawBefore = (inputEl.value.slice(0, selStart).match(/\d/g) || []).join('');
      var allDigits = (inputEl.value.match(/\d/g) || []).join('');
      var formatted = formatProgressiveNG(allDigits);

      if (formatted === inputEl.value){
        try{ inputEl.dataset.raw = allDigits; }catch(e){}
        return;
      }

      inputEl.value = formatted;
      try{ inputEl.dataset.raw = allDigits; }catch(e){}

      var dcount = 0, newPos = 0;
      if (rawBefore.length === 0) newPos = 0;
      else {
        for (var i=0;i<formatted.length;i++){
          if (/\d/.test(formatted[i])) dcount++;
          newPos = i + 1;
          if (dcount >= rawBefore.length) break;
        }
      }
      if (newPos > formatted.length) newPos = formatted.length;
      try { inputEl.setSelectionRange(newPos, newPos); } catch(e){}
    }

    el.addEventListener('input', scheduleFormat, false);
    el.addEventListener('blur', function(){ if(!composing) applyFormatting(el); }, false);

    var watch = null;
    el.addEventListener('focus', function(){
      scheduleFormat();
      if (watch) clearInterval(watch);
      watch = setInterval(function(){
        try {
          var digits = (el.value.match(/\d/g) || []).join('');
          var expected = formatProgressiveNG(digits);
          if (expected !== el.value) applyFormatting(el);
        } catch(e){}
      }, 180);
    }, false);

    el.addEventListener('blur', function(){
      if (watch){ clearInterval(watch); watch = null; }
    }, false);

    var mo = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function(node){
          if (node && node.id === 'phone-input' && node !== el){
            try { attachTo(node); } catch(e){}
          }
        });
      });
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });

    return true;
  }
  

  (function tryAttach(count){
    var el = getPhoneEl();
    if (el) { attachTo(el); return; }
    if (count > 60) {
      console.warn('Phone formatter: element #phone-input not found, giving up after attempts');
      return;
    }
    setTimeout(function(){ tryAttach(count+1); }, 200);
  })(0);

})();



updateContinueState();







})();
