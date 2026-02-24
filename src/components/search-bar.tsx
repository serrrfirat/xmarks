'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface SearchBarProps {
  initialQuery?: string
  resultCount?: number
}

export function SearchBar({ initialQuery = '', resultCount }: SearchBarProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const pushQuery = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`, { scroll: false })
      } else {
        router.push('/search', { scroll: false })
      }
    },
    [router],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      setValue(next)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => pushQuery(next), 300)
    },
    [pushQuery],
  )

  const handleClear = useCallback(() => {
    setValue('')
    if (timerRef.current) clearTimeout(timerRef.current)
    router.push('/search', { scroll: false })
    inputRef.current?.focus()
  }, [router])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search bookmarks..."
          value={value}
          onChange={handleChange}
          className="w-full bg-[#1C1917] border border-[#292524] rounded-full px-4 py-2.5 text-[#E7E5E4] font-sans text-sm placeholder:text-[#78716C] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all duration-300"
        />
        {value.length > 0 && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#ef4444] text-sm transition-colors duration-300"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {resultCount !== undefined && (
        <span className="shrink-0 text-[#78716C] font-sans text-sm">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </span>
      )}
    </div>
  )
}
