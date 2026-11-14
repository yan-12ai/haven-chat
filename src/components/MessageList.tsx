import { useEffect } from 'react'
import type { Message } from '../types'
import { useStickToBottom } from '../hooks/useStickToBottom'
import { cn } from '../lib/utils'
import { MessageBubble } from './MessageBubble'
import { ArrowDownIcon } from './ui/icons'

interface MessageListProps {
  conversationId: string
  messages: Message[]
}

export function MessageList({ conversationId, messages }: MessageListProps) {
  const last = messages.at(-1)
  // Changes whenever a message is added or the streaming message grows.
  const contentVersion = `${messages.length}:${last?.content.length ?? 0}:${last?.status}`
  const { ref, isAtBottom, scrollToBottom } = useStickToBottom<HTMLDivElement>(contentVersion)

  // Opening a different conversation always starts at its latest message.
  useEffect(() => {
    scrollToBottom('instant')
  }, [conversationId, scrollToBottom])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} className="h-full overflow-y-auto">
        <ol aria-label="Messages" className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-6 pb-10 sm:px-6">
          {messages.map((message) => (
            <li key={message.id}>
              <MessageBubble message={message} />
            </li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        onClick={() => scrollToBottom()}
        aria-label="Scroll to latest message"
        tabIndex={isAtBottom ? -1 : 0}
        className={cn(
          'absolute bottom-3 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-md transition-all hover:text-ink',
          isAtBottom ? 'pointer-events-none translate-y-2 opacity-0' : 'opacity-100',
        )}
      >
        <ArrowDownIcon size={16} />
      </button>
    </div>
  )
}
