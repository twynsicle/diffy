import { contextBridge } from 'electron'

export type DiffyApi = Record<string, never>

const api: DiffyApi = {}

contextBridge.exposeInMainWorld('api', api)
