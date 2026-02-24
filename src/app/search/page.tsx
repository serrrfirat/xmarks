'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { SearchBar } from '@/components/search-bar'
import { BookmarkList } from '@/components/bookmark-list'

function SearchContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl animate-fadeIn">
            <h1 className="mb-6 font-serif text-2xl font-light tracking-[-0.02em] text-[#E7E5E4]">
              Search
            </h1>

            <div className="mb-6">
              <SearchBar initialQuery={q} />
            </div>

            {q.trim() ? (
              <BookmarkList query={q} />
            ) : (
              <div className="py-12 text-center">
                <p className="text-[#78716C] font-sans text-sm">Type to search your bookmarks</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}
