let currentRepoRoot: string | null = null

export function getCurrentRepoRoot(): string | null {
  return currentRepoRoot
}

export function setCurrentRepoRoot(root: string | null): void {
  currentRepoRoot = root
}
