[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

Uno strumento di revisione del vocabolario contestuale leggero e orientato al locale. È adatto per registrare nuove parole, frasi originali, clip video locali, screenshot, audio e tag mentre si guardano video in lingua straniera, e quindi pianificare le revisioni utilizzando l'algoritmo FSRS.

> Il progetto attuale è un'applicazione Web locale. I dati vengono salvati per impostazione predefinita in un database SQLite e nella cartella `uploads/` sul tuo computer. Non è richiesto alcun account cloud.

## Caratteristiche principali

- Crea schede attorno a contesti reali: parola di destinazione, definizione contestuale, frase originale, note, tag.
- Una singola voce di significato può essere associata a più istanze di contesto, ideale per registrare gli usi dello stesso significato in video diversi.
- Allegati multimediali locali: video `mp4`, audio `mp3`, immagine `jpg / png / webp`.
- Ripetizione spaziata FSRS: vengono mantenuti solo i pulsanti di valutazione `Again` / `Good`.
- Elenco delle voci di significato, ricerca, filtro per tag, preferiti, statistiche.
- Importazione ed esportazione ZIP: supporta il backup personale completo e la condivisione pura delle schede.
- Suggerimenti IA nella pagina di creazione della scheda V2: può essere configurata un'API compatibile con OpenAI per suggerire definizioni contestuali e note di utilizzo; la chiave API viene salvata solo localmente.

## Posizione dei dati e avviso sullo spazio su disco

L'applicazione salva i dati nella directory di esecuzione per impostazione predefinita. Dopo aver caricato video, screenshot e audio, la directory `uploads/` potrebbe crescere continuamente e occupare molto spazio su disco.

Dati locali predefiniti:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Non è consigliabile eseguire l'app in queste posizioni:

- Directory che in genere richiedono autorizzazioni `sudo` o di root, come `/usr/local`, `/opt`.
- Directory protette dal sistema come `C:\Program Files`.
- Directory temporanee, directory della cache di download o percorsi che verranno eliminati automaticamente dal sistema o da strumenti di pulizia.
- Posizioni con pochissimo spazio, regole di sincronizzazione poco chiare o in cui i file potrebbero essere puliti automaticamente o limitati in quota dai cloud drive.

## Ambiente di esecuzione

| Ambiente | Requisito | Descrizione |
|------|------|------|
| Node.js | Consigliato Node.js 22 LTS; almeno una versione di Node che soddisfi i requisiti attuali di Vite | La compilazione frontend, il server di sviluppo e il server backend dipendono tutti da Node.js. Lo script di installazione cercherà di soddisfare questo requisito. |
| npm | Installato insieme a Node.js | Il repository contiene `package-lock.json`, usa `npm ci` per installare le dipendenze. |
| Git | Necessario per clonare il repository GitHub | Lo script di installazione controllerà e cercherà di soddisfare questo requisito. |
| Browser | Browser moderni come Chrome / Edge / Firefox / Safari | L'applicazione viene utilizzata tramite pagine Web locali. |
| Strumenti di compilazione C/C++ | Potrebbero essere richiesti | `better-sqlite3` è un modulo nativo; se non è disponibile un pacchetto precompilato per il sistema corrente e la versione di Node, `npm ci` tenterà la compilazione locale. |

Lo script di installazione controllerà prima l'ambiente esistente sul computer locale. Su Linux / WSL, tenterà di soddisfare le dipendenze tramite `apt-get` solo se mancano Git o Node.js/npm; se gli ambienti di base sono soddisfatti, salterà `apt-get` per evitare di innescare problemi irrilevanti con origini software di terze parti nel sistema. Lo script per macOS proverà a utilizzare Homebrew quando mancano le dipendenze. Lo script nativo per Windows proverà a utilizzare `winget` quando mancano le dipendenze. Se questi gestori di pacchetti non sono disponibili o l'utente corrente non ha le autorizzazioni di installazione, è necessario installare manualmente gli ambienti mancanti e riprovare.

## Note pre-installazione e dichiarazione di non responsabilità

Per quanto a conoscenza dell'autore, il codice sorgente di questo progetto non contiene alcun codice dannoso. Lo script di installazione controllerà l'ambiente locale e tenterà di installare le dipendenze mancanti come Git, Node.js, npm e strumenti di compilazione nativi sulle piattaforme supportate.

L'installazione del progetto recupererà software e dipendenze di terze parti tramite gestori di pacchetti di sistema e npm. Il processo di installazione e utilizzo potrebbe ancora essere influenzato da fattori quali autorizzazioni di sistema, stato della rete, disponibilità del gestore pacchetti, software antivirus, criteri dei dispositivi aziendali, spazio su disco, catene di fornitura di dipendenze di terze parti e risultati di compilazione dei moduli nativi di Node. Gli utenti sono gli unici responsabili di eventuali problemi e conseguenze derivanti dall'esecuzione dello script di installazione, dall'installazione delle dipendenze, dalla modifica dell'ambiente di sistema e dal caricamento e salvataggio dei file locali.

Se lo script non riesce a soddisfare automaticamente l'ambiente, restituirà gli strumenti mancanti e i metodi di gestione suggeriti; a questo punto, gli utenti devono installarli manualmente in base ai propri sistemi prima di riprovare.

## Installazione con un clic

### Linux / macOS / WSL

Copia ed esegui il seguente comando. Lo script installerà il progetto nella directory corrente:

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Lo script verificherà automaticamente la presenza di dipendenze come Git, Node.js/npm; le dipendenze installate verranno riutilizzate direttamente. Per Linux / WSL, se le dipendenze di base sono soddisfatte, salterà `apt-get`.

Per visualizzare prima il contenuto dello script, visita:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

Uso avanzato: specifica la directory di installazione

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

Innanzitutto, entra in una directory vuota in cui desideri installare i file del progetto, quindi copia ed esegui il comando seguente. Lo script installerà i file del progetto direttamente nella directory corrente senza creare un'altra directory nidificata:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Lo script verificherà automaticamente la presenza di dipendenze come Git, Node.js/npm; le dipendenze installate verranno riutilizzate direttamente.

Per visualizzare prima il contenuto dello script, visita:
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

Uso avanzato: specifica la directory di installazione

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### Risoluzione dei problemi

- Se viene visualizzato il messaggio che il comando non esiste, chiudi il terminale, riaprilo ed esegui nuovamente il comando di installazione.
- Per Linux / WSL, se `apt-get update` segnala errori come Docker, Chromium, Snap, chiavi GPG, ecc., di solito è dovuto a fonti apt esistenti o configurazioni di pacchetti incomplete nel sistema, non perché questo progetto dipende da questi software. Puoi prima riparare/disabilitare le corrispondenti origini apt, oppure installare manualmente Git, Node.js 20+ e npm, quindi riprovare.
- Per macOS, se viene visualizzata la finestra di installazione di Xcode Command Line Tools, fai clic su "Installa" e, una volta completata, esegui nuovamente il comando di installazione.
- Per Windows, se viene richiesto che è necessario installare un ambiente di compilazione, continua come richiesto; questo è un ambiente che potrebbe essere necessario durante la compilazione di alcune dipendenze.

## Aggiornamento all'ultima versione

Se lo hai già installato, entra nella directory del progetto ed esegui:

Linux / macOS / WSL / Git Bash:

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows PowerShell nativo:

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Puoi anche ri-eseguire il comando di installazione con un clic. Quando lo script trova un repository Git esistente nella directory di installazione, eseguirà automaticamente `git pull --ff-only`, `npm ci` e `npm run build`.

Se ri-esegui il comando di installazione con un clic all'interno della directory del progetto, lo script aggiornerà la directory del progetto corrente e non creerà un'altra directory nidificata con lo stesso nome. Se viene eseguito all'esterno del progetto, entra prima in una directory vuota o imposta esplicitamente lo stesso `CVN_HOME`; lo script non mescolerà i file del progetto in una normale directory non vuota.

## Installazione manuale

Se lo script con un clic non riesce a soddisfare l'ambiente, puoi prima installare manualmente Node.js 22 LTS, npm, Git e gli strumenti di compilazione nativi potenzialmente necessari, quindi eseguire i comandi seguenti.

Linux / macOS / WSL / Git Bash:

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows PowerShell nativo:

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Apri nel browser:

```text
http://localhost:5173
```

Indirizzo backend predefinito:

```text
http://localhost:3107
```

## Variabili d'ambiente

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
| Variabile | Richiesto | Predefinito | Descrizione |
|------|------|--------|------|
| `PORT` | No | `3107` | Porta del server Express backend. Il server di sviluppo Vite reindirizza `/api` a questa porta. |
| `DATABASE_PATH` | No | `./data/context-vocabulary-notebook.sqlite` | Percorso del database SQLite. I percorsi relativi vengono risolti rispetto alla radice del progetto. |
| `UPLOADS_DIR` | No | `./uploads` | Directory di salvataggio dei file multimediali caricati. I percorsi relativi vengono risolti rispetto alla radice del progetto. |
<!-- /AUTO-GENERATED:ENV -->

Per cambiare la porta frontend durante lo sviluppo, puoi impostare `CLIENT_PORT` durante l'esecuzione del comando, il valore predefinito è `5173`. Questa variabile non è in `.env.example` e di solito non ha bisogno di essere configurata.

## Comandi comuni

<!-- AUTO-GENERATED:SCRIPTS -->
| Comando | Descrizione |
|------|------|
| `npm run dev` | Avvia sia il server di sviluppo backend che il server di sviluppo frontend Vite. |
| `npm run dev:client` | Avvia solo il server di sviluppo frontend Vite, ascolta su `0.0.0.0:5173` per impostazione predefinita. |
| `npm run dev:server` | Avvia solo il server di sviluppo Express backend, ascolta su `localhost:3107` per impostazione predefinita. |
| `npm run build` | Esegue prima il controllo del tipo, quindi compila frontend e backend. |
| `npm test` | Esegue i test unitari / di integrazione Vitest. |
| `npm run test:e2e` | Esegue i test E2E Playwright; passa anche senza file di test. |
| `npm run typecheck` | Esegue il controllo del tipo TypeScript per le parti frontend e Node. |
| `npm run lint` | Attualmente equivalente a `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Dati e backup

I dati predefiniti si trovano all'interno della directory del progetto:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Si consiglia di salvarli insieme durante il backup:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

Per ripristinare, rimetti questi file nella stessa directory del progetto e avvia l'applicazione.

Viene fornita anche l'importazione/esportazione ZIP in-app:

- Backup completo: include schede, contesti, file multimediali, tag, preferiti, stato della revisione, stato FSRS, registri delle revisioni e impostazioni utente.
- Condivisione pura delle schede: non include l'avanzamento della revisione personale, lo stato dei preferiti o le impostazioni utente.

L'API Key IA è una configurazione locale sensibile e non verrà trasportata con il file esportato; deve essere compilata nuovamente dopo aver cambiato dispositivo.

## Raccomandazioni per i file multimediali

| Tipo | Formati supportati | Dimensioni consigliate |
|------|----------|----------|
| Video | `mp4` | Sotto i 300 MB per file |
| Audio | `mp3` | Sotto i 50 MB per file |
| Immagine | `jpg` / `png` / `webp` | Sotto i 10 MB per file |

## Configurazione dei suggerimenti IA

La pagina di creazione della scheda supporta suggerimenti IA opzionali. È necessario aggiungere configurazioni API compatibili con OpenAI nella pagina delle impostazioni:

- Nome visualizzato
- URL di base
- Chiave API
- Modello

Nota:

- La creazione manuale delle schede e la revisione funzionano perfettamente senza configurare l'IA.
- La chiave API è archiviata nel database locale e verrà mascherata nell'interfaccia utente.
- La chiave API non verrà inclusa nei file esportati.
- L'IA viene utilizzata solo per suggerire definizioni contestuali e note di utilizzo durante la creazione della scheda. Non è un dizionario integrato, né crea schede automaticamente.

## Domande frequenti (FAQ)

### La porta è occupata

Modifica `.env`:

```env
PORT=3108
```

Se la porta frontend `5173` è occupata:

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci fallisce su better-sqlite3

Preferisci usare Node.js 22 LTS. `better-sqlite3` è un modulo nativo; se non è disponibile un pacchetto precompilato per il sistema e la versione Node correnti, tenterà la compilazione locale durante l'installazione.

Linux / WSL:

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS:

```bash
xcode-select --install
```

L'ambiente nativo Windows richiede ambienti di compilazione nativi Python e Visual Studio Build Tools / MSVC disponibili. Se non hai familiarità con la configurazione di questi strumenti, ti consigliamo di utilizzare invece WSL, oppure di installare prima manualmente gli ambienti mancanti e riprovare.

### La pagina si apre, ma le richieste API falliscono

Conferma che il backend sia in esecuzione:

```text
http://localhost:3107/api/health
```

Risposta normale:

```json
{"ok":true}
```

### Voglio cambiare la directory di installazione

Basta spostare l'intera directory del progetto. Se `.env` utilizza percorsi relativi, il database e la directory di caricamento continueranno a essere risolti rispetto alla nuova directory. Se `.env` utilizza percorsi assoluti, devono essere aggiornati in modo sincrono.

## Note di sviluppo

Stack tecnologico per questo progetto:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

La prima versione aderisce al principio local-first, niente dizionari integrati, niente connessioni a dizionari, niente collegamenti video a siti Web e niente sincronizzazione. L'attuale V2 aggiunge solo funzionalità di suggerimento IA durante la creazione della scheda.

## Licenza

Questo progetto utilizza la Licenza MIT. Vedi [`LICENSE`](./LICENSE) per i dettagli.
