[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (Kontext-Vokabelheft)

Wenn du beim Anschauen von Videos, Anhören von Kursen oder Lesen von Untertiteln ein neues Wort findest, speichert die App nicht nur „das Wort selbst“, sondern auch Originalsatz, Kontext, Screenshot, Audio-/Videoclip, Notizen und Tags.

Beim Wiederholen siehst du die echte Situation, in der dir das Wort begegnet ist, nicht ein isoliertes Vokabelwort.

Geeignet für dich, wenn du:

- Du schaust dir häufig fremdsprachige Videos, Kurse, Filme, Podcasts oder Hörmaterialien an.
- Du möchtest Wiederholungen mit Zeitabständen wie bei Anki, aber mit Karten, die Originalsatz, Screenshots und Medienclips behalten.
- Du möchtest deine Lerndaten auf deinem eigenen Computer behalten, ohne nur für ein Vokabelheft ein Cloud-Konto zu registrieren.
- Du brauchst Hilfe beim Erkennen von Sätzen aus lokalen Videos, Audiodateien oder Bildern, bevor du sie manuell zu Karten überarbeitest.

> Dieses Projekt ist eine lokale Web-App. Standardmäßig werden Daten in einer SQLite-Datenbank und im Ordner `uploads/` auf deinem Computer gespeichert; ein Cloud-Konto ist nicht erforderlich.

## Demo

![Beispiel für Kartenerstellung in Context Vocabulary Notebook](./docs/demo/01-create-card-de.png)

## Was du damit tun kannst

- Erstelle Karten mit echtem Kontext: Zielwort, Originalsatz, kontextuelle Bedeutung, Notizen und Tags.
- Speichere lokale Medienanhänge: Video `mp4`, Audio `mp3`, Bilder `jpg / png / webp`.
- Importiere Clips stapelweise: mehrere Video-, Audio- oder Bildclips auf einmal importieren, Erkennungsergebnisse einzeln prüfen und Karten erstellen.
- Nutze optionale lokale OCR/STT-Helfer: konfiguriere ffmpeg, Tesseract und whisper.cpp, um Sätze aus Bildern, Videoframes oder Audio zu erkennen.
- Hänge mehrere Kontextbeispiele an dieselbe Wortbedeutung an, damit du siehst, wie eine Bedeutung in unterschiedlichen Materialien erscheint.
- Wiederhole mit FSRS-Spaced-Repetition und bringe jedes Wort in den Kontext zurück, in dem du es gefunden hast.
- Suche, filtere nach Tags, markiere Favoriten, sieh Statistiken an und importiere/exportiere ZIP-Sicherungen.
- Optionale KI-Vorschläge: Nach dem Konfigurieren einer OpenAI-compatible API erhältst du Hilfe zu kontextuellen Bedeutungen, Nutzungshinweisen, Satzübersetzung, Lemmatisierung und Rechtschreibprüfung.

## Datenort und Hinweis zum Speicherplatz

Wähle zuerst das Installationsverzeichnis. Standardmäßig speichert die App Datenbank, hochgeladene Dateien und Konfiguration in dem Verzeichnis, aus dem sie läuft.

Standardmäßige lokale Daten:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Hinweis: Nach dem Hochladen von Videos, Audio und Screenshots kann `uploads/` weiter wachsen. Whisper-Modelle können ebenfalls mehrere hundert MB bis mehrere GB belegen.

Vermeide diese Speicherorte:

- `/usr/local`, `/opt` oder andere Verzeichnisse, die normalerweise `sudo`- oder root-Rechte erfordern.
- `C:\Program Files` oder andere systemgeschützte Verzeichnisse.
- Temporäre Ordner, Download-Caches oder Orte, die das System oder Bereinigungstools automatisch löschen können.
- Orte mit wenig freiem Speicher, unklaren Synchronisationsregeln oder Cloud-Laufwerks-Bereinigung/Quota-Verhalten.

Bevorzuge einen Ort, den du langfristig behalten kannst, zum Beispiel:

```text
D:\study\context-vocabulary-notebook
E:\study\context
$HOME/context-vocabulary-notebook
```

## Ein-Klick-Installation

Wechsle in ein leeres Verzeichnis, in dem die Projektdateien liegen sollen, und führe dann den Befehl für dein System aus. Das Skript installiert das Projekt im aktuellen Verzeichnis; wenn es dieses Projekt dort bereits findet, aktualisiert es automatisch.

| System | Befehl |
|------|------|
| Linux / macOS / WSL | Siehe den Linux / macOS / WSL-Befehl unten |
| Windows PowerShell | Siehe den Windows PowerShell-Befehl unten |

### Linux / macOS / WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Nach der Installation startest du es mit:

```bash
npm run dev
```

Im Browser öffnen:

```text
http://localhost:5173
```

Backend-Health-Check:

```text
http://localhost:3107/api/health
```

## Auf die neueste Version aktualisieren

Wechsle in das Verzeichnis, in dem du das Projekt installiert hast, und führe aus:

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

Du kannst auch den Ein-Klick-Installationsbefehl erneut ausführen. Wenn das Skript erkennt, dass das aktuelle Verzeichnis bereits dieses Projekt ist, aktualisiert es, installiert Abhängigkeiten und baut automatisch.

## Lokale OCR / Spracherkennung (optional)

Das Kern-Notizbuch benötigt kein OCR/STT. Du kannst zuerst Karten erstellen und manuell wiederholen; konfiguriere diese Tools nur, wenn du Originalsätze aus Videos, Audio oder Bildern automatisch erkennen möchtest.

Die lokale Erkennung verwendet:

- ffmpeg: extrahiert Audio aus Videos.
- Tesseract: erkennt Text in Bildern oder Videoframes.
- whisper.cpp + Whisper-Modell: erkennt Sprache in Audio oder Video.

### Lokale Erkennung automatisch einrichten (zuerst empfohlen)

Führe dies im Projektverzeichnis aus:

Linux / macOS / WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Um chinesische und englische Untertitel zu erkennen, ändere die Sprache zu:

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Nachdem das Skript fertig ist, klicke auf der Karte für lokale Erkennung in den App-Einstellungen auf **I installed it, check again**. Neuere Versionen laden `.env` neu, daher musst du das Backend normalerweise nicht manuell neu starten.

### Modelle und Speicherbedarf

Whisper-Modelle sind groß, und die Downloadzeit hängt von deinem Netzwerk ab:

- `tiny` / `base`: klein und schnell, gut zum Ausprobieren, mit geringerer Genauigkeit.
- `small` / `medium`: bessere Genauigkeit, mit höherer Festplatten- und CPU-Nutzung.
- `large`: sehr groß und auf normalen Computern eventuell langsam; nicht als Standardauswahl empfohlen.

Der Windows-Erkennungsinstaller lädt standardmäßig `ggml-small.bin` herunter, ungefähr mehrere hundert MB.

### Lokale Erkennung manuell einrichten

Wenn die Ein-Klick-Konfiguration fehlschlägt oder du Tool-Pfade selbst verwalten möchtest, installiere die Tools manuell und schreibe diese Werte in `.env`:

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

Windows-Pfadbeispiel:

```env
CVN_FFMPEG_PATH=E:\study\context\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=E:\study\context\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=E:\study\context\models\ggml-small.bin
CVN_TESSERACT_PATH=E:\study\context\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```


## Erweiterte Installationsoptionen

### Installationsverzeichnis festlegen

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

### Den Kern-Installer optionale Tools ergänzen lassen

Für eine normale Erstinstallation sind sie nicht erforderlich. Verwende sie nur bei Bedarf.

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

Installer-Quelle:

- Linux / macOS / WSL: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh
- Windows PowerShell: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

## Manuelle Installation

Wenn die Ein-Klick-Skripte die Umgebung nicht vorbereiten können, installiere zuerst Node.js 22 LTS, npm, Git und alle erforderlichen nativen Build-Tools manuell und führe dann aus:

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

Im Browser öffnen:

```text
http://localhost:5173
```

## Häufige Fragen

### Was tun, wenn die Ein-Klick-Installation fehlschlägt?

- If the message says a command is missing, close and reopen the terminal, then run the installer again.
- Linux / WSL: if `apt-get update` reports Docker, Chromium, Snap, GPG key, or similar errors, it is usually an existing apt-source or unfinished package-configuration issue, not because this project depends on those packages. Fix/disable the affected apt source first, or manually install Git, Node.js 22 LTS, and npm before retrying.
- macOS: if the Xcode Command Line Tools prompt appears, click Install, then rerun the installer after it completes.
- Windows: if `npm ci` fails at `better-sqlite3`, you usually need Python and Visual Studio Build Tools / MSVC; if you are not familiar with these tools, WSL is recommended.

### Die Seite öffnet sich, aber lokale Erkennung bleibt nicht konfiguriert

First make sure the recognition installer has completed and the corresponding `CVN_*` paths exist in `.env`. Then click **I installed it, check again** on the settings page.

If it still does not work:

- Make sure the app was started from the same project directory.
- Make sure no old `3107` backend process is occupying the port.
- Run `npm run dev` again and refresh the page.

### Port ist bereits belegt

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

### Der Clip hat keine sichtbaren Untertitel, daher wird kein Originalsatz erkannt

Wenn das Videobild keine Untertitel enthält oder die Untertitel sehr klein/unscharf sind, findet OCR möglicherweise keinen Satz; dann wird Spracherkennung benötigt. Stelle sicher, dass ffmpeg, whisper.cpp und `CVN_WHISPER_CPP_MODEL` verfügbar sind. Wenn auch der Ton keine klare Sprache enthält, gib den Originalsatz manuell ein.

Wenn `Audio extraction failed` erscheint, ist ffmpeg meist nicht verfügbar, der Pfad ist falsch, oder die Quell-Video-/Audiodatei kann von ffmpeg nicht gelesen werden.

### Fehlende Tesseract-Sprachdaten

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

### Whisper-Modellpfad ist nicht konfiguriert

`CVN_WHISPER_CPP_MODEL` hat kein Standardmodell. Lade ein von whisper.cpp unterstütztes ggml-Modell herunter und trage dessen absoluten Pfad in `.env` ein.

## Daten und Backup

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

## Empfehlungen für Mediendateien

| Type | Supported formats | Recommended size |
|------|----------|----------|
| Video | `mp4` | within 300MB per file |
| Audio | `mp3` | within 50MB per file |
| Image | `jpg` / `png` / `webp` | within 10MB per file |

## Konfiguration für KI-Vorschläge

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

## Anforderungen

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

### Empfehlung zu WSL / nativem Windows

- WSL is usually the most stable: Node, Git, ffmpeg, Tesseract, and native build tools are closer to Linux paths.
- Native Windows PowerShell is supported: the script reuses existing Git / Node.js / npm and tries `winget` only when something is missing.
- If native Windows `npm ci` fails at `better-sqlite3`, install Python and Visual Studio Build Tools / MSVC as prompted, or use WSL.

## Umgebungsvariablen

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | Nein | `3107` | Port des Express-Backenddienstes. Der Vite-Dev-Server leitet `/api` an diesen Port weiter. |
| `DATABASE_PATH` | Nein | `./data/context-vocabulary-notebook.sqlite` | Pfad zur SQLite-Datenbank. Relative Pfade werden vom Projektstamm aus aufgelöst. |
| `UPLOADS_DIR` | Nein | `./uploads` | Verzeichnis für hochgeladene Mediendateien. Relative Pfade werden vom Projektstamm aus aufgelöst. |
| `CVN_FFMPEG_PATH` | Nein | `ffmpeg` | Pfad zur ffmpeg-Ausführungsdatei; bei nativen Windows-Toolinstallationen bei Bedarf einen absoluten Pfad verwenden. |
| `CVN_STT_PROVIDER` | Nein | `whisper.cpp` | Lokaler Spracherkennungsanbieter; kann `whisper.cpp` oder `disabled` sein. |
| `CVN_WHISPER_CPP_PATH` | Nein | `whisper-cli` | Pfad zur whisper.cpp-Ausführungsdatei; wenn dein System nur das alte `main` hat, setze `main` oder einen absoluten Pfad. |
| `CVN_WHISPER_CPP_MODEL` | Für lokale STT erforderlich | Leer | Pfad zur Whisper-Modelldatei; der Installer lädt kein Modell automatisch herunter. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | Nein | `120000` | Zeitlimit für einen whisper.cpp-Erkennungslauf. |
| `CVN_OCR_PROVIDER` | Nein | `tesseract` | Lokaler OCR-Anbieter; kann `tesseract` oder `disabled` sein. |
| `CVN_TESSERACT_PATH` | Nein | `tesseract` | Pfad zur Tesseract-Ausführungsdatei. |
| `CVN_TESSERACT_LANG` | Nein | Automatisch nach Zielsprache gewählt | Tesseract-Sprachcodes wie `eng`, `chi_sim`, `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | Nein | `30000` | Zeitlimit für einen Tesseract-OCR-Lauf. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | Nein | `0` | Ob Cloud-Transkription als Rückfall erlaubt ist, wenn lokale Clip-Erkennung fehlschlägt; standardmäßig deaktiviert. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | Nein | Vom Server entschieden | Zeitlimit für Bereitschaftsprüfungen der lokalen Erkennung. |
<!-- /AUTO-GENERATED:ENV -->

## Häufige Befehle

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

## Entwicklungshinweise

Project stack:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

Version 1 bleibt local-first: kein eingebautes Wörterbuch, keine Wörterbuchintegration, keine Website-Video-Links und keine Synchronisierung. Die aktuelle V2 ergänzt AI-Vorschläge beim Erstellen von Karten und lokale Hilfen zur Clip-Erkennung.

## Hinweise vor der Installation und Haftungsausschluss

Nach aktuellem Kenntnisstand des Autors enthält der eigene Quellcode dieses Projekts keinen schädlichen Code. Der Installer prüft die lokale Umgebung und versucht auf unterstützten Plattformen, fehlende Abhängigkeiten wie Git, Node.js und npm zu installieren; wenn native Build-Tools fehlen, gibt er Hinweise aus, und einige Plattformen erfordern eine manuelle Installation.

Die Installation lädt Drittanbieter-Software und Abhängigkeiten über System-Paketmanager und npm herunter. Installation und Nutzung können dennoch durch Systemberechtigungen, Netzwerkbedingungen, Verfügbarkeit des Paketmanagers, Antivirensoftware, Unternehmensrichtlinien für Geräte, Speicherplatz, Lieferketten von Drittanbieter-Abhängigkeiten, Kompilierungsergebnisse nativer Node-Module und ähnliche Faktoren beeinflusst werden. Für Probleme und Folgen durch das Ausführen von Installern, das Installieren von Abhängigkeiten, das Ändern der Systemumgebung und das Hochladen/Speichern lokaler Dateien ist der Nutzer verantwortlich.

Wenn das Skript die Umgebung nicht automatisch vorbereiten kann, gibt es fehlende Tools und empfohlene nächste Schritte aus; anschließend müssen Sie diese für Ihr System manuell installieren und es erneut versuchen.

## Lizenz

Dieses Projekt verwendet die MIT License. Siehe [`LICENSE`](./LICENSE).
