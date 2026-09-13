import apiClient from './api'
import { API_ENDPOINTS } from '@/constants/config'
import { ReferralInfo } from '@/types/user'

export const referralService = {
  async getReferralInfo(): Promise<ReferralInfo> {
    const response = await apiClient.get(API_ENDPOINTS.REFERRAL_INFO)
    return response.data.data
  },

  async getReferralList(page = 1, pageSize = 10) {
    const response = await apiClient.get(API_ENDPOINTS.REFERRAL_LIST, {
      params: { page, pageSize },
    })
    return response.data.data
  },

  async getReferralStats() {
    const response = await apiClient.get(API_ENDPOINTS.REFERRAL_STATS)
    return response.data.data
  },
}
