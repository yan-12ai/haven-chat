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
    reply: `Good news – all three properties are **still available**. The 2 BHK in Baner has had the most interest this week, so I'd book a viewing soon if it's on your list.`,
  },
  {
    match: /deposit/i,
    reply: `Here's how security deposits work under the **Model Tenancy Act, 2021**:

- **Cap:** for residential homes the deposit can't exceed **2 months' rent** (6 months for commercial premises).
- **Where it applies:** it's a model law, so it only applies in states and UTs that have adopted it. Elsewhere, deposits of 6–10 months are still common in some cities.
- **Paperwork:** the deposit amount should be written into your **rent agreement**.
- **Getting it back:** the landlord should refund it when you move out, minus any dues agreed in the agreement, such as unpaid rent or damage beyond normal wear and tear.

If your landlord is asking for more than the cap, I can help you draft a message to them.`,
  },
  {
    match: /view|book|visit/i,
    reply: `Happy to set up a viewing. These slots are free this week:

| Day | Time | Property |
| --- | --- | --- |
| Tuesday | 10:30 | 2 BHK flat, Baner |
| Wednesday | 17:45 | 1 BHK flat, Kothrud |
| Saturday | 11:00 | 3 BHK flat, Viman Nagar |

Just reply with the slot you'd like and I'll confirm it with the letting agent.`,
  },
  {
    match: /repair|broken|leak|geyser|boiler|water|maintenance/i,
    reply: `Sorry to hear that. Here's the quickest way to get it fixed:

1. **Tell me what's wrong** – which room, what you've noticed and when it started.
2. **Add a photo** if you can; it helps the contractor bring the right parts.
3. **Urgent issues** such as no water supply, a gas smell or a serious leak are treated as emergencies and passed to the on-call contractor straight away.

> If you smell gas, leave the property and call the emergency helpline **112** first.

What's the issue you're seeing?`,
  },
  {
    match: /rent|flat|house|propert|listing|bed/i,
    reply: `Here are a few homes that match what people usually ask for:

| Property | Rent | Available |
| --- | --- | --- |
| 1 BHK flat, Kothrud | ₹18,000/month | Now |
| 2 BHK flat, Baner | ₹28,500/month | 1 Dec |
| 3 BHK flat, Viman Nagar | ₹42,000/month | 15 Dec |

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
