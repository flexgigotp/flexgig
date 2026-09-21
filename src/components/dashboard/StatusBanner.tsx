import { useBroadcast } from '@/hooks/useBroadcast'

export default function StatusBanner() {
  const { broadcast } = useBroadcast()

  if (!broadcast || !broadcast.message) return null

  const level = broadcast.level || 'info'

  return (
    <div className="banner-wrapper">
      <div className={`status-banner level-${level}`}>
        <span className="icon">
          <svg
            fill="#ffffff"
            width="15"
            height="15"
            viewBox="0 0 1920 1920"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M1587.162 31.278c11.52-23.491 37.27-35.689 63.473-29.816 25.525 6.099 43.483 28.8 43.483 55.002V570.46C1822.87 596.662 1920 710.733 1920 847.053c0 136.32-97.13 250.503-225.882 276.705v513.883c0 26.202-17.958 49.016-43.483 55.002a57.279 57.279 0 0 1-12.988 1.468c-21.12 0-40.772-11.745-50.485-31.171C1379.238 1247.203 964.18 1242.347 960 1242.347H564.706v564.706h87.755c-11.859-90.127-17.506-247.003 63.473-350.683 52.405-67.087 129.657-101.082 229.948-101.082v112.941c-64.49 0-110.57 18.861-140.837 57.487-68.781 87.868-45.064 263.83-30.269 324.254 4.18 16.828.34 34.673-10.277 48.34-10.73 13.665-27.219 21.684-44.499 21.684H508.235c-31.171 0-56.47-25.186-56.47-56.47v-621.177h-56.47c-155.747 0-282.354-126.607-282.354-282.353v-56.47h-56.47C25.299 903.523 0 878.336 0 847.052c0-31.172 25.299-56.471 56.47-56.471h56.471v-56.47c0-155.634 126.607-282.354 282.353-282.354h564.593c16.941-.112 420.48-7.002 627.275-420.48Z" />
          </svg>
        </span>
        <div className="scroll-container">
          <div className="scroll-inner">
            <span className="scroll-text banner-msg">{broadcast.message}</span>
            <span className="scroll-text banner-msg">{broadcast.message}</span>
          </div>
        </div>
      </div>
    </div>
  )
}