export class AppError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleApiError(error: any): AppError {
  if (error.response?.data) {
    const { message, code, status } = error.response.data
    return new AppError(code || 'UNKNOWN_ERROR', status || 500, message || 'An error occurred')
  }

  if (error.message === 'Network Error') {
    return new AppError('NETWORK_ERROR', 0, 'Network error. Please check your connection')
  }

  return new AppError('UNKNOWN_ERROR', 500, error.message || 'An error occurred')
}
