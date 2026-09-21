import apiClient from './api'
import { API_ENDPOINTS } from '@/constants/config'
import { UserProfile, UpdateProfileData } from '@/types/user'

export const userService = {
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get(API_ENDPOINTS.USER_PROFILE)
    return response.data.data
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await apiClient.put(API_ENDPOINTS.USER_UPDATE_PROFILE, data)
    return response.data.data
  },

  async uploadAvatar(file: File): Promise<{ url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(API_ENDPOINTS.USER_AVATAR, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  },
}
