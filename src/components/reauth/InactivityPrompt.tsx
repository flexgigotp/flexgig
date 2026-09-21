interface InactivityPromptProps {
  onYes: () => void
}

export default function InactivityPrompt({ onYes }: InactivityPromptProps) {
  return (
    <div className="fg-prompt-overlay">
      <div className="fg-prompt-card">
        <h3 className="fg-prompt-title">Are you there?</h3>
        <button
          type="button"
          className="fg-prompt-yes"
          onClick={onYes}
        >
          Yes
        </button>
      </div>
    </div>
  )
}