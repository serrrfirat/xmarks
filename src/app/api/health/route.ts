import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM sync_state WHERE id = 1').get() as {
      last_sync_at: string | null
      total_synced: number
      status: string
      error_message: string | null
    } | undefined

    return NextResponse.json({
      status: 'ok',
      version: '0.1.0',
      sync: row
        ? {
            lastSyncAt: row.last_sync_at,
            totalSynced: row.total_synced,
            status: row.status,
            error: row.error_message,
          }
        : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Health check failed' },
      { status: 500 }
    )
  }
}
