import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const languages = [
  {
    label: 'English',
    file: 'README.md',
    screenshot: './docs/demo/screen-create-card.jpg',
    ocrCode: 'eng',
    truths: ['website video URLs', 'cloud sync', 'native desktop'],
  },
  {
    label: '简体中文',
    file: 'README.zh-CN.md',
    screenshot: './docs/demo/01-create-card-zh.png',
    ocrCode: 'eng+chi_sim',
    truths: ['视频网站链接', '云同步', '原生桌面'],
  },
  {
    label: '日本語',
    file: 'README.ja.md',
    screenshot: './docs/demo/01-create-card-ja.png',
    ocrCode: 'jpn',
    truths: ['動画サイトの URL', 'クラウド同期', 'ネイティブデスクトップ'],
  },
  {
    label: 'Español',
    file: 'README.es.md',
    screenshot: './docs/demo/01-create-card-es.png',
    ocrCode: 'spa',
    truths: ['URL de sitios de vídeo', 'sincronización en la nube', 'nativa de escritorio'],
  },
  {
    label: 'العربية',
    file: 'README.ar.md',
    screenshot: './docs/demo/screen-create-card.jpg',
    ocrCode: 'ara',
    truths: ['روابط مواقع الفيديو', 'مزامنة سحابية', 'سطح مكتب أصلياً'],
    unavailableUi: 'الواجهة العربية غير متاحة حالياً',
  },
  {
    label: 'Deutsch',
    file: 'README.de.md',
    screenshot: './docs/demo/01-create-card-de.png',
    ocrCode: 'deu',
    truths: ['URLs von Video-Websites', 'Cloud-Synchronisierungsdienst', 'Desktopprogramm'],
  },
  {
    label: 'Français',
    file: 'README.fr.md',
    screenshot: './docs/demo/01-create-card-fr.png',
    ocrCode: 'fra',
    truths: ['URL de sites vidéo', 'synchronisation cloud', 'bureau native'],
  },
  {
    label: 'Italiano',
    file: 'README.it.md',
    screenshot: './docs/demo/screen-create-card.jpg',
    ocrCode: 'ita',
    truths: ['URL di siti video', 'cloud sync', 'desktop nativa'],
    unavailableUi: 'interfaccia italiana non è ancora disponibile',
  },
  {
    label: '한국어',
    file: 'README.ko.md',
    screenshot: './docs/demo/01-create-card-ko.png',
    ocrCode: 'kor',
    truths: ['동영상 웹사이트 URL', '클라우드 동기화', '네이티브 데스크톱'],
  },
  {
    label: 'Русский',
    file: 'README.ru.md',
    screenshot: './docs/demo/01-create-card-ru.png',
    ocrCode: 'rus',
    truths: ['URL видеосайтов', 'облачная синхронизация', 'нативная настольная'],
  },
  {
    label: 'Latina',
    file: 'README.la.md',
    screenshot: './docs/demo/screen-create-card.jpg',
    ocrCode: 'lat',
    truths: ['URL situs pellicularum', 'Synchronizatio nubis', 'desktop nativum'],
    unavailableUi: 'Interfacies Latina nondum praebetur',
  },
]

const languageSwitch = languages
  .map(({ label, file }) => `[${label}](./${file})`)
  .join(' | ')

const sectionMarkers = [
  '<!-- README:OVERVIEW -->',
  '<!-- README:PREVIEW -->',
  '<!-- README:WORKFLOW -->',
  '<!-- README:FEATURES -->',
  '<!-- README:QUICKSTART -->',
  '<!-- README:OPTIONAL -->',
  '<!-- README:PRIVACY -->',
  '<!-- README:DOCS -->',
  '<!-- README:STATUS -->',
  '<!-- README:CONTRIBUTING -->',
  '<!-- README:LICENSE -->',
]

const requiredLiterals = [
  'Context Vocabulary Notebook',
  'https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh',
  'https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1',
  'https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh',
  'https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1',
  '--retry 5 --retry-delay 2 --retry-connrefused',
  'data/context-vocabulary-notebook.sqlite',
  'uploads/',
  '.env',
  '`mp4`',
  '`mp3`',
  '`jpg`',
  '`png`',
  '`webp`',
  'ffmpeg',
  'Tesseract',
  'whisper.cpp',
  'OpenAI-compatible',
  'FSRS',
  '`Again',
  '`Good',
  'npm run dev',
  'http://localhost:5173',
  'http://localhost:3107/api/health',
  './docs/USER_GUIDE.md',
  './docs/USER_GUIDE.zh-CN.md',
  './CONTRIBUTING.md',
  './SECURITY.md',
  './CODE_OF_CONDUCT.md',
  './LICENSE',
]

function sectionContent(content, marker, nextMarker) {
  const start = content.indexOf(marker)
  const end = content.indexOf(nextMarker, start + marker.length)
  return start === -1 || end === -1 ? '' : content.slice(start + marker.length, end)
}

const failures = []

for (const language of languages) {
  const { label, file, screenshot, ocrCode, truths, unavailableUi } = language
  const filePath = path.join(rootDir, file)

  if (!existsSync(filePath)) {
    failures.push(`${file}: missing README for ${label}`)
    continue
  }

  const content = (await readFile(filePath, 'utf8')).replace(/\r\n/g, '\n')
  const lineCount = content.trimEnd().split('\n').length

  if (!content.startsWith(`${languageSwitch}\n\n# `)) {
    failures.push(`${file}: shared language switch is not the first line`)
  }

  if (lineCount < 100 || lineCount > 230) {
    failures.push(`${file}: expected a concise 100-230 line product page, found ${lineCount}`)
  }

  for (const { label: targetLabel, file: targetFile } of languages) {
    const targetLink = `[${targetLabel}](./${targetFile})`
    if (!content.includes(targetLink)) {
      failures.push(`${file}: missing language link ${targetLink}`)
    }
  }

  let previousIndex = -1
  for (const marker of sectionMarkers) {
    const firstIndex = content.indexOf(marker)
    const lastIndex = content.lastIndexOf(marker)
    if (firstIndex === -1) {
      failures.push(`${file}: missing section marker ${marker}`)
    } else if (firstIndex !== lastIndex) {
      failures.push(`${file}: duplicate section marker ${marker}`)
    } else if (firstIndex <= previousIndex) {
      failures.push(`${file}: section marker is out of order ${marker}`)
    }
    previousIndex = Math.max(previousIndex, firstIndex)
  }

  for (const literal of requiredLiterals) {
    if (!content.includes(literal)) {
      failures.push(`${file}: missing required literal ${literal}`)
    }
  }

  for (const truth of truths) {
    if (!content.includes(truth)) {
      failures.push(`${file}: missing product-boundary statement containing ${truth}`)
    }
  }

  const features = sectionContent(content, '<!-- README:FEATURES -->', '<!-- README:QUICKSTART -->')
  const featureRows = features.split('\n').filter((line) => /^\|.+\|$/.test(line) && !/^\|[-|]+\|$/.test(line))
  if (featureRows.length !== 10) {
    failures.push(`${file}: FEATURES must contain one header and 9 shared capability rows; found ${featureRows.length}`)
  }

  const optional = sectionContent(content, '<!-- README:OPTIONAL -->', '<!-- README:PRIVACY -->')
  if (!optional.includes(`CVN_TESSERACT_LANG=${ocrCode} bash`)) {
    failures.push(`${file}: Unix recognition command must install OCR language ${ocrCode}`)
  }
  if (!optional.includes(`CVN_TESSERACT_LANG='${ocrCode}'`)) {
    failures.push(`${file}: PowerShell recognition command must install OCR language ${ocrCode}`)
  }

  const quickStart = sectionContent(content, '<!-- README:QUICKSTART -->', '<!-- README:OPTIONAL -->')
  for (const nestedTarget of ['$HOME/context-vocabulary-notebook', 'Join-Path $HOME "context-vocabulary-notebook"']) {
    if (quickStart.includes(nestedTarget)) {
      failures.push(`${file}: QUICKSTART must install directly into the current directory, found ${nestedTarget}`)
    }
  }

  const privacy = sectionContent(content, '<!-- README:PRIVACY -->', '<!-- README:DOCS -->')
  if (!privacy.includes('CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1')) {
    failures.push(`${file}: PRIVACY must disclose optional network clip fallback`)
  }

  const docs = sectionContent(content, '<!-- README:DOCS -->', '<!-- README:STATUS -->')
  for (const link of ['./docs/USER_GUIDE.md', './docs/USER_GUIDE.zh-CN.md', './CONTRIBUTING.md', './SECURITY.md', './CODE_OF_CONDUCT.md']) {
    if (!docs.includes(`](${link})`)) {
      failures.push(`${file}: DOCS is missing shared link ${link}`)
    }
  }

  if (!content.includes(`](${screenshot})`)) {
    failures.push(`${file}: expected localized screenshot ${screenshot}`)
  }

  const screenshotPath = path.join(rootDir, screenshot.replace(/^\.\//, ''))
  if (!existsSync(screenshotPath)) {
    failures.push(`${file}: screenshot file does not exist ${screenshot}`)
  }

  if (unavailableUi && !content.includes(unavailableUi)) {
    failures.push(`${file}: missing translated-docs/UI-unavailable disclosure`)
  }
}

const compatibilityPath = path.join(rootDir, 'README.en.md')
if (!existsSync(compatibilityPath)) {
  failures.push('README.en.md: missing compatibility stub')
} else {
  const compatibility = await readFile(compatibilityPath, 'utf8')
  if (!compatibility.includes('[Open README.md](./README.md)')) {
    failures.push('README.en.md: missing link to the default English README')
  }
  if (!compatibility.includes('existing links')) {
    failures.push('README.en.md: must explain why the compatibility file remains')
  }
}

const screenCatalogPath = path.join(rootDir, 'docs/SCREEN_CATALOG.md')
const englishReadme = await readFile(path.join(rootDir, 'README.md'), 'utf8')
if (!existsSync(screenCatalogPath)) {
  failures.push('docs/SCREEN_CATALOG.md: missing English application screen catalog')
} else {
  const catalog = await readFile(screenCatalogPath, 'utf8')
  const expectedScreens = [
    ['Home', './demo/screen-home.jpg'],
    ['Create card', './demo/screen-create-card.jpg'],
    ['Card library', './demo/screen-cards.jpg'],
    ['Batch MP4 import', './demo/screen-batch-import.jpg'],
    ['Card detail', './demo/screen-card-detail.jpg'],
    ['Review', './demo/screen-review.jpg'],
    ['Tags', './demo/screen-tags.jpg'],
    ['Favorites', './demo/screen-favorites.jpg'],
    ['Statistics', './demo/screen-statistics.jpg'],
    ['Settings', './demo/screen-settings.jpg'],
  ]

  for (const [heading, screenshot] of expectedScreens) {
    if (!catalog.includes(`## ${heading}`)) failures.push(`docs/SCREEN_CATALOG.md: missing ${heading} section`)
    if (!catalog.includes(`](${screenshot})`)) failures.push(`docs/SCREEN_CATALOG.md: missing screenshot ${screenshot}`)
    if (!existsSync(path.join(rootDir, 'docs', screenshot.replace(/^\.\//, '')))) {
      failures.push(`docs/SCREEN_CATALOG.md: screenshot file does not exist ${screenshot}`)
    }
  }
}

if (!englishReadme.includes('](./docs/SCREEN_CATALOG.md)')) {
  failures.push('README.md: missing link to the English application screen catalog')
}

for (const guide of ['docs/USER_GUIDE.md', 'docs/USER_GUIDE.zh-CN.md']) {
  const guidePath = path.join(rootDir, guide)
  if (!existsSync(guidePath)) {
    failures.push(`${guide}: missing detailed user guide`)
    continue
  }
  const content = await readFile(guidePath, 'utf8')
  for (const literal of ['ALLOW_PRIVATE_AI_PROVIDER_URLS', 'CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1', '100 MB', 'PORT=3117', 'CLIENT_PORT=5174']) {
    if (!content.includes(literal)) failures.push(`${guide}: missing operational boundary ${literal}`)
  }
}

const requirementsStub = path.join(rootDir, 'require.md')
const archivedRequirements = path.join(rootDir, 'docs/archive/initial-requirements.zh-CN.md')
if (!existsSync(requirementsStub) || !existsSync(archivedRequirements)) {
  failures.push('historical requirements must have both a root compatibility stub and archived snapshot')
} else {
  const stub = await readFile(requirementsStub, 'utf8')
  if (!stub.includes('not authoritative') || !stub.includes('./docs/archive/initial-requirements.zh-CN.md')) {
    failures.push('require.md: compatibility stub must warn and link to the archived snapshot')
  }
}

if (failures.length > 0) {
  console.error('README i18n verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`README i18n verification passed for ${languages.length} languages plus the English compatibility stub.`)
