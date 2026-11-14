import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { config } from '../config'
import { useChatActions, useChatState } from '../state/ChatContext'
import { cn } from '../lib/utils'
import { IconButton } from './ui/IconButton'
import { SendIcon, StopIcon } from './ui/icons'

const MAX_HEIGHT_PX = 200

export function ChatInput() {
  const { isStreaming, activeConversation } = useChatState()
  const { sendMessage, stopStreaming } = useChatActions()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const trimmed = value.trim()
  const tooLong = value.length > config.maxMessageLength
  const canSend = trimmed.length > 0 && !tooLong && !isStreaming
  const showCounter = value.length > config.maxMessageLength * 0.8

  // Grow the textarea with its content, up to a max height, then scroll inside it.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  // Put the cursor back in the box when switching chats or when a reply finishes.
  useLayoutEffect(() => {
    if (!isStreaming && window.matchMedia?.('(pointer: fine)')?.matches) textareaRef.current?.focus()
  }, [activeConversation?.id, isStreaming])

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!canSend) return
    sendMessage(trimmed)
    setValue('')
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a new line. Ignore Enter while an IME (e.g. Japanese input) is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="bg-gradient-to-t from-canvas from-70% to-transparent px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
      <form onSubmit={submit} className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border bg-surface p-2 pl-4 shadow-input transition-colors',
            'focus-within:border-accent/60',
            tooLong ? 'border-danger/60' : 'border-border',
          )}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message Haven
          </label>
          <textarea
            id="chat-input"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about rentals, viewings or repairs…"
            aria-describedby="chat-input-hint"
            aria-invalid={tooLong || undefined}
            className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-6 outline-none placeholder:text-faint focus-visible:outline-none"
          />
          {isStreaming ? (
            <IconButton label="Stop generating" variant="solid" onClick={stopStreaming} className="rounded-xl bg-ink hover:bg-ink/85">
              <StopIcon size={16} />
            </IconButton>
          ) : (
            <IconButton label="Send message" variant="solid" type="submit" disabled={!canSend} className="rounded-xl">
              <SendIcon size={17} />
            </IconButton>
          )}
        </div>

        <div id="chat-input-hint" className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-faint">
          <span>
            <span className="hidden sm:inline">Enter to send · Shift + Enter for a new line · </span>
            Haven can make mistakes.
          </span>
          {showCounter && (
            <span className={cn('tabular-nums', tooLong && 'font-medium text-danger')} aria-live="polite">
              {value.length.toLocaleString()} / {config.maxMessageLength.toLocaleString()}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
