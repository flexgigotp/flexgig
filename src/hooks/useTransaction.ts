import { useAsync } from './useAsync'
import { transactionService } from '@/services/transaction'
import { Transaction, TransactionFilter } from '@/types/transaction'

export function useTransactions(filter?: TransactionFilter) {
  const { data, status, error, execute } = useAsync(
    () => transactionService.getTransactions(filter),
    true
  )

  return {
    transactions: (data as Transaction[]) || [],
    isLoading: status === 'pending',
    error: error?.message || null,
    refetch: execute,
  }
}
