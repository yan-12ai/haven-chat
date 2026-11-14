import { useChatActions, useChatState } from '../state/ChatContext'
import { IconButton } from './ui/IconButton'
import { MenuIcon, PlusIcon } from './ui/icons'

export function ChatHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { activeConversation } = useChatState()
  const { newConversation } = useChatActions()
  const title = activeConversation?.messages.length ? activeConversation.title : 'New chat'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-canvas/85 px-3 backdrop-blur sm:px-5">
      <IconButton label="Open sidebar" onClick={onOpenSidebar} className="md:hidden">
        <MenuIcon />
      </IconButton>
      <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-ink/90">{title}</h2>
      <IconButton label="New chat" onClick={newConversation} className="md:hidden">
        <PlusIcon />
      </IconButton>
    </header>
  )
}
