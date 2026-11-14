# Haven Chat

**Live demo:** https://yan-12ai.github.io/haven-chat/

A chat interface for **Haven**, a fictional AI assistant for renters and letting agents. It lets you search listings, book viewings, report repairs and ask tenancy questions.

Built with **React 19, TypeScript, Vite and Tailwind CSS v4**. Replies stream in word by word, like a real LLM. A mock API is included so the app runs with no backend, and pointing it at a real server needs one environment variable.

## Features

- **Streaming replies** with a typing indicator, a blinking caret, and a **Stop** button that cancels the request (`AbortController`)
- **Every UI state handled:** empty (suggested prompts), pending, streaming, done, stopped, and **error with retry**
- **Markdown replies:** lists, bold text, quotes and tables (tables scroll sideways on mobile). Raw HTML is never rendered (XSS-safe)
- **Multiple conversations** in a sidebar grouped by date (Today / Yesterday / …), with delete. Saved to `localStorage`
- **Responsive:** fixed sidebar on desktop, slide-in drawer on mobile and tablet, safe-area padding for phones with a notch
- **Accessible:** semantic landmarks, labelled icon buttons, visible focus rings, Escape closes the drawer, screen-reader announcements when a reply finishes or fails, and `prefers-reduced-motion` support
- **Polished details:**
  - The textarea grows as you type.
  - Enter sends; Shift+Enter adds a new line. Enter is ignored while a Japanese/Chinese input method is composing.
  - A character counter appears near the limit.
  - The list follows new messages only if you're already at the bottom, and shows a "jump to latest" button otherwise.
  - Replies can be copied.
- **Tested** with Vitest and React Testing Library. **CI** on GitHub Actions runs lint, type-check, tests and build, and every push to `main` deploys to GitHub Pages.

> **Demo tip:** include `simulate error` in a message to see the error state. The first attempt fails part-way through, and **Try again** recovers.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on save |
| `npm run lint` | Lint with oxlint |
| `npm run typecheck` | TypeScript only |

### Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Chat backend URL. **Leave empty to use the mock API.** |
| `VITE_MOCK_TOKEN_DELAY_MS` | Delay between streamed words in the mock (default 35 ms) |

Only `VITE_`-prefixed variables reach the browser, so never put secrets in them. All env access is centralised in `src/config.ts`.

## Project structure

```
src/
├── App.tsx                  # Layout: sidebar / drawer + chat area
├── config.ts                # Reads env variables in one place
├── types.ts                 # Message, Conversation, MessageStatus
├── state/
│   ├── chatReducer.ts       # Pure reducer – every state change lives here
│   └── ChatContext.tsx      # Provider: reducer + streaming + persistence
├── services/
│   ├── chatApi.ts           # streamReply() – the only thing the UI calls
│   ├── mockApi.ts           # Fake backend that streams canned replies
│   └── httpApi.ts           # Real backend over Server-Sent Events
├── hooks/
│   └── useStickToBottom.ts  # Smart auto-scroll
├── components/
│   ├── Sidebar.tsx  ChatHeader.tsx  EmptyState.tsx
│   ├── MessageList.tsx  MessageBubble.tsx  Markdown.tsx
│   ├── ChatInput.tsx  TypingIndicator.tsx
│   └── ui/                  # IconButton, inline SVG icons
└── index.css                # Tailwind + design tokens (@theme)
```

## Key technical decisions

These are the decisions to be ready to explain.

**1. `useReducer` + Context instead of a state library.**
Chat state has several related transitions: add a message, append a token, set a status, retry. A reducer keeps them all in one **pure function** that is easy to test (see `chatReducer.test.ts`). Context is enough at this size. Zustand or TanStack Query would be worth adding once there's real server data to cache.

**2. State and actions are in two separate contexts.**
Tokens arrive every ~35 ms. Components that only need actions, like the "New chat" button, subscribe to the actions context. Its value never changes, so they don't re-render while a reply streams.

**3. A message has a status, not a set of booleans.**
`pending → streaming → done | stopped | error`. One status field means impossible combinations can't happen, such as "loading and errored at the same time". Each status maps to exactly one UI: dots, caret, copy button, "Reply stopped", or error + retry.

**4. The UI never knows where replies come from.**
Components call `streamReply(history, { onToken, signal })`. Whether that is the mock or a real server is decided in `config.ts`. This is the dependency-inversion idea: you can build and demo the UI before the backend exists.

**5. `fetch` + `ReadableStream` for streaming, not `EventSource`.**
`EventSource` only does GET and can't send a JSON body with the conversation. Reading the stream manually also lets the Stop button cancel it through `AbortController`. Incomplete SSE events are kept in a buffer until the rest arrives.

**6. Rendering performance while streaming.**
`MessageBubble` and `Markdown` are wrapped in `React.memo`, so only the message that is changing re-renders on each token. `localStorage` is written only when nothing is streaming, not on every token.

**7. Smart scrolling.**
`useStickToBottom` follows new content only if you are already near the bottom. If you scroll up to read, it leaves you there and shows a "jump to latest" button. It uses `useLayoutEffect` so the scroll happens before paint, with no flicker.

**8. Security.**
`react-markdown` is used **without** `rehype-raw`, so HTML inside a reply is shown as text, never executed. A test checks this. Links open with `rel="noopener noreferrer"`. `dangerouslySetInnerHTML` is never used.

**9. Design tokens.**
Every colour and radius is defined once in `@theme` in `index.css`. Tailwind v4 turns them into utilities like `bg-surface` and `text-muted`. Rebranding means editing one block.

**10. Edge cases handled on purpose.**
- Reloading mid-stream marks the reply as "stopped" (`reviveState`) instead of showing a caret forever.
- Retry rebuilds the history without the failed reply.
- "New chat" won't create a second empty chat.
- Switching chats cancels the current stream.
- `localStorage` failures (private mode, storage full) are caught, and the app keeps working.

## Connecting a real backend

Set `VITE_API_BASE_URL`. The app will `POST {base}/chat` with `{ messages: [{ role, content }] }` and expects a `text/event-stream` response:

```
data: {"token":"Hello"}
data: {"token":" there"}
data: [DONE]
```

Errors can be sent as `data: {"error":"message"}` or as a non-2xx JSON response.

## Ideas to extend

- Dark mode (add a second set of token values under a `.dark` class)
- Rename conversations; search the sidebar
- Edit and resend a user message
- Virtualise long conversations (e.g. `@tanstack/react-virtual`)
- A Playwright end-to-end test for the full send → stream → stop flow
- Run Lighthouse and fix whatever it flags
