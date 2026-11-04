// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeprecationBanner } from '../components/DeprecationBanner'

describe('DeprecationBanner', () => {
  it('displays the archive date and links to the repository notice', () => {
    render(<DeprecationBanner />)

    expect(screen.getByRole('note', { name: 'Deprecation notice' })).toHaveTextContent(
      'This project is deprecated and will be archived on December 7, 2026.',
    )
    expect(screen.getByRole('link', { name: 'Read the deprecation notice' })).toHaveAttribute(
      'href',
      'https://github.com/xrvk/ubb-dashboard-org#deprecation-notice',
    )
  })
})
