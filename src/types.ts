export type Role = 'user' | 'assistant'

/**
 * Lifecycle of an assistant message:
 * pending   → request sent, no tokens yet (shows typing dots)
 * streaming → tokens are arriving (shows blinking caret + Stop button)
 * done      → finished normally
 * stopped   → user pressed Stop (partial text is kept)
 * error     → request failed (shows error + Retry)
 */
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'stopped' | 'error'

export interface Message {
  id: string
  role: Role
  content: string
  status: MessageStatus
  createdAt: number
  error?: string
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

/** The minimal shape sent to the API – the backend doesn't need ids or UI status. */
export interface ChatTurn {
  role: Role
  content: string
}
