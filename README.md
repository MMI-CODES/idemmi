# Web IDE - Java & Python Server

Un environnement de développement intégré (IDE) léger et accessible via navigateur, conçu pour exécuter du code Java et Python sur un serveur distant de façon sécurisée.

## 🌟 Fonctionnalités

- **Éditeur de Code Multi-fichiers** : Basé sur Monaco Editor (le moteur de VS Code). Supporte la coloration syntaxique et l'édition de multiples fichiers `.java` ou `.py` en simultané.
- **Console Temps Réel** : Retour direct des flux standards (`stdout`, `stderr`) depuis le serveur vers le navigateur grâce à WebSockets.
- **Sécurité et Bacs à sable** :
  - **Java** : Exécution protégée par un `SecurityManager` strict.
  - **Python** : Exécution protégée contre l'accès réseau et la manipulation du système (`os`, `subprocess`, réseau bloqués dynamiquement).
  - Prévention des attaques de type *Path Traversal*.
- **Déploiement Multi-Architecture** : Image Docker optimisée nativement pour `linux/amd64` (PC, serveurs) et `linux/arm64` (aarch64, Raspberry Pi, serveurs ARM, Mac M1/M2).
- **Auto-Installation** : Pas besoin de pré-installer Java ou Python ! Le serveur télécharge la bonne version des runtime au démarrage.

---

## 🚀 Lancement Rapide avec Docker (Recommandé)

C'est la méthode la plus simple pour déployer le projet, que ce soit en développement ou en production.

1. Clonez ce dépôt.
2. Démarrez simplement le conteneur avec `docker-compose` :

```bash
docker-compose up -d
```

L'IDE sera alors accessible sur [http://localhost:8080](http://localhost:8080).

### Build Multi-Architecture (AMD64 & ARM64)

Si vous souhaitez modifier le code et compiler votre propre image Docker publique compatible toutes architectures :

```bash
docker buildx create --use --name multiarch-builder
docker buildx build --platform linux/amd64,linux/arm64 -t votre-nom/ide-mmi:latest --push .
```

---

## 🛠️ Développement Local (Sans Docker)

Si vous préférez développer et modifier le code source directement sur votre machine locale (Node 20+ requis).

1. Installez les dépendances du projet :
```bash
npm install
```

2. Téléchargez automatiquement les environnements Java, JDK, et Python localement en tapant :
```bash
npm run setup
```

3. Lancez simultanément le client React (Vite) et le serveur Node.js (Express + Socket.io) :
```bash
npm run dev
```

L'IDE s'ouvrira sur le port standard de Vite (généralement `http://localhost:5173`), qui communiquera avec le backend tournant en arrière-plan.

---

## ⚙️ Configuration du Serveur (Variables d'environnement)

Vous pouvez ajuster les limites du serveur directement via le fichier `docker-compose.yml` ou en passant ces variables à l'exécution.

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Le port d'écoute du serveur Node.js. | `8080` |
| `MAX_CONNECTED_CLIENTS` | Nombre maximal de visiteurs sur la page web. | `200` |
| `MAX_CONCURRENT_CLIENTS` | Nombre maximal de programmes s'exécutant *à l'instant T*. | `60` |
| `CLIENT_IDLE_TIMEOUT_MS` | Déconnexion automatique si la page web est inactive. | `1800000` (30m) |
| `INACTIVITY_TIMEOUT_MS` | Temps max pour un script en attente d'input ou boucle infinie muette. | `30000` (30s) |
| `ABSOLUTE_MAX_TIME_MS` | Limite vitale du temps d'exécution total du programme. | `120000` (2m) |
| `MAX_MEMORY_MB` | RAM maximale allouée pour l'exécution d'un **seul** programme. | `128` |
| `MAX_FILES_PER_SESSION` | Nombre de fichiers textes autorisés par exécution. | `5` |
| `MAX_FILE_SIZE_BYTES` | Poids maximal uploadé par fichier code source. | `102400` (100Ko) |

---

## 🏗️ Architecture

- **Frontend** : React 18, Vite, Tailwind CSS (indirectement via classes personnalisées), Socket.IO-Client, Monaco Editor.
- **Backend** : Node.js, Express, Socket.IO.
- **Execution Engine** : Le backend reçoit les fichiers, les isole dans des dossiers temporaires uniques (UUID), compile/exécute le code via des `spawn` processus (`java.exe`, `python/bin/python`), et transmet la sortie (`stdout`/`stderr`) du processus fils vers Socket.IO.
- **Nettoyage** : Un script de nettoyage ("cleanup") ("Garbage Collector") scrute et supprime automatiquement les dossiers de sessions orphelins toutes les heures.
