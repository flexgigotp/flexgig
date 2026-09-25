// src/services/transaction.ts

import apiClient from './api'
import { API_ENDPOINTS } from '@/constants/config'
import { Transaction, TransactionFilter } from '@/types/transaction'

export const transactionService = {
  async getTransactions(filter?: TransactionFilter) {
    const response = await apiClient.get(API_ENDPOINTS.TRANSACTIONS_LIST, {
      params: filter,
    })
    return response.data.data
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.get(API_ENDPOINTS.TRANSACTION_DETAIL.replace(':id', id))
    return response.data.data
  },

  async exportTransactions(filter?: TransactionFilter) {
    const response = await apiClient.get(API_ENDPOINTS.TRANSACTIONS_EXPORT, {
      params: filter,
      responseType: 'blob',
    })
    return response.data
  },
}
