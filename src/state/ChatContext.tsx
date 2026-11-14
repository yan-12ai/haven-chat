import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { streamReply } from '../services/chatApi'
import type { ChatTurn, Conversation, Message } from '../types'
import { createId, isAbortError } from '../lib/utils'
import { chatReducer, initialState, reviveState, type ChatState } from './chatReducer'

const STORAGE_KEY = 'haven-chat:v1'

interface StreamingTarget {
  conversationId: string
  messageId: string
}

interface ChatStateValue {
  conversations: Conversation[]
  activeConversation: Conversation | null
  isStreaming: boolean
  /** Short text read out by screen readers when a reply finishes or fails. */
  announcement: string
}

interface ChatActionsValue {
  sendMessage: (text: string) => void
  stopStreaming: () => void
  retry: (messageId: string) => void
  newConversation: () => void
  selectConversation: (id: string) => void
  deleteConversation: (id: string) => void
}

/*
 * State and actions live in two separate contexts. Components that only need
 * actions (e.g. a "New chat" button) won't re-render on every streamed token.
 */
const ChatStateContext = createContext<ChatStateValue | null>(null)
const ChatActionsContext = createContext<ChatActionsValue | null>(null)

function loadState(): ChatState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as ChatState
    if (!Array.isArray(parsed.conversations)) return initialState
    return reviveState(parsed)
  } catch {
    return initialState
  }
}

function saveState(state: ChatState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or blocked (private mode) – the app still works, it just won't persist.
  }
}

/** Only completed turns are sent as context – failed or empty replies would confuse the model. */
function toHistory(messages: Message[]): ChatTurn[] {
  return messages
    .filter((m) => m.status !== 'error' && m.content.trim() !== '')
    .map(({ role, content }) => ({ role, content }))
}

export function ChatProvider({ children, persist = true }: { children: ReactNode; persist?: boolean }) {
  const [state, dispatch] = useReducer(chatReducer, undefined, () => (persist ? loadState() : initialState))
  const [streaming, setStreaming] = useState<StreamingTarget | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Callbacks read the latest state through a ref so they can stay stable (no re-creation per token).
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])
  const abortRef = useRef<AbortController | null>(null)

  // Persist when nothing is streaming, rather than writing to storage on every token.
  useEffect(() => {
    if (persist && streaming === null) saveState(state)
  }, [state, streaming, persist])

  // Abort any in-flight request when the provider unmounts.
  useEffect(() => () => abortRef.current?.abort(), [])

  const runStream = useCallback(async (conversationId: string, history: ChatTurn[]) => {
    const messageId = createId()
    dispatch({
      type: 'message/add',
      conversationId,
      message: { id: messageId, role: 'assistant', content: '', status: 'pending', createdAt: Date.now() },
    })

    const controller = new AbortController()
    abortRef.current = controller
    setStreaming({ conversationId, messageId })
    setAnnouncement('')

    try {
      await streamReply(history, {
        signal: controller.signal,
        onToken: (token) => dispatch({ type: 'message/appendToken', conversationId, messageId, token }),
      })
      dispatch({ type: 'message/setStatus', conversationId, messageId, status: 'done' })
      setAnnouncement('Haven replied.')
    } catch (error) {
      if (isAbortError(error)) {
        dispatch({ type: 'message/setStatus', conversationId, messageId, status: 'stopped' })
        setAnnouncement('Reply stopped.')
      } else {
        const message = error instanceof Error ? error.message : 'Something went wrong.'
        dispatch({ type: 'message/setStatus', conversationId, messageId, status: 'error', error: message })
        setAnnouncement(`Reply failed: ${message}`)
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setStreaming((current) => (current?.messageId === messageId ? null : current))
    }
  }, [])

  const stopStreaming = useCallback(() => abortRef.current?.abort(), [])

  const sendMessage = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content || abortRef.current) return

      const conversation = stateRef.current.conversations.find((c) => c.id === stateRef.current.activeId)
      let conversationId = conversation?.id
      if (!conversationId) {
        conversationId = createId()
        dispatch({ type: 'conversation/create', id: conversationId, now: Date.now() })
      }

      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content,
        status: 'done',
        createdAt: Date.now(),
      }
      dispatch({ type: 'message/add', conversationId, message: userMessage })

      const history = toHistory([...(conversation?.messages ?? []), userMessage])
      void runStream(conversationId, history)
    },
    [runStream],
  )

  const retry = useCallback(
    (messageId: string) => {
      if (abortRef.current) return
      const conversation = stateRef.current.conversations.find((c) =>
        c.messages.some((m) => m.id === messageId),
      )
      if (!conversation) return
      const index = conversation.messages.findIndex((m) => m.id === messageId)
      dispatch({ type: 'message/remove', conversationId: conversation.id, messageId })
      void runStream(conversation.id, toHistory(conversation.messages.slice(0, index)))
    },
    [runStream],
  )

  const newConversation = useCallback(() => {
    stopStreaming()
    const { conversations, activeId } = stateRef.current
    const active = conversations.find((c) => c.id === activeId)
    // Don't pile up empty chats – if the current one is empty, just stay on it.
    if (active && active.messages.length === 0) return
    dispatch({ type: 'conversation/create', id: createId(), now: Date.now() })
  }, [stopStreaming])

  const selectConversation = useCallback(
    (id: string) => {
      if (id === stateRef.current.activeId) return
      stopStreaming()
      dispatch({ type: 'conversation/select', id })
    },
    [stopStreaming],
  )

  const deleteConversation = useCallback(
    (id: string) => {
      if (streaming?.conversationId === id) stopStreaming()
      dispatch({ type: 'conversation/delete', id })
    },
    [streaming, stopStreaming],
  )

  const activeConversation = state.conversations.find((c) => c.id === state.activeId) ?? null

  const stateValue = useMemo<ChatStateValue>(
    () => ({
      conversations: state.conversations,
      activeConversation,
      isStreaming: streaming !== null,
      announcement,
    }),
    [state.conversations, activeConversation, streaming, announcement],
  )

  const actionsValue = useMemo<ChatActionsValue>(
    () => ({ sendMessage, stopStreaming, retry, newConversation, selectConversation, deleteConversation }),
    [sendMessage, stopStreaming, retry, newConversation, selectConversation, deleteConversation],
  )

  return (
    <ChatActionsContext.Provider value={actionsValue}>
      <ChatStateContext.Provider value={stateValue}>{children}</ChatStateContext.Provider>
    </ChatActionsContext.Provider>
  )
}

export function useChatState(): ChatStateValue {
  const value = useContext(ChatStateContext)
  if (!value) throw new Error('useChatState must be used inside <ChatProvider>')
  return value
}

export function useChatActions(): ChatActionsValue {
  const value = useContext(ChatActionsContext)
  if (!value) throw new Error('useChatActions must be used inside <ChatProvider>')
  return value
}
