// src/components/pin/PinInputs.tsx
interface PinInputsProps {
  length: number
  filled: number
}

export default function PinInputs({ length, filled }: PinInputsProps) {
  return (
    <div className="fg-pin-inputs" aria-hidden>
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`fg-pin-box${i < filled ? ' filled' : ''}`}
        />
      ))}
    </div>
  )
}