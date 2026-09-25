// src/services/auth.ts

import apiClient from './api'
import { API_ENDPOINTS } from '@/constants/config'
import { LoginCredentials, SignUpCredentials, AuthResponse, User } from '@/types/auth'

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH_LOGIN, credentials)
    return response.data
  },

  async signup(data: SignUpCredentials): Promise<AuthResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH_SIGNUP, data)
    return response.data
  },

  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT)
  },

  async getSession(): Promise<{ user: User | null }> {
    const response = await apiClient.get(API_ENDPOINTS.AUTH_SESSION)
    return { user: response.data.data || null }
  },

  async loginWithGoogle(token: string): Promise<AuthResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH_GOOGLE, { token })
    return response.data
  },

  async resetPin(email: string, pin: string): Promise<AuthResponse> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH_RESET_PIN, { email, pin })
    return response.data
  },
}