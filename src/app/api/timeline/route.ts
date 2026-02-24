import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '30', 10)

    if (isNaN(days) || days < 1) {
      return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 })
    }

    const db = getDb()
    const rows = db
      .prepare(
        `SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as count
         FROM tweets
         WHERE created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY date
         ORDER BY date DESC`
      )
      .all(days) as { date: string; count: number }[]

    return NextResponse.json({ data: rows })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get timeline' },
      { status: 500 }
    )
  }
}
