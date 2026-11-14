import { useChatActions } from '../state/ChatContext'
import { Logo } from './ui/icons'

const SUGGESTIONS = [
  { title: 'Find a home', prompt: 'Show me 2-bed flats to rent under £1,500' },
  { title: 'Book a viewing', prompt: 'Can I book a viewing this week?' },
  { title: 'Report a repair', prompt: 'My boiler has stopped working' },
  { title: 'Ask about deposits', prompt: 'How does deposit protection work?' },
]

export function EmptyState() {
  const { sendMessage } = useChatActions()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-10 text-center">
      <Logo size={44} />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">
        How can I help with your home?
      </h1>
      <p className="mt-2 max-w-md text-[15px] text-muted text-pretty">
        Search listings, book viewings, report repairs or get answers about your tenancy.
      </p>

      <ul className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map(({ title, prompt }) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => sendMessage(prompt)}
              className="group h-full w-full rounded-xl border border-border bg-surface px-4 py-3 text-left transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-sm"
            >
              <span className="block text-sm font-medium">{title}</span>
              <span className="mt-0.5 block text-sm text-muted">{prompt}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
