/* checkout.js - Production-ready checkout modal handler
   Handles checkout modal display, payment processing, and authentication
   Integrates with dashboard.js for user state and biometric/PIN verification
*/
['log', 'debug', 'warn', 'error', 'info'].forEach(m => console[m] = () => {});

window.addEventListener('unhandledrejection', e => e.preventDefault());
window.onerror = () => true;
console.log('[checkout] Module loaded 🛒');

'use strict';
// ==================== STATE ====================
let checkoutData = null; // Stores current checkout information

// ======= SAFE USER STATE ACCESS (use window.getUserState if defined) =======
const safeGetUserState = () => {
  try {
    if (typeof window.getUserState === 'function') {
      return window.getUserState() || {};
    }
    const raw = localStorage.getItem('userState');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('[checkout] safeGetUserState parse error', e);
    return {};
  }
};

// ==================== DEBT-RISK WARNING MODAL ====================
function showDebtRiskWarning(checkoutData) {
  return new Promise((resolve, reject) => {
    const isPosAgent = safeGetUserState().is_pos_agent === true;

    // Build the message
    const warningMsg = isPosAgent
      ? `⚠️ <b>Important — Please Confirm With Your Customer</b><br><br>` +
        `This <b>${checkoutData.provider} ${checkoutData.dataAmount}</b> plan will <b>NOT</b> be delivered if your customer currently owes MTN airtime.<br><br>` +
        `MTN will automatically convert this purchase into an airtime debt repayment instead of sending data.<br><br>` +
        `Please confirm your customer has <b>no outstanding MTN debt</b> before proceeding.`
      : `⚠️ <b>Important Notice</b><br><br>` +
        `This <b>${checkoutData.provider} ${checkoutData.dataAmount}</b> plan will <b>NOT</b> be delivered if you currently owe MTN airtime.<br><br>` +
        `MTN will automatically convert this purchase into an airtime debt repayment instead of sending you data.<br><br>` +
        `Please make sure you have <b>no outstanding MTN debt</b> before proceeding.`;

    // Create modal HTML
    const backdropId = 'debt-risk-backdrop';
    let backdrop = document.getElementById(backdropId);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = backdropId;
      backdrop.className = 'modal-backdrop';
      backdrop.style.cssText = `
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(0,0,0,0.5); z-index:9999999;
        display: flex; align-items: center; justify-content: center;
        animation: fadeIn 0.3s ease;
      `;
      backdrop.innerHTML = `
        <div style="background: white; max-width: 500px; width: 90%; padding: 24px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative;">
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="font-size: 40px;">⚠️</span>
          </div>
          <div id="debt-warning-text" style="font-size: 15px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            ${warningMsg}
          </div>
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 20px; background: #f8f9fa; padding: 12px; border-radius: 12px;">
            <input type="checkbox" id="debt-ack-checkbox" style="margin-top: 3px; width: 18px; height: 18px; cursor: pointer;">
            <label for="debt-ack-checkbox" style="font-size: 14px; color: #555; cursor: pointer;">
              I understand and confirm that the recipient has <b>no outstanding MTN debt</b>.
            </label>
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="debt-proceed-btn" style="flex:1; padding: 14px; border: none; border-radius: 50px; background: #00bfa5; color: white; font-weight: 600; font-size: 16px; opacity: 0.5; cursor: not-allowed; transition: opacity 0.2s;">
              Proceed
            </button>
            <button id="debt-cancel-btn" style="flex:1; padding: 14px; border: none; border-radius: 50px; background: #e0e0e0; color: #333; font-weight: 600; font-size: 16px; cursor: pointer;">
              Cancel
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      // Checkbox enable/disable proceed
      const checkbox = backdrop.querySelector('#debt-ack-checkbox');
      const proceedBtn = backdrop.querySelector('#debt-proceed-btn');
      checkbox.addEventListener('change', () => {
        proceedBtn.style.opacity = checkbox.checked ? '1' : '0.5';
        proceedBtn.style.cursor = checkbox.checked ? 'pointer' : 'not-allowed';
      });

      // Proceed
      proceedBtn.addEventListener('click', () => {
        if (!checkbox.checked) return;
        backdrop.remove();
        resolve(true);
      });

      // Cancel
      backdrop.querySelector('#debt-cancel-btn').addEventListener('click', () => {
        backdrop.remove();
        resolve(false);
      });

      // Click on backdrop -> cancel
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.remove();
          resolve(false);
        }
      });
    }
  });
}


// Synchronous PIN check using localStorage
function checkPinExists(context = 'checkout') {
  try {
    const hasPin = localStorage.getItem('hasPin');
    // localStorage stores everything as strings, so convert to boolean
    return hasPin === 'true';
  } catch (err) {
    console.error('[checkout] Failed to read PIN from localStorage:', err);
    return false; // fail-safe: assume no PIN
  }
}

// Usage example
if (checkPinExists()) {
  console.log('PIN exists, proceed.');
} else {
  console.log('No PIN found, prompt user.');
}


// ==================== HELPER: GATHER CHECKOUT DATA ====================
function gatherCheckoutData() {
  try {
    const state = getUserState();

    // Provider (keep your existing logic)
    let selectedProvider = document.querySelector('.provider-box.selected');
    if (!selectedProvider) {
      const slider = document.querySelector('.slider');
      if (slider) {
        const classes = slider.className.split(' ');
        const providerClass = classes.find(c => ['mtn', 'airtel', 'glo', 'ninemobile'].includes(c.toLowerCase()));
        if (providerClass) selectedProvider = document.querySelector(`.provider-box.${providerClass}`);
      }
    }

    if (!selectedProvider) {
      showToast('Please select a network provider', 'error');
      return null;
    }

    let provider = ['mtn', 'airtel', 'glo', 'ninemobile'].find(p => selectedProvider.classList.contains(p));
    if (provider === 'ninemobile') provider = '9mobile';
    if (!provider) {
      showToast('Invalid provider selected', 'error');
      return null;
    }

    // Phone
    const phoneInput = document.getElementById('phone-input');
    const number = phoneInput?.value.trim() || '';
    if (!number || number.length < 10) {
      showToast('Please enter a valid phone number', 'error');
      return null;
    }

    

    // Plan — use real data-plan-id
    let selectedPlan = state.selectedPlan;

    if (!selectedPlan) {
      const selectedBox = document.querySelector('.plan-box.selected');
      if (selectedBox && selectedBox.dataset.planId) {
        selectedPlan = {
          planId: selectedBox.dataset.planId,
          price: parseFloat(selectedBox.dataset.price || 0),
          dataAmount: selectedBox.dataset.dataAmount || selectedBox.querySelectorAll('div')[1]?.textContent?.trim() || 'N/A',
          validity: selectedBox.dataset.validity || selectedBox.querySelectorAll('div')[2]?.textContent?.trim() || 'N/A',
          type: selectedBox.dataset.type || 'GIFTING'
        };
      }
    }

    // Fallback to last saved
    if (!selectedPlan || !selectedPlan.planId) {
      try {
        const saved = localStorage.getItem('lastSelectedPlan');
        if (saved) selectedPlan = JSON.parse(saved);
      } catch (e) {}
    }

    if (!selectedPlan || !selectedPlan.planId) {
      showToast('Please select a data plan', 'error');
      return null;
    }

    if (selectedPlan.price <= 0) {
      showToast('Invalid plan price', 'error');
      return null;
    }

    const checkoutInfo = {
      provider: provider.toUpperCase(),
      planId: selectedPlan.planId,
      planName: `${selectedPlan.dataAmount} (${selectedPlan.validity})`,
      dataAmount: selectedPlan.dataAmount,
      validity: selectedPlan.validity,
      price: selectedPlan.price,
      number: number,
      rawNumber: number.replace(/\s/g, ''),
      planType: selectedPlan.type,
      debt_risk: selectedPlan.debt_risk || false,
    };

    console.log('[checkout] Gathered real checkout data:', checkoutInfo);
    return checkoutInfo;

  } catch (err) {
    console.error('[checkout] Error gathering data:', err);
    showToast('Failed to prepare checkout', 'error');
    return null;
  }
}



// ==================== DOM READY ====================
function domReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb);
  } else cb();
}




const hasPin = () => {
  try {
    const state = getUserState();
    return !!(state.pin && state.pin.length === 4);
  } catch (e) {
    return false;
  }
};

function isProfileComplete() {
  const state = safeGetUserState();

  // Checkout phone input
  const checkoutPhone =
    document.getElementById('phone-input')?.value?.trim() ||
    state.number; // fallback if already saved

  return !!(
    checkoutPhone &&
    checkoutPhone.length >= 10
  );
}



function getAvailableBalance() {
  const balanceReal = document.querySelector('.balance-real');
  if (balanceReal && balanceReal.textContent) {
    return parseFloat(balanceReal.textContent.replace(/[₦,\s]/g, '')) || 0;
  }
  const state = getUserState();
  return parseFloat(state.balance) || 0;
}

function saveSelectedPlan(plan) {
  const state = getUserState();
  state.selectedPlan = plan;
  localStorage.setItem('userState', JSON.stringify(state));
  localStorage.setItem('lastSelectedPlan', JSON.stringify(plan));
}
window.saveSelectedPlan = saveSelectedPlan;

// ==================== CHECKOUT MODAL FUNCTIONS ====================
function openCheckoutModal(data) {
  console.log('[checkout] Opening modal with data:', data);

  let checkoutInfo;

  // ────────────────────────────────────────────────
  // 1. Gather and validate checkout data
  // ────────────────────────────────────────────────
  if (data && data.provider && data.planId && data.price && data.number) {
    checkoutInfo = {
      provider: data.provider.toUpperCase(),
      planId: data.planId,
      planName: data.planName || `${data.dataAmount} Plan`,
      dataAmount: data.dataAmount || 'N/A',
      validity: data.validity || '30 Days',
      price: parseFloat(data.price) || 0,
      number: data.number,
      rawNumber: data.rawNumber || data.number.replace(/\s/g, ''),
      planType: data.planType || 'GIFTING',
      debt_risk: data.debt_risk || false,
    };
    console.log('[checkout] Using explicitly passed data (recommended)');
  } else {
    console.warn('[checkout] No data passed — falling back to DOM scraping');
    checkoutInfo = gatherCheckoutData();
  }

  if (!checkoutInfo || !checkoutInfo.provider || !checkoutInfo.price || !checkoutInfo.number) {
    console.error('[checkout] Invalid checkout data:', checkoutInfo);
    showToast('Missing checkout information. Please try again.', 'error');
    return;
  }

  // Save reference
  checkoutData = checkoutInfo;

  // Save price debug/info
  localStorage.setItem('lastCheckoutPrice', checkoutInfo.price.toString());
  console.log('[PRICE DEBUG] Saved to localStorage:', {
    price: checkoutInfo.price,
    savedValue: localStorage.getItem('lastCheckoutPrice'),
    isSpecial: checkoutInfo.planId.includes('special') || 
               checkoutInfo.planName?.toLowerCase().includes('special')
  });

  // ────────────────────────────────────────────────
  // 2. Get modal element early
  // ────────────────────────────────────────────────
  const modal = document.getElementById('checkoutModal');
  if (!modal) {
    console.error('[checkout] Modal element not found');
    showToast('Checkout modal not available', 'error');
    return;
  }

  const payBtn = document.getElementById('payBtn');

  try {
    // ────────────────────────────────────────────────
    // 3. Populate content BEFORE showing (critical for perceived speed)
    // ────────────────────────────────────────────────
    const priceEl = document.getElementById('checkout-price');
    if (priceEl) {
      priceEl.textContent = `₦${checkoutInfo.price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }

    const serviceEl = document.getElementById('checkout-service');
    if (serviceEl) serviceEl.textContent = 'Mobile Data';

    const providerEl = document.getElementById('checkout-provider');
    if (providerEl) {
      let providerKey = checkoutInfo.provider.toLowerCase() === '9mobile' 
        ? 'ninemobile' 
        : checkoutInfo.provider.toLowerCase();
      const svg = svgShapes?.[providerKey] || '';
      providerEl.innerHTML = svg + ' ' + checkoutInfo.provider;
    }

    const phoneEl = document.getElementById('checkout-phone');
    if (phoneEl) phoneEl.textContent = checkoutInfo.number;

    const dataEl = document.getElementById('checkout-data');
    if (dataEl) dataEl.textContent = `${checkoutInfo.dataAmount} / ${checkoutInfo.validity}`;

    const amountEls = modal.querySelectorAll('.info-row:last-child .value');
    amountEls.forEach(el => {
      el.textContent = `₦${checkoutInfo.price.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    });

    const balance = getAvailableBalance();
    const balanceEl = document.getElementById('checkout-balance');
    if (balanceEl) {
      balanceEl.textContent = `₦${balance.toLocaleString('en-NG', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    }

    if (payBtn) {
      payBtn.disabled = false;
      payBtn.classList.add('active');
    }

    console.log('[checkout] Modal content populated successfully');

    // ────────────────────────────────────────────────
    // 4. Let ModalManager handle visibility, animation, stack, history, focus trap
    // ────────────────────────────────────────────────
    if (window.ModalManager && typeof window.ModalManager.openModal === 'function') {
      // Optional: clean any stale state first
      if (ModalManager.getOpenModals().includes('checkoutModal')) {
        console.warn('[checkout] checkoutModal was already in stack — forcing clean close first');
        ModalManager.forceCloseModal?.('checkoutModal');
      }

      ModalManager.openModal('checkoutModal');
      console.log('[checkout] Successfully delegated open to ModalManager');
    } else {
      // Very safe fallback only if ModalManager is completely missing
      console.warn('[checkout] ModalManager not found — using basic fallback open');
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }

  } catch (err) {
    console.error('[checkout] Error preparing or opening checkout modal:', err);
    showToast('Failed to load checkout details', 'error');
  }
}


function requireTransactionReady() {
  try {
    // 1. Profile check
    const profileCompleted = localStorage.getItem('profileCompleted') === 'true';
    if (!profileCompleted) {
      showToast('Please complete your profile before making transactions.', 'error');

      if (typeof window.openUpdateProfileModal === 'function') {
        window.openUpdateProfileModal();
        ModalManager.openModal('updateProfileModal');
        console.log('open modals:', ModalManager.getOpenModals());
      } else if (typeof window.openProfileModal === 'function') {
        window.openProfileModal();
      }
      return false;
    }

    // 2. PIN check
    const hasPin = localStorage.getItem('hasPin') === 'true';
    if (!hasPin) {
      showToast('Please set up your transaction PIN before proceeding.', 'error');

      // Delay opening modal slightly for smooth animation
      setTimeout(() => {
        ModalManager.openModal('pinModal');
      }, 300);

      // STOP further execution until user sets PIN
      return false;
    }

    // All checks passed
    return true;
  } catch (err) {
    console.error('[checkout] requireTransactionReady error:', err);
    showToast('Security check failed. Please reload the page.', 'error');
    return false;
  }
}




// Extracted payment logic so we can call it after security checks
async function continueCheckoutFlow() {
  const payBtn = document.getElementById('payBtn');
  if (!payBtn) return;
 
  const originalText = payBtn.textContent;
  payBtn.disabled = true;
  payBtn.textContent = 'Processing...';
 
  try {
      checkoutData = gatherCheckoutData();
      if (!checkoutData) throw new Error('Invalid checkout data');

      // ── Debt‑risk warning (MTN plans that auto‑convert to airtime if recipient owes) ──
      if (checkoutData.debt_risk) {
        const acknowledged = await showDebtRiskWarning(checkoutData);
        if (!acknowledged) {
          // User cancelled – stop flow
          payBtn.disabled = false;
          payBtn.textContent = originalText;
          return;
        }
      }

      const authResult = await triggerCheckoutAuthWithDedicatedModal();
 
    if (!authResult?.success) {
      // Biometric path calls showLoader before resolving — make sure it's cleared
      // on cancellation too so the loader never gets stuck
      try { hideLoader(); } catch (e) {}
      payBtn.disabled = false;
      payBtn.textContent = originalText;
      return;
    }
 
    // Force-save price before receipt
    if (checkoutData?.price && !isNaN(checkoutData.price)) {
      localStorage.setItem('lastCheckoutPrice', checkoutData.price.toString());
    }
 
    showProcessingReceipt(checkoutData);
 
    // Hide loader now that receipt is visible — biometric path called showLoader
    // manually at button-click time; PIN path used withLoader in verifyPin.
    // Either way, decrement once here so the screen is never stuck.
    try { hideLoader(); } catch (e) {}
 
    // ✅ Pass authResult so processPayment can attach the token
    const result = await processPayment(authResult);
 
    pollForFinalStatus(result.reference);
 
  } catch (err) {
    console.error('[checkout] Payment failed:', err);
 
    if (err.message && err.message.includes('Insufficient balance')) {
      const match = err.message.match(/₦([\d,]+)/);
      const currentBal = match ? parseFloat(match[1].replace(/,/g, '')) : 0;
      updateReceiptToInsufficient('You do not have enough balance to complete this purchase.', currentBal);
    } else {
      updateReceiptToFailed(err.message || 'Purchase failed. Please try again.');
    }
    
  } finally {
    // Always clear any loader that may have been left open
    try { hideLoader(); } catch (e) {}
    const payBtnFinal = document.getElementById('payBtn');
    if (payBtnFinal) {
      payBtnFinal.disabled = false;
      payBtnFinal.textContent = originalText;
    }
  }
}


// Replacement for closeCheckoutModal function in checkout.js
function closeCheckoutModal() {
  const modalId = 'checkoutModal';
  const modal = document.getElementById(modalId);
  if (!modal) return;

  try {
    // Stop biometric
    if (typeof window.stopModalBiometricRewarming === 'function') {
      window.stopModalBiometricRewarming();
    }

    // Let ModalManager close
    if (window.ModalManager && typeof window.ModalManager.forceCloseModal === 'function') {
      window.ModalManager.forceCloseModal(modalId);
    } else {
      // Fallback
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }

    // Extra force-remove active + clear data
    modal.classList.remove('active');
    checkoutData = null;
    history.replaceState({ isModal: false }, '', window.location.pathname);

    console.log('[checkout] Close completed with extra cleanup');
  } catch (err) {
    console.error('[checkout] Close error:', err);
  }
}


// Reset UI after successful purchase (FULL CLEAN RESET TO MTN)
// Replace your resetCheckoutUI() function (lines 185-248) with this:
function resetCheckoutUI() {
  console.log('[checkout] 🧹 Performing full UI reset after successful purchase');

  // 1. Clear phone input
  const phoneInput = document.getElementById('phone-input');
  if (phoneInput) {
    phoneInput.value = '';
    phoneInput.classList.remove('invalid');
    console.log('[checkout] ✓ Phone cleared');
  }

  // 2. Remove .selected from ALL plan boxes (dashboard + modal) + remove provider classes
  const providerClasses = ['mtn', 'airtel', 'glo', 'ninemobile'];
  document.querySelectorAll('.plan-box.selected').forEach(el => {
    el.classList.remove('selected', ...providerClasses);
    // Also remove the price styling
    const amount = el.querySelector('.plan-amount');
    if (amount) amount.classList.remove('plan-price');
  });
  console.log('[checkout] ✓ All selected plans cleared');

  // 3. Remove active from all provider boxes
  document.querySelectorAll('.provider-box').forEach(el => {
    el.classList.remove('active', 'selected');
  });

  // 4. Set MTN as active provider
  const mtnBox = document.querySelector('.provider-box.mtn');
  if (mtnBox) {
    mtnBox.classList.add('active');
    console.log('[checkout] ✓ MTN set as active');
  }

  // 5. Move slider to MTN (call dashboard function if available, else do it manually)
  const slider = document.querySelector('.provider-grid .slider, .slider');
  if (slider && mtnBox) {
    // Try to use dashboard's function first
    if (typeof window.moveSliderTo === 'function') {
      window.moveSliderTo(mtnBox);
      console.log('[checkout] ✓ Slider moved via moveSliderTo()');
    } else {
      // Manual fallback
      slider.className = 'slider mtn';
      const svgPaths = {
        mtn: '/frontend/svg/MTN-icon.svg'
      };
      slider.innerHTML = `
        <img src="${svgPaths.mtn}" alt="MTN" class="provider-icon" />
        <div class="provider-name">MTN</div>
      `;
      
      // Position slider on MTN box
      const boxRect = mtnBox.getBoundingClientRect();
      const gridRect = mtnBox.parentElement.getBoundingClientRect();
      const scrollContainer = mtnBox.closest('.provider-grid');
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      const left = boxRect.left - gridRect.left + scrollLeft;
      const top = boxRect.top - gridRect.top;
      
      slider.style.left = `${left}px`;
      slider.style.top = `${top}px`;
      slider.style.width = `${boxRect.width}px`;
      slider.style.height = `${boxRect.height}px`;
      slider.style.transition = 'all 0.3s ease';
      
      console.log('[checkout] ✓ Slider moved manually');
    }
  }

  // 6. Reset plans row to MTN
  const plansRow = document.querySelector('.plans-row');
  if (plansRow) {
    plansRow.classList.remove(...providerClasses);
    plansRow.classList.add('mtn');
    console.log('[checkout] ✓ Plans row set to MTN');
  }

  // 7. Re-render MTN plans (critical - ensures fresh MTN plans are shown)
  if (typeof window.renderDashboardPlans === 'function') {
    window.renderDashboardPlans('mtn');
    console.log('[checkout] ✓ MTN plans re-rendered');
  }
  
  if (typeof window.renderModalPlans === 'function') {
    window.renderModalPlans('mtn');
    console.log('[checkout] ✓ Modal plans re-rendered');
  }

  // 8. Re-attach plan listeners
  if (typeof window.attachPlanListeners === 'function') {
    window.attachPlanListeners();
    console.log('[checkout] ✓ Plan listeners re-attached');
  }

  // 9. Clear saved state completely
  try {
    // Clear userState but keep user info
    const rawState = localStorage.getItem('userState');
    if (rawState) {
      const state = JSON.parse(rawState);
      // Only clear transaction-related data
      delete state.selectedPlan;
      delete state.planId;
      delete state.provider;
      delete state.number;
      localStorage.setItem('userState', JSON.stringify(state));
    }
    
    // Remove specific checkout keys
    localStorage.removeItem('lastSelectedPlan');
    
    // Clear session state (prevents restoreEverything from bringing back old data)
    sessionStorage.removeItem('__fg_app_state_v2');
    
    // Clear provider-specific plan tracking
    if (typeof window.selectedPlanByProvider === 'object') {
      Object.keys(window.selectedPlanByProvider).forEach(key => {
        delete window.selectedPlanByProvider[key];
      });
    }
    
    console.log('[checkout] ✓ All saved states cleared');
  } catch (err) {
    console.warn('[checkout] Failed to clear storage during reset:', err);
  }

  // 10. Update UI state (continue button, contact/cancel button)
  if (typeof window.updateContinueState === 'function') {
    window.updateContinueState();
    console.log('[checkout] ✓ Continue button updated');
  }
  
  if (typeof window.updateContactOrCancel === 'function') {
    window.updateContactOrCancel();
    console.log('[checkout] ✓ Contact/cancel button updated');
  }

  // 11. Save the clean state
  if (typeof window.saveUserState === 'function') {
    window.saveUserState();
    console.log('[checkout] ✓ Clean state saved');
  }
  
  if (typeof window.saveCurrentAppState === 'function') {
    window.saveCurrentAppState();
    console.log('[checkout] ✓ App state saved');
  }

  console.log('[checkout] ✅ Full reset complete — fresh MTN state restored');
}

// ==================== AUTHENTICATION WITH DEDICATED PIN MODAL ====================
async function triggerCheckoutAuthWithDedicatedModal() {
  return new Promise((resolve) => {
    window._checkoutPinResolve = (authResult) => {
  delete window._checkoutPinResolve;
  resolve(authResult);
};


    if (typeof window.showCheckoutPinModal === 'function') {
      window.showCheckoutPinModal();
    } else {
      console.error('[checkout] showCheckoutPinModal not available');
      resolve(false);
    }
  });
}

function formatPhoneForAPI(phone) {
  const cleaned = phone.replace(/\s/g, '');
  // Strip +234 or 234 prefix → convert back to 0XXXXXXXXXX
  if (cleaned.startsWith('+234')) {
    return '0' + cleaned.slice(4);
  }
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return '0' + cleaned.slice(3);
  }
  // Already in 080... format
  return cleaned;
}

// ==================== REAL PAYMENT PROCESSING (WITH LOADER) ====================
// ==================== REAL PAYMENT PROCESSING (NO LOADER OVERLAY) ====================
async function processPayment(authResult) {
  if (!checkoutData) throw new Error('No checkout data');

  // authResult comes from triggerCheckoutAuthWithDedicatedModal()
  // it contains either pinToken (from PIN verify) or biometricToken (from WebAuthn)
  const pinToken = authResult?.pinToken || authResult?.biometricToken || null;

  if (!pinToken) {
    throw new Error('PIN verification token missing. Please verify your PIN again.');
  }

  const payload = {
    plan_id:  checkoutData.planId,
      phone:    formatPhoneForAPI(checkoutData.rawNumber || checkoutData.number),
    provider: checkoutData.provider.toUpperCase(), // backend expects uppercase
  };

  console.log('[PAYLOAD]', payload);

  const response = await fetch('https://api.flexgig.com.ng/api/transactions/buy-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PIN-TOKEN': pinToken,           // ✅ required by backend
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const result = await response.json();

  if (!response.ok) {
    // Map backend error codes to user-friendly messages
    switch (result.code) {
      case 'PIN_TOKEN_REQUIRED':
      case 'PIN_TOKEN_INVALID':
      case 'PIN_TOKEN_MISMATCH':
      case 'PIN_TOKEN_WRONG_ACTION':
      case 'PIN_TOKEN_ALREADY_USED':
        throw new Error('PIN session expired. Please verify your PIN again.');
      case 'ACCOUNT_FLAGGED':
        throw new Error(
          'Your account has been temporarily restricted. Please contact support to resolve this.'
        );
      default:
        if (result.error === 'insufficient_balance' || result.current_balance !== undefined) {
          throw new Error(`Insufficient balance: ₦${result.current_balance?.toLocaleString() || '0'}`);
        }
        throw new Error(result.message || 'Purchase failed');
    }
  }

  checkoutData.reference  = result.reference;
  checkoutData.new_balance = result.new_balance;

  return result;
}




// Main pay handler - minimal wrapper to run security checks first
async function onPayClicked(ev) {
  console.log('[checkout] Pay button clicked');
  ev?.preventDefault?.();

  // Do not disable the button until security checks pass
  const ready = await requireTransactionReady();
  if (!ready) {
    console.log('[checkout] Transaction guard failed or user needs to complete setup');
    return;
  }

  // If we get here, profile + PIN are OK — proceed
  await continueCheckoutFlow();
}

// ==================== DEDICATED CHECKOUT PIN MODAL LOGIC ====================
(function() {
  const modal = document.getElementById('checkout-pin-modal');
  if (!modal) {
    console.warn('[checkout-pin] Modal element not found');
    return;
  }

  const inputs = modal.querySelectorAll('.checkout-pin-digit');
  const biometricBtn = document.getElementById('checkout-biometric-btn');
  const deleteBtn = document.getElementById('checkout-delete-btn');
  const forgotLink = document.getElementById('checkout-forgot-pin-link');
  const closeBtn = modal.querySelector('.checkout-close-btn');

  let currentPin = '';

  function isBiometricEnabledForTx() {
    return localStorage.getItem('biometricForTx') === 'true' ||
           localStorage.getItem('biometricForCheckout') === 'true' ||
           localStorage.getItem('biometricForTransactions') === 'true';
  }
  window.isBiometricEnabledForTx = isBiometricEnabledForTx;
 
  // ── Post-use re-warm: fetch a fresh challenge right after consuming one ──
  // Called after every biometric attempt (success or failure) so the NEXT
  // transaction never blocks on a cold fetch or hits a consumed challenge.
  function _checkoutBiometricRewarm() {
    if (!isBiometricEnabledForTx()) return;
 
    const uid =
      window.currentUser?.uid ||
      window.__SERVER_USER_DATA__?.uid ||
      (() => {
        try { return JSON.parse(localStorage.getItem('userData') || '{}').uid; }
        catch (e) { return null; }
      })();
 
    if (!uid) return;
 
    // Null out stale cache so warmBiometricOptions always fetches fresh
    window.__cachedAuthOptions = null;
    window.__cachedAuthOptionsFetchedAt = 0;
    try { localStorage.removeItem('__cachedAuthOptions'); } catch (e) {}
    if (typeof window.invalidateAuthOptionsCache === 'function') {
      window.invalidateAuthOptionsCache();
    }
 
    // Fire-and-forget — does not block the current transaction flow
    if (typeof window.warmBiometricOptions === 'function') {
      window.warmBiometricOptions(uid, 'buy-data', { force: true })
        .then(opts => {
          if (opts) console.log('[checkout] 🔥 Biometric pre-warmed for next transaction');
          else      console.warn('[checkout] Biometric re-warm returned null');
        })
        .catch(err => console.warn('[checkout] Biometric re-warm failed:', err));
    }
  }
  window._checkoutBiometricRewarm = _checkoutBiometricRewarm;
 
  function updateBiometricButton() {
    if (biometricBtn) {
      biometricBtn.style.display = isBiometricEnabledForTx() ? 'flex' : 'none';
    }
  }

  // React to storage changes (cross-tab)
window.addEventListener('storage', (e) => {
  if (['biometricsEnabled', 'biometricForTx', 'credentialId', 
       'security_biom_enabled', 'security_bio_tx'].includes(e.key)) {
    updateBiometricButton();
  }
});

// React to same-tab toggle changes
document.addEventListener('fg:switch-changed', (e) => {
  if (['bioTxSwitch', 'biometricsSwitch'].includes(e.detail?.id)) {
    updateBiometricButton();
  }
});
document.addEventListener('sec:switch-change', (e) => {
  if (['bioTxSwitch', 'biometricsSwitch'].includes(e.detail?.id)) {
    updateBiometricButton();
  }
});

  function updateInputs() {
  inputs.forEach((input, i) => {
    if (currentPin[i]) {
      input.classList.add('filled');
      input.value = '';  // Keep empty — we hide text completely
    } else {
      input.classList.remove('filled');
      input.value = '';
    }
  });
}

  function resetPin() {
    currentPin = '';
    updateInputs();
  }



  function hideCheckoutPinModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  resetPin();
}

  // Keypad
  modal.querySelectorAll('[data-digit]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentPin.length >= 4) return;
      currentPin += btn.dataset.digit;
      updateInputs();
      if (currentPin.length === 4) {
        verifyPin(currentPin);

      }
    });
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      currentPin = currentPin.slice(0, -1);
      updateInputs();
    });
  }
    // === LAPTOP / PHYSICAL KEYBOARD SUPPORT ===
  document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return; // Only when modal is open

    // Allow digits 0-9
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault(); // Prevent default input behavior
      if (currentPin.length < 4) {
        currentPin += e.key;
        updateInputs();
        if (currentPin.length === 4) {
          verifyPin(currentPin);

        }
      }
    }
    // Backspace to delete last digit
    else if (e.key === 'Backspace') {
      e.preventDefault();
      currentPin = currentPin.slice(0, -1);
      updateInputs();
    }
    // Escape to close modal (cancel)
    else if (e.key === 'Escape') {
      hideCheckoutPinModal();
      if (window._checkoutPinResolve) window._checkoutPinResolve(false);
    }
  });

  // Biometric
// === BIOMETRIC AUTH HANDLER ===
// Matches dashboard.js reauth pattern:
//   click → showLoader() immediately → tryBiometricWithCachedOptions()
//   → simulatePinEntry (modal still open, loader on top)
//   → server verify → resolve (caller's showProcessingReceipt hides the modal)
if (biometricBtn) {
  biometricBtn.addEventListener('click', async () => {
    await handleBiometricAuth();
  });
}

function showCheckoutPinModal() {
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  updateBiometricButton();
  resetPin();

  // Always reset button and input state fresh on every open
  inputs.forEach(i => { i.style.opacity = '1'; });
  if (biometricBtn) {
    biometricBtn.style.opacity = '1';
    biometricBtn.disabled = false;
    biometricBtn.classList.remove('loading');
  }

  if (!isBiometricEnabledForTx()) {
    inputs[0]?.focus();
    history.pushState({ checkoutPinModal: true }, '', window.location.href);
  }
}

// === SHARED BIOMETRIC AUTH FUNCTION ===
async function handleBiometricAuth() {

  // Restore input opacity so dots look active
  inputs.forEach(i => i.style.opacity = '1');
  if (biometricBtn) {
    biometricBtn.style.opacity = '1';
    biometricBtn.disabled = true;
    biometricBtn.classList.add('loading');
  }

  // ── 1. Show loader immediately — modal stays open behind loader during gesture ──
try { showLoader(); } catch (e) {}

try {
  let result = { success: false };

  try {
    let cachedAttempt = await tryBiometricWithCachedOptions();

    // ── Auto-retry on bad-challenge / type errors (first-click-after-reload) ──
    if (!cachedAttempt.ok && (cachedAttempt.reason === 'bad-challenge' || cachedAttempt.reason === 'no-cache' || cachedAttempt.reason === 'get-failed')) {
      console.log('[checkout-pin] Auto-retrying biometric with fresh options, reason:', cachedAttempt.reason);
      try {
        const retryUid =
          window.currentUser?.uid ||
          window.__SERVER_USER_DATA__?.uid ||
          (() => { try { return JSON.parse(localStorage.getItem('userData') || '{}').uid; } catch(e) { return null; } })();

        if (retryUid && typeof window.warmBiometricOptions === 'function') {
          window.__cachedAuthOptions = null;
          window.__cachedAuthOptionsFetchedAt = 0;
          try { localStorage.removeItem('__cachedAuthOptions'); } catch(e) {}
          const freshOpts = await window.warmBiometricOptions(retryUid, window._pinModalAction || 'buy-data', { force: true });
          if (freshOpts) {
            cachedAttempt = await tryBiometricWithCachedOptions();
          }
        }
      } catch (retryErr) {
        console.warn('[checkout-pin] Auto-retry failed:', retryErr);
      }
    }

    // ── Rewarm ONLY if gesture failed — if it succeeded, rewarm AFTER verify ──
    if (!cachedAttempt.ok) {
      _checkoutBiometricRewarm();
      try { hideLoader(); } catch (e) {}
      showToast('Biometric failed — please try again or use PIN.', 'info');
      inputs[0]?.focus();
      return;
    }

    // ── 2. Assertion succeeded: fill dots BEFORE hiding modal ──
    try {
      inputs.forEach(input => {
        input.classList.add('filled', 'simulated-pin');
        input.value = '';
      });
    } catch (e) {}

      const session = await (typeof getSession === 'function'
        ? getSession().catch(() => null)
        : Promise.resolve(null));
      const uid = session?.user?.uid || session?.user?.id ||
        (() => { try { return JSON.parse(localStorage.getItem('userData') || '{}').uid; } catch(e){ return null; } })();

      function bufToB64Url(buf) {
        const bytes = new Uint8Array(buf);
        let str = '';
        for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
        return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

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
        },
        userId: uid,
        action: window._pinModalAction || 'buy-data'
      };

      const verifyRes = await fetch((window.__SEC_API_BASE || 'https://api.flexgig.com.ng') + '/webauthn/auth/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // ── Rewarm NOW — after verify, regardless of result ──
      // Doing it before verify was overwriting the server session challenge mid-flight.
      _checkoutBiometricRewarm();

      const verifyData = await verifyRes.json().catch(() => ({}));
      if (verifyRes.ok && verifyData?.verified) {
        result = { success: true, data: verifyData, biometricToken: verifyData.token };
      }
    } catch (e) {
      console.warn('[checkout-pin] Biometric failed:', e);
    }

    if (result?.success) {
      console.log('[checkout-pin] Biometric success');

      // ── 3. On success: resolve first so caller can act, THEN hide modal.
      //    Loader stays visible — it bridges to showProcessingReceipt which calls hideLoader().
      //    Do NOT call hideLoader() here — the processing receipt screen does that.
      window._checkoutPinResolve?.({
        success: true,
        biometricToken: result.data?.token
      });

      // Hide modal AFTER resolving so the loader (already showing) covers the transition
      hideCheckoutPinModal();

      return;
    }

    // ── Biometric verification failed (server rejected) ──
    try { hideLoader(); } catch (e) {}
    showToast('Biometric failed or cancelled. Enter your PIN', 'info');
    inputs[0]?.focus();

  } catch (err) {
    console.warn('[checkout-pin] Biometric error:', err);
    try { hideLoader(); } catch (e) {}
    showToast('Biometric unavailable. Use your PIN', 'info');
    inputs[0]?.focus();

  } finally {
    if (biometricBtn) {
      biometricBtn.disabled = false;
      biometricBtn.classList.remove('loading');
    }
  }
}

  // Forgot PIN
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openForgetPinFlow === 'function') openForgetPinFlow();
      if (window._checkoutPinResolve) window._checkoutPinResolve(false);
    });
  }
  /* Global Forget PIN Flow — works from checkout, dashboard, anywhere */
window.openForgetPinFlow = async function openForgetPinFlow() {
  return await withLoader(async () => {

    // Find the link that triggered it (if any)
    const triggerLink =
      document.activeElement ||
      document.querySelector('#checkout-forgot-pin-link') ||
      document.querySelector('[href="#forget-pin"]');

    let originalText = '';
    if (triggerLink) {
      originalText = triggerLink.textContent;
      triggerLink.textContent = 'Processing...';
      triggerLink.classList.add('processing');
      triggerLink.disabled = true;
    }

    try {
      // === RESOLVE EMAIL SMARTLY ===
      let email =
        window.currentUser?.email ||
        window.__SERVER_USER_DATA__?.email ||
        localStorage.getItem('userEmail') ||
        localStorage.getItem('email');

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        email = prompt('Enter your registered email to receive OTP:');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          throw new Error('Valid email required');
        }
        email = email.trim().toLowerCase();
      }

      // === SEND OTP ===
      const resp = await fetch('https://api.flexgig.com.ng/auth/resend-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.message || 'Failed to send OTP');
      }

      showToast(`OTP sent to ${email}`, 'success');

      // === OPEN RESET PIN MODAL ===
      const modal = document.getElementById('resetPinModal');
      if (modal) {
        hideCheckoutPinModal();
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        const emailInput = modal.querySelector(
          'input[type="email"], #reset-pin-email'
        );
        if (emailInput) emailInput.value = email;

        modal.querySelector('input, button')?.focus();
      } else {
        showToast(
          'OTP sent! Please check your email and reset PIN from profile.',
          'info'
        );
      }

    } catch (err) {
      console.error('openForgetPinFlow error:', err);
      showToast(err.message || 'Failed to start PIN reset', 'error');
      throw err; // ⬅ ensures loader closes properly
    } finally {
      if (triggerLink) {
        triggerLink.textContent = originalText || 'Forgot PIN?';
        triggerLink.classList.remove('processing');
        triggerLink.disabled = false;
      }
    }
  });
};


  // Close
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideCheckoutPinModal();
      if (window._checkoutPinResolve) window._checkoutPinResolve(false);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      hideCheckoutPinModal();
      if (window._checkoutPinResolve) window._checkoutPinResolve(false);
    }
  });
async function verifyPin(pin) {
  // Simulate filled PIN inputs immediately (visual feedback before server round-trip)
  try {
    const pinInputs = Array.from(modal.querySelectorAll('.checkout-pin-digit'));
    pinInputs.forEach(input => {
      input.classList.add('filled', 'simulated-pin');
      input.value = '';
    });
  } catch (e) {}
 
  // Hide modal first so loader appears on the main screen, not behind the pin modal
  hideCheckoutPinModal();
 
  // Kick off a fresh biometric challenge in the background immediately.
  // Even if the user used PIN this time, biometric will be ready for their next purchase.
  _checkoutBiometricRewarm();
 
  const _withLoader = typeof withLoader === 'function' ? withLoader
    : (typeof window.withLoader === 'function' ? window.withLoader : fn => fn());

  return await _withLoader(async () => {
    let raw = '';
    try {
      const token = localStorage.getItem('token') || '';
      const action = window._pinModalAction || 'buy-data';
      const res = await fetch('https://api.flexgig.com.ng/api/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ pin, action })
      });

      // ✅ Read raw response as text first
      raw = await res.text();
      let data = {};

      // ✅ Try parse JSON safely
      try {
        data = raw ? JSON.parse(raw) : {};
        // Handle nested error object
        if (data.error) {
          data.code = data.error.code;
          data.message = data.error.message;
        }
      } catch (_) {
        console.warn('[verifyPin] JSON parse failed, raw:', raw);
      }

      // ✅ Log full info for debugging
      console.warn('[PIN VERIFY RESPONSE]', {
        status: res.status,
        code: data.code,
        message: data.message,
        raw
      });

      // ✅ Success path
      if (res.ok && data.pinToken) {
  window._checkoutPinResolve?.({
    success: true,
    pinToken: data.pinToken
  });
  return;
}


      // ❌ Error handling based on real server code/message
      switch (data.code) {
        case 'WRONG_PIN':
          showToast('Incorrect PIN. Try again.', 'error');
          window._checkoutPinResolve?.({ success: false, code: 'WRONG_PIN' });
          break;

        case 'PIN_NOT_SET':
          showToast('You have not set a PIN yet.', 'warning');
          hideCheckoutPinModal();
          break;

        case 'PIN_RATE_LIMITED':
          showToast('Too many attempts. Please wait.', 'error');
          break;

        case 'INVALID_SESSION':
          showToast('Session expired. Please login again.', 'error');
          forceLogout?.();
          break;

        case 'PIN_SERVICE_UNAVAILABLE':
          showToast('Network issue. Try again shortly.', 'error');
          break;
          
        case 'ACCOUNT_FLAGGED':
          hideCheckoutPinModal();
          showToast(
            'Your account has been temporarily restricted. Please contact support.',
            'error'
          );
          // Resolve the promise as cancelled so the purchase flow stops cleanly
          window._checkoutPinResolve?.({ success: false, code: 'ACCOUNT_FLAGGED' });
          break;

        default:
          showToast(data.message || 'PIN verification failed.', 'error');
          window._checkoutPinResolve?.({ success: false, code: data.code || 'UNKNOWN' });
      }

    } catch (err) {
      console.error('[verifyPin] fetch error:', err);
      console.log('RAW PIN RESPONSE:', raw);
      showToast('Unable to verify PIN. Check your connection.', 'error');
      window._checkoutPinResolve?.({ success: false, code: 'NETWORK_ERROR' });
    }
  });
}

  window.addEventListener('popstate', (e) => {
    if (modal.classList.contains('hidden')) return;
    hideCheckoutPinModal();
    if (window._checkoutPinResolve) window._checkoutPinResolve(false);
    e.stopImmediatePropagation();
  });



  window.showCheckoutPinModal = showCheckoutPinModal;
  window.hideCheckoutPinModal = hideCheckoutPinModal;
})();

// ==================== INITIALIZATION ====================
domReady(() => {
  console.log('[checkout] Initializing');

  const modal = document.getElementById('checkoutModal');
  if (!modal) {
    console.warn('[checkout] Modal not found');
    return;
  }

  const payBtn = document.getElementById('payBtn');
  if (payBtn) {
    payBtn.removeEventListener('click', onPayClicked);
    payBtn.addEventListener('click', onPayClicked);
  }

  const closeBtns = modal.querySelectorAll('[data-close], .close-btn');
  closeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeCheckoutModal();
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeCheckoutModal();
    }
  });

  window.addEventListener('popstate', (e) => {
    if (modal.classList.contains('active')) {
      closeCheckoutModal();
    }
  });

  console.log('[checkout] Initialized ✓');
});

// ==================== SMART RECEIPT SCROLL LOCK ====================
function lockScrollForReceiptModal(backdropEl, lock = true) {
  if (!backdropEl) return;

  if (lock) {
    const scrollY = window.scrollY;

    backdropEl.dataset.scrollY = scrollY;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  } else {
    const scrollY = parseInt(backdropEl.dataset.scrollY || '0', 10);

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    window.scrollTo(0, scrollY);
    delete backdropEl.dataset.scrollY;
  }
}


// ==================== SMART RECEIPT MODAL FUNCTIONS ====================

// ==================== SMART RECEIPT MODAL FUNCTIONS ====================

function showProcessingReceipt(data) {
  const backdrop = document.getElementById('smart-receipt-backdrop');
  if (!backdrop) return console.error('[checkout] Receipt modal not found');

  // ✅ Capture current balance from DOM before anything changes
  data.balanceAtPurchase = getAvailableBalance();

  backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden', 'false');


    lockScrollForReceiptModal(backdrop, true);


  // Reset to processing
  const icon = document.getElementById('receipt-icon');
  icon.className = 'receipt-icon processing';
  icon.innerHTML = '<div class="spinner"></div>';

  document.getElementById('receipt-status').textContent = 'Processing Transaction';
  document.getElementById('receipt-message').textContent = 'Please hold on while we deliver your data...';
  document.getElementById('receipt-details').style.display = 'none';
  document.getElementById('receipt-actions').style.display = 'none';

  // Store data
  window._currentCheckoutData = data;
}
async function updateReceiptToSuccess(result) {
  const icon = document.getElementById('receipt-icon');
  icon.className = 'receipt-icon success';
  icon.innerHTML = `
    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>
  `;

  document.getElementById('receipt-status').textContent = 'Transaction Successful';
  document.getElementById('receipt-message').textContent = 'Your data has been delivered successfully!';

  const data = window._currentCheckoutData;
  if (!data) {
    console.warn('[updateReceiptToSuccess] No checkout data available');
    return;
  }

  console.log('[checkout] Starting success update with data:', {
    phone: data.number,
    provider: data.provider,
    dataAmount: data.dataAmount || '(missing)',
    price: data.price,
    reference: data.reference || '(none)'
  });

  let transactionRef = data.reference || 'TX-' + Date.now().toString(36);
  const displayAmount = Number(result?.amount ?? data?.price ?? 0);

  const providerKey = data.provider?.toLowerCase() === '9mobile' ? 'ninemobile' : data.provider?.toLowerCase() || '';
  const svg = window.svgShapes?.[providerKey] || '';

  document.getElementById('receipt-provider').innerHTML = `${svg} ${data.provider?.toUpperCase() || 'Unknown'}`;
  document.getElementById('receipt-phone').textContent = data.number || '—';
  document.getElementById('receipt-plan').textContent = data.dataAmount ? `${data.dataAmount} / ${data.validity || '—'}` : 'Data Bundle';
  document.getElementById('receipt-amount').textContent = `₦${displayAmount.toLocaleString('en-NG')}`;
  document.getElementById('receipt-transaction-id').textContent = transactionRef;
  // Prefer API result balance, then transaction balance, never the pre-purchase snapshot
  const displayBalance = Number(
    result?.new_balance ??
    result?.balance ??
    result?.wallet_balance ??
    data?.new_balance ??
    0
  );
  document.getElementById('receipt-balance').textContent = `₦${displayBalance.toLocaleString('en-NG')}`;
  document.getElementById('receipt-time').textContent = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
  document.getElementById('receipt-details').style.display = 'block';
  document.getElementById('receipt-actions').style.display = 'flex';

  // ✅ FIX 1 — Force balance update immediately from API result
  const newBal = result?.new_balance ?? result?.balance ?? result?.wallet_balance ?? null;
  if (newBal !== null && !isNaN(Number(newBal))) {
    if (typeof window.updateAllBalances === 'function') {
      window.updateAllBalances(Number(newBal));
    }
    try {
      const raw = localStorage.getItem('userState');
      if (raw) {
        const state = JSON.parse(raw);
        state.balance = Number(newBal);
        state.wallet_balance = Number(newBal);
        localStorage.setItem('userState', JSON.stringify(state));
      }
    } catch(e) {}
  }

  // === ONLY LOCAL TRANSACTIONS UPDATE ===
  if (typeof window.renderRecentTransactions === 'function') {
    try {
      const cleanPhone = data.number?.replace(/\s+/g, '') || '—';
      const newTx = {
        id: transactionRef,
        phone: cleanPhone,
        provider: data.provider,
        data_amount: data.dataAmount || 'Data Bundle',
        description: `${data.dataAmount || 'Data'} Data Purchase`,
        status: 'success',
        timestamp: new Date().toISOString(),
        amount: data.price,
        created_at: new Date().toISOString()
      };

      let currentRecent = [];
      try {
        const stored = localStorage.getItem('recentTransactions');
        if (stored) currentRecent = JSON.parse(stored) || [];
      } catch (e) {
        console.warn('[checkout] localStorage parse error:', e);
      }

      function normalizePhone(phone) { return phone?.replace(/\s+/g, '') || ''; }

      currentRecent = currentRecent.filter(tx => normalizePhone(tx.phone) !== normalizePhone(newTx.phone) || tx.amount !== newTx.amount);
      currentRecent.unshift(newTx);
      currentRecent = currentRecent.slice(0, 5);

      localStorage.setItem('recentTransactions', JSON.stringify(currentRecent));
      window.renderRecentTransactions(currentRecent);

    } catch (err) {
      console.error('[checkout] Failed to update recent list:', err);
    }
  }
}


function updateReceiptToFailed(errorMessage) {
  // Ensure processing state is fully cleared first
  const backdrop = document.getElementById('smart-receipt-backdrop');
  if (backdrop) {
    backdrop.classList.remove('hidden');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  const icon = document.getElementById('receipt-icon');
  icon.className = 'receipt-icon failed';
  icon.innerHTML = `
    <svg class="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="cross__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="cross__path" fill="none" d="M16 16 36 36"/>
      <path class="cross__path" fill="none" d="M16 36 36 16"/>
    </svg>
  `;

  document.getElementById('receipt-status').textContent = 'Transaction Failed';
  document.getElementById('receipt-message').textContent = errorMessage;

  document.getElementById('receipt-details').style.display = 'none';

  const actions = document.getElementById('receipt-actions');
  actions.style.display = 'flex';
  actions.innerHTML = `
    <button id="receipt-done" style="flex:1; background:#333; color:white; border:none; border-radius:50px; padding:14px; font-weight:600;">
      Close
    </button>
  `;

  // Reattach close handler
  document.getElementById('receipt-done')?.addEventListener('click', () => {
    const backdrop = document.getElementById('smart-receipt-backdrop');
    if (backdrop) {
      backdrop.classList.add('hidden');
      backdrop.setAttribute('aria-hidden', 'true');
      lockScrollForReceiptModal(backdrop, false);
      closeCheckoutModal();
    }
  });
}

function updateReceiptToInsufficient(message, currentBalance = 0) {
  const icon = document.getElementById('receipt-icon');
  icon.className = 'receipt-icon failed';
  icon.innerHTML = `
    <svg class="cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="cross__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="cross__path" fill="none" d="M16 16 36 36"/>
      <path class="cross__path" fill="none" d="M16 36 36 16"/>
    </svg>
  `;

  document.getElementById('receipt-status').textContent = 'Insufficient Balance';
  document.getElementById('receipt-message').innerHTML = `
    ${message}<br><br>
    <strong>Current balance: ₦${Number(currentBalance).toLocaleString()}</strong><br><br>
    Please fund your wallet to complete this purchase.
  `;

  document.getElementById('receipt-details').style.display = 'none';

  const actions = document.getElementById('receipt-actions');
  actions.style.display = 'flex';
  actions.innerHTML = `
    <button id="receipt-fund-wallet" style="flex:1; background:linear-gradient(90deg,#00d4aa,#00bfa5); color:white; border:none; border-radius:50px; padding:14px; font-weight:600; margin-right:8px;">
      Fund Wallet
    </button>
    <button id="receipt-done" style="flex:1; background:#333; color:white; border:none; border-radius:50px; padding:14px; font-weight:600;">
      Close
    </button>
  `;

  // Add click handler for Fund Wallet
   document.getElementById('receipt-fund-wallet')?.addEventListener('click', () => {
    // Close the receipt modal properly
    const backdrop = document.getElementById('smart-receipt-backdrop');
    if (backdrop) {
      backdrop.classList.add('hidden');
      backdrop.setAttribute('aria-hidden', 'true');
      lockScrollForReceiptModal(backdrop, false);
    }

    // Now open fund wallet modal
    if (window.ModalManager?.openModal) {
      window.ModalManager.openModal('addMoneyModal');
      console.log('✓ Fund modal opened', 'success');
    } else {
      console.warn('⚠️ ModalManager not available');
      // Fallback: redirect to fund page if needed
      // window.location.href = '/wallet';
    }
  });

  document.getElementById('receipt-done')?.addEventListener('click', () => {
    const backdrop = document.getElementById('smart-receipt-backdrop');
    backdrop?.classList.add('hidden');
    backdrop?.setAttribute('aria-hidden', 'true');
    lockScrollForReceiptModal(backdrop, false);
  });
}


function updateReceiptToPending(tx = null) {
  const icon = document.getElementById('receipt-icon');
  icon.className = 'receipt-icon pending';
  icon.innerHTML = `
    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none" stroke="#FF9500" stroke-width="2"/>
      <path d="M26 16V26L32 32" stroke="#FF9500" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;

  document.getElementById('receipt-status').textContent = 'Pending Delivery';
  document.getElementById('receipt-message').textContent = 'Your data is being delivered. This may take a few minutes due to network. Money safe - auto refund on fail.';

  const data = window._currentCheckoutData;

  
  const displayAmount = tx?.amount ?? data?.price ?? 0;
  const displayBalance = tx?.new_balance ?? data?.new_balance ?? data?.balanceAtPurchase ?? 0;
  const transactionRef = tx?.reference ?? data?.reference ?? 'N/A';


  const providerKey = data.provider.toLowerCase() === '9mobile' ? 'ninemobile' : data.provider.toLowerCase();
  const svg = svgShapes[providerKey] || '';
  document.getElementById('receipt-provider').innerHTML = `${svg} ${data.provider.toUpperCase()}`;
  document.getElementById('receipt-phone').textContent = data.number;
  document.getElementById('receipt-plan').textContent = `${data.dataAmount} / ${data.validity}`;
  document.getElementById('receipt-amount').textContent = 
    `₦${Number(displayAmount).toLocaleString('en-NG')}`;

  document.getElementById('receipt-balance').textContent = 
    `₦${Number(displayBalance).toLocaleString('en-NG')}`;

  document.getElementById('receipt-transaction-id').textContent = transactionRef;
  document.getElementById('receipt-time').textContent = new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

  document.getElementById('receipt-details').style.display = 'block';

  const actions = document.getElementById('receipt-actions');
  actions.style.display = 'flex';
  actions.innerHTML = `
    <button id="receipt-done" style="width:100%; background:#333; color:white; border:none; border-radius:50px; padding:14px; font-weight:600;">
      OK
    </button>
  `;

  document.getElementById('receipt-done')?.addEventListener('click', () => {
    const backdrop = document.getElementById('smart-receipt-backdrop');
    if (backdrop) {
      backdrop.classList.add('hidden');
      backdrop.setAttribute('aria-hidden', 'true');
      lockScrollForReceiptModal(backdrop, false);
      closeCheckoutModal();
    }
  });
}
async function pollForFinalStatus(reference) {
  let showedPending = false;
  let showedFailed = false;
  let settled = false;

  // ── 1. Realtime listener — fires the instant DB row updates ──
  const realtimeHandler = (e) => {
    const tx = e?.detail;
    if (!tx || (tx.reference !== reference && tx.id !== reference)) return;

    const status = (tx.status || '').toLowerCase();
    console.log('[checkout] ⚡ Realtime status update:', status, 'for', reference);

    if (status === 'success' && !settled) {
      settled = true;
      window.removeEventListener('transaction_update', realtimeHandler);
      updateReceiptToSuccess(tx);
      resetCheckoutUI();
      closeCheckoutModal();
    } else if ((status === 'failed' || status === 'refund') && !settled && !showedFailed) {
  settled = true;
  showedFailed = true;
  window.removeEventListener('transaction_update', realtimeHandler);
  const failMsg = tx.description && tx.description.length < 200
    ? tx.description
    : 'Data delivery failed. Amount has been refunded instantly.';
  updateReceiptToFailed(failMsg);
}
  };

  window.addEventListener('transaction_update', realtimeHandler);

  // ── 2. Fast first check — hits the API immediately (catches races) ──
  try {
    const res = await fetch('https://api.flexgig.com.ng/api/transactions?limit=10', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      const tx = json.items.find(t => t.reference === reference);
      if (tx && !settled) {
        const status = tx.status.toLowerCase();
        if (status === 'success') {
          settled = true;
          window.removeEventListener('transaction_update', realtimeHandler);
          await updateReceiptToSuccess(tx);
          resetCheckoutUI();
          closeCheckoutModal();
          return;
        }
        if (status === 'failed' || status === 'refund') {
          settled = true;
          showedFailed = true;
          window.removeEventListener('transaction_update', realtimeHandler);
          const failMsg = tx.description && tx.description.length < 200 
  ? tx.description 
  : 'Data delivery failed. Amount has been refunded instantly.';
updateReceiptToFailed(failMsg);
          
          return;
        }
      }
    }
  } catch (e) {
    console.warn('[checkout] Fast-check error:', e);
  }

  // ── 3. Slow fallback poll — only kicks in if realtime hasn't fired ──
  // Show pending after 8s of no response
  const pendingTimer = setTimeout(() => {
    if (!settled && !showedPending) {
      showedPending = true;
      updateReceiptToPending(null);
    }
  }, 8000);

  // Poll every 8s (was 15s) for up to 2 minutes as a safety net
  let attempts = 0;
  const maxAttempts = 15;

  const intervalId = setInterval(async () => {
    if (settled) {
      clearInterval(intervalId);
      clearTimeout(pendingTimer);
      return;
    }

    attempts++;
    if (attempts >= maxAttempts) {
      clearInterval(intervalId);
      clearTimeout(pendingTimer);
      window.removeEventListener('transaction_update', realtimeHandler);
      if (!showedFailed) {
        if (!showedPending) updateReceiptToPending(null);
        document.getElementById('receipt-message').textContent =
          'Delivery taking longer than expected. Check history for updates.';
      }
      return;
    }

    try {
      const res = await fetch('https://api.flexgig.com.ng/api/transactions?limit=10', { credentials: 'include' });
      if (!res.ok || settled) return;
      const json = await res.json();
      const tx = json.items.find(t => t.reference === reference);
      if (!tx || settled) return;

      const status = tx.status.toLowerCase();

      if (status === 'success') {
        settled = true;
        clearInterval(intervalId);
        clearTimeout(pendingTimer);
        window.removeEventListener('transaction_update', realtimeHandler);
        await updateReceiptToSuccess(tx);
        resetCheckoutUI();
        closeCheckoutModal();
      } else if (status === 'failed' || status === 'refund') {
        if (!showedFailed) {
          settled = true;
          showedFailed = true;
          clearInterval(intervalId);
          clearTimeout(pendingTimer);
          window.removeEventListener('transaction_update', realtimeHandler);
          const failMsg = tx.description && tx.description.length < 200 
  ? tx.description 
  : 'Data delivery failed. Amount has been refunded instantly.';
updateReceiptToFailed(failMsg);
          
        }
      }
    } catch (e) {
      console.warn('[checkout] Poll error:', e);
    }
  }, 8000);
}


// Close & Buy Again handlers (unchanged)
document.getElementById('receipt-done')?.addEventListener('click', () => {
  const backdrop = document.getElementById('smart-receipt-backdrop');
  backdrop?.classList.add('hidden');
  backdrop?.setAttribute('aria-hidden', 'true');

  // 🔓 UNLOCK SCROLL HERE
  lockScrollForReceiptModal(backdrop, false);
});




// ==================== EXPORTS ====================
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;
window.gatherCheckoutData = gatherCheckoutData;
window.onPayClicked = onPayClicked;