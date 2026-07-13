[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (commentarius vocabulorum contextualium)

Cum novum verbum in pelliculis, lectionibus auditis, aut titulis subtitulatis inveneris, haec applicatio non solum “ipsum verbum” servat, sed etiam sententiam originalem, contextum, imaginem captam, segmentum audio/video, notas et pittacia.

In repetitione non vocabulum solum vides, sed ipsum locum ubi verbum primum invenisti.

Tibi convenit si:

- Saepe videos, cursus, pelliculas, podcasts vel materias audiendi linguis externis spectas aut audis.
- Vis repetitionem intervallis distributam sicut Anki, sed chartis quae sententiam primam, screenshots et segmenta mediorum servant.
- Vis data studii in computatro tuo servare, sine ratione nubis creanda solum pro libello vocabulorum.
- Opus habes auxilio ad sententias ex videos, audio vel imaginibus localibus agnoscendas antequam eas manu in chartas expolias.

> Hoc projectum est app interretialis localis. Ex more, data in basi SQLite et in fasciculo `uploads/` in computatro tuo servantur; ratio nubis non requiritur.

## Demo

![Exemplum chartae creandae in Context Vocabulary Notebook](./docs/demo/01-create-card-la.png)

## Quid hoc instrumento facere possis

- Crea chartas circa contextum verum: verbum destinatum, sententiam primam, significationem contextualem, notas et tags.
- Serva adiuncta mediorum localia: video `mp4`, audio `mp3`, imagines `jpg / png / webp`.
- Importa segmenta gregatim: plura segmenta video, audio vel imaginum simul importa, eventus agnitionis singillatim inspice et chartas crea.
- Utere adiutoribus localibus OCR/STT optionalibus: configura ffmpeg, Tesseract et whisper.cpp ut sententias ex imaginibus, tabulis video vel audio agnoscas.
- Adiunge plura exempla contextus eidem significationi verbi, utile ut videas quomodo una significatio in diversis materiis appareat.
- Repete cum repetitione intervallata FSRS, quodque verbum ad contextum in quo inventum est reducens.
- Quaere, per tags cola, favorita nota, statistica vide, et subsidia ZIP importa/exporta.
- Consilia AI optionalia: post API OpenAI-compatible configuratam, auxilium accipe de significationibus contextualibus, notis usus, translatione sententiae plenae, lemmatizatione et orthographiae probatione.

## Locus datorum et monitum de spatio disci

Elige primum directorium institutionis. Ex more, app basim datorum, fasciculos impositos et configurationem sub directorio unde currit servat.

Data localia praedefinita:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Nota: post videos, audio et screenshots impositos, `uploads/` crescere pergere potest. Exemplaria Whisper quoque centenas MB usque ad plures GB occupare possunt.

Vita hos locos:

- `/usr/local`, `/opt` vel alia directoria quae plerumque permissiones `sudo` vel root requirunt.
- `C:\Program Files` vel alia directoria a systemate protecta.
- Fasciculi temporarii, receptacula download, vel loci quos systema aut instrumenta purgationis automatice delere possunt.
- Loci cum parvo spatio libero, regulis synchronizationis incertis, vel moribus purgationis/quotae in disco nubis.

Praefer locum quem diu servare potes, exempli gratia:

```text
D:\study\context-vocabulary-notebook
E:\study\context
$HOME/context-vocabulary-notebook
```

## Institutio uno mandato

Intra directorium vacuum ubi fasciculi projecti manere debent, deinde mandatum systemati tuo aptum exsequere. Scriptum projectum in directorio praesenti instituit; si directorium hoc projectum iam continet, id automatice renovat.

| Systema | Mandatum |
|------|------|
| Linux / macOS / WSL | Vide mandatum Linux / macOS / WSL infra |
| Windows PowerShell | Vide mandatum Windows PowerShell infra |

### Linux / macOS / WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Post institutionem, hoc modo incipe:

```bash
npm run dev
```

Aperi in navigatro:

```text
http://localhost:5173
```

Probatio salutis backend:

```text
http://localhost:3107/api/health
```

## Ad novissimam versionem renovare

Intra directorium ubi projectum instituisti, deinde exsequere:

Linux / macOS / WSL / Git Bash:

```bash
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows PowerShell:

```powershell
git pull --ff-only
npm ci
npm run build
npm run dev
```

Potes etiam mandatum institutionis uno clicco iterum exsequi. Si scriptum agnoscit directorium praesens iam hoc projectum esse, renovat, dependentias instituit et automatice aedificat.

## OCR / agnitio vocis localis (libitum)

Libellus principalis OCR/STT non requirit. Primum chartas creare et manu repetere potes; haec instrumenta configura tantum cum sententias primas ex videos, audio vel imaginibus automatice agnoscere debes.

Agnitio localis utitur:

- ffmpeg: audio ex videos extrahit.
- Tesseract: textum in imaginibus vel tabulis video agnoscit.
- whisper.cpp + exemplar Whisper: sermonem in audio vel video agnoscit.

### Agnitionem localem automatice configurare (primum suadetur)

Hoc in directorio projecti exsequere:

Linux / macOS / WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Ut subscripta Sinica et Anglica agnoscas, linguam muta in:

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Postquam scriptum finitum est, preme **I installed it, check again** in charta agnitionis localis paginae optionum app. Versiones recentiores `.env` denuo onerant, itaque backend plerumque manu restituere non debes.

### Exemplaria et usus disci

Exemplaria Whisper magna sunt, et tempus download a rete tuo pendet:

- `tiny` / `base`: parva et celeria, bona ad experiendum, cum minore accuratione.
- `small` / `medium`: accuratio melior, cum maiore usu disci et CPU.
- `large`: valde magnum et in computatris communibus fortasse tardum; non commendatur ut electio praedefinita.

Institutor agnitionis Windows ex more `ggml-small.bin` deponit, circiter plures centenos MB.

### Agnitionem localem manu configurare

Si configuratio uno clicco deficit, aut si vias instrumentorum ipse administrare vis, instrumenta manu institue et hos valores in `.env` scribe:

```env
CVN_FFMPEG_PATH=/absolute/path/to/ffmpeg

CVN_STT_PROVIDER=whisper.cpp
CVN_WHISPER_CPP_PATH=/absolute/path/to/whisper-cli
CVN_WHISPER_CPP_MODEL=/absolute/path/to/ggml-small.bin
CVN_WHISPER_CPP_TIMEOUT_MS=120000

CVN_OCR_PROVIDER=tesseract
CVN_TESSERACT_PATH=/absolute/path/to/tesseract
CVN_TESSERACT_LANG=eng
CVN_TESSERACT_TIMEOUT_MS=30000
```

Exemplum viae Windows:

```env
CVN_FFMPEG_PATH=E:\study\context\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=E:\study\context\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=E:\study\context\models\ggml-small.bin
CVN_TESSERACT_PATH=E:\study\context\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```


## Optiones institutionis provectae

### Directorium institutionis definire

Linux / macOS / WSL:

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### Institutorem principalem instrumenta libita addere sinere

Ad primam institutionem ordinariam non requiruntur. Utere eis tantum cum opus est.

Linux / macOS / WSL:

```bash
export CVN_INSTALL_FFMPEG=1
export CVN_INSTALL_TESSERACT=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
$env:CVN_INSTALL_TESSERACT = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Fons institutoris:

- Linux / macOS / WSL: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh
- Windows PowerShell: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

## Institutio manualis

Si scripta uno clicco ambitum parare non possunt, primum Node.js 22 LTS, npm, Git et instrumenta nativa aedificationis necessaria manu institue, deinde exsequere:

Linux / macOS / WSL / Git Bash:

```bash
cd "$HOME"
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows PowerShell:

```powershell
Set-Location $HOME
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Aperi in navigatro:

```text
http://localhost:5173
```

## Quaestiones frequentes

### Quid si institutio uno mandato deficit?

- If the message says a command is missing, close and reopen the terminal, then run the installer again.
- Linux / WSL: if `apt-get update` reports Docker, Chromium, Snap, GPG key, or similar errors, it is usually an existing apt-source or unfinished package-configuration issue, not because this project depends on those packages. Fix/disable the affected apt source first, or manually install Git, Node.js 22 LTS, and npm before retrying.
- macOS: if the Xcode Command Line Tools prompt appears, click Install, then rerun the installer after it completes.
- Windows: if `npm ci` fails at `better-sqlite3`, you usually need Python and Visual Studio Build Tools / MSVC; if you are not familiar with these tools, WSL is recommended.

### Pagina aperitur, sed agnitio localis adhuc non configurata dicitur

First make sure the recognition installer has completed and the corresponding `CVN_*` paths exist in `.env`. Then click **I installed it, check again** on the settings page.

If it still does not work:

- Make sure the app was started from the same project directory.
- Make sure no old `3107` backend process is occupying the port.
- Run `npm run dev` again and refresh the page.

### Portus iam in usu est

Change the backend port:

```env
PORT=3108
```

Linux / macOS / WSL / Git Bash change the frontend port:

```bash
CLIENT_PORT=5174 npm run dev
```

Windows PowerShell change the frontend port:

```powershell
$env:CLIENT_PORT = "5174"
npm run dev
```

### Segmentum subtitulos visibiles non habet, ergo sententia originalis non agnoscitur

Si imago videi titulos non habet, aut tituli nimis parvi vel confusi sunt, OCR sententiam invenire non potest; tum agnitio vocis opus est. Confirma ffmpeg, whisper.cpp et `CVN_WHISPER_CPP_MODEL` praesto esse. Si etiam sonus vocem claram non habet, sententiam originalem manu inscribe.

Si `Audio extraction failed` apparet, plerumque ffmpeg deest, semita falsa est, aut fasciculus video/audio a ffmpeg legi non potest.

### Data linguae Tesseract desunt

If OCR reports missing language data, Tesseract was found but the matching traineddata is not installed. Common language codes:

- English: `eng`
- Simplified Chinese: `chi_sim`
- Japanese: `jpn`
- Korean: `kor`
- French: `fra`
- German: `deu`
- Spanish: `spa`
- Russian: `rus`

For multiple languages:

```env
CVN_TESSERACT_LANG=eng+chi_sim
```

### Semita exemplaris Whisper non configurata est

Applicatio exemplar Whisper inclusum non habet. Institutor agnitionis localis `ggml-small.bin` deponit et configurat; in configuratione manuali tantum exemplar ggml a whisper.cpp sustentatum deponendum est atque via absoluta in `.env` scribenda.

## Data et exemplum securitatis

By default, all data is under the project directory:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

For backup, save them together:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

To restore, put these files back into the same project directory and start the app.

The app also provides ZIP import/export:

- Full backup: includes cards, contexts, media, tags, favorites, review state, FSRS state, review logs, and user settings.
- Card-only sharing: excludes personal review progress, favorite state, and user settings.

AI API Keys are local sensitive configuration and are not included in exports; you need to enter them again on another device.

## Consilia de fasciculis mediaticis

| Type | Supported formats | Recommended size |
|------|----------|----------|
| Video | `mp4` | within 300MB per file |
| Audio | `mp3` | within 50MB per file |
| Image | `jpg` / `png` / `webp` | within 10MB per file |

## Configuratio suggestionum AI

The card creation page supports optional AI suggestions. Add an OpenAI-compatible API configuration on the settings page:

- Display name
- Base URL
- API Key
- Model

Notes:

- Without AI configuration, manual card creation and review still work normally.
- The API Key is stored in the local database and masked in the UI.
- The API Key is not included in export files.
- AI can suggest contextual meanings, usage notes, full-sentence translations, lemmatization, and spell checks during card creation.
- OpenAI-compatible text models such as DeepSeek do not perform local OCR/STT; image text recognition depends on Tesseract, and speech recognition depends on whisper.cpp.

## Requisita

| Environment | Requirement | Notes |
|------|------|------|
| Node.js | Node.js 22 LTS recommended | Frontend build, development servers, and backend service all depend on Node.js. The installer tries to provide it. |
| npm | Installed with Node.js | The repository includes `package-lock.json`; dependencies are installed with `npm ci`. |
| Git | Required when cloning from GitHub | The installer checks for it and tries to provide it. |
| Browser | Chrome / Edge / Firefox / Safari or another modern browser | The app is used through a local web page. |
| C/C++ build tools | May be required | `better-sqlite3` is a native module; if no prebuilt package is available, `npm ci` tries to compile it locally. |
| ffmpeg | Optional | Required for video/audio clip analysis. |
| Tesseract OCR | Optional | Required for OCR on images or video frames. |
| whisper.cpp + Whisper model | Optional | Required for speech recognition on audio/video. |

### Commendatio WSL / Windows nativi

- WSL is usually the most stable: Node, Git, ffmpeg, Tesseract, and native build tools are closer to Linux paths.
- Native Windows PowerShell is supported: the script reuses existing Git / Node.js / npm and tries `winget` only when something is missing.
- If native Windows `npm ci` fails at `better-sqlite3`, install Python and Visual Studio Build Tools / MSVC as prompted, or use WSL.

## Variabiles ambitus

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | Non | `3107` | Porta servitii backend Express. Minister evolutionis Vite `/api` ad hanc portam transmittit. |
| `DATABASE_PATH` | Non | `./data/context-vocabulary-notebook.sqlite` | Via basis datorum SQLite. Viae relativae a radice propositi resolvuntur. |
| `UPLOADS_DIR` | Non | `./uploads` | Directorium fasciculorum mediorum impositorum. Viae relativae a radice propositi resolvuntur. |
| `CVN_FFMPEG_PATH` | Non | `ffmpeg` | Via ad exsecutabile ffmpeg; in institutionibus instrumentorum nativorum Windows, viam absolutam adhibe si opus est. |
| `CVN_STT_PROVIDER` | Non | `whisper.cpp` | Praebitor localis agnitionis vocis; potest esse `whisper.cpp` aut `disabled`. |
| `CVN_WHISPER_CPP_PATH` | Non | `whisper-cli` | Via ad exsecutabile whisper.cpp; si systema tuum solum vetus `main` habet, pone `main` aut viam absolutam. |
| `CVN_WHISPER_CPP_MODEL` | Necessarium pro STT locali | Vacuum | Via exemplaris Whisper; institutor agnitionis localis exemplar praedefinitum deponit, dum configuratio manualis hanc viam requirit. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | Non | `120000` | Tempus maximum unius cursus agnitionis whisper.cpp. |
| `CVN_OCR_PROVIDER` | Non | `tesseract` | Praebitor localis OCR; potest esse `tesseract` aut `disabled`. |
| `CVN_TESSERACT_PATH` | Non | `tesseract` | Via ad exsecutabile Tesseract. |
| `CVN_TESSERACT_LANG` | Non | Automate secundum linguam destinatam eligitur | Codices linguarum Tesseract, ut `eng`, `chi_sim`, `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | Non | `30000` | Tempus maximum unius cursus OCR Tesseract. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | Non | `0` | Utrum transcriptio nubis tamquam subsidium liceat cum agnitio localis segmenti deficit; per defaltam inhibitum. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | Non | A servo decernitur | Tempus maximum probationum promptitudinis agnitionis localis. |
<!-- /AUTO-GENERATED:ENV -->

## Mandata usitata

<!-- AUTO-GENERATED:SCRIPTS -->
| Command | Description |
|------|------|
| `npm run dev` | Start both the backend development server and the Vite frontend development server. |
| `npm run dev:client` | Start only the Vite frontend development server, listening on `0.0.0.0:5173` by default. |
| `npm run dev:server` | Start only the backend Express development server, listening on `localhost:3107` by default. |
| `npm run build` | Run type checks, then build the frontend and backend. |
| `npm test` | Run Vitest unit / integration tests. |
| `npm run test:e2e` | Run Playwright E2E tests; passes even when there are no test files. |
| `npm run typecheck` | Run TypeScript type checks for the frontend and Node side. |
| `npm run lint` | Currently equivalent to `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Notae evolutionis

Project stack:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

Versio 1 localis-prima manet: nullum lexicon inclusum, nulla integratio lexici, nulli nexus ad videos paginarum interretialium, neque synchronisatio. V2 hodierna addit suggestiones AI dum chartae creantur et auxilia localia ad fragmenta recognoscenda.

## Monita ante institutionem et recusatio responsabilitatis

Quantum auctor nunc scit, codex fontis ipsius huius propositi nullum codicem malitiosum continet. Installer ambitum localem inspicit et, in suggestis sustentatis, conatur dependentias absentes sicut Git, Node.js et npm instituere; cum instrumenta aedificationis nativa desunt, consilia imprimit, et quaedam suggesta institutionem manualem requirunt.

Institutio programmata et dependentias tertiarum partium per administratores fasciculorum systematis et npm demittit. Institutio et usus tamen affici possunt permissionibus systematis, condicionibus retis, disponibilitate administratoris fasciculorum, programmate antivirali, consiliis machinarum corporatarum, spatio disci, catenis commeatus dependentiarum tertiarum partium, eventibus compilationis modulorum nativorum Node, et similibus rebus. Problemata et consequentiae ex currendis installeribus, instituendis dependentiis, mutando ambitu systematis, atque onerandis/servandis fasciculis localibus orta responsabilitas usoris sunt.

Si scriptum ambitum automatice parare non potest, instrumenta absentia et proximos gradus commendatos imprimit; deinde ea pro tuo systemate manualiter instituere debes et iterum conari.

## Licentia

Hoc propositum MIT License utitur. Vide [`LICENSE`](./LICENSE).
