const CHECK_LENGTH = 8192

export function isBinary(content: string): boolean {
  const len = Math.min(content.length, CHECK_LENGTH)
  for (let i = 0; i < len; i++) {
    if (content.charCodeAt(i) === 0) {
      return true
    }
  }
  return false
}
