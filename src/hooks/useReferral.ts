import { useAsync } from './useAsync'
import { referralService } from '@/services/referral'

export function useReferral() {
  const { data, status, error, execute } = useAsync(
    () => referralService.getReferralInfo(),
    true
  )

  return {
    referralInfo: data || null,
    isLoading: status === 'pending',
    error: error?.message || null,
    refetch: execute,
  }
}
