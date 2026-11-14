import { describe, expect, it } from 'vitest'
import { chatReducer, initialState, reviveState, type ChatState } from './chatReducer'
import type { Message } from '../types'

const msg = (overrides: Partial<Message> = {}): Message => ({
  id: 'm1',
  role: 'user',
  content: 'Hello',
  status: 'done',
  createdAt: 2,
  ...overrides,
})

function withConversation(): ChatState {
  return chatReducer(initialState, { type: 'conversation/create', id: 'c1', now: 1 })
}

describe('chatReducer', () => {
  it('creates a conversation and makes it active', () => {
    const state = withConversation()
    expect(state.activeId).toBe('c1')
    expect(state.conversations).toHaveLength(1)
    expect(state.conversations[0].title).toBe('New chat')
  })

  it('titles the conversation from the first user message only', () => {
    let state = withConversation()
    state = chatReducer(state, { type: 'message/add', conversationId: 'c1', message: msg({ content: 'Find me a flat' }) })
    state = chatReducer(state, { type: 'message/add', conversationId: 'c1', message: msg({ id: 'm2', content: 'Second' }) })
    expect(state.conversations[0].title).toBe('Find me a flat')
  })

  it('appends streamed tokens and marks the message as streaming', () => {
    let state = withConversation()
    state = chatReducer(state, {
      type: 'message/add',
      conversationId: 'c1',
      message: msg({ id: 'a1', role: 'assistant', content: '', status: 'pending' }),
    })
    state = chatReducer(state, { type: 'message/appendToken', conversationId: 'c1', messageId: 'a1', token: 'Hi ' })
    state = chatReducer(state, { type: 'message/appendToken', conversationId: 'c1', messageId: 'a1', token: 'there' })
    const reply = state.conversations[0].messages[0]
    expect(reply.content).toBe('Hi there')
    expect(reply.status).toBe('streaming')
  })

  it('records an error message on failure', () => {
    let state = withConversation()
    state = chatReducer(state, { type: 'message/add', conversationId: 'c1', message: msg({ id: 'a1', role: 'assistant' }) })
    state = chatReducer(state, {
      type: 'message/setStatus',
      conversationId: 'c1',
      messageId: 'a1',
      status: 'error',
      error: 'Network down',
    })
    expect(state.conversations[0].messages[0]).toMatchObject({ status: 'error', error: 'Network down' })
  })

  it('selects the next conversation when the active one is deleted', () => {
    let state = withConversation()
    state = chatReducer(state, { type: 'conversation/create', id: 'c2', now: 2 })
    state = chatReducer(state, { type: 'conversation/delete', id: 'c2' })
    expect(state.activeId).toBe('c1')
    state = chatReducer(state, { type: 'conversation/delete', id: 'c1' })
    expect(state.activeId).toBeNull()
  })

  it('returns the same object when nothing changes', () => {
    const state = withConversation()
    const next = chatReducer(state, { type: 'message/remove', conversationId: 'missing', messageId: 'x' })
    expect(next).toBe(state)
  })

  it('marks unfinished replies as stopped after a reload', () => {
    let state = withConversation()
    state = chatReducer(state, {
      type: 'message/add',
      conversationId: 'c1',
      message: msg({ id: 'a1', role: 'assistant', status: 'streaming' }),
    })
    expect(reviveState(state).conversations[0].messages[0].status).toBe('stopped')
  })
})
