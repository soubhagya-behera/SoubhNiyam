// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'anonymous',
    email: null,
    isRestoring: false,
    isAuthenticated: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signOutEverywhere: vi.fn(),
  }),
}))

describe('LoginPage registration success', () => {
  beforeEach(() => {})

  afterEach(() => {
    cleanup()
  })

  it('shows the account-created success message', () => {
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/login', state: { registrationSuccess: true, email: 'user@example.com' } },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByText('Account created successfully. Please sign in.'),
    ).toBeTruthy()
    expect(
      (document.querySelector('input[name="email"]') as HTMLInputElement).value,
    ).toBe('user@example.com')
  })
})
