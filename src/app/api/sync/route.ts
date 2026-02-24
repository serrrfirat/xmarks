import { NextResponse } from 'next/server'
import { syncBookmarks } from '@/lib/sync'

export async function POST() {
  const start = Date.now()
  try {
    const result = await syncBookmarks()
    const duration = Date.now() - start
    return NextResponse.json({
      synced: result.synced,
      lastSyncAt: result.lastSyncAt,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - start
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed', duration },
      { status: 500 }
    )
  }
}
