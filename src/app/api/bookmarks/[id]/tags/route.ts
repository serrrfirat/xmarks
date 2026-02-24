import { NextRequest, NextResponse } from 'next/server'
import { getTagsForTweet } from '@/lib/tags'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tags = getTagsForTweet(id)
    return NextResponse.json({ data: tags })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get tags for bookmark' },
      { status: 500 }
    )
  }
}
