'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'

import { SidebarContent } from '@/components/layout/sidebar'

export function Header() {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = query.trim()
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`)
      }
    },
    [query, router]
  )

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch('/api/sync', { method: 'POST' })
    } catch {

    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#292524] bg-[#0C0A09] px-4">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            className="btn-pill btn-pill-secondary flex flex-col items-center justify-center gap-[5px] px-2.5 py-2 md:hidden"
            aria-label="Open navigation"
          >
            <span className="block h-[2px] w-4 rounded-full bg-current" />
            <span className="block h-[2px] w-4 rounded-full bg-current" />
            <span className="block h-[2px] w-4 rounded-full bg-current" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 bg-[#0C0A09] border-[#292524]" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <form onSubmit={handleSearch} className="flex flex-1 items-center gap-0">
        <input
          type="search"
          placeholder="Search bookmarks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-[#E7E5E4] placeholder:text-[#78716C] font-sans text-sm bg-[#1C1917] rounded-full px-4 py-2 border border-[#292524] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all duration-300 outline-none"
        />
      </form>

      <button
        onClick={handleSync}
        disabled={syncing}
        aria-label="Sync bookmarks"
        className="btn-pill btn-pill-primary text-sm disabled:opacity-40"
      >
        {syncing ? 'Syncing...' : 'Sync'}
      </button>
    </header>
  )
}
