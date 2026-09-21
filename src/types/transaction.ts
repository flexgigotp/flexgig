export interface Transaction {
  id: string
  type: 'credit' | 'debit'
  amount: number
  description: string
  status: 'pending' | 'completed' | 'failed'
  reference: string
  createdAt: string
  updatedAt: string
}

export interface TransactionFilter {
  type?: 'credit' | 'debit'
  status?: 'pending' | 'completed' | 'failed'
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}
