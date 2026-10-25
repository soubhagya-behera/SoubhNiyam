// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterPage } from './RegisterPage'

const signUp = vi.fn()
const signIn = vi.fn()

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    status: 'anonymous',
    email: null,
    isRestoring: false,
    isAuthenticated: false,
    signIn,
    signUp,
    signOut: vi.fn(),
    signOutEverywhere: vi.fn(),
  }),
}))


describe('RegisterPage registration flow', () => {
  beforeEach(() => {
    signUp.mockReset()
    signIn.mockReset()
    signUp.mockResolvedValue({ email: 'user@example.com' })
  })

  afterEach(() => {
    cleanup()
  })

  it('creates an account without signing in and redirects to login', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<div>Login destination</div>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(document.querySelector('input[name="email"]')!, {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(document.querySelector('input[name="password"]')!, {
      target: { value: 'correct-horse-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByText('Login destination')).toBeTruthy()
    })
    expect(signUp).toHaveBeenCalledWith('user@example.com', 'correct-horse-1')
    expect(signIn).not.toHaveBeenCalled()
  })
})
