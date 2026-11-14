import { describe, expect, it, vi } from 'vitest'
import { handleEvent } from './httpApi'
import { pickReply, streamMockReply, tokenize } from './mockApi'

describe('handleEvent (SSE parsing)', () => {
  it('passes tokens through and stops on [DONE]', () => {
    const onToken = vi.fn()
    expect(handleEvent('data: {"token":"Hello"}', onToken)).toBeUndefined()
    expect(handleEvent('data: [DONE]', onToken)).toBe('done')
    expect(onToken).toHaveBeenCalledWith('Hello')
  })

  it('ignores malformed lines but surfaces server errors', () => {
    const onToken = vi.fn()
    expect(() => handleEvent('data: not-json', onToken)).not.toThrow()
    expect(() => handleEvent('data: {"error":"Rate limited"}', onToken)).toThrow('Rate limited')
  })
})

describe('mock API', () => {
  it('tokenize keeps the original text intact', () => {
    const text = 'Hello there,\n\n- a **list** item\n'
    expect(tokenize(text).join('')).toBe(text)
  })

  it('picks a reply by keyword', () => {
    expect(pickReply('How do deposits work?')).toContain('deposit')
    expect(pickReply('hi')).toContain('Haven')
  })

  it('can be cancelled with an AbortSignal', async () => {
    const controller = new AbortController()
    const promise = streamMockReply([{ role: 'user', content: 'hi' }], {
      signal: controller.signal,
      onToken: () => {},
      tokenDelayMs: 1,
    })
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
