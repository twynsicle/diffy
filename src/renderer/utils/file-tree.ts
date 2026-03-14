import type { FileChange } from '@shared/types'

export type TreeNodeFolder = {
  kind: 'folder'
  name: string
  path: string
  children: TreeNode[]
  fileCount: number
}

export type TreeNodeFile = {
  kind: 'file'
  name: string
  file: FileChange
}

export type TreeNode = TreeNodeFolder | TreeNodeFile

export type FlatFolderRow = {
  kind: 'folder'
  depth: number
  node: TreeNodeFolder
  isExpanded: boolean
}

export type FlatFileRow = {
  kind: 'file'
  depth: number
  node: TreeNodeFile
}

export type FlatRow = FlatFolderRow | FlatFileRow

type RawFolder = {
  files: TreeNodeFile[]
  subfolders: Map<string, RawFolder>
}

function createRawFolder(): RawFolder {
  return { files: [], subfolders: new Map() }
}

function countFiles(node: TreeNode): number {
  if (node.kind === 'file') return 1
  return node.children.reduce((sum, child) => sum + countFiles(child), 0)
}

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  return nodes.slice().sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function rawToTree(raw: RawFolder, prefix: string): TreeNode[] {
  const nodes: TreeNode[] = []

  for (const [name, sub] of raw.subfolders) {
    const folderPath = prefix ? `${prefix}/${name}` : name
    const children = rawToTree(sub, folderPath)

    // Path compression: if a folder has exactly one child and it's a folder, merge
    let displayName = name
    let compressedPath = folderPath
    let current = children
    while (current.length === 1 && current[0].kind === 'folder' && sub.files.length === 0) {
      const child = current[0]
      displayName = `${displayName}/${child.name}`
      compressedPath = child.path
      current = child.children
    }

    const folder: TreeNodeFolder = {
      kind: 'folder',
      name: displayName,
      path: compressedPath,
      children: sortNodes(current),
      fileCount: 0,
    }
    folder.fileCount = countFiles(folder)
    nodes.push(folder)
  }

  for (const file of raw.files) {
    nodes.push(file)
  }

  return sortNodes(nodes)
}

export function buildFileTree(files: FileChange[]): TreeNode[] {
  if (files.length === 0) return []

  const root = createRawFolder()

  for (const file of files) {
    const parts = file.path.split('/')
    const fileName = parts[parts.length - 1]
    if (!fileName) continue

    let current = root
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i]
      let sub = current.subfolders.get(segment)
      if (!sub) {
        sub = createRawFolder()
        current.subfolders.set(segment, sub)
      }
      current = sub
    }

    current.files.push({
      kind: 'file',
      name: fileName,
      file,
    })
  }

  return rawToTree(root, '')
}

export function flattenTree(roots: TreeNode[], collapsedPaths: ReadonlySet<string>): FlatRow[] {
  const rows: FlatRow[] = []

  function walk(nodes: TreeNode[], depth: number): void {
    for (const node of nodes) {
      if (node.kind === 'folder') {
        const isExpanded = !collapsedPaths.has(node.path)
        rows.push({ kind: 'folder', depth, node, isExpanded })
        if (isExpanded) {
          walk(node.children, depth + 1)
        }
      } else {
        rows.push({ kind: 'file', depth, node })
      }
    }
  }

  walk(roots, 0)
  return rows
}

export function collectAllFolderPaths(roots: TreeNode[]): string[] {
  const paths: string[] = []

  function walk(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.kind === 'folder') {
        paths.push(node.path)
        walk(node.children)
      }
    }
  }

  walk(roots)
  return paths
}
