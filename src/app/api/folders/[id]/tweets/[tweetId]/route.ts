import { NextRequest, NextResponse } from 'next/server'
import { removeTweetFromFolder } from '@/lib/folders'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tweetId: string }> }
) {
  try {
    const { id, tweetId } = await params
    const folderId = parseInt(id, 10)
    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    removeTweetFromFolder(tweetId, folderId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove tweet from folder' },
      { status: 500 }
    )
  }
}
