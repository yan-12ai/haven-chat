import { config, useMockApi } from '../config'
import type { ChatTurn } from '../types'
import { streamMockReply } from './mockApi'
import { streamHttpReply } from './httpApi'

export interface StreamOptions {
  /** Called with each new chunk of text as it arrives. */
  onToken: (token: string) => void
  /** Lets the caller cancel the request (the Stop button). */
  signal: AbortSignal
}

/**
 * The single entry point the UI uses to get a reply.
 * Components don't know or care whether the reply comes from the mock or a real
 * server – swapping backends is a config change, not a UI change.
 */
export function streamReply(history: ChatTurn[], options: StreamOptions): Promise<void> {
  if (useMockApi) {
    return streamMockReply(history, { ...options, tokenDelayMs: config.mockTokenDelayMs })
  }
  return streamHttpReply(config.apiBaseUrl, history, options)
}
