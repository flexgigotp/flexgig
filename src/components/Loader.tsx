interface LoaderProps {
  /** Use lighter transparency when overlaying existing content. */
  transparent?: boolean
}

export default function Loader({ transparent = false }: LoaderProps) {
  return (
    <div
      className={`fg-loader-overlay${transparent ? ' transparent' : ''}`}
    >
      <div className="fg-logo-spinner">
        <img src="/pwa/logo.svg" alt="Loading" />
      </div>
    </div>
  )
}