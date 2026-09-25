import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullScreenModal from '@/components/modals/FullScreenModal'
import { useSession } from '@/hooks'
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability'
import { userService } from '@/services/user'
import { extractApiError } from '@/services/api'
import { formatNgPhone, normalizeNgPhone, isValidNgPhone } from '@/lib/providers'
import { toast } from '@/stores/toastStore'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export default function ProfileUpdatePage() {
  const navigate = useNavigate()
  const { user, refetch } = useSession()
  const usernameCheck = useUsernameAvailability()

  const [fullName, setFullName] = useState(user?.fullName || '')
  const [username, setUsername] = useState(user?.username || '')
  const [phoneRaw, setPhoneRaw] = useState(
    user?.phoneNumber ? formatNgPhone(user.phoneNumber) : ''
  )
  const [address, setAddress] = useState(user?.address || '')
  const [picture, setPicture] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(
    user?.profilePicture || null
  )
  const [pictureError, setPictureError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fullNameLocked = !!user?.fullNameEdited
  const usernameLocked = !!user?.username
  const phoneLocked = !!user?.phoneNumber
  const addressLocked = !!(user?.address && user.address.trim())

  const fullNameValid = fullName.trim().length >= 2 && /^[A-Za-z\s'-]+$/.test(fullName.trim())
  const usernameValid =
    usernameLocked || usernameCheck.state === 'available' || (username.trim() === user?.username)
  const phoneValid = phoneLocked || isValidNgPhone(phoneRaw)
  const addressValid = addressLocked || address.trim().length === 0 || address.trim().length >= 5

  const canSubmit =
    !submitting && fullNameValid && usernameValid && phoneValid && addressValid

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setPictureError('')
    if (!file) return

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPictureError('Only JPG, PNG, or WEBP files are allowed')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPictureError('File size must be less than 2MB')
      return
    }

    setPicture(file)
    const reader = new FileReader()
    reader.onload = () => setPicturePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (usernameLocked) return
    const v = e.target.value.replace(/\s/g, '')
    setUsername(v)
    usernameCheck.check(v)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (phoneLocked) return
    setPhoneRaw(formatNgPhone(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !user) return

    setSubmitting(true)
    setError('')

    try {
      await userService.updateProfile({
        fullName: fullName.trim(),
        username: username.trim(),
        phoneNumber: normalizeNgPhone(phoneRaw),
        address: address.trim(),
        email: user.email,
        profilePicture: picture || undefined,
      })

      await refetch({ silent: true })
      toast.success('Profile updated successfully!')
      navigate(-1)
    } catch (err: any) {
      const { code, message } = extractApiError(err)

      if (code === 'USERNAME_TAKEN') {
        usernameCheck.reset()
        setError('Username is already taken')
      } else if (code === 'USERNAME_LOCKED') {
        setError('Username can only be set once')
      } else if (code === 'PHONE_LOCKED') {
        setError('Phone number cannot be changed once set')
      } else if (code === 'ADDRESS_LOCKED') {
        setError('Address cannot be changed once set')
      } else if (code === 'INVALID_IMAGE') {
        setPictureError(message || 'Invalid image')
      } else {
        setError(message || 'Failed to update profile. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const usernameHint =
    usernameCheck.state === 'checking'
      ? 'Checking availability...'
      : usernameCheck.state === 'available'
        ? `${username} is available`
        : usernameCheck.state === 'taken'
          ? `${username} is already taken`
          : usernameCheck.state === 'invalid'
            ? 'At least 3 letters; optional _ then 3+ letters/numbers'
            : ''

  return (
    <FullScreenModal title="Update Profile" onClose={() => navigate(-1)}>
      <form onSubmit={handleSubmit} style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              margin: '0 auto 10px',
              overflow: 'hidden',
              background: '#2f3136',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              color: '#fff',
            }}
          >
            {picturePreview ? (
              <img
                src={picturePreview}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (user?.username || user?.firstName || 'U').charAt(0).toUpperCase()
            )}
          </div>
          <label style={{ color: '#00AAFF', fontSize: 14, cursor: 'pointer' }}>
            Change Photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePictureChange}
              hidden
            />
          </label>
          {pictureError && (
            <div style={{ color: '#ff5c5c', fontSize: 13, marginTop: 6 }}>{pictureError}</div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={fullNameLocked}
            placeholder="Enter your full name"
            style={{ width: '100%', padding: 12, borderRadius: 8 }}
          />
          {!fullNameLocked && fullName.trim() && !fullNameValid && (
            <div style={{ color: '#ff5c5c', fontSize: 13, marginTop: 4 }}>
              Full name must contain only letters, at least 2 characters
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            disabled={usernameLocked}
            placeholder="username"
            maxLength={15}
            style={{ width: '100%', padding: 12, borderRadius: 8 }}
          />
          {!usernameLocked && usernameHint && (
            <div
              style={{
                color: usernameCheck.state === 'available' ? '#4ade80' : '#ff5c5c',
                fontSize: 13,
                marginTop: 4,
              }}
            >
              {usernameHint}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Phone Number</label>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneRaw}
            onChange={handlePhoneChange}
            disabled={phoneLocked}
            placeholder="0803 456 7890"
            style={{ width: '100%', padding: 12, borderRadius: 8 }}
          />
          {!phoneLocked && phoneRaw && !phoneValid && (
            <div style={{ color: '#ff5c5c', fontSize: 13, marginTop: 4 }}>
              Enter a valid Nigerian phone number
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={user?.email || ''}
            readOnly
            disabled
            style={{ width: '100%', padding: 12, borderRadius: 8, opacity: 0.6 }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={addressLocked}
            placeholder="Enter your address"
            style={{ width: '100%', padding: 12, borderRadius: 8 }}
          />
          {!addressLocked && address.trim() && !addressValid && (
            <div style={{ color: '#ff5c5c', fontSize: 13, marginTop: 4 }}>
              Address must be at least 5 characters
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: '#ff5c5c', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 8,
            background: canSubmit ? '#00AAFF' : '#555',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </FullScreenModal>
  )
}