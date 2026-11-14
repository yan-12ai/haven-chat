import { useEffect, useRef, useState } from 'react'
import { ChatProvider, useChatState } from './state/ChatContext'
import { Sidebar } from './components/Sidebar'
import { ChatHeader } from './components/ChatHeader'
import { MessageList } from './components/MessageList'
import { ChatInput } from './components/ChatInput'
import { EmptyState } from './components/EmptyState'
import { cn } from './lib/utils'

export default function App() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  )
}

function ChatLayout() {
  const { activeConversation, announcement } = useChatState()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const hasMessages = (activeConversation?.messages.length ?? 0) > 0

  // Mobile drawer: Escape closes it, and focus moves into it when it opens.
  useEffect(() => {
    if (!sidebarOpen) return
    drawerRef.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSidebarOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-[272px] shrink-0 border-r border-border md:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <div className={cn('fixed inset-0 z-40 md:hidden', !sidebarOpen && 'pointer-events-none')} aria-hidden={!sidebarOpen}>
        <div
          className={cn('absolute inset-0 bg-ink/30 transition-opacity', sidebarOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Conversations"
          inert={!sidebarOpen}
          className={cn(
            'absolute inset-y-0 left-0 w-[84%] max-w-[300px] shadow-xl transition-transform duration-200',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} />
        </div>
      </div>

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader onOpenSidebar={() => setSidebarOpen(true)} />
        {hasMessages && activeConversation ? (
          <MessageList conversationId={activeConversation.id} messages={activeConversation.messages} />
        ) : (
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <EmptyState />
          </div>
        )}
        <ChatInput />
      </main>

      {/* Screen-reader-only announcements (reply finished / failed). */}
      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  )
}
