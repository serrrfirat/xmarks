'use client'

import { useMemo, useState } from 'react'

import type { BirdMedia, Folder, Tag, Tweet } from '@/lib/types'
import { cn, formatCount, formatRelativeDate } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThreadView } from '@/components/thread-view'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export interface BookmarkCardProps {
  tweet: Tweet
  tags?: Tag[]
  folders?: Folder[]
  onAddToFolder?: (tweetId: string, folderId: number) => void
  onAddTag?: (tweetId: string, tagId: number) => void
  activeFolderColor?: string
  onAuthorClick?: (handle: string) => void
}

export function BookmarkCard({
  tweet,
  tags,
  folders,
  onAddToFolder,
  onAddTag,
  activeFolderColor,
  onAuthorClick,
}: BookmarkCardProps) {

  const [threadOpen, setThreadOpen] = useState(false)

  const media: BirdMedia[] = useMemo(() => {
    if (!tweet.mediaJson) return []
    try {
      return JSON.parse(tweet.mediaJson) as BirdMedia[]
    } catch {
      return []
    }
  }, [tweet.mediaJson])

  const primaryMedia = media[0]
  const mediaType = primaryMedia?.type
  const hasVideoStream = Boolean(primaryMedia?.videoUrl)
  const shouldRenderVideo = (mediaType === 'video' || mediaType === 'animated_gif') && hasVideoStream
  const imageSrc = primaryMedia?.previewUrl ?? primaryMedia?.url

  const proxiedVideoSrc = primaryMedia?.videoUrl
    ? '/api/media/video?url=' + encodeURIComponent(primaryMedia.videoUrl)
    : null

  return (
    <>
      <article
        className={cn(
          'group relative card-naturalism p-4 transition-all duration-300',
          activeFolderColor && 'border-l-[3px]',
        )}
        style={
          activeFolderColor
            ? { borderLeftColor: activeFolderColor }
            : undefined
        }
      >
        {/* ── Author row ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3">

          <div
            className="shrink-0 w-9 h-9 rounded-full bg-[#292524] flex items-center justify-center text-xs font-sans font-medium text-[#F97316]"
            aria-hidden
          >
            {initials(tweet.authorName)}
          </div>

          <div className="min-w-0 flex-1">

            <div className="flex flex-wrap items-center gap-x-1.5">
              <button
                onClick={() => onAuthorClick?.(tweet.authorHandle)}
                data-author-handle={tweet.authorHandle}
                className="truncate text-[#E7E5E4] font-sans text-sm font-medium hover:text-[#F97316] transition-colors cursor-pointer"
              >
                {tweet.authorName}
              </button>
              <span className="truncate text-[#78716C] font-sans text-sm">
                @{tweet.authorHandle}
              </span>
              <span className="text-[#78716C] font-sans text-sm">
                · {formatRelativeDate(tweet.createdAt)}
              </span>
            </div>

            {/* ── Tweet text ───────────────────────────────────── */}
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[#E7E5E4] font-sans text-base leading-relaxed">
              {tweet.text}
            </p>

            {/* ── Primary media (photo/video/animated_gif) ────────── */}
            {primaryMedia && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#292524]">
                {shouldRenderVideo && proxiedVideoSrc ? (
                  <video
                    src={proxiedVideoSrc}
                    poster={imageSrc}
                    autoPlay
                    muted
                    controls
                    playsInline
                    preload="metadata"
                    loop={mediaType === 'animated_gif'}
                    className="max-h-80 w-full object-cover bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageSrc}
                    alt="Tweet media"
                    loading="lazy"
                    className="max-h-80 w-full object-cover"
                  />
                )}
              </div>
            )}

            {/* ── Tags ─────────────────────────────────────────── */}
            {tags && tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-[#292524] text-[#E7E5E4] text-xs font-sans px-2.5 py-0.5"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* ── Stats row ────────────────────────────────────── */}
            <div className="mt-3 flex items-center gap-4 text-[#78716C] text-xs font-sans">
              <span>{formatCount(tweet.replyCount)} replies</span>
              <span>·</span>
              <span>{formatCount(tweet.retweetCount)} retweets</span>
              <span>·</span>
              <span>{formatCount(tweet.likeCount)} likes</span>
            </div>

            {/* ── Actions row ──────────────────────────────────── */}
            <div className="mt-3 flex items-center gap-3">
              <a
                href={tweet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#78716C] hover:text-[#F97316] text-xs font-sans font-medium transition-colors duration-300"
              >
                Open
              </a>

              {folders && folders.length > 0 && onAddToFolder && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-[#78716C] hover:text-[#F97316] text-xs font-sans font-medium transition-colors duration-300 cursor-pointer">
                    Move
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 border-[#292524] bg-[#1C1917]">
                    <DropdownMenuLabel className="text-[#78716C] text-xs font-sans">Add to folder</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#292524]" />
                    {folders.map((folder) => (
                      <DropdownMenuItem
                        key={folder.id}
                        onSelect={() => onAddToFolder(tweet.id, folder.id)}
                        className="text-[#E7E5E4] text-xs font-sans focus:bg-[#292524] focus:text-[#E7E5E4]"
                      >
                        {folder.color && (
                          <span
                            className="mr-1.5 inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: folder.color }}
                          />
                        )}
                        {folder.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {onAddTag && tags !== undefined && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-[#78716C] hover:text-[#F97316] text-xs font-sans font-medium transition-colors duration-300 cursor-pointer">
                    Tag
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 border-[#292524] bg-[#1C1917]">
                    <DropdownMenuLabel className="text-[#78716C] text-xs font-sans">Add tag</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-[#292524]" />
                    <DropdownMenuItem disabled className="text-[#78716C] text-xs font-sans">
                      No more tags
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {tweet.isThread && (
                <button
                    className="text-[#78716C] hover:text-[#F97316] text-xs font-sans font-medium transition-colors duration-300 cursor-pointer"
                  onClick={() => setThreadOpen((o) => !o)}
                >
                  {threadOpen ? 'Hide thread' : 'Thread'}
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      {tweet.isThread && (
        <ThreadView
          tweetId={tweet.id}
          isOpen={threadOpen}
          onClose={() => setThreadOpen(false)}
        />
      )}
    </>
  )
}
