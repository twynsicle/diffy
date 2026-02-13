import { extname } from 'node:path'

const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.jsonc': 'json',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.html': 'html',
  '.htm': 'html',
  '.xml': 'xml',
  '.svg': 'xml',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.kt': 'kotlin',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',
  '.ini': 'ini',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.dockerfile': 'dockerfile',
  '.lua': 'lua',
  '.r': 'r',
  '.dart': 'dart',
  '.vue': 'html',
  '.bat': 'bat',
  '.ps1': 'powershell',
}

const FILENAME_MAP: Record<string, string> = {
  dockerfile: 'dockerfile',
  makefile: 'shell',
}

export function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  if (ext && ext in EXTENSION_MAP) {
    return EXTENSION_MAP[ext]
  }

  const basename = filePath.split('/').pop()?.toLowerCase() ?? ''
  if (basename in FILENAME_MAP) {
    return FILENAME_MAP[basename]
  }

  return 'plaintext'
}
