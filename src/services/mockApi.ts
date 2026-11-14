import type { ChatTurn } from '../types'
import { sleep } from '../lib/utils'
import type { StreamOptions } from './chatApi'

/**
 * A fake backend so the UI can be built and demoed without a server.
 * It picks a canned reply by keyword and "streams" it word by word,
 * the same way a real LLM response arrives.
 *
 * Tip for demos: include "simulate error" in a message to see the error state.
 * The first attempt fails part-way through; pressing "Try again" succeeds.
 */

interface MockOptions extends StreamOptions {
  tokenDelayMs: number
}

const REPLIES: Array<{ match: RegExp; reply: string }> = [
  {
    match: /simulate error/i,
    reply: `Good news – all three properties are **still available**. The Riverside Court flat has had the most interest this week, so I'd book a viewing soon if it's on your list.`,
  },
  {
    match: /deposit/i,
    reply: `Here's how tenancy deposits work in England:

- **Cap:** for most tenancies the deposit is capped at **5 weeks' rent** (6 weeks if the annual rent is £50,000 or more).
- **Protection:** your landlord or agent must put it in a government-approved deposit protection scheme **within 30 days** of receiving it.
- **Paperwork:** you should receive the "prescribed information" telling you which scheme holds it.
- **Getting it back:** at the end of the tenancy, any deductions must be justified – for example damage beyond normal wear and tear.

If you think your deposit wasn't protected, I can help you draft a message to your agent.`,
  },
  {
    match: /view|book|visit/i,
    reply: `Happy to set up a viewing. These slots are free this week:

| Day | Time | Property |
| --- | --- | --- |
| Tuesday | 10:30 | 2-bed flat, Riverside Court |
| Wednesday | 17:45 | 1-bed flat, Elm Street |
| Saturday | 11:00 | 3-bed house, Oakfield Road |

Just reply with the slot you'd like and I'll confirm it with the letting agent.`,
  },
  {
    match: /repair|broken|leak|boiler|heating|maintenance/i,
    reply: `Sorry to hear that. Here's the quickest way to get it fixed:

1. **Tell me what's wrong** – which room, what you've noticed and when it started.
2. **Add a photo** if you can; it helps the contractor bring the right parts.
3. **Urgent issues** such as no heating in winter, a gas smell or a serious leak are treated as emergencies and passed to the on-call contractor straight away.

> If you smell gas, leave the property and call the National Gas Emergency line on **0800 111 999** first.

What's the issue you're seeing?`,
  },
  {
    match: /rent|flat|house|propert|listing|bed/i,
    reply: `Here are a few homes that match what people usually ask for:

| Property | Rent | Available |
| --- | --- | --- |
| 1-bed flat, Elm Street | £1,150 pcm | Now |
| 2-bed flat, Riverside Court | £1,475 pcm | 1 Dec |
| 3-bed house, Oakfield Road | £1,850 pcm | 15 Dec |

Tell me your **budget**, **preferred area** and **move-in date** and I'll narrow this down.`,
  },
]

const FALLBACK = `I'm **Haven**, an assistant for renters and letting agents. I can help you:

- **Find a home** – search listings by budget, area and move-in date
- **Book viewings** – see open slots and confirm a time
- **Report repairs** – log maintenance issues with the right urgency
- **Understand your tenancy** – deposits, notice periods and fees

What would you like to do?`

const PARTIAL_BEFORE_ERROR = 'Let me check the latest availability for you'

/** Messages that have already failed once – the retry for them succeeds. */
const failedOnce = new Set<string>()

export function pickReply(message: string): string {
  return REPLIES.find(({ match }) => match.test(message))?.reply ?? FALLBACK
}

/** Splits text into word-sized chunks while keeping whitespace and newlines intact. */
export function tokenize(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? []
}

export async function streamMockReply(
  history: ChatTurn[],
  { onToken, signal, tokenDelayMs }: MockOptions,
): Promise<void> {
  const lastUserMessage = [...history].reverse().find((turn) => turn.role === 'user')?.content ?? ''
  const shouldFail = /simulate error/i.test(lastUserMessage) && !failedOnce.has(lastUserMessage)
  if (shouldFail) failedOnce.add(lastUserMessage)
  const tokens = tokenize(shouldFail ? PARTIAL_BEFORE_ERROR : pickReply(lastUserMessage))

  // Simulate network latency before the first token (shows the typing indicator).
  await sleep(600, signal)

  for (const [index, token] of tokens.entries()) {
    await sleep(tokenDelayMs, signal)
    onToken(token)
    if (shouldFail && index === tokens.length - 1) {
      throw new Error('Connection lost while receiving the reply.')
    }
  }
}
