import { NextResponse } from 'next/server'
import { getClassificationState } from '@/lib/categories'
import { classifyBookmarks } from '@/lib/classify'

export async function POST() {
  try {
    const state = getClassificationState()
    if (state.status !== 'idle') {
      return NextResponse.json(
        { error: 'Classification already running' },
        { status: 409 }
      )
    }

    classifyBookmarks().catch(console.error)

    return NextResponse.json({ data: { status: 'running' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start classification' },
      { status: 500 }
    )
  }
}
