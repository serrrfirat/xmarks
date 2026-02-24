import { type NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOST = 'video.twimg.com'

const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'accept-ranges',
  'content-range',
  'cache-control',
  'etag',
  'last-modified',
] as const

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only https: URLs are allowed' }, { status: 403 })
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_HOST} is allowed` },
      { status: 403 },
    )
  }

  const headers: HeadersInit = {}
  const rangeHeader = request.headers.get('range')
  if (rangeHeader) {
    headers['range'] = rangeHeader
  }

  let upstream: Response
  try {
    upstream = await fetch(rawUrl, { headers })
  } catch {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
  }

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: 502 },
    )
  }

  const responseHeaders = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) {
      responseHeaders.set(name, value)
    }
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}