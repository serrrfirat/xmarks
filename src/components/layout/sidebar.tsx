'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { SyncStatus } from '@/components/sync-status'
import { FolderManager } from '@/components/folder-manager'
import { TagManager } from '@/components/tag-manager'
import { TopicManager } from '@/components/topic-manager'
import { ClassifyButton } from '@/components/classify-button'

const NAV_ITEMS = [
  { href: '/', label: 'All Bookmarks' },
  { href: '/search', label: 'Search' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/graph', label: 'Graph' },
  { href: '/stats', label: 'Stats' },
] as const

function FoldersSkeleton() {
  return (
    <div className="px-3 py-3">
      <div className="mb-2 px-3 text-xs font-sans font-medium uppercase tracking-wider text-[#78716C]">
        Folders
      </div>
      <div className="flex flex-col gap-2 px-3">
        <Skeleton className="h-5 w-3/4 bg-[#1C1917]" />
        <Skeleton className="h-5 w-1/2 bg-[#1C1917]" />
      </div>
    </div>
  )
}

function TagsSkeleton() {
  return (
    <div className="px-3 py-3">
      <div className="mb-2 px-3 text-xs font-sans font-medium uppercase tracking-wider text-[#78716C]">
        Tags
      </div>
      <div className="flex flex-wrap gap-1.5 px-3">
        <Skeleton className="h-5 w-14 bg-[#1C1917]" />
        <Skeleton className="h-5 w-18 bg-[#1C1917]" />
      </div>
    </div>
  )
}

function TopicsSkeleton() {
  return (
    <div className="px-3 py-3">
      <div className="mb-2 px-3 text-xs font-sans font-medium uppercase tracking-wider text-[#78716C]">
        Topics
      </div>
      <div className="flex flex-wrap gap-1.5 px-3">
        <div className="h-5 w-20 rounded-full bg-[#1C1917] animate-pulse" />
        <div className="h-5 w-16 rounded-full bg-[#1C1917] animate-pulse" />
        <div className="h-5 w-24 rounded-full bg-[#1C1917] animate-pulse" />
      </div>
    </div>
  )
}

export function SidebarContent() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col text-[#E7E5E4]">
      <div className="flex h-14 items-center gap-2 px-5">
        <span className="font-serif text-xl font-light tracking-[-0.02em] text-[#E7E5E4]">XMarks</span>
      </div>

      <div className="serrated-edge mx-3" />

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-3 py-3">
          <TooltipProvider>
            {NAV_ITEMS.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={href}
                      className={cn(
                        'group flex items-center gap-2 font-sans text-sm font-medium transition-all duration-300',
                        active
      ? 'bg-[#F97316] text-[#0C0A09] rounded-full px-4 py-2'
                          : 'text-[#E7E5E4] hover:bg-[#1C1917] rounded-full px-4 py-2'
                      )}
                    >
      {active && <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] shrink-0" />}
                      {label}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              )
            })}
          </TooltipProvider>
        </div>

        <div className="serrated-edge mx-3" />

        <Suspense fallback={<FoldersSkeleton />}>
          <FolderManager />
        </Suspense>

        <div className="serrated-edge mx-3" />

        <Suspense fallback={<TagsSkeleton />}>
          <TagManager />
        </Suspense>

        <div className="serrated-edge mx-3" />

        <Suspense fallback={<TopicsSkeleton />}>
          <TopicManager />
        </Suspense>
      </ScrollArea>

      <div className="serrated-edge mx-3" />
      <ClassifyButton />
      <SyncStatus />
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-[#292524] bg-[#0C0A09] md:block">
      <SidebarContent />
    </aside>
  )
}
