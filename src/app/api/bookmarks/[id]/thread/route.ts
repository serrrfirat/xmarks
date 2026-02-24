import { NextRequest, NextResponse } from 'next/server'
import { fetchThread } from '@/lib/bird'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tweets = await fetchThread(id)
    return NextResponse.json({ data: tweets })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch thread' },
      { status: 500 }
    )
  }
}
