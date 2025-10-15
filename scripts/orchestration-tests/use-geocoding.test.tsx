import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGeocoding } from '@/features/site/hooks/useGeocoding'

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn()
}))

vi.mock('@/core/services/api/HttpClient', () => ({
  httpClient: {
    get: getMock
  }
}))

const createWrapper = () => {
  const queryClient = new QueryClient()

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useGeocoding', () => {
  beforeEach(() => {
    getMock.mockReset()
  })

  it('geocodeAddress retourne les résultats issus du backend', async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {
          formattedAddress: '10 rue de Test, Paris',
          lat: 48.8566,
          lng: 2.3522
        }
      ]
    })

    const { result } = renderHook(() => useGeocoding(), {
      wrapper: createWrapper()
    })

    const output = await act(() =>
      result.current.geocodeAddress('10 rue de Test, Paris')
    )

    expect(getMock).toHaveBeenCalledWith(expect.stringMatching('/api/geocode'))
    expect(output).toHaveLength(1)
    expect(result.current.lastResults).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('reverseGeocode renvoie une erreur lorsqu\'une exception survient', async () => {
    const failure = new Error('Network down')
    getMock.mockRejectedValueOnce(failure)

    const { result } = renderHook(() => useGeocoding(), {
      wrapper: createWrapper()
    })

    await expect(
      act(async () => {
        await result.current.reverseGeocode({ lat: 0, lng: 0 })
      })
    ).rejects.toBeInstanceOf(Error)

    expect(result.current.lastResults).toHaveLength(0)
  })
})
