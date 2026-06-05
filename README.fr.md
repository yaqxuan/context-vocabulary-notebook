[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook

Un outil de révision de vocabulaire contextuel léger et centré sur le local. Il convient pour enregistrer de nouveaux mots, des phrases originales, des clips vidéo locaux, des captures d'écran, de l'audio et des étiquettes lors du visionnage de vidéos en langues étrangères, puis pour planifier des révisions à l'aide de l'algorithme FSRS.

> Le projet actuel est une application Web locale. Les données sont enregistrées par défaut dans une base de données SQLite et dans le dossier `uploads/` de votre ordinateur. Aucun compte cloud n'est requis.

## Caractéristiques principales

- Créez des cartes autour de contextes réels : mot cible, définition contextuelle, phrase originale, notes, étiquettes.
- Une seule entrée de sens peut être associée à plusieurs instances de contexte, idéal pour enregistrer les usages du même sens dans différentes vidéos.
- Pièces jointes multimédias locales : vidéo `mp4`, audio `mp3`, image `jpg / png / webp`.
- Répétition espacée FSRS : seuls les boutons d'évaluation `Again` / `Good` sont conservés.
- Liste des entrées de sens, recherche, filtrage par étiquette, favoris, statistiques.
- Importation et exportation ZIP : prend en charge la sauvegarde personnelle complète et le partage de cartes pur.
- Suggestions de l'IA sur la page de création de cartes V2 : une API compatible OpenAI peut être configurée pour suggérer des définitions contextuelles et des notes d'utilisation ; la clé API n'est enregistrée que localement.

## Emplacement des données et avertissement d'espace disque

L'application enregistre les données dans le répertoire d'exécution par défaut. Après avoir téléchargé des vidéos, des captures d'écran et de l'audio, le répertoire `uploads/` peut croître continuellement et occuper un espace disque important.

Données locales par défaut :

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Il n'est pas recommandé d'exécuter l'application dans ces emplacements :

- Les répertoires qui nécessitent généralement des autorisations `sudo` ou root, tels que `/usr/local`, `/opt`.
- Répertoires protégés par le système comme `C:\Program Files`.
- Répertoires temporaires, répertoires de cache de téléchargement ou emplacements qui seront automatiquement supprimés par le système ou les outils de nettoyage.
- Emplacements avec très peu d'espace, des règles de synchronisation peu claires ou où les fichiers pourraient être automatiquement nettoyés ou limités en quota par les lecteurs cloud.

## Environnement d'exécution

| Environnement | Exigence | Description |
|------|------|------|
| Node.js | Recommandé Node.js 22 LTS ; au moins une version Node répondant aux exigences actuelles de Vite | Le build front-end, le serveur de développement et le serveur back-end dépendent tous de Node.js. Le script d'installation tentera de répondre à ce besoin. |
| npm | Installé avec Node.js | Le dépôt contient `package-lock.json`, utilisez `npm ci` pour installer les dépendances. |
| Git | Requis pour cloner le dépôt GitHub | Le script d'installation vérifiera et tentera de répondre à ce besoin. |
| Navigateur | Navigateurs modernes comme Chrome / Edge / Firefox / Safari | L'application est utilisée via des pages Web locales. |
| Outils de construction C/C++ | Peuvent être requis | `better-sqlite3` est un module natif ; s'il n'y a pas de package précompilé disponible pour le système actuel et la version Node, `npm ci` tentera une compilation locale. |

Le script d'installation vérifiera d'abord l'environnement existant sur la machine locale. Sur Linux / WSL, il ne tentera de répondre aux dépendances via `apt-get` que si Git ou Node.js/npm sont manquants ; si les environnements de base sont satisfaits, il ignorera `apt-get` pour éviter de déclencher des problèmes de sources logicielles tierces non pertinents dans le système. Le script macOS essaiera d'utiliser Homebrew lorsque des dépendances sont manquantes. Le script natif Windows essaiera d'utiliser `winget` lorsque des dépendances sont manquantes. Si ces gestionnaires de packages ne sont pas disponibles, ou si l'utilisateur actuel ne dispose pas des autorisations d'installation, vous devez installer manuellement les environnements manquants et réessayer.

## Remarques préalables à l'installation et avis de non-responsabilité

À la connaissance actuelle de l'auteur, le code source de ce projet ne contient aucun code malveillant. Le script d'installation vérifiera l'environnement local et tentera d'installer les dépendances manquantes telles que Git, Node.js, npm et les outils de construction natifs sur les plates-formes prises en charge.

L'installation du projet récupérera des logiciels et dépendances tiers via les gestionnaires de packages système et npm. Le processus d'installation et d'utilisation peut toujours être affecté par des facteurs tels que les autorisations du système, l'état du réseau, la disponibilité du gestionnaire de packages, les logiciels antivirus, les politiques des appareils d'entreprise, l'espace disque, les chaînes d'approvisionnement des dépendances tierces et les résultats de la compilation des modules natifs de Node. Les utilisateurs sont seuls responsables des problèmes et des conséquences découlant de l'exécution du script d'installation, de l'installation des dépendances, de la modification de l'environnement système, ainsi que du téléchargement et de l'enregistrement de fichiers locaux.

Si le script ne peut pas remplir automatiquement l'environnement, il affichera les outils manquants et les méthodes de gestion suggérées ; à ce stade, les utilisateurs doivent les installer manuellement en fonction de leurs propres systèmes avant de réessayer.

## Installation en un clic

### Linux / macOS / WSL

Copiez et exécutez la commande suivante. Le script installera le projet dans le répertoire actuel :

```bash
mkdir -p "$HOME/context-vocabulary-notebook" && cd "$HOME/context-vocabulary-notebook"
curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Le script vérifiera automatiquement les dépendances telles que Git, Node.js/npm ; les dépendances installées seront directement réutilisées. Pour Linux / WSL, si les dépendances de base sont satisfaites, il ignorera `apt-get`.

Pour voir d'abord le contenu du script, visitez :
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh

Utilisation avancée : spécifier le répertoire d'installation

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

Tout d'abord, entrez dans un répertoire vide où vous souhaitez installer les fichiers du projet, puis copiez et exécutez la commande suivante. Le script installera les fichiers du projet directement dans le répertoire actuel sans créer d'autre répertoire imbriqué :

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

Le script vérifiera automatiquement les dépendances telles que Git, Node.js/npm ; les dépendances installées seront directement réutilisées.

Pour voir d'abord le contenu du script, visitez :
https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

Utilisation avancée : spécifier le répertoire d'installation

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 | iex
```

### Dépannage

- S'il est indiqué que la commande n'existe pas, fermez le terminal, rouvrez-le et réexécutez la commande d'installation.
- Pour Linux / WSL, si `apt-get update` signale des erreurs telles que Docker, Chromium, Snap, les clés GPG, etc., cela est généralement dû à des sources apt existantes ou à des configurations de packages incomplètes dans le système, et non au fait que ce projet dépend de ces logiciels. Vous pouvez d'abord réparer/désactiver les sources apt correspondantes, ou installer manuellement Git, Node.js 20+ et npm, puis réessayer.
- Pour macOS, si la fenêtre d'installation des outils de ligne de commande Xcode apparaît, cliquez sur "Installer", et une fois l'installation terminée, relancez la commande d'installation.
- Pour Windows, s'il vous indique qu'un environnement de compilation doit être installé, veuillez continuer comme indiqué ; il s'agit d'un environnement qui peut être nécessaire lors de la compilation de certaines dépendances.

## Mettre à jour vers la dernière version

Si vous l'avez déjà installé, entrez dans le répertoire du projet et exécutez :

Linux / macOS / WSL / Git Bash :

```bash
cd context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

PowerShell natif Windows :

```powershell
Set-Location context-vocabulary-notebook
git pull --ff-only
npm ci
npm run build
npm run dev
```

Vous pouvez également réexécuter la commande d'installation en un clic. Lorsque le script trouve un dépôt Git existant dans le répertoire d'installation, il exécutera automatiquement `git pull --ff-only`, `npm ci` et `npm run build`.

Si vous réexécutez la commande d'installation en un clic à l'intérieur du répertoire du projet, le script mettra à jour le répertoire du projet actuel et ne créera pas d'autre répertoire imbriqué du même nom. Si vous l'exécutez en dehors du projet, veuillez d'abord entrer dans un répertoire vide, ou définir explicitement le même `CVN_HOME` ; le script ne mélangera pas les fichiers du projet dans un répertoire ordinaire non vide.

## Installation manuelle

Si le script en un clic ne peut pas répondre à l'environnement, vous pouvez d'abord installer manuellement Node.js 22 LTS, npm, Git et les outils de construction natifs potentiellement nécessaires, puis exécuter les commandes suivantes.

Linux / macOS / WSL / Git Bash :

```bash
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

PowerShell natif Windows :

```powershell
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

Ouvrir dans le navigateur :

```text
http://localhost:5173
```

Adresse backend par défaut :

```text
http://localhost:3107
```

## Variables d'environnement

<!-- AUTO-GENERATED:ENV -->
| Variable | Requis | Par défaut | Description |
|------|------|--------|------|
| `PORT` | Non | `3107` | Port du serveur Express backend. Le serveur de développement Vite redirige `/api` vers ce port. |
| `DATABASE_PATH` | Non | `./data/context-vocabulary-notebook.sqlite` | Chemin de la base de données SQLite. Les chemins relatifs sont résolus par rapport à la racine du projet. |
| `UPLOADS_DIR` | Non | `./uploads` | Répertoire d'enregistrement des fichiers multimédias téléchargés. Les chemins relatifs sont résolus par rapport à la racine du projet. |
<!-- /AUTO-GENERATED:ENV -->

Pour modifier le port front-end pendant le développement, vous pouvez définir `CLIENT_PORT` lors de l'exécution de la commande, la valeur par défaut est `5173`. Cette variable n'est pas dans `.env.example` et n'a généralement pas besoin d'être configurée.

## Commandes courantes

<!-- AUTO-GENERATED:SCRIPTS -->
| Commande | Description |
|------|------|
| `npm run dev` | Démarre à la fois le serveur de développement backend et le serveur de développement front-end Vite. |
| `npm run dev:client` | Démarre uniquement le serveur de développement front-end Vite, écoute sur `0.0.0.0:5173` par défaut. |
| `npm run dev:server` | Démarre uniquement le serveur de développement Express backend, écoute sur `localhost:3107` par défaut. |
| `npm run build` | Exécute d'abord la vérification de type, puis génère le front-end et le back-end. |
| `npm test` | Exécute les tests unitaires / d'intégration Vitest. |
| `npm run test:e2e` | Exécute les tests E2E Playwright ; réussit même sans fichiers de test. |
| `npm run typecheck` | Exécute la vérification de type TypeScript pour les côtés front-end et Node. |
| `npm run lint` | Actuellement équivalent à `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## Données et sauvegarde

Les données par défaut se trouvent dans le répertoire du projet :

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

Il est recommandé de les enregistrer ensemble lors de la sauvegarde :

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

Pour restaurer, remettez ces fichiers dans le même répertoire de projet et démarrez l'application.

L'importation/exportation ZIP dans l'application est également fournie :

- Sauvegarde complète : inclut les cartes, les contextes, les médias, les étiquettes, les favoris, le statut de révision, le statut FSRS, les journaux de révision et les paramètres utilisateur.
- Partage de cartes pur : n'inclut pas les progrès de révision personnelle, le statut des favoris ou les paramètres utilisateur.

La clé API IA est une configuration locale sensible et ne sera pas transportée avec le fichier exporté ; elle doit être renseignée à nouveau après un changement d'appareil.

## Recommandations pour les fichiers multimédias

| Type | Formats pris en charge | Taille recommandée |
|------|----------|----------|
| Vidéo | `mp4` | Moins de 300 Mo par fichier |
| Audio | `mp3` | Moins de 50 Mo par fichier |
| Image | `jpg` / `png` / `webp` | Moins de 10 Mo par fichier |

## Configuration des suggestions d'IA

La page de création de cartes prend en charge des suggestions d'IA facultatives. Vous devez ajouter des configurations d'API compatibles avec OpenAI sur la page des paramètres :

- Nom d'affichage
- URL de base
- Clé API
- Modèle

Remarque :

- La création manuelle de cartes et la révision fonctionnent parfaitement bien sans configurer l'IA.
- La clé API est stockée dans la base de données locale et sera masquée sur l'interface utilisateur.
- La clé API ne sera pas incluse dans les fichiers exportés.
- L'IA n'est utilisée que pour suggérer des définitions contextuelles et des notes d'utilisation lors de la création de la carte. Ce n'est pas un dictionnaire intégré et il ne crée pas de cartes automatiquement.

## Foire aux questions (FAQ)

### Le port est occupé

Modifier `.env` :

```env
PORT=3108
```

Si le port front-end `5173` est occupé :

```bash
CLIENT_PORT=5174 npm run dev
```

### npm ci échoue sur better-sqlite3

Préférez utiliser Node.js 22 LTS. `better-sqlite3` est un module natif ; s'il n'y a pas de package précompilé disponible pour le système actuel et la version Node, il tentera une compilation locale pendant l'installation.

Linux / WSL :

```bash
sudo apt update
sudo apt install -y build-essential python3 make g++
```

macOS :

```bash
xcode-select --install
```

L'environnement natif Windows nécessite des environnements de construction natifs Python et Visual Studio Build Tools / MSVC disponibles. Si vous n'êtes pas familier avec la configuration de ces outils, il est recommandé d'utiliser WSL à la place, ou d'installer d'abord manuellement les environnements manquants et de réessayer.

### La page s'ouvre, mais les requêtes API échouent

Confirmez que le backend est en cours d'exécution :

```text
http://localhost:3107/api/health
```

Réponse normale :

```json
{"ok":true}
```

### Je veux changer le répertoire d'installation

Déplacez simplement l'intégralité du répertoire du projet. Si `.env` utilise des chemins relatifs, la base de données et le répertoire de téléchargements continueront d'être résolus par rapport au nouveau répertoire. Si `.env` utilise des chemins absolus, ils doivent être mis à jour de manière synchrone.

## Notes de développement

Pile technologique pour ce projet :

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

La première version adhère à la priorité locale, pas de dictionnaires intégrés, pas de connexions de dictionnaire, pas de liens vidéo de site Web et pas de synchronisation. La version V2 actuelle ajoute uniquement des capacités de suggestion d'IA lors de la création de la carte.

## Licence

Ce projet utilise la licence MIT. Voir [`LICENSE`](./LICENSE) pour plus de détails.
