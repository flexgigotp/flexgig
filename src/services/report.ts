// src/services/report.ts
import { api } from './api'

export interface TransactionReportPayload {
  transaction_ref: string
  transaction_amount: number
  transaction_status: string
  transaction_date: string
  issue_reason: string
  issue_details?: string
}

export interface TransactionReportResponse {
  ok: boolean
  message?: string
}

export const reportApi = {
  submit: (
    payload: TransactionReportPayload
  ): Promise<TransactionReportResponse> =>
    api
      .post<TransactionReportResponse>('/api/report-transaction', payload)
      .then((r) => r.data),
}