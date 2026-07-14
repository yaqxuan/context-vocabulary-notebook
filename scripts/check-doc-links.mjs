import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rootDocuments = [
  'README.md',
  ...readdirSync(rootDir).filter((name) => /^README\.[^.]+(?:-[^.]+)?\.md$/u.test(name)),
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
]

const docs = [
  ...new Set(rootDocuments),
  'docs/USER_GUIDE.md',
  'docs/USER_GUIDE.zh-CN.md',
]
const htmlDocuments = collectFiles(path.join(rootDir, 'site'), '.html')
  .map((file) => path.relative(rootDir, file))

// Pages assembles these tracked demo screenshots into the deployment artifact.
// Keeping the mapping here verifies both the HTML contract and its source file.
const generatedSiteAssets = new Map([
  ['site/assets/screenshots/create-card-en.png', 'docs/demo/01-create-card-en.png'],
  ['site/assets/screenshots/create-card-zh.png', 'docs/demo/01-create-card-zh.png'],
  ['site/assets/screenshots/review.png', 'docs/demo/03-review.png'],
  ['site/assets/screenshots/statistics.png', 'docs/demo/04-statistics.png'],
].map(([target, source]) => [path.join(rootDir, target), path.join(rootDir, source)]))

const failures = []
const linkPattern = /!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\)/gu

for (const relativeDocument of docs) {
  const documentPath = path.join(rootDir, relativeDocument)
  if (!existsSync(documentPath)) continue

  const content = readFileSync(documentPath, 'utf8')
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].replace(/^<|>$/gu, '')
    if (isExternalOrAnchor(rawTarget)) continue

    const pathOnly = rawTarget.split('#', 1)[0].split('?', 1)[0]
    if (!pathOnly) continue

    let decodedTarget
    try {
      decodedTarget = decodeURIComponent(pathOnly)
    } catch {
      failures.push(`${relativeDocument}: invalid URL encoding in ${rawTarget}`)
      continue
    }

    const resolvedTarget = path.resolve(path.dirname(documentPath), decodedTarget)
    if (!resolvedTarget.startsWith(`${rootDir}${path.sep}`) && resolvedTarget !== rootDir) {
      failures.push(`${relativeDocument}: relative link escapes the repository: ${rawTarget}`)
      continue
    }

    if (!targetExists(resolvedTarget)) {
      failures.push(`${relativeDocument}: missing relative link target ${rawTarget}`)
    }
  }
}

const htmlTargetPattern = /\b(?:href|src)=["']([^"']+)["']/giu
for (const relativeDocument of htmlDocuments) {
  const documentPath = path.join(rootDir, relativeDocument)
  const content = readFileSync(documentPath, 'utf8')

  for (const match of content.matchAll(htmlTargetPattern)) {
    const rawTarget = match[1]
    if (isExternalOrAnchor(rawTarget)) continue

    const pathOnly = rawTarget.split('#', 1)[0].split('?', 1)[0]
    if (!pathOnly) continue

    const resolvedTarget = path.resolve(path.dirname(documentPath), decodeURIComponent(pathOnly))
    if (!targetExists(resolvedTarget)) {
      failures.push(`${relativeDocument}: missing relative HTML target ${rawTarget}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Documentation link verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Documentation link verification passed for ${docs.length} Markdown and ${htmlDocuments.length} HTML files.`)

function collectFiles(directory, extension) {
  if (!existsSync(directory)) return []

  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, extension))
    } else if (entry.isFile() && entry.name.endsWith(extension) && statSync(entryPath).size > 0) {
      files.push(entryPath)
    }
  }
  return files
}

function targetExists(target) {
  if (existsSync(target)) return true
  const source = generatedSiteAssets.get(target)
  return source ? existsSync(source) : false
}

function isExternalOrAnchor(target) {
  return (
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z\d+.-]*:/iu.test(target)
  )
}
