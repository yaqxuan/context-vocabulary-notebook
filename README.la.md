[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

Instrumentum leve, primum locale, ad vocabula contextualia recognoscenda. Idoneum est ad nova verba, sententias originales, partes pellicularum locales, capturas ekranorum, sonos, et pittacia annotanda dum pelliculas in linguis peregrinis spectas, deinde recognitiones per algorithmum FSRS disponendas.

> Praesens propositum est applicatio telae localis. Data per defaltam in base datorum SQLite et in palliolo `uploads/` in computatro tuo salvantur. Ratio nubis non requiritur.

## Lineamenta Praecipua

- Creare chartulas circa contextus reales: verbum scopi, definitio contextualis, sententia originalis, notae, pittacia.
- Unus introitus significationis pluribus exemplis contextus sociari potest, perfectum ad usus eiusdem significationis in diversis pelliculis annotandos.
- Appendices mediorum localium: pellicula `mp4`, sonus `mp3`, imago `jpg / png / webp`.
- Repetitio spatiata FSRS: tantum bullae aestimationis `Again` / `Good` retinentur.
- Index introituum significationis, quaesitio, percolatio per pittacia, dilecta, statistica.
- Importatio et exportatio ZIP: sustinet tergum personale integrum et puram communicationem chartularum.
- Suggestiones IA in pagina creationis chartularum V2: API compatibilis OpenAI configurari potest ad definitiones contextuales et notas usus suggerendas; Clavis API tantum localiter salvatur.

## Monitio de Loco Datorum et Spatio Disci

Applicatio data in directorio exsecutionis per defaltam salvat. Postquam pelliculas, capturas ekranorum, et sonos oneraveris, directorium `uploads/` continue crescere et spatium disci insigne occupare potest.

Data localia per defaltam:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Non commendatur applicationem in his locis exsequi:

- Directoria quae plerumque permissiones `sudo` vel radicis requirunt, sicut `/usr/local`, `/opt`.
- Directoria a systemate protecta sicut `C:\Program Files`.
- Directoria temporaria, directoria celationis detractionis, vel loca quae a systemate vel instrumentis purgationis automatice delebuntur.
- Loca cum spatio minimo, regulis synchronisationis obscuris, vel ubi fasciculi ab unitatibus nubis automatice purgari vel in quota limitari possunt.

## Ambitus Exsecutionis

| Ambitus | Requiritur | Descriptio |
|------|------|------|
| Node.js | Commendatur Node.js 22 LTS; saltem versio Node praesentibus requisitis Vite satisfaciens | Aedificatio partis anterioris, servitor evolutionis, et servitor partis posterioris omnes a Node.js dependent. Scriptum installationis hoc implere conabitur. |
| npm | Cum Node.js installatur | Receptaculum `package-lock.json` continet, utere `npm ci` ad dependentias installandas. |
| Git | Requisitum ad receptaculum GitHub clonandum | Scriptum installationis hoc verificabit et implere conabitur. |
| Navigatorium | Navigatoria moderna sicut Chrome / Edge / Firefox / Safari | Applicatio per paginas telae locales adhibetur. |
| Instrumenta Aedificationis C/C++ | Requiruntur forsitan | `better-sqlite3` est modulum nativum; si nullum fasciculum praecompilatum pro praesenti systemate et versione Node praesto est, `npm ci` compilationem localem tentabit. |

Scriptum installationis primum ambitum exsistentem in machina locali verificabit. In Linux / WSL, dependentias per `apt-get` implere tentabit solum si Git vel Node.js/npm desunt; si ambitus fundamentales satisfacti sunt, `apt-get` transiliet ne quaestiones fontium programmatum extraneorum in systemate provocet. Scriptum macOS Homebrew adhibere conabitur cum dependentiae desunt. Scriptum nativum Windows `winget` adhibere conabitur cum dependentiae desunt. Si hi dispensatores fasciculorum non praesto sunt, vel usor praesens permissiones installationis non habet, oportet ut ambitus deficientes manualiter installes et iterum tentes.

## Notae Prae-installationis et Declinatio Responsabilitatis

Ad optimam auctoris cognitionem praesentem, codex fontis proprius huius propositi nullum codicem malignum continet. Scriptum installationis ambitum localem verificabit et dependentias deficientes sicut Git, Node.js, npm, et instrumenta aedificationis nativa in suggestis sustentatis installare tentabit.

Installatio propositi programmata extranea et dependentias per dispensatores fasciculorum systematis et npm acquiret. Processus installationis et usus adhuc affici potest a factoribus sicut permissiones systematis, status retis, disponibilitas dispensatoris fasciculorum, programmata antivirorum, consilia machinarum corporatarum, spatium disci, catenae suppeditationis dependentiarum extranearum, et exitus compilationis modulorum nativorum Node. Usores soli responsabiles sunt pro ullis quaestionibus et consecutionibus ex exsecutione scripti installationis, installatione dependentiarum, modificatione ambitus systematis, ac onere et salvatione fasciculorum localium surgentibus.

Si scriptum ambitum automatice implere nequit, instrumenta deficientia et methodos tractationis suggestas proferet; hoc in puncto, usores ea manualiter secundum propria systemata installare debent antequam iterum tentent.

## Installatio Unico Ictu

### Linux / macOS / WSL

Copia et exsequere praeceptum sequens. Scriptum propositum in directorio praesenti installabit:

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Scriptum automatice dependentias sicut Git, Node.js/npm verificabit; dependentiae installatae directe iterum adhibebuntur. Pro Linux / WSL, si dependentiae fundamentales satisfactae sunt, `apt-get` transiliet.

Ad contentum scripti prius videndum, visita:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

Usus provectus: Specificare directorium installationis

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

Primum, intra directorium vacuum ubi vis fasciculos propositi installare, deinde copia et exsequere praeceptum sequens. Scriptum fasciculos propositi directe in directorio praesenti installabit sine alio directorio nidificato creando:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Scriptum automatice dependentias sicut Git, Node.js/npm verificabit; dependentiae installatae directe iterum adhibebuntur.

Ad contentum scripti prius videndum, visita:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

Usus provectus: Specificare directorium installationis

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### Solutio Problematum

- Si dicit praeceptum non exsistere, claude terminalem, eam iterum aperi, et praeceptum installationis iterum exsequere.
- Pro Linux / WSL, si `apt-get update` errores nuntiat sicut Docker, Chromium, Snap, claves GPG, etc., plerumque est propter fontes apt exsistentes vel configurationes fasciculorum imperfectas in systemate, non quia hoc propositum a his programmatibus dependet. Potes primum fontes apt respondentes reparare/debilitare, vel manualiter Git, Node.js 20+ et npm installare, deinde iterum tentare.
- Pro macOS, si fenestra installationis Instrumentorum Lineae Praecepti Xcode prosilit, preme "Install", et postquam completa est, praeceptum installationis iterum exsequere.
- Pro Windows, si te admonet ambitum compilationis installari debere, quaeso perge ut admonitus; hic est ambitus qui forsitan requiratur in compilatione quarundam dependentiarum.

## Renovatio ad Versionem Recentissimam

Si eam iam installasti, intra directorium propositi et exsequere:

Linux / macOS / WSL / Git Bash:

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows native PowerShell:

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Potes etiam iterum exsequi praeceptum installationis unico ictu. Cum scriptum receptaculum Git exsistens in directorio installationis invenit, automatice `git pull --ff-only`, `npm ci`, et `npm run build` exsequetur.

Si iterum exsequeris praeceptum installationis unico ictu intra directorium propositi, scriptum directorium propositi praesens renovabit et aliud directorium nidificatum eiusdem nominis non creabit. Si extra propositum exsequitur, quaeso primum intra directorium vacuum, vel expresse eundem `CVN_HOME` statue; scriptum fasciculos propositi in directorium ordinarium non vacuum non miscebit.

## Installatio Manualis

Si scriptum unico ictu ambitum implere nequit, potes manualiter Node.js 22 LTS, npm, Git, et instrumenta aedificationis nativa potentialiter requisita primum installare, deinde praecepta sequentia exsequi.

Linux / macOS / WSL / Git Bash:

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows native PowerShell:

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Aperi in navigatorio:

```text
http://localhost:5173
```

Inscriptio partis posterioris per defaltam:

```text
http://localhost:3107
```

## Variabiles Ambitus

## ffmpeg / Video transcription addendum

For video transcription, install local `ffmpeg`. The installer checks ffmpeg and reports its status; missing ffmpeg does not block the core install, card creation, review, or normal media upload.

Opt in to installer-managed ffmpeg installation before running the installer:

```bash
export CVN_INSTALL_FFMPEG=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

If video transcription shows `Audio extraction failed`, install ffmpeg and retry: Linux / WSL `sudo apt-get update && sudo apt-get install -y ffmpeg`; macOS `brew install ffmpeg`; Windows `winget install Gyan.FFmpeg`, then reopen the terminal.

Video transcription prerequisites: local `ffmpeg` on PATH, a configured OpenAI-compatible `/audio/transcriptions` provider/model, and an uploaded file within the transcription size limit. `TRANSCRIPTION_UPLOAD_SIZE_LIMIT_BYTES` is currently 100MB; the media-library video attachment limit is 300MB.

<!-- AUTO-GENERATED:ENV -->
| Variabilis | Requiritur | Defalta | Descriptio |
|------|------|--------|------|
| `PORT` | Non | `3107` | Portus servitoris Express partis posterioris. Servitor evolutionis Vite `/api` ad hunc portum delegat. |
| `DATABASE_PATH` | Non | `./data/context-vocabulary-notebook.sqlite` | Semita basis datorum SQLite. Semitae relativae contra radicem propositi resolvuntur. |
| `UPLOADS_DIR` | Non | `./uploads` | Directorium salvationis fasciculorum mediorum oneratorum. Semitae relativae contra radicem propositi resolvuntur. |
<!-- /AUTO-GENERATED:ENV -->

Ad portum partis anterioris mutandum in evolutione, potes `CLIENT_PORT` statuere cum praeceptum exsequeris, defalta est `5173`. Haec variabilis non est in `.env.example` et plerumque non indiget configurari.

## Praecepta Communia

<!-- AUTO-GENERATED:SCRIPTS -->
| Praeceptum | Descriptio |
|------|------|
| `npm run dev` | Incipit et servitorem evolutionis partis posterioris et servitorem evolutionis partis anterioris Vite. |
| `npm run dev:client` | Incipit tantum servitorem evolutionis partis anterioris Vite, auscultat ad `0.0.0.0:5173` per defaltam. |
| `npm run dev:server` | Incipit tantum servitorem evolutionis Express partis posterioris, auscultat ad `localhost:3107` per defaltam. |
| `npm run build` | Exsequitur verificationem typi primum, deinde aedificat partem anteriorem et partem posteriorem. |
| `npm test` | Exsequitur probationes unitatis / integrationis Vitest. |
| `npm run test:e2e` | Exsequitur probationes E2E Playwright; transit etiam nullo fasciculo probationis praesenti. |
| `npm run typecheck` | Exsequitur verificationem typi TypeScript pro partibus anteriori et Node. |
| `npm run lint` | Nunc aequivalet `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Data et Tergum

Data per defaltam sunt intra directorium propositi:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Commendatur ea una salvare cum tergum facis:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

Ad restituendum, repone hos fasciculos in eodem directorio propositi et incipe applicationem.

Importatio/exportatio ZIP intra-applicationem etiam providetur:

- Tergum integrum: includit chartulas, contextus, media, pittacia, dilecta, statum recognitionis, statum FSRS, diurna recognitionis, et configurationes usoris.
- Pura communicatio chartularum: non includit progressum recognitionis personalem, statum dilectorum, vel configurationes usoris.

Clavis API IA est configuratio localis sensitiva et non portabitur cum fasciculo exportato; eam oportet iterum implere post mutationem machinarum.

## Commendationes Fasciculorum Mediorum

| Typus | Formae Sustentatae | Magnitudo Commendata |
|------|----------|----------|
| Pellicula | `mp4` | Infra 300MB pro fasciculo |
| Sonus | `mp3` | Infra 50MB pro fasciculo |
| Imago | `jpg` / `png` / `webp` | Infra 10MB pro fasciculo |

## Configuratio Suggestionum IA

Pagina creationis chartularum suggestiones IA optionales sustinet. Oportet configurationes API compatibiles OpenAI addere in pagina configurationum:

- Nomen Proponendum
- URL Fundamentale
- Clavis API
- Exemplar

Nota:

- Creatio manualis chartularum et recognitio perfecte bene operantur sine IA configurata.
- Clavis API in base datorum locali reconditur et in interfacie usoris larvabitur.
- Clavis API in fasciculis exportatis non includetur.
- IA tantum adhibetur ad definitiones contextuales et notas usus suggerendas in creatione chartularum. Non est dictionarium insitum, nec chartulas automatice creat.

## Quaestiones Frequentes (FAQ)

### Portus occupatus est

Modifica `.env`:

```env
PORT=3108
```

Si portus partis anterioris `5173` occupatus est:

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci deficit apud better-sqlite3

Praefer adhibere Node.js 22 LTS. `better-sqlite3` est modulum nativum; si nullum fasciculum praecompilatum pro praesenti systemate et versione Node praesto est, compilationem localem tentabit in installatione.

Linux / WSL:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS:

```bash
xcode-select --install
```

Ambitus nativus Windows requirit ambitus aedificationis nativos Python et Visual Studio Build Tools / MSVC praesto. Si non es familiaris cum his instrumentis configurandis, commendatur WSL potius adhibere, vel manualiter ambitus deficientes primum installare et iterum tentare.

### Pagina aperitur, sed petitiones API deficiunt

Confirma partem posteriorem exsequi:

```text
http://localhost:3107/api/health
```

Responsum normale:

```json
{"ok":true}
```

### Volo mutare directorium installationis

Tantum move integrum directorium propositi. Si `.env` semitis relativis utitur, basis datorum et directorium onerum continue resolventur relate ad novum directorium. Si `.env` semitis absolutis utitur, ea synchrone renovari debent.

## Notae Evolutionis

Cumulus technicus huius propositi:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

Prima versio adhaeret principio primi localis, nullis dictionariis insitis, nullis conexionibus dictionarii, nullis nexibus pellicularum ad situs telae, et nullae synchronisationi. Praesens V2 tantum facultates suggestionis IA in creatione chartularum addit.

## Licentia

Hoc propositum Licentia MIT utitur. Vide [`LICENSE`](./LICENSE) pro singularibus.
