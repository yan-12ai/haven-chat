import type { ChatTurn } from '../types'
import type { StreamOptions } from './chatApi'

/**
 * Talks to a real backend that streams its reply as Server-Sent Events:
 *
 *   POST {baseUrl}/chat   body: { messages: ChatTurn[] }
 *   → text/event-stream
 *     data: {"token":"Hello"}
 *     data: {"token":" there"}
 *     data: [DONE]
 *
 * fetch + ReadableStream is used instead of EventSource because EventSource
 * only supports GET requests and can't send a JSON body.
 */
export async function streamHttpReply(
  baseUrl: string,
  history: ChatTurn[],
  { onToken, signal }: StreamOptions,
): Promise<void> {
  const response = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ messages: history }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  if (!response.body) {
    throw new Error('The server returned an empty response.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by a blank line; keep any incomplete event in the buffer.
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const result = handleEvent(event, onToken)
      if (result === 'done') return
    }
  }
}

/** Exported for unit tests. */
export function handleEvent(event: string, onToken: (token: string) => void): 'done' | void {
  for (const line of event.split('\n')) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') return 'done'
    try {
      const parsed = JSON.parse(data) as { token?: string; error?: string }
      if (parsed.error) throw new Error(parsed.error)
      if (parsed.token) onToken(parsed.token)
    } catch (error) {
      if (error instanceof SyntaxError) continue // ignore malformed lines rather than killing the stream
      throw error
    }
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; message?: string }
    return body.error ?? body.message ?? `Request failed (${response.status})`
  } catch {
    return `Request failed (${response.status} ${response.statusText})`
  }
}
