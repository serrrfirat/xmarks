import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number into a compact human-readable string.
 * 0–999 → as-is, 1 000+ → "1.2K", 1 000 000+ → "1.2M"
 */
export function formatCount(n: number): string {
  if (n < 1_000) return String(n)
  if (n < 1_000_000) {
    const k = n / 1_000
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`
  }
  const m = n / 1_000_000
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/**
 * Format an ISO date string into a relative or short absolute label.
 * <60 s → "just now", <60 m → "2m ago", <24 h → "2h ago",
 * <7 d → "3d ago", otherwise → "Feb 22"
 */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1_000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`
}
