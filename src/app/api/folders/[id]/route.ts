import { NextRequest, NextResponse } from 'next/server'
import { updateFolder, deleteFolder } from '@/lib/folders'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const folderId = parseInt(id, 10)
    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    const body = await request.json()
    const { name, color } = body as { name?: string; color?: string }

    const folder = updateFolder(folderId, { name, color })
    return NextResponse.json({ data: folder })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update folder'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Folder name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const folderId = parseInt(id, 10)
    if (isNaN(folderId)) {
      return NextResponse.json({ error: 'Invalid folder ID' }, { status: 400 })
    }

    deleteFolder(folderId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
