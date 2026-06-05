import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const languages = [
  { label: '中文', file: 'README.md' },
  { label: 'English', file: 'README.en.md' },
  { label: '日本語', file: 'README.ja.md' },
  { label: 'Español', file: 'README.es.md' },
  { label: 'العربية', file: 'README.ar.md' },
  { label: 'Deutsch', file: 'README.de.md' },
  { label: 'Français', file: 'README.fr.md' },
  { label: 'Italiano', file: 'README.it.md' },
  { label: 'Latina', file: 'README.la.md' },
]

const languageSwitch = languages
  .map(({ label, file }) => `[${label}](./${file})`)
  .join(' | ')

const requiredLiterals = [
  'https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh',
  'https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1',
  'https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh',
  'https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1',
  '<!-- AUTO-GENERATED:ENV -->',
  '<!-- /AUTO-GENERATED:ENV -->',
  '<!-- AUTO-GENERATED:SCRIPTS -->',
  '<!-- /AUTO-GENERATED:SCRIPTS -->',
  'data/context-vocabulary-notebook.sqlite',
  'uploads/',
  '.env',
  'PORT',
  'DATABASE_PATH',
  'UPLOADS_DIR',
  'CLIENT_PORT',
  'CVN_HOME',
  'npm ci',
  'npm run build',
  'npm run dev',
  'git pull --ff-only',
  'http://localhost:5173',
  'http://localhost:3107',
  'http://localhost:3107/api/health',
  'better-sqlite3',
  'FSRS',
]

const failures = []

for (const { label, file } of languages) {
  const filePath = path.join(rootDir, file)

  if (!existsSync(filePath)) {
    failures.push(`${file}: missing README for ${label}`)
    continue
  }

  const rawContent = await readFile(filePath, 'utf8')
  const content = rawContent.replace(/\r\n/g, '\n')

  if (!content.startsWith(`${languageSwitch}\n\n# `)) {
    failures.push(`${file}: missing shared language switch at top`)
  }

  for (const { label: targetLabel, file: targetFile } of languages) {
    const targetLink = `[${targetLabel}](./${targetFile})`
    if (!content.includes(targetLink)) {
      failures.push(`${file}: missing language link ${targetLink}`)
    }
  }

  for (const literal of requiredLiterals) {
    if (!content.includes(literal)) {
      failures.push(`${file}: missing required literal ${literal}`)
    }
  }
}

if (failures.length > 0) {
  console.error('README i18n verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`README i18n verification passed for ${languages.length} files.`)
