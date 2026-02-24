'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BookmarkList } from '@/components/bookmark-list'
import { AuthorSheet } from '@/components/author-sheet'

function HomeContent() {
  const searchParams = useSearchParams()
  const folderParam = searchParams.get('folderId')
  const tagParam = searchParams.get('tagId')
  const categoryParam = searchParams.get('categoryId')

  const folderId = folderParam ? Number(folderParam) : undefined
  const tagId = tagParam ? Number(tagParam) : undefined
  const categoryId = categoryParam ? Number(categoryParam) : undefined

  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl animate-fadeIn">
            <h1 className="mb-6 font-serif text-2xl font-light tracking-[-0.02em] text-[#E7E5E4]">
              All Bookmarks
            </h1>
            <BookmarkList
              folderId={folderId}
              tagId={tagId}
              categoryId={categoryId}
              onAuthorClick={(handle) => {
                setSelectedAuthor(handle)
                setSheetOpen(true)
              }}
            />
          </div>
        </main>
        <AuthorSheet
          handle={selectedAuthor}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
