// src/services/user.ts
import apiClient from './api'
import { API_ENDPOINTS } from '@/constants/config'
import type { ProfileUpdatePayload, ProfileUpdateResponse } from '@/types/api'

export const userService = {
  async updateProfile(data: ProfileUpdatePayload): Promise<ProfileUpdateResponse> {
    const formData = new FormData()
    formData.set('fullName', data.fullName)
    formData.set('username', data.username)
    formData.set('phoneNumber', data.phoneNumber)
    formData.set('address', data.address)
    formData.set('email', data.email)
    if (data.profilePicture) {
      formData.set('profilePicture', data.profilePicture)
    }

    const response = await apiClient.post(API_ENDPOINTS.PROFILE_UPDATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async checkUsername(username: string): Promise<boolean> {
    const response = await apiClient.post(API_ENDPOINTS.PROFILE_CHECK_USERNAME, { username })
    return !!response.data?.available
  },
}