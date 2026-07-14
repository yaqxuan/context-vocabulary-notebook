[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [한국어](./README.ko.md) | [Русский](./README.ru.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (commentarius vocabulorum contextualium)

Serva vocabulum una cum sententia, imagine, sono vel pellicula ubi id re vera invenisti.

> **Nota de lingua:** haec documenta Latine conversa sunt, sed usus interfaciei Latinae nondum
> praebetur. Imago infra interfaciem Anglicam ostendit.

<!-- README:OVERVIEW -->
## Vocabulum in vero contextu disce

Context Vocabulary Notebook est instrumentum in propria machina hospitatum et local-first.
Scheda vocabulum, sensum contextualem, sententiam originalem, notas, indicia et media libita
coniungit. FSRS repetitiones ordinat; discipulus `Again` aut `Good` respondet.

Non est lexicon praeparatum, servitium synchronizationis nubis, nec programma desktop nativum.
Est applicatio Web localis vocabulorum quae ipse colligis.

<!-- README:PREVIEW -->
## Imago

![Scheda contextus in interfacie Anglica hodierna](./docs/demo/01-create-card-en.png)

Aliae paginae: [schedae singula](./docs/demo/02-context-card.png),
[repetitio](./docs/demo/03-review.png), [statistica](./docs/demo/04-statistics.png).

<!-- README:WORKFLOW -->
## Ordo discendi

1. Sententiam, vocabulum propositum et sensum contextualem scribe.
2. Fasciculum `mp4`, `mp3`, `jpg`, `png` vel `webp` adiunge.
3. Indiciis, dilectis, notis, inquisitione et filtris ordina.
4. Per `Again / Good` repete; FSRS proximum intervallum eligit.
5. Numerum, rectitudinem, indicia et mutationem aestimationum inspice.

Importatio multiplex plura **segmenta MP4 localia** tractat et singula responsa ante
conservationem confirmari sinit. URL situs pellicularum non accipiuntur.

<!-- README:FEATURES -->
## Facultates hodiernae

| Pars | Facultas |
|---|---|
| Schedae | Sententia, sensus, notae, indicia et plura exempla contextus. |
| Media | Fasciculi locales `mp4`, `mp3`, `jpg`, `png`, `webp`. |
| Repetitio | FSRS, `Again / Good`, progressus cotidianus et media relata. |
| Bibliotheca | Inquisitio, filtra, dilecta, indicia, emendatio, status memoriae. |
| Statisticae | Numerus repetitionum, rectitudo, summae mensium, indicia et mutationes. |
| Translatio | ZIP ad exemplar privatum vel schedas communicandas. |
| Agnitio | ffmpeg, Tesseract OCR et whisper.cpp STT libita. |
| AI | Suggestiones libitae per API OpenAI-compatible. |

<!-- README:QUICKSTART -->
## Initium celer

Git, npm et Node.js `20.19+` aut `22.12+` requiruntur (Node.js 22 LTS suadetur).

Installatorem ex directorio vacuo exsequere. Projectum directe in directorio currenti
installatur neque directorium `context-vocabulary-notebook` inclusum creat.

Linux, macOS aut WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Excita:

```bash
npm run dev
```

Aperi <http://localhost:5173>. Status API:
<http://localhost:3107/api/health>. Primum schedam unam manu crea.

<!-- README:OPTIONAL -->
## Agnitio et AI libita

ffmpeg media extrahit, Tesseract textum visibilem legit, whisper.cpp cum exemplo Whisper vocem
transcribit. Agnitio propter magnitudinem exemplaris separatim instituitur.

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | CVN_TESSERACT_LANG=lat bash
```

```powershell
$env:CVN_TESSERACT_LANG='lat'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

AI utitur API OpenAI-compatible quod tu configuras. Creatio manualis et repetitio sine OCR,
STT vel AI operantur.

<!-- README:PRIVACY -->
## Vita privata et data

Data sua sponte in directorio institutionis manent:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Synchronizatio nubis inclusa non est. Labor manualis et OCR/STT locale contentum in computatro
tuo retinent. Praebitor AI per rete configuratus textum suggestionum et sonum transcriptionis
schedae accipit. Tantum cum `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK=1` imagines vel sonus segmenti
post agnitionem localem deficientem mitti possunt. Clavis API localis manet et a fasciculis ZIP
ab applicatione exportatis excluditur.

<!-- README:DOCS -->
## Documenta

- [Manuale plenum Anglice](./docs/USER_GUIDE.md)
- [Manuale plenum Sinice](./docs/USER_GUIDE.zh-CN.md)
- [De contributione](./CONTRIBUTING.md)
- [Consilium securitatis](./SECURITY.md)
- [Codex morum](./CODE_OF_CONDUCT.md)

Renovatio, Windows/WSL, OCR/STT, variabiles ambitus, exempla securitatis et difficultates in
manuali pleno explicantur.

<!-- README:STATUS -->
## Status operis

Haec est editio praevia prima ad usum localem. Ante mutationes maiores `data/`, `uploads/`
et `.env` conserva.

Linguae UI hodiernae: Anglica, Sinica simplificata, Iaponica, Coreana, Francogallica,
Germanica, Hispanica et Russica. **Interfacies Latina nondum praebetur.**

<!-- README:CONTRIBUTING -->
## Contributio

Relationes errorum, propositiones definitae, versiones et PR explorata accipiuntur. Lege
[CONTRIBUTING.md](./CONTRIBUTING.md); vocabula privata, media, databasin aut claves API ne publices.

<!-- README:LICENSE -->
## Licentia

[MIT](./LICENSE)
