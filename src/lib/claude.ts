import { existsSync } from 'fs'

export class ClaudeNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeNotFoundError'
  }
}

export class ClaudeParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeParseError'
  }
}

export function findClaudeBinary(): string {
  if (process.env.CLAUDE_PATH && existsSync(process.env.CLAUDE_PATH)) {
    return process.env.CLAUDE_PATH
  }

  const candidates = [
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    (process.env.HOME ?? '') + '/.local/bin/claude',
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  const pathDirs = (process.env.PATH ?? '').split(':').filter(Boolean)
  for (const dir of pathDirs) {
    const candidate = `${dir}/claude`
    if (existsSync(candidate)) return candidate
  }

  throw new ClaudeNotFoundError(
    'Claude CLI not found. Install it with: npm install -g @anthropic-ai/claude-code'
  )
}

export async function runClaude(prompt: string): Promise<string> {
  const binaryPath = findClaudeBinary()
  const proc = Bun.spawn([binaryPath, '-p', prompt], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  await proc.exited
  if (proc.exitCode !== 0) {
    throw new Error(`Claude exited with code ${proc.exitCode}: ${stderr.trim()}`)
  }
  return stdout.trim()
}

export function extractJSON<T>(text: string): T {
  const fenceStart = text.match(/```json\s*/)
  if (fenceStart && fenceStart.index !== undefined) {
    const jsonStart = fenceStart.index + fenceStart[0].length
    const afterStart = text.slice(jsonStart)
    const closingPositions: number[] = []
    let searchPos = 0
    while (true) {
      const pos = afterStart.indexOf('```', searchPos)
      if (pos === -1) break
      closingPositions.push(pos)
      searchPos = pos + 3
    }
    for (let i = closingPositions.length - 1; i >= 0; i--) {
      const candidate = afterStart.slice(0, closingPositions[i]).trim()
      try {
        return JSON.parse(candidate) as T
      } catch {}
    }
  }

  const jsonMatches = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatches) {
    try {
      return JSON.parse(jsonMatches[0]) as T
    } catch {}
  }

  try {
    return JSON.parse(text.trim()) as T
  } catch {}

  throw new ClaudeParseError(
    `Could not extract JSON from Claude response. First 200 chars: ${text.slice(0, 200)}`
  )
}

export async function runClaudeJSON<T>(prompt: string): Promise<T> {
  const text = await runClaude(prompt)
  return extractJSON<T>(text)
}
