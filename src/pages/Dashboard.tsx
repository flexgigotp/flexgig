import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '@/styles/dashboard.css'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import BalanceCard from '@/components/dashboard/BalanceCard'
import QuickActions from '@/components/dashboard/QuickActions'
import ServicesGrid from '@/components/dashboard/ServicesGrid'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import AllTimeStats from '@/components/dashboard/AllTimeStats'
import BottomNav, { DashboardTab } from '@/components/dashboard/BottomNav'
import StatusBanner from '@/components/dashboard/StatusBanner'
import RecentlyBoughtData from '@/components/dashboard/RecentlyBoughtData'
import DataPurchasePanel from '@/components/dashboard/DataPurchasePanel'
import DashboardActionCards from '@/components/dashboard/DashboardActionCards'
import BuyDataFlow from '@/components/buy-data/BuyDataFlow'
import AllPlansSheet from '@/components/plans/AllPlansSheet'
import AddMoneySheet from '@/components/addmoney/AddMoneySheet'
import KYCSheet from '@/components/kyc/KYCSheet'
import SettingsTab from '@/components/settings/SettingsTab'
import HelpSupportSheet from '@/components/settings/HelpSupportSheet'
import SecuritySheet from '@/components/settings/SecuritySheet'
import HistorySheet from '@/components/history/HistorySheet'
import TransactionReceiptSheet from '@/components/history/TransactionReceiptSheet'
import type { Transaction } from '@/types/api'
import { useSession } from '@/hooks'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useBackTrap } from '@/hooks/useBackTrap'
import { useModalParam } from '@/hooks/useModalParam'
import { useDataPurchaseStore } from '@/stores/dataPurchaseStore'
import { useHistoryStore } from '@/stores/historyStore'
import { useBiometricPromptStore } from '@/stores/biometricPromptStore'
import { getKYCState } from '@/lib/addMoneyStorage'
import { safeCloseModal } from '@/lib/safeCloseModal'
import { toast } from '@/stores/toastStore'
import { useBiometric } from '@/hooks/useBiometric'

export default function Dashboard() {
  const { user, balance, logout } = useSession()
  useRealtimeSync()
  const [tab, setTab] = useState<DashboardTab>('home')
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (!window.confirm('Log out of FlexGig?')) return
    await logout()
    navigate('/', { replace: true })
  }

  const [searchParams] = useSearchParams()
  const checkoutActive = searchParams.get('checkout') === '1'
  const checkoutPlanId = searchParams.get('plan_id')
  const checkoutPhone = searchParams.get('phone')
  const checkoutProvider = searchParams.get('provider')
  const plansOpen = searchParams.get('plans') === '1'
  const plansProvider = searchParams.get('plans_provider') || 'mtn'
  const selectedPlanId = useDataPurchaseStore((s) => s.planId)

  const addMoneyModal = useModalParam('addmoney')
  const kycModal = useModalParam('kyc')
  const helpModal = useModalParam('help')
  const settingsModal = useModalParam('settings')
  const securityModal = useModalParam('security')

  // Biometric prompt owns the back button while it's visible — we must
  // not let useBackTrap also grab it, or the two fight over popstate.
  const bioPromptVisible = useBiometricPromptStore((s) => s.visible)

  // History sheet + receipt (stackable)
  const historyModal = useModalParam('history')
  const setHistoryMonth = useHistoryStore((s) => s.setSelectedMonth)
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null)

  const handleOpenAddMoney = () => {
    const kyc = getKYCState()
    if (kyc?.verified) {
      kycModal.open()
    } else {
      addMoneyModal.open()
    }
  }

  const handleTabChange = (newTab: DashboardTab) => {
    if (newTab === 'settings') {
      settingsModal.open()
      return
    }

    if (newTab === 'history') {
      historyModal.open()
      return
    }

    // Switching away from Settings → close the sheet if it's open
    if (settingsModal.isOpen) {
      settingsModal.close()
    }
    setTab(newTab)
  }

  const bio = useBiometric()

  useEffect(() => {
    if (bio.enabled && (bio.forTx || bio.forLogin) && bio.isSupported) {
      bio.prefetch()
    }
  }, [bio.enabled, bio.forTx, bio.forLogin, bio.isSupported, bio.prefetch])

  // Ref on the DataPurchasePanel wrapper
  const plansSectionRef = useRef<HTMLDivElement | null>(null)
  const prevPlansOpenRef = useRef(plansOpen)

  // Track previous plansOpen across renders
  useEffect(() => {
    const wasOpen = prevPlansOpenRef.current
    prevPlansOpenRef.current = plansOpen

    // Only act on the open → closed transition
    if (!wasOpen || plansOpen) return

    // Wait a frame for the sheet to unmount + scroll lock to release
    const t = window.setTimeout(() => {
      plansSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 80)

    return () => window.clearTimeout(t)
  }, [plansOpen])

  useBackTrap(
    !checkoutActive &&
      !plansOpen &&
      !settingsModal.isOpen &&
      !securityModal.isOpen &&
      !bioPromptVisible &&
      !historyModal.isOpen &&
      !receiptTx
  )

  return (
    <div className="flexgig-dashboard">
      <StatusBanner />

      <div id="content">
        <DashboardHeader
          username={user?.username}
          firstName={user?.firstName}
          fullName={user?.fullName}
          avatarUrl={user?.profilePicture || undefined}
        />
      </div>

      <main className="page-content">
        {tab === 'home' && (
          <div className="stack">
            <DashboardActionCards
              hasPin={user?.hasPin ?? true}
              profileCompleted={user?.profileCompleted ?? true}
              onSetupPin={() => navigate('/pin-setup')}
              onUpdateProfile={() => navigate('/profile-update')}
            />
            <BalanceCard balance={balance} />
            <QuickActions
              onTransfer={() => navigate('/transfer')}
              onAddMoney={handleOpenAddMoney}
            />
            <ServicesGrid />
            <RecentlyBoughtData plans={user?.recentDataTx ?? []} />
            <div ref={plansSectionRef}>
              <DataPurchasePanel />
            </div>
            <RecentTransactions
              onViewAll={historyModal.open}
              onSelectTransaction={(tx) => setReceiptTx(tx)}
            />
            <AllTimeStats
              funded={user?.allTimeIn ?? 0}
              spent={user?.allTimeOut ?? 0}
              count={user?.totalDataTxCount ?? 0}
            />
          </div>
        )}

        {tab === 'admin' && (
          <div className="stack">
            <p style={{ padding: 40, textAlign: 'center', color: '#999' }}>
              Admin tab — coming later
            </p>
          </div>
        )}
      </main>

      <BottomNav
        active={
          settingsModal.isOpen
            ? 'settings'
            : historyModal.isOpen
              ? 'history'
              : tab
        }
        onTabChange={handleTabChange}
        isAdmin={user?.is_admin === true}
      />

      {/* Settings — full-screen sheet, URL-driven */}
      {settingsModal.isOpen && (
        <SettingsTab
          onClose={settingsModal.close}
          onOpenHelp={helpModal.open}
          onOpenSecurity={securityModal.open}
          onOpenReferrals={() => toast.info('Referrals — coming in Drop 4')}
          onOpenEditProfile={() =>
            toast.info('Edit profile — coming in Drop 3')
          }
          onLogout={handleLogout}
        />
      )}

      {/* Security — full-screen sheet, URL-driven */}
      {securityModal.isOpen && (
        <SecuritySheet onClose={securityModal.close} />
      )}

      {checkoutActive &&
        checkoutPlanId &&
        checkoutPhone &&
        checkoutProvider && (
          <BuyDataFlow
            planId={checkoutPlanId}
            phone={checkoutPhone}
            provider={checkoutProvider}
          />
        )}

      {plansOpen && (
        <AllPlansSheet
          provider={plansProvider}
          selectedPlanId={selectedPlanId}
          onClose={() =>
            safeCloseModal(navigate, ['plans', 'plans_provider'])
          }
          onSelect={(plan) => {
            useDataPurchaseStore
              .getState()
              .selectPlanFromAllPlans(plan.plan_id)
            safeCloseModal(navigate, ['plans', 'plans_provider'])
          }}
        />
      )}

      {addMoneyModal.isOpen && (
        <AddMoneySheet
          onClose={addMoneyModal.close}
          onOpenKYC={() => {
            const params = new URLSearchParams(window.location.search)
            params.delete('addmoney')
            params.set('kyc', '1')
            navigate(`${window.location.pathname}?${params.toString()}`, {
              replace: true,
            })
          }}
        />
      )}

      {kycModal.isOpen && <KYCSheet onClose={kycModal.close} />}

      {helpModal.isOpen && <HelpSupportSheet onClose={helpModal.close} />}

      {historyModal.isOpen && (
        <HistorySheet
          onClose={historyModal.close}
          onSelectTransaction={(tx) => setReceiptTx(tx)}
          onSelectMonth={(m) => {
            setHistoryMonth(m)
            // month picker comes in the next pass; for now just store it
          }}
        />
      )}

      {/* Receipt is independent of the history sheet — it can be opened
          from the dashboard's Recent Transactions widget OR from inside
          the history sheet. Render it whenever there's a receipt to show. */}
      {receiptTx && (
        <TransactionReceiptSheet
          tx={receiptTx}
          onClose={() => setReceiptTx(null)}
        />
      )}
    </div>
  )
}