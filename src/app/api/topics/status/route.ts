import { NextResponse } from 'next/server'
import { getClassificationState } from '@/lib/categories'

export async function GET() {
  try {
    const state = getClassificationState()
    return NextResponse.json({ data: state })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}
