// src/components/history/HistoryFilters.tsx
import { useEffect, useRef, useState } from 'react'
import { useHistoryStore } from '@/stores/historyStore'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  type HistoryCategoryFilter,
  type HistoryStatusFilter,
} from '@/lib/history'

function FilterDropdown<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T
  options: T[]
  labels: Record<T, string>
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="custom-select-wrapper" ref={ref}>
      <button
        type="button"
        className={`custom-select-trigger${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="selected-value">{labels[value]}</span>
        <svg
          className="dropdown-arrow"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`custom-select-dropdown${open ? ' show' : ''}`}>
        {options.map((opt) => (
          <div
            key={opt}
            className={`dropdown-option${value === opt ? ' active' : ''}`}
            onClick={() => {
              onChange(opt)
              setOpen(false)
            }}
          >
            {labels[opt]}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryFilters() {
  const category = useHistoryStore((s) => s.category)
  const status = useHistoryStore((s) => s.status)
  const setCategory = useHistoryStore((s) => s.setCategory)
  const setStatus = useHistoryStore((s) => s.setStatus)

  const categoryOptions: HistoryCategoryFilter[] = ['all', 'data']
  const statusOptions: HistoryStatusFilter[] = [
    'all',
    'success',
    'failed',
    'pending',
    'refund',
    'credit',
    'mtn',
    'airtel',
    'glo',
    '9mobile',
  ]

  return (
    <div className="opay-filters">
      <FilterDropdown
        value={category}
        options={categoryOptions}
        labels={CATEGORY_LABELS}
        onChange={setCategory}
      />
      <FilterDropdown
        value={status}
        options={statusOptions}
        labels={STATUS_LABELS}
        onChange={setStatus}
      />
    </div>
  )
}