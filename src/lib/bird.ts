import { BIRD_PATH } from './config'
import type { BirdResponse, BirdTweet } from './types'

export class BirdAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BirdAuthError'
  }
}

export class BirdParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BirdParseError'
  }
}

export async function checkAuth(): Promise<boolean> {
  const proc = Bun.spawn([BIRD_PATH, 'whoami'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  await proc.exited
  // success indicates authenticated via Safari cookies/session
  if (proc.exitCode === 0) {
    return true
  }
  // treat missing credentials as not authenticated
  if (stderr.toLowerCase().includes('cookie') || stderr.toLowerCase().includes('missing')) {
    return false
  }
  // default to false on any non-zero exit
  return false
}

export async function fetchBookmarks(): Promise<BirdResponse> {
  const proc = Bun.spawn([BIRD_PATH, 'bookmarks', '--all', '--json'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  await proc.exited
  if (proc.exitCode !== 0) {
    if (stderr.includes('Missing required credentials') || stderr.toLowerCase().includes('cookie')) {
      throw new BirdAuthError('Safari cookies expired or missing. Please log in to X in Safari.')
    }
    throw new Error(`bird exited with code ${proc.exitCode}: ${stderr}`)
  }
  try {
    const data = JSON.parse(stdout)
    // Expect shape: { tweets: BirdTweet[], nextCursor?: string }
    if (data && typeof data === 'object' && 'tweets' in data) {
      return data as BirdResponse
    }
    // If the API returns a raw object, attempt to interpret as BirdResponse
    if (data && ('tweets' in data || 'nextCursor' in data)) {
      return data as BirdResponse
    }
    throw new BirdParseError('Invalid bookmarks JSON shape')
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new BirdParseError('Failed to parse bookmarks JSON')
    }
    throw e
  }
}

export async function fetchThread(tweetId: string): Promise<BirdTweet[]> {
  const proc = Bun.spawn([BIRD_PATH, 'thread', tweetId, '--json'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  await proc.exited
  if (proc.exitCode !== 0) {
    if (stderr.includes('Missing required credentials') || stderr.toLowerCase().includes('cookie')) {
      throw new BirdAuthError('Safari cookies expired or missing. Please log in to X in Safari.')
    }
    throw new Error(`bird exited with code ${proc.exitCode}: ${stderr}`)
  }
  try {
    const data = JSON.parse(stdout)
    // Normalize into BirdTweet[]
    if (Array.isArray(data)) {
      return data as BirdTweet[]
    }
    if (data && Array.isArray((data as any).tweets)) {
      return (data as any).tweets as BirdTweet[]
    }
    throw new BirdParseError('Invalid thread JSON shape')
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new BirdParseError('Failed to parse thread JSON')
    }
    throw e
  }
}
