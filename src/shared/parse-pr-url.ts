import type { PrReference } from './types'

const PR_URL_REGEX = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/

export function parsePrUrl(url: string): PrReference | null {
  const match = PR_URL_REGEX.exec(url.trim())
  if (!match) return null

  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  }
}
