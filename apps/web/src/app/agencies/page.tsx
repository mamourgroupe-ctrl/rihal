'use client';

import { useAgencies } from '@/lib/agencies';

export default function AgenciesPage() {
  const { data, isLoading, isError, error } = useAgencies();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading agencies…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">
          Failed to load agencies: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  const agencies = data ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-black">
      <main className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Agencies
        </h1>

        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Plan
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Period End
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  Cancel at Period End
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {agencies.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No agencies found.
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {agency.plan.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {agency.status}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {agency.price} {agency.currency}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {new Date(agency.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {agency.cancelAtPeriodEnd ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
