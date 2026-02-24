'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, TagIcon, X, Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Tag } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

export function TagManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTagId = searchParams.get('tagId')

  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchTags = useCallback(() => {
    fetch('/api/tags')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => setTags(Array.isArray(res) ? res : (res.data ?? [])))
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  function handleTagClick(tagId: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedTagId === String(tagId)) {
      params.delete('tagId')
    } else {
      params.set('tagId', String(tagId))
    }
    params.delete('folderId')
    router.push(`/?${params.toString()}`)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        setNewName('')
        setCreateOpen(false)
        fetchTags()
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(tagId: number) {
    try {
      const res = await fetch(`/api/tags/${tagId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeletingId(null)
        if (selectedTagId === String(tagId)) {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('tagId')
          router.push(`/?${params.toString()}`)
        }
        fetchTags()
      }
    } catch {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Tags
        </span>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
              aria-label="Create tag"
            >
              <Plus className="size-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tag</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Tag name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              autoFocus
            />
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex flex-wrap gap-1.5 px-3">
          <Skeleton className="h-5 w-14 rounded-full bg-sidebar-accent" />
          <Skeleton className="h-5 w-18 rounded-full bg-sidebar-accent" />
          <Skeleton className="h-5 w-12 rounded-full bg-sidebar-accent" />
        </div>
      ) : tags.length === 0 ? (
        <p className="px-3 text-xs text-sidebar-foreground/40">
          No tags yet
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 px-3">
          {tags.map((t) => {
            const isActive = selectedTagId === String(t.id)
            const isDeleting = deletingId === t.id

            if (isDeleting) {
              return (
                <Badge
                  key={t.id}
                  variant="destructive"
                  className="gap-1 cursor-default"
                >
                  Delete?
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
                    aria-label="Confirm delete"
                  >
                    <Check className="size-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(null)}
                    className="rounded-full p-0.5 hover:bg-white/20"
                    aria-label="Cancel delete"
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              )
            }

            return (
              <Badge
                key={t.id}
                variant="secondary"
                className={cn(
                  'cursor-pointer gap-1 transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
                )}
                onClick={() => handleTagClick(t.id)}
              >
                <TagIcon className="size-2.5" />
                {t.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingId(t.id)
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`Remove ${t.name}`}
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
