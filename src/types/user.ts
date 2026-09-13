export interface UserProfile {
  id: string
  email: string
  fullName: string
  phoneNumber: string
  country: string
  state: string
  city: string
  avatar: string
  bio: string
  accountBalance: number
  totalEarnings: number
  referralCode: string
  referralCount: number
  verified: boolean
  createdAt: string
  updatedAt: string
}

export interface ReferralInfo {
  code: string
  count: number
  earnings: number
  createdAt: string
}

export interface UpdateProfileData {
  fullName?: string
  phoneNumber?: string
  country?: string
  state?: string
  city?: string
  bio?: string
}
