import { readFile, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { BrowserWindow, dialog, ipcMain } from 'electron'

import { IPC_CHANNELS } from '@shared/ipc'
import type { DiffContent, DiffRequest, PrData, PrReference, Result } from '@shared/types'

import type { AiProvider } from '@shared/types'

import { generateNarrative } from './anthropic-client'
import { checkClaudeCliInstalled, generateNarrativeCli } from './claude-cli-client'
import { isBinary } from './detect-binary'
import { checkGhInstalled, fetchPrData } from './gh-runner'
import { buildBranchDiff, buildUncommittedDiff } from './local-diff-builder'
import { startWatching, stopWatching } from './file-watcher'
import { getRepoRoot, isPathInsideRepo, runGit } from './git-runner'
import { detectLanguage } from './language-map'
import { parseStatus } from './parse-status'
import {
  getAiProvider,
  getCliModel,
  getExcludedFilePatterns,
  getLastPrUrl,
  getLastRepoPath,
  setAiProvider,
  setCliModel,
  setExcludedFilePatterns,
  setLastPrUrl,
  setLastRepoPath,
} from './persisted-state'
import {
  clearApiKey,
  getApiKey,
  hasApiKey,
  setApiKey,
} from './secure-storage'

let currentRepoRoot: string | null = null
const activeGenerations = new Map<string, AbortController>()

async function isTracked(repoRoot: string, filePath: string): Promise<boolean> {
  const result = await runGit({
    repoRoot,
    args: ['ls-files', '--error-unmatch', '--', filePath],
  })
  return result.ok
}

async function gitShow(repoRoot: string, ref: string): Promise<string> {
  const result = await runGit({ repoRoot, args: ['show', ref] })
  if (!result.ok) {
    // New file or deleted — no content at this ref
    return ''
  }
  return result.data
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC_CHANNELS.REPO_GET_LAST, () => {
    return getLastRepoPath()
  })

  ipcMain.handle(IPC_CHANNELS.REPO_SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.REPO_OPEN, async (_event, folderPath: string) => {
    const rootResult = await getRepoRoot(folderPath)
    if (!rootResult.ok) {
      return { ok: false, error: `Not a git repository: ${folderPath}` } satisfies Result<never>
    }

    currentRepoRoot = rootResult.data
    startWatching(currentRepoRoot, mainWindow)
    setLastRepoPath(currentRepoRoot)

    return {
      ok: true,
      data: {
        repoRoot: currentRepoRoot,
        displayName: basename(currentRepoRoot),
      },
    }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_STATUS, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['status', '--porcelain=v2', '-z'],
    })

    if (!result.ok) {
      return result
    }

    return { ok: true, data: parseStatus(result.data) }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['add', '--', filePath],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['reset', 'HEAD', '--', filePath],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_STAGE_ALL, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['add', '-A'],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_UNSTAGE_ALL, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }

    const result = await runGit({
      repoRoot: currentRepoRoot,
      args: ['reset', 'HEAD'],
    })

    if (!result.ok) return result
    return { ok: true, data: undefined }
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT_GET_DIFF_CONTENT,
    async (_event, request: DiffRequest): Promise<Result<DiffContent>> => {
      if (!currentRepoRoot) {
        return { ok: false, error: 'No repository open' }
      }
      if (!isPathInsideRepo(currentRepoRoot, request.path)) {
        return { ok: false, error: 'Path is outside repository' }
      }

      const language = detectLanguage(request.path)
      let original: string
      let modified: string
      const origPath = request.origPath ?? request.path

      if (request.baseRef) {
        // Ref-based diff for narrative review
        original = await gitShow(currentRepoRoot, `${request.baseRef}:${origPath}`)

        if (request.headRef === 'WORKTREE') {
          try {
            modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
          } catch {
            modified = ''
          }
        } else {
          const headRef = request.headRef ?? 'HEAD'
          modified = await gitShow(currentRepoRoot, `${headRef}:${request.path}`)
        }
      } else if (request.section === 'unstaged') {
        // Unstaged: original = index, modified = worktree
        const indexResult = await gitShow(currentRepoRoot, `:${origPath}`)
        original = indexResult

        try {
          modified = await readFile(join(currentRepoRoot, request.path), 'utf-8')
        } catch {
          // File deleted from worktree
          modified = ''
        }
      } else {
        // Staged: original = HEAD, modified = index
        const headResult = await gitShow(currentRepoRoot, `HEAD:${origPath}`)
        original = headResult

        const indexResult = await gitShow(currentRepoRoot, `:${request.path}`)
        modified = indexResult
      }

      if (isBinary(original) || isBinary(modified)) {
        return { ok: true, data: { original: '', modified: '', language, isBinary: true } }
      }

      return { ok: true, data: { original, modified, language, isBinary: false } }
    },
  )

  ipcMain.handle(IPC_CHANNELS.GIT_DISCARD_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const tracked = await isTracked(currentRepoRoot, filePath)
    if (tracked) {
      const result = await runGit({
        repoRoot: currentRepoRoot,
        args: ['restore', '--', filePath],
      })
      if (!result.ok) return result
    } else {
      try {
        await rm(join(currentRepoRoot, filePath), { recursive: true, force: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove file'
        return { ok: false, error: msg } satisfies Result<never>
      }
    }
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.GIT_DELETE_FILE, async (_event, filePath: string) => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    if (!isPathInsideRepo(currentRepoRoot, filePath)) {
      return { ok: false, error: 'Path is outside repository' } satisfies Result<never>
    }

    const tracked = await isTracked(currentRepoRoot, filePath)
    if (tracked) {
      const result = await runGit({
        repoRoot: currentRepoRoot,
        args: ['rm', '-f', '--', filePath],
      })
      if (!result.ok) return result
    } else {
      try {
        await rm(join(currentRepoRoot, filePath), { recursive: true, force: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove file'
        return { ok: false, error: msg } satisfies Result<never>
      }
    }
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_API_KEY, () => {
    try {
      return { ok: true, data: getApiKey() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_API_KEY, (_event, key: string) => {
    if (typeof key !== 'string' || key.trim().length === 0) {
      return { ok: false, error: 'API key must be a non-empty string' }
    }
    try {
      setApiKey(key.trim())
      return { ok: true, data: undefined }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_HAS_API_KEY, () => {
    try {
      return { ok: true, data: hasApiKey() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to check API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_CLEAR_API_KEY, () => {
    try {
      clearApiKey()
      return { ok: true, data: undefined }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to clear API key'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.GH_CHECK_INSTALLED, async () => {
    return checkGhInstalled()
  })

  ipcMain.handle(IPC_CHANNELS.GH_FETCH_PR, async (_event, ref: unknown) => {
    if (
      typeof ref !== 'object' ||
      ref === null ||
      typeof (ref as PrReference).owner !== 'string' ||
      typeof (ref as PrReference).repo !== 'string' ||
      typeof (ref as PrReference).number !== 'number'
    ) {
      return { ok: false, error: 'Invalid PR reference' } satisfies Result<never>
    }
    return fetchPrData(ref as PrReference)
  })

  let narrativeRequestId = 0

  ipcMain.handle(IPC_CHANNELS.LLM_GENERATE_NARRATIVE, (_event, prData: unknown) => {
    if (
      typeof prData !== 'object' ||
      prData === null ||
      typeof (prData as PrData).title !== 'string' ||
      typeof (prData as PrData).diff !== 'string' ||
      !Array.isArray((prData as PrData).files)
    ) {
      return { ok: false, error: 'Invalid PR data' } satisfies Result<never>
    }

    const provider = getAiProvider()

    if (provider === 'api') {
      const apiKey = getApiKey()
      if (!apiKey) {
        return { ok: false, error: 'No API key configured' } satisfies Result<never>
      }
    }

    narrativeRequestId += 1
    const requestId = String(narrativeRequestId)

    const controller = new AbortController()
    activeGenerations.set(requestId, controller)

    void (async (): Promise<void> => {
      const onChunk = (chunk: string): void => {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_CHUNK, chunk)
      }

      const result = provider === 'cli'
        ? await generateNarrativeCli(
          prData as PrData,
          onChunk,
          controller.signal,
          getCliModel() || undefined,
        )
        : await generateNarrative(
          prData as PrData,
          getApiKey(),
          onChunk,
          controller.signal,
        )

      activeGenerations.delete(requestId)

      if (result.wasTruncated) {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_TRUNCATION_WARNING)
      }

      if (result.ok) {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_COMPLETE, result.data)
      } else {
        mainWindow.webContents.send(IPC_CHANNELS.LLM_STREAM_ERROR, result.error)
      }
    })()

    return { ok: true, data: requestId } satisfies Result<string>
  })

  ipcMain.handle(IPC_CHANNELS.LLM_CANCEL_GENERATION, () => {
    for (const controller of activeGenerations.values()) {
      controller.abort()
    }
    activeGenerations.clear()
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_LAST_PR_URL, () => {
    return getLastPrUrl()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_LAST_PR_URL, (_event, url: unknown) => {
    if (typeof url !== 'string' || url.trim().length === 0) {
      return { ok: false, error: 'URL must be a non-empty string' } satisfies Result<never>
    }
    setLastPrUrl(url.trim())
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_AI_PROVIDER, () => {
    return { ok: true, data: getAiProvider() }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AI_PROVIDER, (_event, provider: unknown) => {
    if (provider !== 'api' && provider !== 'cli') {
      return { ok: false, error: 'Invalid AI provider' } satisfies Result<never>
    }
    setAiProvider(provider as AiProvider)
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_CLI_MODEL, () => {
    return { ok: true, data: getCliModel() }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_CLI_MODEL, (_event, model: unknown) => {
    if (typeof model !== 'string') {
      return { ok: false, error: 'Model must be a string' } satisfies Result<never>
    }
    setCliModel(model.trim())
    return { ok: true, data: undefined }
  })

  ipcMain.handle(IPC_CHANNELS.CLAUDE_CLI_CHECK_INSTALLED, async () => {
    return checkClaudeCliInstalled()
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_BRANCH_DIFF, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    return buildBranchDiff(currentRepoRoot)
  })

  ipcMain.handle(IPC_CHANNELS.GIT_GET_UNCOMMITTED_DIFF, async () => {
    if (!currentRepoRoot) {
      return { ok: false, error: 'No repository open' } satisfies Result<never>
    }
    return buildUncommittedDiff(currentRepoRoot)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_EXCLUDED_PATTERNS, () => {
    try {
      return { ok: true, data: getExcludedFilePatterns() }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get excluded patterns'
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_EXCLUDED_PATTERNS, (_event, patterns: unknown) => {
    if (!Array.isArray(patterns) || !patterns.every((p) => typeof p === 'string')) {
      return { ok: false, error: 'Patterns must be an array of strings' } satisfies Result<never>
    }
    try {
      setExcludedFilePatterns(patterns)
      return { ok: true, data: undefined }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save excluded patterns'
      return { ok: false, error: msg }
    }
  })
}

export function cleanup(): void {
  stopWatching()
  for (const controller of activeGenerations.values()) {
    controller.abort()
  }
  activeGenerations.clear()
  currentRepoRoot = null
}
