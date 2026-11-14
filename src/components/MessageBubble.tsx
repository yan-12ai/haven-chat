import { memo, useEffect, useState } from 'react'
import type { Message } from '../types'
import { useChatActions } from '../state/ChatContext'
import { cn } from '../lib/utils'
import { Markdown } from './Markdown'
import { TypingIndicator } from './TypingIndicator'
import { IconButton } from './ui/IconButton'
import { AlertIcon, CheckIcon, CopyIcon, Logo, RetryIcon } from './ui/icons'

/**
 * memo() means only the message that is currently streaming re-renders when a
 * token arrives – the rest of the conversation is left alone.
 */
export const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  return message.role === 'user' ? <UserMessage message={message} /> : <AssistantMessage message={message} />
})

function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex animate-fade-up justify-end">
      <div className="max-w-[85%] rounded-bubble rounded-br-md bg-accent px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words text-white sm:max-w-[75%]">
        {message.content}
      </div>
    </div>
  )
}

function AssistantMessage({ message }: { message: Message }) {
  const { retry } = useChatActions()
  const isPending = message.status === 'pending'
  const isStreaming = message.status === 'streaming'
  const isFinished = message.status === 'done' || message.status === 'stopped'

  return (
    <div className="flex animate-fade-up gap-3">
      <div className="mt-0.5 shrink-0">
        <Logo size={26} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-relaxed text-ink">
          {isPending ? (
            <TypingIndicator />
          ) : (
            <div className={cn('markdown break-words', isStreaming && 'streaming')}>
              <Markdown content={message.content} />
            </div>
          )}
        </div>

        {message.status === 'stopped' && <p className="mt-2 text-xs text-faint">Reply stopped</p>}

        {message.status === 'error' && (
          <div
            role="alert"
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            <span className="flex items-center gap-1.5">
              <AlertIcon size={16} />
              {message.error ?? 'Something went wrong.'}
            </span>
            <button
              type="button"
              onClick={() => retry(message.id)}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-xs ring-1 ring-border hover:bg-subtle"
            >
              <RetryIcon size={13} />
              Try again
            </button>
          </div>
        )}

        {isFinished && message.content && (
          <div className="mt-1.5 -ml-1.5 flex items-center">
            <CopyButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (e.g. insecure context); fail quietly.
    }
  }

  return (
    <IconButton label={copied ? 'Copied' : 'Copy reply'} size="sm" onClick={copy}>
      {copied ? <CheckIcon size={14} className="text-accent" /> : <CopyIcon size={14} />}
    </IconButton>
  )
}
