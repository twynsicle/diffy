const MAX_LENGTH = 60

export function truncatePath(path: string, maxLength: number = MAX_LENGTH): string {
  if (path.length <= maxLength) return path

  const sep = '/'
  const parts = path.split(sep)

  if (parts.length <= 2) {
    const half = Math.floor((maxLength - 3) / 2)
    return path.slice(0, half) + '...' + path.slice(-half)
  }

  const first = parts[0]
  const last = parts[parts.length - 1]
  const ellipsis = '...'

  if ((first + sep + ellipsis + sep + last).length >= maxLength) {
    const half = Math.floor((maxLength - 3) / 2)
    return path.slice(0, half) + '...' + path.slice(-half)
  }

  return first + sep + ellipsis + sep + last
}
