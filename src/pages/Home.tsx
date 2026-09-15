import { useState } from 'react'
import { useAuth } from '@/hooks'
import Button from '@/components/Button'
import ServiceCard from '@/components/ServiceCard'
import AuthModal from '@/components/AuthModal'

function Home() {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const services = [
    {
      id: 'data',
      name: 'Data',
      icon: '📊',
      color: 'from-yellow-500 to-yellow-600',
      columnSpan: 3,
    },
    {
      id: 'airtime',
      name: 'Airtime',
      icon: '📱',
      color: 'from-orange-500 to-orange-600',
      columnSpan: 3,
    },
    {
      id: 'tv',
      name: 'TV',
      icon: '📺',
      color: 'from-purple-500 to-purple-600',
      columnSpan: 2,
    },
    {
      id: 'airtime-to-cash',
      name: 'Airtime 2 Cash',
      icon: '💰',
      color: 'from-green-500 to-green-600',
      columnSpan: 4,
    },
    {
      id: 'electricity',
      name: 'Electricity',
      icon: '⚡',
      color: 'from-red-500 to-red-600',
      columnSpan: 3,
    },
    {
      id: 'giftcards',
      name: 'Giftcards',
      icon: '🎁',
      color: 'from-pink-500 to-pink-600',
      columnSpan: 3,
    },
  ]

  const socialLinks = [
    {
      name: 'Telegram',
      url: 'https://t.me/flexgigng',
      icon: '📲',
      bgColor: 'bg-blue-500',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/flexgigng',
      icon: 'f',
      bgColor: 'bg-blue-600',
    },
    {
      name: 'WhatsApp',
      url: 'https://whatsapp.com/channel/0029VbDFobWGE56rppyHSt3J',
      icon: 'W',
      bgColor: 'bg-green-500',
    },
    {
      name: 'Twitter',
      url: 'https://x.com/FlexgigNG',
      icon: 'X',
      bgColor: 'bg-black',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 pt-24 space-y-12">
        {/* Service Cards Grid */}
        <section className="space-y-8">
          <div className="grid grid-cols-6 gap-1 rounded-sm overflow-hidden w-full">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                {...service}
              />
            ))}
          </div>
        </section>

        {/* Call-to-Action Section */}
        <section className="space-y-8 w-full">
          <div className="space-y-3">
            <p className="text-sm sm:text-base font-semibold tracking-wide text-blue-400 flex items-center gap-2">
              🚀 <span>Join <span className="font-bold text-yellow-400">thousands</span> of active users</span>
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
              Get connected now
            </h2>
          </div>

          {user ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-300">
                Welcome back, <span className="font-bold text-blue-400">{user.fullName}</span>!
              </p>
              <a href="/dashboard" className="inline-block">
                <Button size="lg">Go to Dashboard</Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col w-full gap-2 lg:flex-row lg:gap-4">
              {/* Google Login Button */}
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex-1 max-w-sm px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-semibold hover:from-blue-700 hover:to-blue-800 transition flex items-center justify-center gap-3 shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Email Login Button */}
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex-1 max-w-sm px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-semibold transition flex items-center justify-center gap-3 shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Continue with Email
              </button>

              {/* WhatsApp Button */}
              <a
                href="https://wa.me/2349039542070?text=Hello"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 max-w-sm px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition flex items-center justify-center gap-3 shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                </svg>
                Continue with WhatsApp
              </a>

              {/* Telegram Button */}
              <a
                href="https://t.me/FlexgigOfficialBot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 max-w-sm px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition flex items-center justify-center gap-3 shadow-lg"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.73 4.16c.06-.28-.04-.56-.25-.74-.22-.19-.51-.23-.77-.13l-18.5 7.5c-.31.12-.5.43-.47.76.03.32.27.6.59.66l4.55.91 1.87 6.56c.08.29.33.5.63.53.3.03.59-.12.74-.39l2.06-3.72 4.8 3.93c.2.16.47.21.71.12s.43-.3.48-.55l3.5-15.5z"/>
                </svg>
                Continue with Telegram
              </a>
            </div>
          )}

          <div className="text-center space-y-3 pt-4">
            <p className="text-xs sm:text-sm font-semibold text-gray-300">Follow Us</p>
            <div className="flex flex-wrap justify-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg transition hover:scale-110 ${social.bgColor} text-white font-bold`}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}

export default Home
