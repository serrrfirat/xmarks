'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Check, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Folder } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

const COLOR_PRESETS = [
  { name: 'red', hex: '#ef4444' },
  { name: 'orange', hex: '#f97316' },
  { name: 'amber', hex: '#fb923c' },
  { name: 'green', hex: '#22c55e' },
  { name: 'teal', hex: '#14b8a6' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'purple', hex: '#8b5cf6' },
  { name: 'pink', hex: '#ec4899' },
] as const

type FolderWithCount = Folder & { bookmarkCount?: number }

export function FolderManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedFolderId = searchParams.get('folderId')

  const [folders, setFolders] = useState<FolderWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>(COLOR_PRESETS[5].hex)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchFolders = useCallback(() => {
    fetch('/api/folders')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((res) => setFolders(Array.isArray(res) ? res : (res.data ?? [])))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  function handleFolderClick(folderId: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedFolderId === String(folderId)) {
      params.delete('folderId')
    } else {
      params.set('folderId', String(folderId))
    }
    params.delete('tagId')
    router.push(`/?${params.toString()}`)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      if (res.ok) {
        setNewName('')
        setNewColor(COLOR_PRESETS[5].hex)
        setCreateOpen(false)
        fetchFolders()
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(folderId: number) {
    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeletingId(null)
        if (selectedFolderId === String(folderId)) {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('folderId')
          router.push(`/?${params.toString()}`)
        }
        fetchFolders()
      }
    } catch {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
          Folders
        </span>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
              aria-label="Create folder"
            >
              <Plus className="size-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Folder</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Input
                placeholder="Folder name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                }}
                autoFocus
              />
              <div>
                <span className="mb-2 block text-sm font-medium text-muted-foreground">
                  Color
                </span>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setNewColor(c.hex)}
                      className={cn(
                        'size-7 rounded-full border-2 transition-all',
                        newColor === c.hex
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
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
        <div className="flex flex-col gap-2 px-3">
          <Skeleton className="h-5 w-3/4 bg-sidebar-accent" />
          <Skeleton className="h-5 w-1/2 bg-sidebar-accent" />
          <Skeleton className="h-5 w-2/3 bg-sidebar-accent" />
        </div>
      ) : folders.length === 0 ? (
        <p className="px-3 text-xs text-sidebar-foreground/40">
          No folders yet
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {folders.map((f) => {
            const isActive = selectedFolderId === String(f.id)
            const isDeleting = deletingId === f.id

            if (isDeleting) {
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm bg-destructive/10"
                >
                  <span className="text-xs font-medium text-destructive">
                    Delete?
                  </span>
                  <div className="ml-auto flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(f.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/20"
                      aria-label="Confirm delete"
                    >
                      <Check className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setDeletingId(null)}
                      className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
                      aria-label="Cancel delete"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={f.id}
                className={cn(
                  'group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
                onClick={() => handleFolderClick(f.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleFolderClick(f.id)
                  }
                }}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: f.color || '#3b82f6' }}
                />
                <span className="truncate">{f.name}</span>
                {f.bookmarkCount != null && (
                  <span className="ml-auto mr-1 text-[10px] tabular-nums text-sidebar-foreground/40">
                    {f.bookmarkCount}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    'shrink-0 text-sidebar-foreground/40 hover:text-destructive transition-opacity',
                    f.bookmarkCount != null
                      ? 'opacity-0 group-hover:opacity-100'
                      : 'ml-auto opacity-0 group-hover:opacity-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingId(f.id)
                  }}
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
