// src/components/settings/HelpSupportSheet.tsx
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface HelpSupportSheetProps {
  onClose: () => void
}

export default function HelpSupportSheet({
  onClose,
}: HelpSupportSheetProps) {
  useBodyScrollLock(true)

  return createPortal(
    <div className="fg-sheet-overlay" role="dialog" aria-modal="true">
      <div className="pad4Support">
        <div className="help-modal-header all-modal-headers">
          <button
            type="button"
            className="help-modal-close all-modal-chevron"
            aria-label="Close"
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="all-modal-title">Help &amp; Support</h1>
        </div>

        <div className="help-modal-body">
          <div className="support-illustration">
            <img
              style={{ width: 250, height: 250 }}
              src="/frontend/img/flat-design-illustration-customer-support.png"
              alt="customer support"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>

          <div className="support-text">
            <h2>What assistance can we offer you?</h2>
            <p>
              We are dedicated to ensuring you have the best possible
              experience. If you have any questions, concerns, or feedback,
              we are here to assist you.
            </p>
          </div>

          <div className="support-contact">
            {/* WhatsApp */}
            <a
              href="https://wa.me/+2349160227505"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <div className="contact-box whatsapp">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16 31C23.732 31 30 24.732 30 17C30 9.26801 23.732 3 16 3C8.26801 3 2 9.26801 2 17C2 19.5109 2.661 21.8674 3.81847 23.905L2 31L9.31486 29.3038C11.3014 30.3854 13.5789 31 16 31ZM16 28.8462C22.5425 28.8462 27.8462 23.5425 27.8462 17C27.8462 10.4576 22.5425 5.15385 16 5.15385C9.45755 5.15385 4.15385 10.4576 4.15385 17C4.15385 19.5261 4.9445 21.8675 6.29184 23.7902L5.23077 27.7692L9.27993 26.7569C11.1894 28.0746 13.5046 28.8462 16 28.8462Z"
                    fill="white"
                  />
                  <path
                    d="M12.5 9.5C12.17 8.83 11.66 8.89 11.14 8.89C10.22 8.89 8.78 10 8.78 12.05C8.78 13.73 9.52 15.58 12.02 18.34C14.44 21 17.61 22.37 20.24 22.33C22.88 22.28 23.42 20.02 23.42 19.25C23.42 18.91 23.21 18.74 23.06 18.7C22.16 18.27 20.51 17.46 20.13 17.31C19.76 17.16 19.56 17.37 19.44 17.48C19.1 17.8 18.42 18.76 18.19 18.98C17.96 19.19 17.61 19.08 17.47 19C16.94 18.79 15.5 18.15 14.36 17.04C12.95 15.67 12.86 15.2 12.6 14.78C12.38 14.44 12.54 14.24 12.62 14.15C12.92 13.8 13.34 13.25 13.53 12.98C13.72 12.71 13.57 12.31 13.48 12.05C13.09 10.95 12.77 10.03 12.5 9.5Z"
                    fill="white"
                  />
                </svg>
                <span>WhatsApp</span>
                <small>Contact us on WhatsApp</small>
              </div>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/flexgigsupport"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <div className="contact-box telegram">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 256 256"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="128" cy="128" r="128" fill="#40B3E0" />
                  <path
                    d="M190.28 73.63L167.42 188.9C167.42 188.9 164.22 196.89 155.43 193.05L102.67 152.61L83.49 143.33L51.19 132.46C51.19 132.46 46.24 130.7 45.76 126.87C45.28 123.03 51.35 120.95 51.35 120.95L179.73 70.59C179.73 70.59 190.28 65.96 190.28 73.63"
                    fill="#FFFFFF"
                  />
                  <path
                    d="M98.62 187.6C98.62 187.6 97.08 187.46 95.16 181.38C93.24 175.31 83.49 143.33 83.49 143.33L161.03 94.09C161.03 94.09 165.5 91.38 165.34 94.09C165.34 94.09 166.14 94.57 163.74 96.81C161.35 99.05 102.83 151.65 102.83 151.65"
                    fill="#D2E5F1"
                  />
                  <path
                    d="M122.9 168.12L102.03 187.14C102.03 187.14 100.4 188.38 98.62 187.6L102.61 152.26"
                    fill="#B5CFE4"
                  />
                </svg>
                <span>Telegram</span>
                <small>Contact us on Telegram</small>
              </div>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/flexgigng"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <div className="contact-box facebook">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="14" fill="#1877F2" />
                  <path
                    d="M21.21 20.28L21.84 16.33H17.95V13.77C17.95 12.69 18.49 11.63 20.23 11.63H22V8.27C22 8.27 20.39 8 18.86 8C15.65 8 13.56 9.89 13.56 13.32V16.33H10V20.28H13.56V29.83C14.28 29.94 15.01 30 15.75 30C16.5 30 17.23 29.94 17.95 29.83V20.28H21.21Z"
                    fill="white"
                  />
                </svg>
                <span>Facebook</span>
                <small>Contact us on Facebook</small>
              </div>
            </a>

            {/* Twitter / X */}
            <a
              href="https://twitter.com/flexgigng"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <div className="contact-box twitter">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="#ffffff"
                  viewBox="0 0 16 16"
                  width="56"
                  height="56"
                >
                  <path d="M12.6 0.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H0.316l5.733-6.57L0 0.75h5.063l3.495 4.633L12.601 0.75Zm-0.86 13.028h1.36L4.323 2.145H2.865z" />
                </svg>
                <span>Twitter</span>
                <small>Contact us on Twitter</small>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}