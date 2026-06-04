/**
 * Pure constraint calculator that enforces the "golden rule" for the org
 * variant: Σ effective per-user ULBs must remain the binding constraint, not
 * the org-level envelope.
 *
 * The org variant collapses to a single hard check:
 *
 *   max(0, Σ effectiveUlb(seat) − poolDollars) ≤ org budget
 *
 * where `effectiveUlb` is the user's individual ULB if set, otherwise the
 * universal ULB amount (or 0 when neither is configured). ULBs cap gross
 * AI-credit pool draw per user, while the org budget only meters post-pool
 * (net) spend, so the shared pool is subtracted from the gross ULB sum
 * before it is compared to the org envelope.
 *
 * See docs/budget-constraints.md for the model, vocabulary, and justification.
 *
 * This module is intentionally dependency-free apart from the data types in
 * `./api`. Inputs are normalized values (no fetch I/O). Output is a structured
 * report of which check passes/fails plus soft warnings.
 */

import type {
  CopilotSeat,
  OrgBudget,
  UniversalUlb,
  UserBudget,
} from './api'

// --- Inputs ---

export interface ComputeBudgetConstraintsInput {
  orgBudget: OrgBudget | null
  universalUlb: UniversalUlb | null
  /** All Copilot seats: the universe of users we constrain. */
  seats: CopilotSeat[]
  /** User-scope ai_credits budgets. Keyed-by-login lookup is built internally. */
  userBudgets: UserBudget[]
  /**
   * Dollar value of the shared AI-credit pool for this billing cycle. ULBs cap
   * gross pool draw per user, while the org budget only meters the post-pool
   * (net) spend. The engine subtracts this pool from the gross ULB sum before
   * comparing to the org envelope, so the two ledgers stay comparable.
   * Defaults to 0 when the caller does not know, which recovers the legacy
   * gross-vs-net comparison.
   */
  poolDollars?: number
}

// --- Outputs ---

/**
 * Result of the hard check. `ok=true` means the check passes.
 * `actual ≤ allowed` always when `ok=true`. When `ok=false`,
 * `overBy = actual - allowed`.
 *
 * `actual` is the post-pool ULB sum: `max(0, Σ effectiveUlb − poolDollars)`.
 * `grossUlbs` and `poolShare` carry the unadjusted numbers so the UI can
 * explain the math (e.g. "$X gross of caps − $Y from the pool = $Z of
 * metered exposure against a $W envelope").
 */
export interface BudgetCheck {
  ok: boolean
  /** Post-pool ULB sum. */
  actual: number
  /** The org-budget envelope being checked against. */
  allowed: number
  /** How far over `allowed` we are. 0 when `ok=true`. */
  overBy: number
  /** Σ effective ULBs before subtracting the pool share. */
  grossUlbs: number
  /** Pool dollars attributed to this check (entire pool in the org variant). */
  poolShare: number
}

export type ConstraintMode = 'org-budget' | 'no-org-budget'

export interface BudgetWarning {
  /** Machine-readable code. */
  code:
    | 'prevent_further_usage_off'
    | 'unbounded_user_coverage'
  message: string
  /** Optional details (e.g. login). */
  context?: Record<string, unknown>
}

export interface BudgetConstraintsResult {
  mode: ConstraintMode
  /**
   * max(0, Σ effective ULBs − poolDollars) ≤ org budget. `null` when there
   * is no org budget (mode === 'no-org-budget'): in that case the org has no
   * top-level cap and the only thing bounding spend is the universal /
   * individual ULBs themselves.
   */
  mainCheck: BudgetCheck | null
  warnings: BudgetWarning[]
  /**
   * The max universal ULB value that would keep the hard check passing,
   * holding everything else (individual ULBs, org budget, pool) constant.
   * May be `Infinity` when no envelope binds, or `0` when even a universal
   * ULB of 0 fails.
   */
  maxSafeUniversalUlb: number
  /**
   * Convenience: count of seats that effectively draw from the universal
   * pool (i.e. don't have an individual ULB). Surfaces in the help page
   * and constraints banner.
   */
  universalSeatCount: number
}

// --- Helpers ---

/**
 * Build a BudgetCheck for a bucket whose LHS is gross ULB exposure compared
 * against a net (post-pool) envelope. The pool share is subtracted from the
 * gross sum before comparison, but both raw numbers are echoed back so the UI
 * can render the full math.
 */
function checkLeNet(grossUlbs: number, poolShare: number, allowed: number): BudgetCheck {
  const actual = Math.max(0, grossUlbs - poolShare)
  const ok = actual <= allowed
  return {
    ok,
    actual,
    allowed,
    overBy: ok ? 0 : actual - allowed,
    grossUlbs,
    poolShare,
  }
}

// --- Main ---

export function computeBudgetConstraints(
  input: ComputeBudgetConstraintsInput,
): BudgetConstraintsResult {
  const { orgBudget, universalUlb, seats, userBudgets, poolDollars = 0 } = input

  const individualByLogin = new Map<string, UserBudget>()
  let individualTotal = 0
  for (const ub of userBudgets) {
    if (ub.user) {
      individualByLogin.set(ub.user.toLowerCase(), ub)
      individualTotal += ub.budgetAmount
    }
  }

  // Effective draw from the universal pool: number of seats that don't have
  // an individual ULB override.
  let universalSeatCount = 0
  for (const seat of seats) {
    if (!individualByLogin.has(seat.login.toLowerCase())) {
      universalSeatCount += 1
    }
  }
  const universalAmount = universalUlb?.budgetAmount ?? 0
  const universalTotal = universalAmount * universalSeatCount

  const ulbTotalGross = individualTotal + universalTotal

  const warnings: BudgetWarning[] = []
  if (orgBudget && !orgBudget.preventFurtherUsage) {
    warnings.push({
      code: 'prevent_further_usage_off',
      message:
        'The organization budget is configured as a soft cap (alerts only). Turn on “Prevent further usage” to enforce a hard ceiling.',
    })
  }
  if (!universalUlb && seats.length > 0) {
    // Without a universal ULB, anyone without an individual ULB is unbounded.
    const unboundedSeats = seats.filter(s => !individualByLogin.has(s.login.toLowerCase()))
    if (unboundedSeats.length > 0) {
      warnings.push({
        code: 'unbounded_user_coverage',
        message: `${unboundedSeats.length} Copilot seat${
          unboundedSeats.length === 1 ? ' has' : 's have'
        } no individual ULB and no universal ULB to fall back on.`,
        context: { unboundedSeatCount: unboundedSeats.length },
      })
    }
  }

  if (!orgBudget) {
    return {
      mode: 'no-org-budget',
      mainCheck: null,
      warnings,
      // With no org cap, any universal ULB is mathematically "safe"; surfacing
      // Infinity here lets callers fall back to a per-user heuristic.
      maxSafeUniversalUlb: Infinity,
      universalSeatCount,
    }
  }

  const mainCheck = checkLeNet(ulbTotalGross, poolDollars, orgBudget.budgetAmount)

  // maxSafeUniversalUlb solves
  //   max(0, individualTotal + U * universalSeatCount − poolDollars) ≤ orgBudget
  // ⇒ U ≤ (orgBudget + poolDollars − individualTotal) / universalSeatCount
  // held to >= 0. If everyone has an individual ULB, the universal value
  // does not affect the sum, so any value is safe (Infinity).
  let maxSafeUniversalUlb: number
  if (universalSeatCount === 0) {
    maxSafeUniversalUlb = Infinity
  } else {
    const remaining = orgBudget.budgetAmount + poolDollars - individualTotal
    maxSafeUniversalUlb = Math.max(0, remaining / universalSeatCount)
  }

  return {
    mode: 'org-budget',
    mainCheck,
    warnings,
    maxSafeUniversalUlb,
    universalSeatCount,
  }
}
