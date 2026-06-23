import { describe, it, expect, beforeEach } from 'vitest'
import { getSasiTokenFromUrl, hasSasiToken } from './external-provider.api'

// ──────────────────────────────────────────────
// Setup — reset URL before each test
// ──────────────────────────────────────────────

beforeEach(() => {
  window.history.pushState({}, '', '/')
})

// ──────────────────────────────────────────────
// getSasiTokenFromUrl
// ──────────────────────────────────────────────

describe('getSasiTokenFromUrl', () => {
  it('retorna null quando sasi-token não está na URL', () => {
    expect(getSasiTokenFromUrl()).toBeNull()
  })

  it('retorna o token quando sasi-token está presente na query string', () => {
    window.history.pushState({}, '', '/my-routes?sasi-token=abc123xyz')

    expect(getSasiTokenFromUrl()).toBe('abc123xyz')
  })

  it('retorna o token quando há outros parâmetros junto', () => {
    window.history.pushState({}, '', '/delivery?routeId=R001&sasi-token=token-456')

    expect(getSasiTokenFromUrl()).toBe('token-456')
  })

  it('retorna null quando apenas outros parâmetros estão presentes', () => {
    window.history.pushState({}, '', '/my-routes?routeId=R001&page=2')

    expect(getSasiTokenFromUrl()).toBeNull()
  })

  it('retorna o token exato sem transformações', () => {
    const rawToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
    window.history.pushState({}, '', `/my-routes?sasi-token=${encodeURIComponent(rawToken)}`)

    expect(getSasiTokenFromUrl()).toBe(rawToken)
  })
})

// ──────────────────────────────────────────────
// hasSasiToken
// ──────────────────────────────────────────────

describe('hasSasiToken', () => {
  it('retorna false quando sasi-token não está na URL', () => {
    expect(hasSasiToken()).toBe(false)
  })

  it('retorna true quando sasi-token está presente', () => {
    window.history.pushState({}, '', '/my-routes?sasi-token=any-token')

    expect(hasSasiToken()).toBe(true)
  })

  it('retorna false após navegar para URL sem token', () => {
    window.history.pushState({}, '', '/my-routes?sasi-token=token')
    expect(hasSasiToken()).toBe(true)

    window.history.pushState({}, '', '/my-routes')
    expect(hasSasiToken()).toBe(false)
  })
})
