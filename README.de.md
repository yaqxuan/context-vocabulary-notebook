[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

Ein Local-First, leichtgewichtiges Tool zur Überprüfung von Kontextvokabeln. Es eignet sich zum Aufzeichnen neuer Wörter, Originaltexte, lokaler Videoclips, Screenshots, Audio und Tags beim Ansehen fremdsprachiger Videos und plant dann Überprüfungen mit dem FSRS-Algorithmus.

> Das aktuelle Projekt ist eine lokale Webanwendung. Daten werden standardmäßig in einer SQLite-Datenbank und im Ordner `uploads/` auf Ihrem Computer gespeichert. Es ist kein Cloud-Konto erforderlich.

## Hauptfunktionen

- Erstellen Sie Karten rund um reale Kontexte: Zielwort, kontextbezogene Definition, Originaltext, Notizen, Tags.
- Ein einzelner Bedeutungseintrag kann mit mehreren Kontextinstanzen verknüpft werden, ideal zum Aufzeichnen von Verwendungen derselben Bedeutung in verschiedenen Videos.
- Lokale Medienanhänge: Video `mp4`, Audio `mp3`, Bild `jpg / png / webp`.
- FSRS Spaced Repetition: Nur die Bewertungsknöpfe `Again` / `Good` bleiben erhalten.
- Liste der Bedeutungseinträge, Suche, Tag-Filterung, Favoriten, Statistiken.
- ZIP-Import und -Export: Unterstützt ein vollständiges persönliches Backup und reines Teilen von Karten.
- V2 KI-Vorschläge auf der Kartenerstellungsseite: Eine OpenAI-kompatible API kann konfiguriert werden, um kontextbezogene Definitionen und Verwendungsnotizen vorzuschlagen; der API-Schlüssel wird nur lokal gespeichert.

## Datenstandort und Speicherplatzwarnung

Die Anwendung speichert Daten standardmäßig im Ausführungsverzeichnis. Nach dem Hochladen von Videos, Screenshots und Audio kann das Verzeichnis `uploads/` kontinuierlich wachsen und erheblichen Speicherplatz belegen.

Standardmäßige lokale Daten:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Es wird nicht empfohlen, die App an diesen Orten auszuführen:

- Verzeichnisse, die normalerweise `sudo`- oder Root-Rechte erfordern, wie `/usr/local`, `/opt`.
- Systemgeschützte Verzeichnisse wie `C:\Program Files`.
- Temporäre Verzeichnisse, Download-Cache-Verzeichnisse oder Speicherorte, die automatisch vom System oder von Reinigungstools gelöscht werden.
- Orte mit sehr wenig Speicherplatz, unklaren Synchronisierungsregeln oder wo Dateien automatisch von Cloud-Laufwerken bereinigt oder kontingentiert werden könnten.

## Laufzeitumgebung

| Umgebung | Anforderung | Beschreibung |
|------|------|------|
| Node.js | Empfohlen Node.js 22 LTS; mindestens eine Node-Version, die die aktuellen Vite-Anforderungen erfüllt | Frontend-Build, Dev-Server und Backend-Server hängen alle von Node.js ab. Das Installationsskript wird versuchen, dies zu erfüllen. |
| npm | Wird zusammen mit Node.js installiert | Das Repository enthält `package-lock.json`, verwenden Sie `npm ci`, um Abhängigkeiten zu installieren. |
| Git | Erforderlich zum Klonen des GitHub-Repositorys | Das Installationsskript prüft dies und versucht, es zu erfüllen. |
| Browser | Moderne Browser wie Chrome / Edge / Firefox / Safari | Die Anwendung wird über lokale Webseiten verwendet. |
| C/C++ Build Tools | Möglicherweise erforderlich | `better-sqlite3` ist ein natives Modul; wenn kein vorkompiliertes Paket für das aktuelle System und die Node-Version verfügbar ist, versucht `npm ci` eine lokale Kompilierung. |

Das Installationsskript überprüft zuerst die vorhandene Umgebung auf dem lokalen Computer. Unter Linux / WSL wird nur versucht, Abhängigkeiten über `apt-get` zu erfüllen, wenn Git oder Node.js/npm fehlen; wenn grundlegende Umgebungen erfüllt sind, überspringt es `apt-get`, um zu vermeiden, dass irrelevante Softwarequellenprobleme von Drittanbietern im System ausgelöst werden. Das macOS-Skript versucht, Homebrew zu verwenden, wenn Abhängigkeiten fehlen. Das native Windows-Skript versucht, `winget` zu verwenden, wenn Abhängigkeiten fehlen. Wenn diese Paketmanager nicht verfügbar sind oder der aktuelle Benutzer keine Installationsberechtigungen hat, müssen Sie die fehlenden Umgebungen manuell installieren und es erneut versuchen.

## Hinweise vor der Installation und Haftungsausschluss

Nach bestem Wissen und Gewissen des Autors enthält der eigene Quellcode dieses Projekts keinen bösartigen Code. Das Installationsskript überprüft die lokale Umgebung und versucht, fehlende Abhängigkeiten wie Git, Node.js, npm und native Build-Tools auf unterstützten Plattformen zu installieren.

Die Projektinstallation ruft Software und Abhängigkeiten von Drittanbietern über Systempaketmanager und npm ab. Der Installations- und Nutzungsprozess kann weiterhin durch Faktoren wie Systemberechtigungen, Netzwerkstatus, Verfügbarkeit von Paketmanagern, Antivirensoftware, Unternehmensgeräterichtlinien, Speicherplatz, Lieferketten für Abhängigkeiten von Drittanbietern und Kompilierungsergebnisse von nativen Node-Modulen beeinflusst werden. Die Benutzer sind allein verantwortlich für alle Probleme und Konsequenzen, die sich aus der Ausführung des Installationsskripts, der Installation von Abhängigkeiten, der Änderung der Systemumgebung sowie dem Hochladen und Speichern lokaler Dateien ergeben.

Wenn das Skript die Umgebung nicht automatisch erfüllen kann, gibt es die fehlenden Tools und empfohlenen Handhabungsmethoden aus; zu diesem Zeitpunkt müssen Benutzer sie vor einem erneuten Versuch manuell entsprechend ihrem eigenen System installieren.

## Ein-Klick-Installation

### Linux / macOS / WSL

Kopieren Sie den folgenden Befehl und führen Sie ihn aus. Das Skript installiert das Projekt im aktuellen Verzeichnis:

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Das Skript prüft automatisch auf Abhängigkeiten wie Git, Node.js/npm; installierte Abhängigkeiten werden direkt wiederverwendet. Bei Linux / WSL wird `apt-get` übersprungen, wenn die grundlegenden Abhängigkeiten erfüllt sind.

Um den Inhalt des Skripts zuerst anzuzeigen, besuchen Sie:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

Erweiterte Nutzung: Installationsverzeichnis angeben

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

Geben Sie zuerst ein leeres Verzeichnis ein, in dem Sie die Projektdateien installieren möchten, kopieren Sie dann den folgenden Befehl und führen Sie ihn aus. Das Skript installiert die Projektdateien direkt in das aktuelle Verzeichnis, ohne ein weiteres verschachteltes Verzeichnis zu erstellen:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Das Skript prüft automatisch auf Abhängigkeiten wie Git, Node.js/npm; installierte Abhängigkeiten werden direkt wiederverwendet.

Um den Inhalt des Skripts zuerst anzuzeigen, besuchen Sie:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

Erweiterte Nutzung: Installationsverzeichnis angeben

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### Fehlerbehebung

- Wenn gemeldet wird, dass der Befehl nicht existiert, schließen Sie das Terminal, öffnen Sie es erneut und führen Sie den Installationsbefehl erneut aus.
- Für Linux / WSL: Wenn `apt-get update` Fehler wie Docker, Chromium, Snap, GPG-Schlüssel usw. meldet, liegt dies normalerweise an vorhandenen apt-Quellen oder unvollständigen Paketkonfigurationen im System und nicht daran, dass dieses Projekt von dieser Software abhängt. Sie können zuerst die entsprechenden apt-Quellen reparieren/deaktivieren oder Git, Node.js 20+ und npm manuell installieren und es dann erneut versuchen.
- Für macOS: Wenn das Installationsfenster für die Xcode Command Line Tools angezeigt wird, klicken Sie auf "Installieren" und führen Sie den Installationsbefehl nach Abschluss erneut aus.
- Für Windows: Wenn Sie aufgefordert werden, dass eine Kompilierungsumgebung installiert werden muss, fahren Sie bitte wie angegeben fort; dies ist eine Umgebung, die während der Kompilierung einiger Abhängigkeiten benötigt werden kann.

## Update auf die neueste Version

Wenn Sie es bereits installiert haben, gehen Sie in das Projektverzeichnis und führen Sie aus:

Linux / macOS / WSL / Git Bash:

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Natives Windows PowerShell:

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Sie können auch den Ein-Klick-Installationsbefehl erneut ausführen. Wenn das Skript ein vorhandenes Git-Repository im Installationsverzeichnis findet, führt es automatisch `git pull --ff-only`, `npm ci` und `npm run build` aus.

Wenn Sie den Ein-Klick-Installationsbefehl im Projektverzeichnis erneut ausführen, aktualisiert das Skript das aktuelle Projektverzeichnis und erstellt kein weiteres verschachteltes Verzeichnis mit demselben Namen. Wenn Sie es außerhalb des Projekts ausführen, geben Sie bitte zuerst ein leeres Verzeichnis ein oder legen Sie explizit dasselbe `CVN_HOME` fest; das Skript mischt keine Projektdateien in ein nicht leeres reguläres Verzeichnis.

## Manuelle Installation

Wenn das Ein-Klick-Skript die Umgebung nicht erfüllen kann, können Sie Node.js 22 LTS, npm, Git und potenziell erforderliche native Build-Tools zuerst manuell installieren und dann die folgenden Befehle ausführen.

Linux / macOS / WSL / Git Bash:

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Natives Windows PowerShell:

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Im Browser öffnen:

```text
http://localhost:5173
```

Standard-Backend-Adresse:

```text
http://localhost:3107
```

## Umgebungsvariablen

<!-- AUTO-GENERATED:ENV -->
| Variable | Erforderlich | Standard | Beschreibung |
|------|------|--------|------|
| `PORT` | Nein | `3107` | Backend Express Server Port. Der Vite Dev-Server leitet `/api` an diesen Port weiter. |
| `DATABASE_PATH` | Nein | `./data/context-vocabulary-notebook.sqlite` | SQLite-Datenbankpfad. Relative Pfade werden relativ zum Projektstamm aufgelöst. |
| `UPLOADS_DIR` | Nein | `./uploads` | Speicherverzeichnis für hochgeladene Mediendateien. Relative Pfade werden relativ zum Projektstamm aufgelöst. |
<!-- /AUTO-GENERATED:ENV -->

Um den Frontend-Port während der Entwicklung zu ändern, können Sie `CLIENT_PORT` festlegen, wenn Sie den Befehl ausführen, standardmäßig `5173`. Diese Variable ist nicht in `.env.example` enthalten und muss normalerweise nicht konfiguriert werden.

## Häufige Befehle

<!-- AUTO-GENERATED:SCRIPTS -->
| Befehl | Beschreibung |
|------|------|
| `npm run dev` | Startet sowohl den Backend Dev-Server als auch den Vite Frontend Dev-Server. |
| `npm run dev:client` | Startet nur den Vite Frontend Dev-Server und lauscht standardmäßig auf `0.0.0.0:5173`. |
| `npm run dev:server` | Startet nur den Backend Express Dev-Server und lauscht standardmäßig auf `localhost:3107`. |
| `npm run build` | Führt zuerst die Typprüfung aus und erstellt dann das Frontend und das Backend. |
| `npm test` | Führt Vitest Unit- / Integrationstests aus. |
| `npm run test:e2e` | Führt Playwright E2E-Tests aus; besteht auch ohne Testdateien. |
| `npm run typecheck` | Führt TypeScript Typprüfungen für Frontend und Node aus. |
| `npm run lint` | Entspricht derzeit `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Daten und Backup

Standarddaten befinden sich im Projektverzeichnis:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Es wird empfohlen, sie beim Sichern zusammen zu speichern:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

Legen Sie diese Dateien zur Wiederherstellung wieder im selben Projektverzeichnis ab und starten Sie die Anwendung.

In-App-ZIP-Import/-Export wird ebenfalls bereitgestellt:

- Vollständiges Backup: enthält Karten, Kontexte, Medien, Tags, Favoriten, Überprüfungsstatus, FSRS-Status, Überprüfungsprotokolle und Benutzereinstellungen.
- Reines Teilen von Karten: Enthält keinen persönlichen Überprüfungsfortschritt, Favoritenstatus oder Benutzereinstellungen.

Der KI API-Schlüssel ist eine lokale sensible Konfiguration und wird nicht in die exportierte Datei übernommen; er muss nach einem Gerätewechsel erneut eingegeben werden.

## Empfehlungen für Mediendateien

| Typ | Unterstützte Formate | Empfohlene Größe |
|------|----------|----------|
| Video | `mp4` | Unter 300MB pro Datei |
| Audio | `mp3` | Unter 50MB pro Datei |
| Bild | `jpg` / `png` / `webp` | Unter 10MB pro Datei |

## Konfiguration von KI-Vorschlägen

Die Seite zur Kartenerstellung unterstützt optionale KI-Vorschläge. Sie müssen auf der Einstellungsseite OpenAI-kompatible API-Konfigurationen hinzufügen:

- Anzeigename
- Basis-URL
- API-Schlüssel
- Modell

Hinweis:

- Manuelle Kartenerstellung und Überprüfung funktionieren einwandfrei, ohne KI zu konfigurieren.
- Der API-Schlüssel wird in der lokalen Datenbank gespeichert und in der Benutzeroberfläche maskiert.
- Der API-Schlüssel wird nicht in exportierte Dateien aufgenommen.
- KI wird nur verwendet, um bei der Kartenerstellung kontextbezogene Definitionen und Verwendungsnotizen vorzuschlagen. Es ist kein eingebautes Wörterbuch und erstellt Karten nicht automatisch.

## Häufig gestellte Fragen (FAQ)

### Port ist belegt

Ändern Sie `.env`:

```env
PORT=3108
```

Wenn der Frontend-Port `5173` belegt ist:

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci schlägt bei better-sqlite3 fehl

Bevorzugen Sie die Verwendung von Node.js 22 LTS. `better-sqlite3` ist ein natives Modul; wenn kein vorkompiliertes Paket für das aktuelle System und die Node-Version verfügbar ist, wird bei der Installation eine lokale Kompilierung versucht.

Linux / WSL:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS:

```bash
xcode-select --install
```

Die native Windows-Umgebung erfordert verfügbare Python- und Visual Studio Build Tools / MSVC-native Build-Umgebungen. Wenn Sie mit der Konfiguration dieser Tools nicht vertraut sind, wird empfohlen, stattdessen WSL zu verwenden oder zuerst die fehlenden Umgebungen manuell zu installieren und es erneut zu versuchen.

### Seite öffnet sich, aber API-Anfragen schlagen fehl

Vergewissern Sie sich, dass das Backend ausgeführt wird:

```text
http://localhost:3107/api/health
```

Normale Antwort:

```json
{"ok":true}
```

### Möchte das Installationsverzeichnis ändern

Verschieben Sie einfach das gesamte Projektverzeichnis. Wenn `.env` relative Pfade verwendet, werden die Datenbank und das Upload-Verzeichnis weiterhin relativ zum neuen Verzeichnis aufgelöst. Wenn `.env` absolute Pfade verwendet, müssen sie synchron aktualisiert werden.

## Entwicklungshinweise

Tech-Stack für dieses Projekt:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

Die erste Version ist Local-First, hat keine eingebauten Wörterbücher, keine Wörterbuchverbindungen, keine Website-Videolinks und keine Synchronisation. Die aktuelle V2 fügt nur KI-Vorschlagsfunktionen während der Kartenerstellung hinzu.

## Lizenz

Dieses Projekt verwendet die MIT-Lizenz. Weitere Informationen finden Sie unter [`LICENSE`](./LICENSE).
