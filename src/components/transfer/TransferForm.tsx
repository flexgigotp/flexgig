import { useState } from 'react'

interface TransferFormProps {
  balance: number
  initial?: { recipient: string; amount: number }
  onContinue: (data: { recipient: string; amount: number }) => void
}

export default function TransferForm({
  balance,
  initial,
  onContinue,
}: TransferFormProps) {
  const [recipient, setRecipient] = useState(initial?.recipient || '')
  const [amountRaw, setAmountRaw] = useState(
    initial?.amount ? String(initial.amount) : ''
  )
  const [recipientError, setRecipientError] = useState('')
  const [amountError, setAmountError] = useState('')

  const digits = amountRaw.replace(/[^\d]/g, '')
  const amount = digits ? Number(digits) : 0

  const formatAmount = (d: string) =>
    d ? Number(d).toLocaleString('en-NG') : ''

  const validate = (): boolean => {
    let rErr = ''
    let aErr = ''

    const r = recipient.trim()
    if (r.length < 3) rErr = 'Username must be at least 3 characters'
    else if (/^\d/.test(r)) rErr = 'Username cannot start with a number'
    else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(r))
      rErr = 'Invalid username format'
    else if (/__/.test(r)) rErr = 'Underscore cannot be consecutive'

    if (!digits) aErr = 'Amount is required'
    else if (amount <= 0) aErr = 'Invalid amount'
    else if (amount > balance) aErr = `Max ₦${balance.toLocaleString('en-NG')}`

    setRecipientError(rErr)
    setAmountError(aErr)
    return !rErr && !aErr
  }

  const canContinue =
    recipient.trim().length >= 3 && amount > 0 && amount <= balance

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onContinue({ recipient: recipient.trim(), amount })
  }

  return (
    <form className="fg-tx-form" onSubmit={handleSubmit}>
      <p className="fg-tx-instructions">
        Transfer an amount from your balance to another user on Flexgig.
      </p>

      <div className="fg-tx-group">
        <label className="fg-tx-label" htmlFor="tx-recipient">
          Username
        </label>
        <input
          id="tx-recipient"
          className="fg-tx-input"
          type="text"
          inputMode="text"
          placeholder="recipient_username"
          value={recipient}
          onChange={(e) => {
            const v = e.target.value.replace(/\s/g, '')
            setRecipient(v)
            if (recipientError) setRecipientError('')
          }}
          autoComplete="off"
          autoFocus
        />
        {recipientError && (
          <div className="fg-tx-error">{recipientError}</div>
        )}
      </div>

      <div className="fg-tx-group">
        <label className="fg-tx-label" htmlFor="tx-amount">
          Amount
        </label>
        <div className="fg-tx-amount-wrap">
          <span className="fg-tx-currency">₦</span>
          <input
            id="tx-amount"
            className="fg-tx-input fg-tx-amount"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatAmount(digits)}
            onChange={(e) => {
              const d = e.target.value.replace(/[^\d]/g, '')
              setAmountRaw(d)
              if (amountError) setAmountError('')
            }}
            autoComplete="off"
          />
        </div>
        {amountError && <div className="fg-tx-error">{amountError}</div>}
      </div>

      <button
        type="submit"
        className="fg-tx-continue"
        disabled={!canContinue}
      >
        Continue
      </button>
    </form>
  )
}