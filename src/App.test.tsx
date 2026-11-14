import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { streamReply } from './services/chatApi'

// Replace the network layer so tests are fast and deterministic.
vi.mock('./services/chatApi', () => ({ streamReply: vi.fn() }))
const mockedStreamReply = vi.mocked(streamReply)

beforeEach(() => {
  mockedStreamReply.mockReset()
})

describe('App', () => {
  it('shows suggestions on an empty chat and disables Send until there is text', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /how can i help/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/message haven/i), 'Hi')
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled()
  })

  it('sends on Enter, streams the reply and adds the chat to the sidebar', async () => {
    mockedStreamReply.mockImplementation(async (_history, { onToken }) => {
      onToken('Hello ')
      onToken('**there**')
    })
    render(<App />)

    await userEvent.type(screen.getByLabelText(/message haven/i), 'Find me a flat{Enter}')

    const messages = screen.getByRole('list', { name: /messages/i })
    expect(within(messages).getByText('Find me a flat')).toBeInTheDocument()
    expect(await within(messages).findByText('there')).toBeInTheDocument()
    expect(within(messages).getByText('there').tagName).toBe('STRONG') // markdown rendered
    expect(screen.getByRole('navigation', { name: /conversations/i })).toHaveTextContent('Find me a flat')
    expect(mockedStreamReply).toHaveBeenCalledWith(
      [{ role: 'user', content: 'Find me a flat' }],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('Shift+Enter inserts a new line instead of sending', async () => {
    render(<App />)
    const input = screen.getByLabelText(/message haven/i)
    await userEvent.type(input, 'line one{Shift>}{Enter}{/Shift}line two')
    expect(input).toHaveValue('line one\nline two')
    expect(mockedStreamReply).not.toHaveBeenCalled()
  })

  it('shows an error with a working retry button', async () => {
    mockedStreamReply
      .mockRejectedValueOnce(new Error('Server unavailable'))
      .mockImplementationOnce(async (_history, { onToken }) => onToken('Recovered'))
    render(<App />)

    await userEvent.type(screen.getByLabelText(/message haven/i), 'Hello{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable')

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText('Recovered')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not render raw HTML from replies (XSS safety)', async () => {
    mockedStreamReply.mockImplementation(async (_history, { onToken }) => {
      onToken('<img src=x onerror="alert(1)">')
    })
    const { container } = render(<App />)
    await userEvent.type(screen.getByLabelText(/message haven/i), 'Hi{Enter}')
    await screen.findByText(/onerror/)
    expect(container.querySelector('img')).toBeNull()
  })
})
