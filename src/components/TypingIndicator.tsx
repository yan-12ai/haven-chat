export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-1.5" role="status" aria-label="Haven is typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 animate-dot rounded-full bg-muted"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  )
}
