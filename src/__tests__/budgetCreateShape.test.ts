import { describe, it, expect, vi } from 'vitest'
import { createUserBudget, createUniversalULB } from '@/lib/api'

/**
 * Pin the wire shape for budget create POSTs.
 *
 * Background: GitHub's budgets API rejects user-scope and
 * multi_user_customer-scope POSTs that wrap the user under
 * `target_entity` with 400 'Missing required fields: user'. The
 * documented contract is top-level `user`, plus `budget_entity_name`
 * and `budget_alerting`. These tests keep that shape from drifting back.
 */
describe('budget create wire shape', () => {
  it('createUserBudget posts top-level user, not target_entity', async () => {
    const apiFetch = vi.fn().mockResolvedValue(undefined)
    await createUserBudget(apiFetch, 'octocat', 25)

    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, init] = apiFetch.mock.calls[0]
    expect(path).toBe('/budgets')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(init?.body as string)

    expect(body).toEqual({
      budget_type: 'BundlePricing',
      budget_product_sku: 'ai_credits',
      budget_scope: 'user',
      budget_amount: 25,
      prevent_further_usage: true,
      budget_entity_name: '',
      budget_alerting: { will_alert: false, alert_recipients: [] },
      user: 'octocat',
    })
    expect(body).not.toHaveProperty('target_entity')
  })

  it('createUniversalULB posts multi_user_customer scope without target_entity', async () => {
    const apiFetch = vi.fn().mockResolvedValue(undefined)
    await createUniversalULB(apiFetch, 100)

    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, init] = apiFetch.mock.calls[0]
    expect(path).toBe('/budgets')
    expect(init?.method).toBe('POST')
    const body = JSON.parse(init?.body as string)

    expect(body).toEqual({
      budget_type: 'BundlePricing',
      budget_product_sku: 'ai_credits',
      budget_scope: 'multi_user_customer',
      budget_amount: 100,
      prevent_further_usage: true,
      budget_entity_name: '',
      budget_alerting: { will_alert: false, alert_recipients: [] },
    })
    expect(body).not.toHaveProperty('target_entity')
    expect(body).not.toHaveProperty('user')
  })
})
