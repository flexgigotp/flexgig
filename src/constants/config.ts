export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_SESSION: '/api/auth/session',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_GOOGLE: '/api/auth/google',
  AUTH_WEBAUTHN: '/api/auth/webauthn',
  AUTH_RESET_PIN: '/api/auth/reset-pin',

  // User
  USER_PROFILE: '/api/user/profile',
  USER_UPDATE_PROFILE: '/api/user/profile/update',
  USER_AVATAR: '/api/user/avatar',

  // Referral
  REFERRAL_INFO: '/api/referral/info',
  REFERRAL_LIST: '/api/referral/list',
  REFERRAL_STATS: '/api/referral/stats',

  // Transactions
  TRANSACTIONS_LIST: '/api/transactions',
  TRANSACTION_DETAIL: '/api/transactions/:id',
  TRANSACTIONS_EXPORT: '/api/transactions/export',
}

export const APP_CONFIG = {
  APP_NAME: import.meta.env.VITE_APP_NAME || 'FlexGig',
  APP_DESCRIPTION: import.meta.env.VITE_APP_DESCRIPTION || 'Cheap Data Plug',
  ENABLE_WEBAUTHN: import.meta.env.VITE_ENABLE_WEBAUTHN === 'true',
  ENABLE_GOOGLE_AUTH: import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true',
}
