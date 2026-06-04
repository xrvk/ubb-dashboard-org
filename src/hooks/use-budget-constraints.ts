import { useMemo } from 'react'
import { computeBudgetConstraints, type BudgetConstraintsResult } from '@/lib/budgetConstraints'
import { useCredentials } from '@/hooks/use-credentials'
import { includedAiCredits, seatCostBreakdown } from '@/lib/pricing'

/**
 * Shared computation of the BudgetConstraintsResult from the credentials
 * context. Components that need to read/show constraint state (banner, help
 * page, planner surfaces) all use this so they stay in sync.
 */
export function useBudgetConstraints(): BudgetConstraintsResult {
  const { orgBudget, universalUlb, seats, budgets } = useCredentials()

  return useMemo(() => {
    const breakdown = seatCostBreakdown(seats)
    const pool = includedAiCredits(breakdown.business, breakdown.enterprise)
    return computeBudgetConstraints({
      orgBudget,
      universalUlb,
      seats,
      userBudgets: budgets,
      poolDollars: pool.totalDollars,
    })
  }, [orgBudget, universalUlb, seats, budgets])
}
