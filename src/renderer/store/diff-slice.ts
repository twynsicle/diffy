import { createSlice } from '@reduxjs/toolkit'

type DiffState = {
  loading: boolean
  wrapEnabled: boolean
  original: string
  modified: string
  language?: string
  isBinary?: boolean
  error?: string
}

const initialState: DiffState = {
  loading: false,
  wrapEnabled: false,
  original: '',
  modified: '',
}

const diffSlice = createSlice({
  name: 'diff',
  initialState,
  reducers: {},
})

export const diffReducer = diffSlice.reducer
