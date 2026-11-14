import { useMemo } from 'react'
import { useChatActions, useChatState } from '../state/ChatContext'
import { cn, dateBucket } from '../lib/utils'
import { IconButton } from './ui/IconButton'
import { ChatIcon, CloseIcon, Logo, PlusIcon, TrashIcon } from './ui/icons'

interface SidebarProps {
  /** Mobile only: close the drawer after an action. */
  onNavigate?: () => void
  onClose?: () => void
}

export function Sidebar({ onNavigate, onClose }: SidebarProps) {
  const { conversations, activeConversation } = useChatState()
  const { newConversation, selectConversation, deleteConversation } = useChatActions()

  // Most recently active first, grouped into Today / Yesterday / ...
  const groups = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
    const map = new Map<string, typeof sorted>()
    for (const conversation of sorted) {
      const bucket = dateBucket(conversation.updatedAt)
      map.set(bucket, [...(map.get(bucket) ?? []), conversation])
    }
    return [...map.entries()]
  }, [conversations])

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">Haven</span>
        </div>
        {onClose && (
          <IconButton label="Close sidebar" onClick={onClose} className="md:hidden">
            <CloseIcon />
          </IconButton>
        )}
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            newConversation()
            onNavigate?.()
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:border-border-strong hover:bg-subtle"
        >
          <PlusIcon size={16} />
          New chat
        </button>
      </div>

      <nav aria-label="Conversations" className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-faint">Your conversations will appear here.</p>
        ) : (
          groups.map(([label, items]) => (
            <section key={label} className="mt-3 first:mt-0">
              <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</h2>
              <ul className="space-y-0.5">
                {items.map((conversation) => {
                  const isActive = conversation.id === activeConversation?.id
                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        type="button"
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          selectConversation(conversation.id)
                          onNavigate?.()
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg py-2 pr-9 pl-2.5 text-left text-sm transition-colors',
                          isActive ? 'bg-accent-soft font-medium text-accent-ink' : 'text-ink/80 hover:bg-subtle',
                        )}
                      >
                        <ChatIcon size={15} className={cn('shrink-0', isActive ? 'text-accent' : 'text-faint')} />
                        <span className="truncate">{conversation.title}</span>
                      </button>
                      <IconButton
                        label={`Delete “${conversation.title}”`}
                        size="sm"
                        onClick={() => deleteConversation(conversation.id)}
                        className="absolute top-1/2 right-1 -translate-y-1/2 opacity-100 hover:text-danger md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                      >
                        <TrashIcon size={14} />
                      </IconButton>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </nav>

      <p className="border-t border-border px-4 py-3 text-xs leading-relaxed text-faint">
        Demo project · replies are simulated
      </p>
    </div>
  )
}
