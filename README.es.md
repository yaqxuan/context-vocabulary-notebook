[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (cuaderno de vocabulario contextual)

Cuando encuentras una palabra nueva al ver videos, escuchar cursos o leer subtítulos, la app guarda no solo “la palabra”, sino también la frase original, el contexto, una captura, el fragmento de audio/video, notas y etiquetas.

Al repasar, ves la escena real donde encontraste la palabra, no un término aislado.

Te conviene si:

- Ves a menudo vídeos, cursos, películas, podcasts o materiales de escucha en idiomas extranjeros.
- Quieres una revisión espaciada similar a Anki, pero con tarjetas que conservan la frase original, capturas de pantalla y clips multimedia.
- Quieres que tus datos de aprendizaje estén en tu propio ordenador, sin registrar una cuenta en la nube solo para un cuaderno de vocabulario.
- Necesitas ayuda para reconocer frases de vídeos, audios o imágenes locales antes de pulirlas manualmente y convertirlas en tarjetas.

> Este proyecto es una aplicación web local. De forma predeterminada, los datos se guardan en una base de datos SQLite y en la carpeta `uploads/` de tu ordenador; no se requiere cuenta en la nube.

## Demo

![Ejemplo de creación de tarjetas en Context Vocabulary Notebook](./docs/demo/01-create-card-es.png)

## Qué puedes hacer

- Crea tarjetas alrededor de contexto real: palabra objetivo, frase original, significado contextual, notas y etiquetas.
- Guarda adjuntos multimedia locales: vídeo `mp4`, audio `mp3`, imágenes `jpg / png / webp`.
- Importa clips por lotes: añade varios clips de vídeo, audio o imagen a la vez, revisa los resultados de reconocimiento uno por uno y crea tarjetas.
- Usa asistentes locales opcionales de OCR/STT: configura ffmpeg, Tesseract y whisper.cpp para reconocer frases desde imágenes, fotogramas de vídeo o audio.
- Adjunta varios ejemplos de contexto al mismo significado de una palabra, útil para ver cómo aparece un significado en distintos materiales.
- Repasa con repetición espaciada FSRS, devolviendo cada palabra al contexto donde la encontraste.
- Busca, filtra por etiquetas, marca favoritos, consulta estadísticas e importa/exporta copias de seguridad ZIP.
- Sugerencias de IA opcionales: tras configurar una API OpenAI-compatible, recibe ayuda con significados contextuales, notas de uso, traducción de frases completas, lematización y corrección ortográfica.

## Ubicación de datos y aviso de espacio en disco

Elige primero el directorio de instalación. De forma predeterminada, la aplicación guarda la base de datos, los archivos subidos y la configuración en el directorio desde el que se ejecuta.

Datos locales predeterminados:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Nota: después de subir vídeos, audios y capturas de pantalla, `uploads/` puede seguir creciendo. Los modelos Whisper también pueden ocupar desde cientos de MB hasta varios GB.

Evita ejecutarla en estas ubicaciones:

- `/usr/local`, `/opt` u otros directorios que normalmente requieren permisos `sudo` o root.
- `C:\Program Files` u otros directorios protegidos por el sistema.
- Carpetas temporales, cachés de descargas o ubicaciones que el sistema o las herramientas de limpieza puedan borrar automáticamente.
- Ubicaciones con poco espacio libre, reglas de sincronización poco claras o comportamiento de limpieza/cuota de unidades en la nube.

Prefiere un lugar que puedas conservar a largo plazo, por ejemplo:

```text
D:\study\context-vocabulary-notebook
E:\study\context
$HOME/context-vocabulary-notebook
```

## Instalación en un paso

Entra en un directorio vacío donde quieras guardar los archivos del proyecto y ejecuta el comando de tu sistema. El script instala el proyecto en el directorio actual; si el directorio ya contiene este proyecto, lo actualiza automáticamente.

| Sistema | Comando |
|------|------|
| Linux / macOS / WSL | Consulta el comando de Linux / macOS / WSL más abajo |
| Windows PowerShell | Consulta el comando de Windows PowerShell más abajo |

### Linux / macOS / WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Después de la instalación, inícialo con:

```bash
npm run dev
```

Ábrelo en tu navegador:

```text
http://localhost:5173
```

Comprobación de salud del backend:

```text
http://localhost:3107/api/health
```

## Actualizar a la última versión

Entra en el directorio donde instalaste el proyecto y ejecuta:

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

También puedes volver a ejecutar el comando de instalación en un clic. Si el script detecta que el directorio actual ya es este proyecto, actualiza, instala dependencias y compila automáticamente.

## OCR / reconocimiento de voz local (opcional)

El cuaderno principal no requiere OCR/STT. Primero puedes crear tarjetas y repasar manualmente; configura estas herramientas solo cuando necesites reconocer automáticamente frases originales de vídeos, audios o imágenes.

El reconocimiento local usa:

- ffmpeg: extrae audio de vídeos.
- Tesseract: reconoce texto en imágenes o fotogramas de vídeo.
- whisper.cpp + modelo Whisper: reconoce voz en audio o vídeo.

### Configurar el reconocimiento local automáticamente (primer intento recomendado)

Ejecuta esto en el directorio del proyecto:

Linux / macOS / WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Para reconocer subtítulos en chino e inglés, cambia el idioma a:

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Cuando termine el script, haz clic en **I installed it, check again** en la tarjeta de reconocimiento local de la página de ajustes de la aplicación. Las versiones recientes recargan `.env`, así que normalmente no necesitas reiniciar manualmente el backend.

### Modelos y uso de disco

Los modelos Whisper son grandes y el tiempo de descarga depende de tu red:

- `tiny` / `base`: pequeños y rápidos, buenos para probar, con menor precisión.
- `small` / `medium`: mejor precisión, con mayor uso de disco y CPU.
- `large`: muy grande y puede ser lento en ordenadores normales; no se recomienda como opción predeterminada.

El instalador de reconocimiento para Windows descarga `ggml-small.bin` de forma predeterminada, de varios cientos de MB aproximadamente.

### Configurar el reconocimiento local manualmente

Si la configuración en un clic falla, o si quieres gestionar tú mismo las rutas de las herramientas, instala las herramientas manualmente y escribe estos valores en `.env`:

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

Ejemplo de ruta de Windows:

```env
CVN_FFMPEG_PATH=E:\study\context\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=E:\study\context\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=E:\study\context\models\ggml-small.bin
CVN_TESSERACT_PATH=E:\study\context\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```


## Opciones avanzadas de instalación

### Especificar directorio de instalación

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

### Permitir que el instalador principal intente añadir herramientas opcionales

No son necesarios para una primera instalación normal. Úsalos solo cuando hagan falta.

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

Fuente del instalador:

- Linux / macOS / WSL: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh
- Windows PowerShell: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

## Instalación manual

Si los scripts de un clic no pueden preparar el entorno, instala primero manualmente Node.js 22 LTS, npm, Git y cualquier herramienta nativa de compilación necesaria; después ejecuta:

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

Ábrelo en tu navegador:

```text
http://localhost:5173
```

## Preguntas frecuentes

### ¿Qué hago si falla la instalación en un paso?

- If the message says a command is missing, close and reopen the terminal, then run the installer again.
- Linux / WSL: if `apt-get update` reports Docker, Chromium, Snap, GPG key, or similar errors, it is usually an existing apt-source or unfinished package-configuration issue, not because this project depends on those packages. Fix/disable the affected apt source first, or manually install Git, Node.js 22 LTS, and npm before retrying.
- macOS: if the Xcode Command Line Tools prompt appears, click Install, then rerun the installer after it completes.
- Windows: if `npm ci` fails at `better-sqlite3`, you usually need Python and Visual Studio Build Tools / MSVC; if you are not familiar with these tools, WSL is recommended.

### La página se abre, pero el reconocimiento local sigue sin configurarse

First make sure the recognition installer has completed and the corresponding `CVN_*` paths exist in `.env`. Then click **I installed it, check again** on the settings page.

If it still does not work:

- Make sure the app was started from the same project directory.
- Make sure no old `3107` backend process is occupying the port.
- Run `npm run dev` again and refresh the page.

### El puerto ya está en uso

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

### El clip no tiene subtítulos visibles, así que no se reconoce la oración original

Si el fotograma del video no tiene subtítulos, o si los subtítulos son muy pequeños o borrosos, OCR puede no encontrar una frase; en ese caso se necesita reconocimiento de voz. Confirma que ffmpeg, whisper.cpp y `CVN_WHISPER_CPP_MODEL` estén disponibles. Si el audio tampoco contiene habla clara, introduce la frase original manualmente.

Si aparece `Audio extraction failed`, normalmente ffmpeg no está disponible, la ruta es incorrecta o ffmpeg no puede leer el archivo de video/audio de origen.

### Faltan datos de idioma de Tesseract

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

### La ruta del modelo Whisper no está configurada

`CVN_WHISPER_CPP_MODEL` no tiene un modelo predeterminado. Descarga un modelo ggml compatible con whisper.cpp y escribe su ruta absoluta en `.env`.

## Datos y copia de seguridad

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

## Recomendaciones de archivos multimedia

| Type | Supported formats | Recommended size |
|------|----------|----------|
| Video | `mp4` | within 300MB per file |
| Audio | `mp3` | within 50MB per file |
| Image | `jpg` / `png` / `webp` | within 10MB per file |

## Configuración de sugerencias de IA

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

## Requisitos

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

### Recomendación sobre WSL / Windows nativo

- WSL is usually the most stable: Node, Git, ffmpeg, Tesseract, and native build tools are closer to Linux paths.
- Native Windows PowerShell is supported: the script reuses existing Git / Node.js / npm and tries `winget` only when something is missing.
- If native Windows `npm ci` fails at `better-sqlite3`, install Python and Visual Studio Build Tools / MSVC as prompted, or use WSL.

## Variables de entorno

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | No requerido | `3107` | Puerto del servicio backend Express. El servidor de desarrollo Vite redirige `/api` a este puerto. |
| `DATABASE_PATH` | No requerido | `./data/context-vocabulary-notebook.sqlite` | Ruta de la base de datos SQLite. Las rutas relativas se resuelven desde la raíz del proyecto. |
| `UPLOADS_DIR` | No requerido | `./uploads` | Directorio para archivos multimedia subidos. Las rutas relativas se resuelven desde la raíz del proyecto. |
| `CVN_FFMPEG_PATH` | No requerido | `ffmpeg` | Ruta al ejecutable de ffmpeg; en instalaciones de herramientas nativas de Windows, usa una ruta absoluta si hace falta. |
| `CVN_STT_PROVIDER` | No requerido | `whisper.cpp` | Proveedor local de reconocimiento de voz; puede ser `whisper.cpp` o `disabled`. |
| `CVN_WHISPER_CPP_PATH` | No requerido | `whisper-cli` | Ruta al ejecutable de whisper.cpp; si tu sistema solo tiene el antiguo `main`, usa `main` o una ruta absoluta. |
| `CVN_WHISPER_CPP_MODEL` | Requerido para STT local | Vacío | Ruta del archivo de modelo Whisper; el instalador no descarga un modelo automáticamente. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | No requerido | `120000` | Tiempo límite para una ejecución de reconocimiento con whisper.cpp. |
| `CVN_OCR_PROVIDER` | No requerido | `tesseract` | Proveedor local de OCR; puede ser `tesseract` o `disabled`. |
| `CVN_TESSERACT_PATH` | No requerido | `tesseract` | Ruta al ejecutable de Tesseract. |
| `CVN_TESSERACT_LANG` | No requerido | Se elige automáticamente según el idioma objetivo | Códigos de idioma de Tesseract, como `eng`, `chi_sim`, `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | No requerido | `30000` | Tiempo límite para una ejecución de OCR con Tesseract. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | No requerido | `0` | Permite transcripción en la nube como alternativa cuando falla el reconocimiento local de clips; desactivado por defecto. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | No requerido | Decidido por el servidor | Tiempo límite para comprobaciones de disponibilidad del reconocimiento local. |
<!-- /AUTO-GENERATED:ENV -->

## Comandos comunes

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

## Notas de desarrollo

Project stack:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

La versión 1 sigue siendo local-first: sin diccionario integrado, sin integración con diccionarios, sin enlaces a videos de sitios web y sin sincronización. La V2 actual añade sugerencias de AI durante la creación de tarjetas y ayudantes locales de reconocimiento de clips.

## Notas antes de instalar y descargo

Hasta donde sabe actualmente el autor, el código fuente propio de este proyecto no contiene código malicioso. El instalador comprueba el entorno local y, en las plataformas compatibles, intenta instalar dependencias faltantes como Git, Node.js y npm; cuando faltan herramientas de compilación nativas, muestra orientación, y algunas plataformas requieren instalación manual.

La instalación descarga software y dependencias de terceros mediante los gestores de paquetes del sistema y npm. La instalación y el uso aún pueden verse afectados por permisos del sistema, condiciones de red, disponibilidad del gestor de paquetes, software antivirus, políticas de dispositivos empresariales, espacio en disco, cadenas de suministro de dependencias de terceros, resultados de compilación de módulos nativos de Node y factores similares. Los problemas y consecuencias causados por ejecutar instaladores, instalar dependencias, modificar el entorno del sistema y subir/guardar archivos locales son responsabilidad del usuario.

Si el script no puede preparar el entorno automáticamente, muestra las herramientas faltantes y los siguientes pasos sugeridos; después debes instalarlas manualmente para tu sistema y volver a intentarlo.

## Licencia

Este proyecto usa la MIT License. Consulta [`LICENSE`](./LICENSE).
