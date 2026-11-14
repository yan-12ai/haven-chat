/**
 * All environment-driven configuration lives here so the rest of the app never
 * touches import.meta.env directly. Only variables prefixed with VITE_ are
 * exposed to the browser by Vite – never put secrets in them.
 */
const env = import.meta.env

export const config = {
  /** Base URL of the chat backend. Empty → use the built-in mock API. */
  apiBaseUrl: (env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, ''),
  /** Delay between words when the mock API streams a reply. */
  mockTokenDelayMs: Number(env.VITE_MOCK_TOKEN_DELAY_MS ?? 35) || 35,
  /** Max characters a user can send in one message. */
  maxMessageLength: 2000,
} as const

export const useMockApi = config.apiBaseUrl === ''
