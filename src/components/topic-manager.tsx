'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { SemanticCategoryWithCount } from '@/lib/types'

const INITIAL_VISIBLE = 8

export function TopicManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedCategoryId = searchParams.get('categoryId')

  const [categories, setCategories] = useState<SemanticCategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  const fetchCategories = useCallback(() => {
    fetch('/api/topics')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => setCategories(Array.isArray(res) ? res : (res.data ?? [])))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function handleCategoryClick(categoryId: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedCategoryId === String(categoryId)) {
      params.delete('categoryId')
    } else {
      params.set('categoryId', String(categoryId))
    }
    params.delete('folderId')
    params.delete('tagId')
    router.push(`/?${params.toString()}`)
  }

  const visibleCategories = showAll ? categories : categories.slice(0, INITIAL_VISIBLE)
  const hasMore = categories.length > INITIAL_VISIBLE

  return (
    <div className="px-3 py-3">
      <div className="mb-2 px-3">
        <span className="text-xs font-sans font-medium uppercase tracking-wider text-[#78716C]">
          Topics
        </span>
      </div>

      {loading ? (
        <div className="flex flex-wrap gap-1.5 px-3">
          <Skeleton className="h-5 w-20 rounded-full bg-[#1C1917]" />
          <Skeleton className="h-5 w-16 rounded-full bg-[#1C1917]" />
          <Skeleton className="h-5 w-24 rounded-full bg-[#1C1917]" />
        </div>
      ) : categories.length === 0 ? (
        <p className="px-3 text-xs text-[#78716C]">No topics yet</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 px-3">
            {visibleCategories.map((cat) => {
              const isActive = selectedCategoryId === String(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-sans font-medium transition-colors',
                    isActive
                      ? 'bg-[#F97316] text-[#0C0A09]'
                      : 'bg-[#1C1917] text-[#A8A29E] hover:bg-[#292524] hover:text-[#E7E5E4]'
                  )}
                >
                  {cat.name}
                  <span className={cn(
                    'text-[10px]',
                    isActive ? 'text-[#0C0A09]/60' : 'text-[#78716C]'
                  )}>
                    {cat.tweetCount}
                  </span>
                </button>
              )
            })}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 px-3 text-xs text-[#78716C] hover:text-[#E7E5E4] transition-colors"
            >
              {showAll ? 'Show less' : `Show all ${categories.length}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
