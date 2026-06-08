[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

Un cuaderno de vocabulario local-first para aprender palabras desde videos, audio, subtítulos y cursos reales.

En lugar de guardar palabras aisladas, conserva la oración, el significado contextual, la captura de pantalla, el clip de video/audio, las notas y las etiquetas del momento en que encontraste la palabra. Al repasar, vuelves a ver el contexto real, no solo una palabra y una definición.

Ideal para:

- Registrar palabras nuevas mientras ves videos, cursos, películas o materiales de escucha en otro idioma.
- Estudiantes que quieren repetición espaciada tipo Anki, pero con más contexto en cada tarjeta.
- Personas que prefieren datos locales y no quieren una cuenta en la nube para su cuaderno de vocabulario.

> El proyecto actual es una aplicación Web local. Los datos se guardan de forma predeterminada en una base de datos SQLite y en la carpeta `uploads/` de su computadora. No se requiere una cuenta en la nube.

## Demo

![Demo de creación de tarjetas de Context Vocabulary Notebook](./docs/demo/01-create-card.png)

## Características Principales

- Crea tarjetas en torno a contextos reales: palabra objetivo, definición contextual, oración original, notas, etiquetas.
- Guarda archivos adjuntos multimedia locales: video `mp4`, audio `mp3`, imagen `jpg / png / webp`.
- Asocia una entrada de significado con múltiples instancias de contexto, útil para registrar el mismo significado en diferentes materiales.
- Repasa con repetición espaciada FSRS y devuelve cada palabra al contexto donde la encontraste.
- Lista de entradas de significado, búsqueda, filtrado por etiquetas, favoritos, estadísticas.
- Importación y exportación ZIP para copia de seguridad personal completa y uso compartido solo de tarjetas.
- Sugerencias de IA en la página de creación de tarjetas V2: configura una API compatible con OpenAI para definiciones contextuales y notas de uso; la API Key se guarda solo localmente.

## Advertencia de Ubicación de Datos y Espacio en Disco

La aplicación guarda los datos en el directorio de ejecución de forma predeterminada. Después de cargar videos, capturas de pantalla y audio, el directorio `uploads/` puede crecer continuamente y ocupar un espacio en disco significativo.

Datos locales predeterminados:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

No se recomienda ejecutar la aplicación en estas ubicaciones:

- Directorios que normalmente requieren `sudo` o permisos de root, como `/usr/local`, `/opt`.
- Directorios protegidos por el sistema como `C:\Program Files`.
- Directorios temporales, directorios de caché de descarga o ubicaciones que el sistema o las herramientas de limpieza eliminarán automáticamente.
- Ubicaciones con muy poco espacio, reglas de sincronización poco claras o donde los archivos podrían ser limpiados automáticamente o limitados en cuota por las unidades en la nube.

## Entorno de Ejecución

| Entorno | Requisito | Descripción |
|------|------|------|
| Node.js | Se recomienda Node.js 22 LTS; al menos una versión de Node que cumpla con los requisitos actuales de Vite | La compilación del frontend, el servidor de desarrollo y el servidor del backend dependen de Node.js. El script de instalación intentará cumplir con esto. |
| npm | Instalado junto con Node.js | El repositorio contiene `package-lock.json`, use `npm ci` para instalar dependencias. |
| Git | Requerido para clonar el repositorio de GitHub | El script de instalación comprobará e intentará cumplir con esto. |
| Navegador | Navegadores modernos como Chrome / Edge / Firefox / Safari | La aplicación se utiliza a través de páginas web locales. |
| Herramientas de Compilación C/C++ | Pueden ser requeridas | `better-sqlite3` es un módulo nativo; si no hay un paquete precompilado disponible para el sistema actual y la versión de Node, `npm ci` intentará la compilación local. |

El script de instalación primero comprobará el entorno existente en la máquina local. En Linux / WSL, solo intentará cumplir con las dependencias a través de `apt-get` si faltan Git o Node.js/npm; si se cumplen los entornos básicos, omitirá `apt-get` para evitar desencadenar problemas irrelevantes con fuentes de software de terceros en el sistema. El script de macOS intentará usar Homebrew cuando falten dependencias. El script nativo de Windows intentará usar `winget` cuando falten dependencias. Si estos administradores de paquetes no están disponibles, o el usuario actual no tiene permisos de instalación, debe instalar manualmente los entornos faltantes y volver a intentarlo.

## Notas Previas a la Instalación y Descargo de Responsabilidad

Según el conocimiento actual del autor, el código fuente propio de este proyecto no contiene ningún código malicioso. El script de instalación comprobará el entorno local e intentará instalar las dependencias faltantes, como Git, Node.js, npm y herramientas de compilación nativas en las plataformas compatibles.

La instalación del proyecto obtendrá software de terceros y dependencias a través de los administradores de paquetes del sistema y npm. El proceso de instalación y uso aún puede verse afectado por factores como permisos del sistema, estado de la red, disponibilidad del administrador de paquetes, software antivirus, políticas de dispositivos corporativos, espacio en disco, cadenas de suministro de dependencias de terceros y resultados de la compilación de módulos nativos de Node. Los usuarios son los únicos responsables de cualquier problema y consecuencia que surja de la ejecución del script de instalación, la instalación de dependencias, la modificación del entorno del sistema y la carga y almacenamiento de archivos locales.

Si el script no puede cumplir automáticamente con el entorno, mostrará las herramientas faltantes y los métodos de manejo sugeridos; en este punto, los usuarios deben instalarlos manualmente de acuerdo con sus propios sistemas antes de volver a intentarlo.

## Instalación con un Clic

### Linux / macOS / WSL

Copie y ejecute el siguiente comando. El script instalará el proyecto en el directorio actual:

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

El script comprobará automáticamente las dependencias como Git, Node.js/npm; las dependencias instaladas se reutilizarán directamente. Para Linux / WSL, si se cumplen las dependencias básicas, omitirá `apt-get`.

Para ver primero el contenido del script, visite:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

Uso avanzado: Especificar el directorio de instalación

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

Primero, ingrese a un directorio vacío donde desea instalar los archivos del proyecto, luego copie y ejecute el siguiente comando. El script instalará los archivos del proyecto directamente en el directorio actual sin crear otro directorio anidado:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

El script comprobará automáticamente las dependencias como Git, Node.js/npm; las dependencias instaladas se reutilizarán directamente.

Para ver primero el contenido del script, visite:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

Uso avanzado: Especificar el directorio de instalación

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### Solución de Problemas

- Si dice que el comando no existe, cierre la terminal, vuelva a abrirla y ejecute el comando de instalación nuevamente.
- Para Linux / WSL, si `apt-get update` informa errores como Docker, Chromium, Snap, claves GPG, etc., generalmente se debe a fuentes apt existentes o configuraciones de paquetes incompletas en el sistema, no porque este proyecto dependa de estos software. Primero puede reparar/deshabilitar las fuentes apt correspondientes, o instalar manualmente Git, Node.js 20+ y npm, luego volver a intentarlo.
- Para macOS, si aparece la ventana de instalación de Xcode Command Line Tools, haga clic en "Instalar", y después de que se complete, vuelva a ejecutar el comando de instalación.
- Para Windows, si le indica que es necesario instalar un entorno de compilación, continúe según lo indicado; este es un entorno que puede ser necesario durante la compilación de algunas dependencias.

## Actualizar a la Última Versión

Si ya lo ha instalado, ingrese al directorio del proyecto y ejecute:

Linux / macOS / WSL / Git Bash:

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

PowerShell nativo de Windows:

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

También puede volver a ejecutar el comando de instalación con un clic. Cuando el script encuentre un repositorio de Git existente en el directorio de instalación, ejecutará automáticamente `git pull --ff-only`, `npm ci` y `npm run build`.

Si vuelve a ejecutar el comando de instalación con un clic dentro del directorio del proyecto, el script actualizará el directorio del proyecto actual y no creará otro directorio anidado con el mismo nombre. Si se ejecuta fuera del proyecto, ingrese primero a un directorio vacío o establezca explícitamente el mismo `CVN_HOME`; el script no mezclará los archivos del proyecto en un directorio regular no vacío.

## Instalación Manual

Si el script de un clic no puede cumplir con el entorno, primero puede instalar manualmente Node.js 22 LTS, npm, Git y las herramientas de compilación nativas potencialmente necesarias, luego ejecute los siguientes comandos.

Linux / macOS / WSL / Git Bash:

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

PowerShell nativo de Windows:

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Abrir en el navegador:

```text
http://localhost:5173
```

Dirección predeterminada del backend:

```text
http://localhost:3107
```

## Variables de Entorno

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
| Variable | Requerido | Predeterminado | Descripción |
|------|------|--------|------|
| `PORT` | No | `3107` | Puerto del servidor Express del backend. El servidor de desarrollo de Vite redirige `/api` a este puerto. |
| `DATABASE_PATH` | No | `./data/context-vocabulary-notebook.sqlite` | Ruta de la base de datos SQLite. Las rutas relativas se resuelven contra la raíz del proyecto. |
| `UPLOADS_DIR` | No | `./uploads` | Directorio donde se guardan los archivos multimedia subidos. Las rutas relativas se resuelven contra la raíz del proyecto. |
<!-- /AUTO-GENERATED:ENV -->

Para cambiar el puerto del frontend durante el desarrollo, puede configurar `CLIENT_PORT` al ejecutar el comando, el valor predeterminado es `5173`. Esta variable no está en `.env.example` y generalmente no necesita ser configurada.

## Comandos Comunes

<!-- AUTO-GENERATED:SCRIPTS -->
| Comando | Descripción |
|------|------|
| `npm run dev` | Inicia tanto el servidor de desarrollo del backend como el servidor de desarrollo del frontend de Vite. |
| `npm run dev:client` | Inicia solo el servidor de desarrollo del frontend de Vite, escucha en `0.0.0.0:5173` de forma predeterminada. |
| `npm run dev:server` | Inicia solo el servidor de desarrollo Express del backend, escucha en `localhost:3107` de forma predeterminada. |
| `npm run build` | Ejecuta la comprobación de tipos primero, luego compila el frontend y el backend. |
| `npm test` | Ejecuta pruebas unitarias / de integración de Vitest. |
| `npm run test:e2e` | Ejecuta pruebas E2E de Playwright; pasa incluso sin archivos de prueba. |
| `npm run typecheck` | Ejecuta la comprobación de tipos de TypeScript para los lados de frontend y Node. |
| `npm run lint` | Actualmente equivalente a `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Datos y Copia de Seguridad

Los datos predeterminados están dentro del directorio del proyecto:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Se recomienda guardarlos juntos al hacer una copia de seguridad:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

Para restaurar, vuelva a colocar estos archivos en el mismo directorio del proyecto y inicie la aplicación.

También se proporciona importación/exportación ZIP dentro de la aplicación:

- Copia de seguridad completa: incluye tarjetas, contextos, medios, etiquetas, favoritos, estado de revisión, estado de FSRS, registros de revisión y configuración de usuario.
- Uso compartido puro de tarjetas: no incluye el progreso de revisión personal, el estado de favoritos ni la configuración de usuario.

La API Key de IA es una configuración confidencial local y no se incluirá en el archivo exportado; debe volver a ingresarse después de cambiar de dispositivo.

## Recomendaciones de Archivos Multimedia

| Tipo | Formatos Soportados | Tamaño Recomendado |
|------|----------|----------|
| Video | `mp4` | Menos de 300MB por archivo |
| Audio | `mp3` | Menos de 50MB por archivo |
| Imagen | `jpg` / `png` / `webp` | Menos de 10MB por archivo |

## Configuración de Sugerencias de IA

La página de creación de tarjetas admite sugerencias de IA opcionales. Debe agregar configuraciones de API compatibles con OpenAI en la página de configuración:

- Nombre a Mostrar
- URL Base
- API Key
- Modelo

Nota:

- La creación manual de tarjetas y la revisión funcionan perfectamente bien sin configurar la IA.
- La API Key se almacena en la base de datos local y se enmascarará en la interfaz de usuario.
- La API Key no se incluirá en los archivos exportados.
- La IA solo se utiliza para sugerir definiciones contextuales y notas de uso durante la creación de tarjetas. No es un diccionario integrado, ni crea tarjetas automáticamente.

## Preguntas Frecuentes (FAQ)

### El puerto está ocupado

Modifique `.env`:

```env
PORT=3108
```

Si el puerto del frontend `5173` está ocupado:

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci falla en better-sqlite3

Prefiera usar Node.js 22 LTS. `better-sqlite3` es un módulo nativo; si no hay un paquete precompilado disponible para el sistema actual y la versión de Node, intentará la compilación local durante la instalación.

Linux / WSL:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS:

```bash
xcode-select --install
```

El entorno nativo de Windows requiere entornos de compilación nativa disponibles de Python y Visual Studio Build Tools / MSVC. Si no está familiarizado con la configuración de estas herramientas, se recomienda usar WSL en su lugar, o instalar manualmente los entornos faltantes primero y volver a intentarlo.

### La página se abre, pero las solicitudes de API fallan

Confirme que el backend se está ejecutando:

```text
http://localhost:3107/api/health
```

Respuesta normal:

```json
{"ok":true}
```

### Quiero cambiar el directorio de instalación

Simplemente mueva todo el directorio del proyecto. Si `.env` usa rutas relativas, la base de datos y el directorio de cargas continuarán resolviéndose en relación con el nuevo directorio. Si `.env` usa rutas absolutas, deben actualizarse sincrónicamente.

## Notas de Desarrollo

Pila tecnológica para este proyecto:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

La primera versión se adhiere a ser local primero, sin diccionarios integrados, sin conexiones de diccionario, sin enlaces de video a sitios web y sin sincronización. La versión V2 actual solo agrega capacidades de sugerencia de IA durante la creación de tarjetas.

## Licencia

Este proyecto utiliza la Licencia MIT. Consulte [`LICENSE`](./LICENSE) para obtener más detalles.
