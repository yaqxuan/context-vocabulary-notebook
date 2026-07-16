[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [한국어](./README.ko.md) | [Русский](./README.ru.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (quaderno di vocaboli contestuali)

Conserva una parola insieme alla frase, immagine, audio o video in cui l’hai incontrata.

> **Nota sulla lingua:** questa documentazione è tradotta in italiano, ma l’interfaccia italiana
> non è ancora disponibile. L’immagine seguente mostra l’interfaccia inglese.

<!-- README:OVERVIEW -->
## Impara la parola nel suo contesto reale

Context Vocabulary Notebook è un’applicazione self-hosted e local-first. Una scheda raccoglie
la parola, il significato nel contesto, la frase originale, etichette, note e media facoltativi.
FSRS programma il ripasso e tu rispondi con `Again` o `Good`.

Non è un dizionario precompilato, un servizio cloud sync o un’app desktop nativa. È un’app Web
locale per il vocabolario che raccogli personalmente.

<!-- README:PREVIEW -->
## Anteprima

![Creazione di una scheda nell’interfaccia inglese attuale](./docs/demo/screen-create-card.jpg)

Altre schermate: [dettaglio](./docs/demo/screen-card-detail.jpg),
[ripasso](./docs/demo/screen-review.jpg), [statistiche](./docs/demo/screen-statistics.jpg).

<!-- README:WORKFLOW -->
## Flusso di studio

1. Registra frase, parola e significato contestuale.
2. Allega un file `mp4`, `mp3`, `jpg`, `png` o `webp`.
3. Organizza con etichette, preferiti, note, ricerca e filtri.
4. Ripassa con `Again / Good`; FSRS sceglie il prossimo intervallo.
5. Controlla quantità, accuratezza, distribuzione delle etichette e valutazioni.

L’importazione in blocco elabora più **clip MP4 locali** e permette di confermare ogni risultato
prima del salvataggio. Non accetta URL di siti video.

<!-- README:FEATURES -->
## Funzioni attuali

| Area | Funzione |
|---|---|
| Schede | Frase, significato, note, etichette e più esempi di contesto. |
| Media | File locali `mp4`, `mp3`, `jpg`, `png`, `webp`. |
| Ripasso | FSRS, `Again / Good`, progresso giornaliero e riproduzione. |
| Libreria | Ricerca, filtri, preferiti, etichette, modifica e stato imparato. |
| Statistiche | Numero di ripassi, accuratezza, totali mensili, etichette e tendenze. |
| Portabilità | ZIP per backup personale o schede condivisibili. |
| Ripasso Android offline | Un Android associato, replica cifrata, sincronizzazione LAN HTTPS o Tailscale, immagini/audio offline. |
| Riconoscimento | ffmpeg, Tesseract OCR e whisper.cpp STT facoltativi. |
| IA | Suggerimenti facoltativi tramite API OpenAI-compatible. |

<!-- README:QUICKSTART -->
## Avvio rapido

Servono Git, npm e Node.js `20.19+` o `22.12+` (consigliato Node.js 22 LTS).

Esegui l’installer da una cartella vuota. Il progetto viene installato direttamente
nella cartella corrente, senza creare una sottocartella `context-vocabulary-notebook`.

Linux, macOS o WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Avvia:

```bash
npm run dev
```

Apri <http://localhost:5173>. Stato API:
<http://localhost:3107/api/health>. Crea prima una scheda manualmente.

<!-- README:OPTIONAL -->
## Riconoscimento e IA facoltativi

ffmpeg estrae i media, Tesseract legge il testo visibile e whisper.cpp con un modello Whisper
trascrive il parlato. Il riconoscimento si installa separatamente a causa del modello.

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG=ita bash
```

```powershell
$env:CVN_TESSERACT_LANG='ita'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

I suggerimenti IA usano un’API OpenAI-compatible configurata dall’utente. Creazione manuale
e ripasso non richiedono OCR, STT o IA.

<!-- README:PRIVACY -->
## Privacy e dati

Per impostazione predefinita i dati restano nella cartella di installazione:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Non esiste cloud sync integrato. Il lavoro manuale e OCR/STT locale mantengono i contenuti sul
computer. Un fornitore IA di rete configurato riceve testo per i suggerimenti e audio per la
trascrizione delle schede. Solo con `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` può ricevere fotogrammi
o audio dopo un errore locale. La chiave API resta locale ed è esclusa dagli ZIP esportati
dall’applicazione.

<!-- README:DOCS -->
## Documentazione

- [Guida completa in inglese](./docs/USER_GUIDE.md)
- [Guida completa in cinese](./docs/USER_GUIDE.zh-CN.md)
- [Contribuire](./CONTRIBUTING.md)
- [Sicurezza](./SECURITY.md)
- [Codice di condotta](./CODE_OF_CONDUCT.md)

Aggiornamenti, Windows/WSL, OCR/STT, variabili d’ambiente, backup e problemi sono nella guida.

<!-- README:STATUS -->
## Stato del progetto

È una prerelease iniziale per uso locale self-hosted. Salva `data/`, `uploads/` e `.env`
prima di modifiche importanti.

Lingue UI attuali: inglese, cinese semplificato, giapponese, coreano, francese, tedesco,
spagnolo e russo. **L’interfaccia italiana non è ancora disponibile.**

<!-- README:CONTRIBUTING -->
## Contribuire

Sono benvenuti bug report, proposte mirate, traduzioni e PR testate. Leggi
[CONTRIBUTING.md](./CONTRIBUTING.md) e non pubblicare vocaboli, media, database o chiavi API privati.

<!-- README:LICENSE -->
## Licenza

[MIT](./LICENSE)
