import { useAuth } from '@/hooks'
import { useTransactions } from '@/hooks'
import Spinner from '@/components/Spinner'

function Dashboard() {
  const { user } = useAuth()
  const { transactions, isLoading } = useTransactions()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Account Balance</p>
          <p className="text-3xl font-bold text-primary">₦0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Total Earnings</p>
          <p className="text-3xl font-bold text-success">₦0.00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 text-sm">Referrals</p>
          <p className="text-3xl font-bold text-secondary">0</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="py-2">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="py-2">{tx.description}</td>
                    <td className="py-2 font-semibold">
                      {tx.type === 'credit' ? '+' : '-'}₦{tx.amount}
                    </td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          tx.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
