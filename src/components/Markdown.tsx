import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/*
 * Security note: react-markdown does NOT render raw HTML by default (no rehype-raw),
 * so text like <img onerror=...> in a reply is shown as plain text instead of being
 * injected into the page. That's what keeps model or user content safe from XSS.
 * We never use dangerouslySetInnerHTML anywhere in the app.
 */
const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  // Wide tables scroll sideways on small screens instead of breaking the layout.
  table: ({ node: _node, ...props }) => (
    <div className="-mx-1 overflow-x-auto rounded-lg border border-border px-1">
      <table {...props} />
    </div>
  ),
}

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
})
