import { useState, useCallback } from 'react'

interface UseFormOptions<T> {
  initialValues: T
  onSubmit: (values: T) => Promise<void> | void
  validate?: (values: T) => Record<string, string>
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setValues((prev) => ({ ...prev, [name]: value }))
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }))
      }
    },
    [errors]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const newErrors = validate?.(values) || {}
      setErrors(newErrors)

      if (Object.keys(newErrors).length === 0) {
        setIsSubmitting(true)
        try {
          await onSubmit(values)
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [values, validate, onSubmit]
  )

  return { values, errors, isSubmitting, handleChange, handleSubmit }
}
