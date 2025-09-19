import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../../utils/api-client'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('GET requests', () => {
    it('makes successful GET request', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, name: 'test' }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      })

      const result = await api.get('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
      expect(result).toEqual(mockResponse)
    })

    it('includes auth token when available', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ success: true })
      })

      await api.get('/protected')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })
  })

  describe('POST requests', () => {
    it('makes successful POST request with data', async () => {
      const postData = { name: 'test', value: 123 }
      const mockResponse = { success: true, id: 1 }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse
      })

      const result = await api.post('/create', postData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(postData)
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Error handling', () => {
    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(api.get('/test')).rejects.toThrow('Network error')
    })

    it('handles HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          success: false,
          error: 'Not found'
        })
      })

      await expect(api.get('/nonexistent')).rejects.toThrow('Not found')
    })

    it('handles non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'text/html']]),
        text: async () => '<html>Server Error</html>'
      })

      await expect(api.get('/error')).rejects.toThrow()
    })
  })

  describe('Retry mechanism', () => {
    it('retries on server errors', async () => {
      // First call fails with 500
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            success: false,
            error: 'SERVER_ERROR_500: Internal server error'
          })
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            success: true,
            data: 'success'
          })
        })

      const result = await api.get('/test')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({
        success: true,
        data: 'success'
      })
    })

    it('does not retry on client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          success: false,
          error: 'Bad request'
        })
      })

      await expect(api.get('/test')).rejects.toThrow('Bad request')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})

