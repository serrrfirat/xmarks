import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM sync_state WHERE id = 1').get() as {
      last_sync_at: string | null
      last_cursor: string | null
      total_synced: number
      status: string
      error_message: string | null
    } | undefined

    if (!row) {
      return NextResponse.json({
        lastSyncAt: null,
        totalSynced: 0,
        status: 'idle',
        error: null,
      })
    }

    return NextResponse.json({
      lastSyncAt: row.last_sync_at,
      totalSynced: row.total_synced,
      status: row.status,
      error: row.error_message,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
