import type { Conversation, Message, MessageStatus } from '../types'
import { titleFrom } from '../lib/utils'

export interface ChatState {
  conversations: Conversation[]
  activeId: string | null
}

export type ChatAction =
  | { type: 'conversation/create'; id: string; now: number }
  | { type: 'conversation/select'; id: string | null }
  | { type: 'conversation/delete'; id: string }
  | { type: 'message/add'; conversationId: string; message: Message }
  | { type: 'message/appendToken'; conversationId: string; messageId: string; token: string }
  | {
      type: 'message/setStatus'
      conversationId: string
      messageId: string
      status: MessageStatus
      error?: string
    }
  | { type: 'message/remove'; conversationId: string; messageId: string }

export const initialState: ChatState = { conversations: [], activeId: null }

/**
 * All state changes go through this pure function. Keeping it free of side
 * effects (no fetches, no Date.now(), no random ids) makes it trivial to test
 * and means the UI is always a predictable function of state.
 */
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'conversation/create': {
      const conversation: Conversation = {
        id: action.id,
        title: 'New chat',
        messages: [],
        createdAt: action.now,
        updatedAt: action.now,
      }
      return { conversations: [conversation, ...state.conversations], activeId: action.id }
    }

    case 'conversation/select':
      return { ...state, activeId: action.id }

    case 'conversation/delete': {
      const conversations = state.conversations.filter((c) => c.id !== action.id)
      const activeId = state.activeId === action.id ? (conversations[0]?.id ?? null) : state.activeId
      return { conversations, activeId }
    }

    case 'message/add':
      return updateConversation(state, action.conversationId, (conversation) => {
        const isFirstUserMessage =
          action.message.role === 'user' && !conversation.messages.some((m) => m.role === 'user')
        return {
          ...conversation,
          title: isFirstUserMessage ? titleFrom(action.message.content) : conversation.title,
          messages: [...conversation.messages, action.message],
          updatedAt: action.message.createdAt,
        }
      })

    case 'message/appendToken':
      return updateMessage(state, action.conversationId, action.messageId, (message) => ({
        ...message,
        content: message.content + action.token,
        status: 'streaming',
      }))

    case 'message/setStatus':
      return updateMessage(state, action.conversationId, action.messageId, (message) => ({
        ...message,
        status: action.status,
        error: action.error,
      }))

    case 'message/remove':
      return updateConversation(state, action.conversationId, (conversation) => ({
        ...conversation,
        messages: conversation.messages.filter((m) => m.id !== action.messageId),
      }))

    default:
      return state
  }
}

function updateConversation(
  state: ChatState,
  id: string,
  update: (conversation: Conversation) => Conversation,
): ChatState {
  let changed = false
  const conversations = state.conversations.map((conversation) => {
    if (conversation.id !== id) return conversation
    changed = true
    return update(conversation)
  })
  return changed ? { ...state, conversations } : state
}

function updateMessage(
  state: ChatState,
  conversationId: string,
  messageId: string,
  update: (message: Message) => Message,
): ChatState {
  return updateConversation(state, conversationId, (conversation) => ({
    ...conversation,
    messages: conversation.messages.map((m) => (m.id === messageId ? update(m) : m)),
  }))
}

/**
 * When the page is reloaded mid-stream, the stream is gone. Mark any
 * unfinished replies as stopped so the UI doesn't show a caret forever.
 */
export function reviveState(state: ChatState): ChatState {
  return {
    ...state,
    conversations: state.conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((m) =>
        m.status === 'pending' || m.status === 'streaming' ? { ...m, status: 'stopped' } : m,
      ),
    })),
  }
}
