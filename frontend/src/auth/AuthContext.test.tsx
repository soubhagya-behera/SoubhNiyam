// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider, resetSessionRestorationForTests, useAuth } from './AuthContext'
import * as authApi from '../api/auth'

vi.mock('../api/auth', () => ({
  refresh: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
}))

function Probe() {
  const auth = useAuth()
  return <span data-testid="status">{auth.status}</span>
}

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    localStorage.clear()
    resetSessionRestorationForTests()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    resetSessionRestorationForTests()
  })

  it('rotates the refresh token exactly once under StrictMode', async () => {
    localStorage.setItem('pie.refreshToken', 'old-refresh-token')
    localStorage.setItem('pie.email', 'user@example.com')

    vi.mocked(authApi.refresh).mockResolvedValue({
      accessToken: 'new-access-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: 'new-refresh-token',
      refreshExpiresIn: 86400,
    })

    render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('authenticated'),
    )

    expect(vi.mocked(authApi.refresh)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(authApi.refresh)).toHaveBeenCalledWith('old-refresh-token')
    expect(localStorage.getItem('pie.refreshToken')).toBe('new-refresh-token')
  })

  it('does not stay in the restoring state when refresh fails', async () => {
    localStorage.setItem('pie.refreshToken', 'old-refresh-token')

    vi.mocked(authApi.refresh).mockRejectedValue(new Error('invalid refresh token'))

    render(
      <StrictMode>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </StrictMode>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('anonymous'),
    )

    expect(localStorage.getItem('pie.refreshToken')).toBeNull()
  })
})
