[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (carnet de vocabulaire en contexte)

Quand vous rencontrez un mot nouveau en regardant des vidéos, en écoutant des cours ou en lisant des sous-titres, l’application enregistre non seulement « le mot lui-même », mais aussi la phrase originale, le contexte, la capture d’écran, l’extrait audio/vidéo, les notes et les tags.

À la révision, vous voyez la scène réelle où vous avez rencontré le mot, pas un mot isolé.

Cet outil est fait pour vous si :

- Vous regardez souvent des vidéos, cours, films, podcasts ou supports d’écoute en langue étrangère.
- Vous voulez une révision espacée comme Anki, mais avec des cartes qui conservent la phrase d’origine, les captures d’écran et les clips multimédias.
- Vous voulez garder vos données d’apprentissage sur votre ordinateur, sans créer de compte cloud seulement pour un carnet de vocabulaire.
- Vous avez besoin d’aide pour reconnaître des phrases depuis des vidéos, audios ou images locales avant de les peaufiner manuellement en cartes.

> Ce projet est une application web locale. Par défaut, les données sont stockées dans une base SQLite et le dossier `uploads/` sur votre ordinateur ; aucun compte cloud n’est requis.

## Demo

![Exemple de création de carte dans Context Vocabulary Notebook](./docs/demo/01-create-card-fr.png)

## Ce que vous pouvez faire

- Créez des cartes autour d’un contexte réel : mot cible, phrase d’origine, sens contextuel, notes et étiquettes.
- Enregistrez des pièces jointes multimédias locales : vidéo `mp4`, audio `mp3`, images `jpg / png / webp`.
- Importez des clips par lots : importez plusieurs clips vidéo, audio ou image à la fois, vérifiez les résultats de reconnaissance un par un et créez des cartes.
- Utilisez des assistants locaux OCR/STT facultatifs : configurez ffmpeg, Tesseract et whisper.cpp pour reconnaître des phrases depuis des images, des images vidéo ou de l’audio.
- Associez plusieurs exemples de contexte au même sens d’un mot, utile pour voir comment un sens apparaît dans différents supports.
- Révisez avec la répétition espacée FSRS, en ramenant chaque mot dans le contexte où vous l’avez trouvé.
- Recherchez, filtrez par étiquettes, ajoutez aux favoris, consultez les statistiques et importez/exportez des sauvegardes ZIP.
- Suggestions IA facultatives : après avoir configuré une API OpenAI-compatible, obtenez de l’aide pour les sens contextuels, notes d’usage, traduction de phrase complète, lemmatisation et correction orthographique.

## Emplacement des données et espace disque

Choisissez d’abord le répertoire d’installation. Par défaut, l’application conserve la base de données, les fichiers téléversés et la configuration dans le répertoire depuis lequel elle s’exécute.

Données locales par défaut :

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Remarque : après le téléversement de vidéos, d’audio et de captures d’écran, `uploads/` peut continuer à grossir. Les modèles Whisper peuvent aussi occuper de plusieurs centaines de MB à plusieurs GB.

Évitez de l’exécuter dans ces emplacements :

- `/usr/local`, `/opt` ou d’autres répertoires qui nécessitent généralement des droits `sudo` ou root.
- `C:\Program Files` ou d’autres répertoires protégés par le système.
- Dossiers temporaires, caches de téléchargement ou emplacements que le système ou des outils de nettoyage peuvent supprimer automatiquement.
- Emplacements avec peu d’espace libre, règles de synchronisation floues ou comportement de nettoyage/quota de disque cloud.

Préférez un emplacement que vous pouvez conserver durablement, par exemple :

```text
D:\study\context-vocabulary-notebook
E:\study\context
$HOME/context-vocabulary-notebook
```

## Installation en une commande

Entrez dans un répertoire vide où vous voulez placer les fichiers du projet, puis exécutez la commande correspondant à votre système. Le script installe le projet dans le répertoire courant ; si ce répertoire contient déjà ce projet, il le met automatiquement à jour.

| Système | Commande |
|------|------|
| Linux / macOS / WSL | Voir la commande Linux / macOS / WSL ci-dessous |
| Windows PowerShell | Voir la commande Windows PowerShell ci-dessous |

### Linux / macOS / WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Après l’installation, démarrez-le avec :

```bash
npm run dev
```

Ouvrez dans votre navigateur :

```text
http://localhost:5173
```

Contrôle de santé du backend :

```text
http://localhost:3107/api/health
```

## Mettre à jour vers la dernière version

Entrez dans le répertoire où vous avez installé le projet, puis exécutez :

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

Vous pouvez aussi relancer la commande d’installation en un clic. Si le script détecte que le répertoire courant est déjà ce projet, il met à jour, installe les dépendances et construit automatiquement.

## OCR / reconnaissance vocale locale (optionnel)

Le carnet principal ne nécessite pas OCR/STT. Vous pouvez d’abord créer des cartes et réviser manuellement ; configurez ces outils seulement lorsque vous devez reconnaître automatiquement des phrases d’origine depuis des vidéos, de l’audio ou des images.

La reconnaissance locale utilise :

- ffmpeg : extrait l’audio des vidéos.
- Tesseract : reconnaît le texte dans les images ou les images vidéo.
- whisper.cpp + modèle Whisper : reconnaît la parole dans l’audio ou la vidéo.

### Configurer automatiquement la reconnaissance locale (à essayer d’abord)

Exécutez ceci dans le répertoire du projet :

Linux / macOS / WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Pour reconnaître les sous-titres chinois et anglais, changez la langue en :

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

Une fois le script terminé, cliquez sur **I installed it, check again** sur la carte de reconnaissance locale dans la page des paramètres de l’application. Les versions récentes rechargent `.env`, vous n’avez donc généralement pas besoin de redémarrer manuellement le backend.

### Modèles et utilisation du disque

Les modèles Whisper sont volumineux, et le temps de téléchargement dépend de votre réseau :

- `tiny` / `base` : petits et rapides, pratiques pour essayer, avec une précision moindre.
- `small` / `medium` : meilleure précision, avec une utilisation plus élevée du disque et du CPU.
- `large` : très volumineux et peut être lent sur des ordinateurs ordinaires ; déconseillé comme choix par défaut.

L’installateur de reconnaissance Windows télécharge `ggml-small.bin` par défaut, environ plusieurs centaines de MB.

### Configurer manuellement la reconnaissance locale

Si la configuration en un clic échoue, ou si vous voulez gérer vous-même les chemins des outils, installez les outils manuellement et écrivez ces valeurs dans `.env` :

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

Exemple de chemin Windows :

```env
CVN_FFMPEG_PATH=E:\study\context\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=E:\study\context\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=E:\study\context\models\ggml-small.bin
CVN_TESSERACT_PATH=E:\study\context\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```


## Options d’installation avancées

### Spécifier le dossier d’installation

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

### Laisser l’installateur principal ajouter les outils optionnels

Ils ne sont pas nécessaires pour une première installation ordinaire. Utilisez-les seulement si nécessaire.

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

Source de l’installateur :

- Linux / macOS / WSL: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh
- Windows PowerShell: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

## Installation manuelle

Si les scripts en un clic ne peuvent pas préparer l’environnement, installez d’abord manuellement Node.js 22 LTS, npm, Git et tout outil de compilation natif requis, puis exécutez :

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

Ouvrez dans votre navigateur :

```text
http://localhost:5173
```

## FAQ

### Que faire si l’installation en une commande échoue ?

- If the message says a command is missing, close and reopen the terminal, then run the installer again.
- Linux / WSL: if `apt-get update` reports Docker, Chromium, Snap, GPG key, or similar errors, it is usually an existing apt-source or unfinished package-configuration issue, not because this project depends on those packages. Fix/disable the affected apt source first, or manually install Git, Node.js 22 LTS, and npm before retrying.
- macOS: if the Xcode Command Line Tools prompt appears, click Install, then rerun the installer after it completes.
- Windows: if `npm ci` fails at `better-sqlite3`, you usually need Python and Visual Studio Build Tools / MSVC; if you are not familiar with these tools, WSL is recommended.

### La page s’ouvre, mais la reconnaissance locale reste non configurée

First make sure the recognition installer has completed and the corresponding `CVN_*` paths exist in `.env`. Then click **I installed it, check again** on the settings page.

If it still does not work:

- Make sure the app was started from the same project directory.
- Make sure no old `3107` backend process is occupying the port.
- Run `npm run dev` again and refresh the page.

### Le port est déjà utilisé

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

### Le clip n’a pas de sous-titres visibles, donc aucune phrase originale n’est reconnue

Si l’image vidéo ne contient pas de sous-titres, ou si les sous-titres sont minuscules/flous, l’OCR peut ne trouver aucune phrase ; dans ce cas, la reconnaissance vocale est nécessaire. Vérifiez que ffmpeg, whisper.cpp et `CVN_WHISPER_CPP_MODEL` sont disponibles. Si l’audio ne contient pas non plus de parole claire, saisissez la phrase originale manuellement.

Si `Audio extraction failed` apparaît, ffmpeg est généralement indisponible, le chemin est incorrect, ou le fichier vidéo/audio source ne peut pas être lu par ffmpeg.

### Données de langue Tesseract manquantes

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

### Le chemin du modèle Whisper n’est pas configuré

L’application n’intègre pas de modèle Whisper. Le programme d’installation de la reconnaissance locale télécharge et configure `ggml-small.bin` ; seules les configurations manuelles doivent télécharger un modèle ggml compatible avec whisper.cpp et inscrire son chemin absolu dans `.env`.

## Données et sauvegarde

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

## Recommandations pour les médias

| Type | Supported formats | Recommended size |
|------|----------|----------|
| Video | `mp4` | within 300MB per file |
| Audio | `mp3` | within 50MB per file |
| Image | `jpg` / `png` / `webp` | within 10MB per file |

## Configuration des suggestions IA

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

## Prérequis

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

### Recommandation WSL / Windows natif

- WSL is usually the most stable: Node, Git, ffmpeg, Tesseract, and native build tools are closer to Linux paths.
- Native Windows PowerShell is supported: the script reuses existing Git / Node.js / npm and tries `winget` only when something is missing.
- If native Windows `npm ci` fails at `better-sqlite3`, install Python and Visual Studio Build Tools / MSVC as prompted, or use WSL.

## Variables d’environnement

<!-- AUTO-GENERATED:ENV -->
| Variable | Required | Default | Description |
|------|------|--------|------|
| `PORT` | Non | `3107` | Port du service backend Express. Le serveur de développement Vite relaie `/api` vers ce port. |
| `DATABASE_PATH` | Non | `./data/context-vocabulary-notebook.sqlite` | Chemin de la base SQLite. Les chemins relatifs sont résolus depuis la racine du projet. |
| `UPLOADS_DIR` | Non | `./uploads` | Répertoire des fichiers multimédias téléversés. Les chemins relatifs sont résolus depuis la racine du projet. |
| `CVN_FFMPEG_PATH` | Non | `ffmpeg` | Chemin de l’exécutable ffmpeg ; pour des outils Windows natifs, utilisez un chemin absolu si nécessaire. |
| `CVN_STT_PROVIDER` | Non | `whisper.cpp` | Fournisseur local de reconnaissance vocale ; peut être `whisper.cpp` ou `disabled`. |
| `CVN_WHISPER_CPP_PATH` | Non | `whisper-cli` | Chemin de l’exécutable whisper.cpp ; si votre système ne possède que l’ancien `main`, indiquez `main` ou un chemin absolu. |
| `CVN_WHISPER_CPP_MODEL` | Requis pour le STT local | Vide | Chemin du modèle Whisper ; l’installateur de reconnaissance locale télécharge le modèle par défaut, tandis qu’une configuration manuelle doit fournir ce chemin. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | Non | `120000` | Délai d’expiration pour une exécution de reconnaissance whisper.cpp. |
| `CVN_OCR_PROVIDER` | Non | `tesseract` | Fournisseur OCR local ; peut être `tesseract` ou `disabled`. |
| `CVN_TESSERACT_PATH` | Non | `tesseract` | Chemin de l’exécutable Tesseract. |
| `CVN_TESSERACT_LANG` | Non | Choisi automatiquement selon la langue cible | Codes de langue Tesseract, comme `eng`, `chi_sim`, `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | Non | `30000` | Délai d’expiration pour une exécution OCR Tesseract. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | Non | `0` | Autorise le repli vers la transcription cloud lorsque la reconnaissance locale de clips échoue ; désactivé par défaut. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | Non | Décidé par le serveur | Délai d’expiration des vérifications de disponibilité de la reconnaissance locale. |
<!-- /AUTO-GENERATED:ENV -->

## Commandes courantes

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

## Notes de développement

Project stack:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

La version 1 reste local-first : pas de dictionnaire intégré, pas d’intégration de dictionnaire, pas de liens vers des vidéos de sites web et pas de synchronisation. La V2 actuelle ajoute des suggestions AI lors de la création de cartes et des assistants locaux de reconnaissance de clips.

## Notes avant installation et avertissement

À la connaissance actuelle de l’auteur, le code source propre à ce projet ne contient aucun code malveillant. L’installateur vérifie l’environnement local et, sur les plateformes prises en charge, tente d’installer les dépendances manquantes telles que Git, Node.js et npm ; lorsque les outils de compilation natifs manquent, il affiche des indications, et certaines plateformes nécessitent une installation manuelle.

L’installation télécharge des logiciels et dépendances tiers via les gestionnaires de paquets du système et npm. L’installation et l’utilisation peuvent tout de même être affectées par les permissions système, les conditions réseau, la disponibilité du gestionnaire de paquets, les logiciels antivirus, les politiques d’appareils d’entreprise, l’espace disque, les chaînes d’approvisionnement des dépendances tierces, les résultats de compilation des modules natifs Node et des facteurs similaires. Les problèmes et conséquences causés par l’exécution d’installateurs, l’installation de dépendances, la modification de l’environnement système et le téléversement/enregistrement de fichiers locaux relèvent de la responsabilité de l’utilisateur.

Si le script ne peut pas préparer l’environnement automatiquement, il affiche les outils manquants et les prochaines étapes suggérées ; vous devez alors les installer manuellement pour votre système et réessayer.

## Licence

Ce projet utilise la MIT License. Voir [`LICENSE`](./LICENSE).
