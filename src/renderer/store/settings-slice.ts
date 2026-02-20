import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import type { AiProvider } from '@shared/types'

import type { RootState } from '.'

type SettingsState = {
  aiProvider: AiProvider
  hasApiKey: boolean
  cliModel: string
  cliInstalled: boolean | null
  excludedPatterns: string[]
  lastPrUrl: string | null
  loading: boolean
  loaded: boolean
}

const initialState: SettingsState = {
  aiProvider: 'api',
  hasApiKey: false,
  cliModel: '',
  cliInstalled: null,
  excludedPatterns: [],
  lastPrUrl: null,
  loading: false,
  loaded: false,
}

export const loadSettings = createAsyncThunk<
  {
    aiProvider: AiProvider
    hasApiKey: boolean
    cliModel: string
    cliInstalled: boolean
    excludedPatterns: string[]
  },
  undefined,
  { rejectValue: string }
>('settings/loadSettings', async (_, { rejectWithValue }) => {
  const [providerResult, hasKeyResult, modelResult, cliResult, patternsResult] = await Promise.all([
    window.api.getAiProvider(),
    window.api.hasApiKey(),
    window.api.getCliModel(),
    window.api.checkClaudeCliInstalled(),
    window.api.getExcludedPatterns(),
  ])

  if (!providerResult.ok) return rejectWithValue(providerResult.error)
  if (!hasKeyResult.ok) return rejectWithValue(hasKeyResult.error)
  if (!modelResult.ok) return rejectWithValue(modelResult.error)
  if (!cliResult.ok) return rejectWithValue(cliResult.error)
  if (!patternsResult.ok) return rejectWithValue(patternsResult.error)

  return {
    aiProvider: providerResult.data,
    hasApiKey: hasKeyResult.data,
    cliModel: modelResult.data,
    cliInstalled: cliResult.data,
    excludedPatterns: patternsResult.data,
  }
})

export const saveAiProvider = createAsyncThunk<AiProvider, AiProvider, { rejectValue: string }>(
  'settings/saveAiProvider',
  async (provider, { rejectWithValue }) => {
    const result = await window.api.setAiProvider(provider)
    if (!result.ok) return rejectWithValue(result.error)
    return provider
  },
)

export const saveApiKey = createAsyncThunk<undefined, string, { rejectValue: string }>(
  'settings/saveApiKey',
  async (key, { rejectWithValue }) => {
    const result = await window.api.setApiKey(key)
    if (!result.ok) return rejectWithValue(result.error)
    return undefined
  },
)

export const clearApiKey = createAsyncThunk<undefined, undefined, { rejectValue: string }>(
  'settings/clearApiKey',
  async (_, { rejectWithValue }) => {
    const result = await window.api.clearApiKey()
    if (!result.ok) return rejectWithValue(result.error)
    return undefined
  },
)

export const saveCliModel = createAsyncThunk<string, string, { rejectValue: string }>(
  'settings/saveCliModel',
  async (model, { rejectWithValue }) => {
    const result = await window.api.setCliModel(model)
    if (!result.ok) return rejectWithValue(result.error)
    return model
  },
)

export const addExcludedPattern = createAsyncThunk<
  string[],
  string,
  { state: RootState; rejectValue: string }
>(
  'settings/addExcludedPattern',
  async (pattern, { getState, rejectWithValue }) => {
    const current = getState().settings.excludedPatterns
    const updated = [...current, pattern]
    const result = await window.api.setExcludedPatterns(updated)
    if (!result.ok) return rejectWithValue(result.error)
    return updated
  },
)

export const removeExcludedPattern = createAsyncThunk<
  string[],
  string,
  { state: RootState; rejectValue: string }
>(
  'settings/removeExcludedPattern',
  async (pattern, { getState, rejectWithValue }) => {
    const current = getState().settings.excludedPatterns
    const updated = current.filter((p) => p !== pattern)
    const result = await window.api.setExcludedPatterns(updated)
    if (!result.ok) return rejectWithValue(result.error)
    return updated
  },
)

export const loadLastPrUrl = createAsyncThunk<string | null, undefined, { rejectValue: string }>(
  'settings/loadLastPrUrl',
  async () => {
    const url = await window.api.getLastPrUrl()
    return url
  },
)

export const saveLastPrUrl = createAsyncThunk<string, string, { rejectValue: string }>(
  'settings/saveLastPrUrl',
  async (url, { rejectWithValue }) => {
    const result = await window.api.setLastPrUrl(url)
    if (!result.ok) return rejectWithValue(result.error)
    return url
  },
)

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadSettings.pending, (state) => {
      state.loading = true
    })
    builder.addCase(loadSettings.fulfilled, (state, action) => {
      state.loading = false
      state.loaded = true
      state.aiProvider = action.payload.aiProvider
      state.hasApiKey = action.payload.hasApiKey
      state.cliModel = action.payload.cliModel
      state.cliInstalled = action.payload.cliInstalled
      state.excludedPatterns = action.payload.excludedPatterns
    })
    builder.addCase(loadSettings.rejected, (state) => {
      state.loading = false
    })

    builder.addCase(saveAiProvider.fulfilled, (state, action) => {
      state.aiProvider = action.payload
    })

    builder.addCase(saveApiKey.fulfilled, (state) => {
      state.hasApiKey = true
    })

    builder.addCase(clearApiKey.fulfilled, (state) => {
      state.hasApiKey = false
    })

    builder.addCase(saveCliModel.fulfilled, (state, action) => {
      state.cliModel = action.payload
    })

    builder.addCase(addExcludedPattern.fulfilled, (state, action) => {
      state.excludedPatterns = action.payload
    })

    builder.addCase(removeExcludedPattern.fulfilled, (state, action) => {
      state.excludedPatterns = action.payload
    })

    builder.addCase(loadLastPrUrl.fulfilled, (state, action) => {
      state.lastPrUrl = action.payload
    })

    builder.addCase(saveLastPrUrl.fulfilled, (state, action) => {
      state.lastPrUrl = action.payload
    })
  },
})

export const settingsReducer = settingsSlice.reducer

export const selectAiProvider = (state: RootState): AiProvider => state.settings.aiProvider
export const selectHasApiKey = (state: RootState): boolean => state.settings.hasApiKey
export const selectCliModel = (state: RootState): string => state.settings.cliModel
export const selectCliInstalled = (state: RootState): boolean | null => state.settings.cliInstalled
export const selectExcludedPatterns = (state: RootState): string[] => state.settings.excludedPatterns
export const selectLastPrUrl = (state: RootState): string | null => state.settings.lastPrUrl
export const selectSettingsLoading = (state: RootState): boolean => state.settings.loading
export const selectSettingsLoaded = (state: RootState): boolean => state.settings.loaded
