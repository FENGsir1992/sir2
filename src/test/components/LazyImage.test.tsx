import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LazyImage from '../../components/LazyImage'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.IntersectionObserver = mockIntersectionObserver

describe('LazyImage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with placeholder initially', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        className="test-class"
      />
    )

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveClass('test-class')
    expect(img).toHaveAttribute('alt', 'Test image')
  })

  it('applies correct CSS classes', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
        className="custom-class"
      />
    )

    const img = screen.getByRole('img')
    expect(img).toHaveClass('custom-class')
  })

  it('handles missing src gracefully', () => {
    render(
      <LazyImage
        src=""
        alt="Test image"
      />
    )

    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
  })

  it('sets up intersection observer on mount', () => {
    render(
      <LazyImage
        src="https://example.com/image.jpg"
        alt="Test image"
      />
    )

    expect(mockIntersectionObserver).toHaveBeenCalled()
  })
})
