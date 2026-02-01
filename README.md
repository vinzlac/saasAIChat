# Application SaaS de Chat avec LLM

Application SaaS permettant aux utilisateurs de discuter avec un LLM (Mistral) via une interface de chat, avec la possibilité d'intégrer des outils externes (tools) pour étendre les capacités du LLM. La première intégration proposée est Google Calendar via OAuth.

## 🎯 Objectifs

- Construire une application SaaS de chat avec assistant IA, sécurisée, scalable et orientée production
- Offrir une interface de chat intuitive avec un LLM performant et gratuit (Mistral)
- Permettre l'authentification email + mot de passe avec confirmation email obligatoire
- Architecture prête pour RAG (Retrieval Augmented Generation)
- Intégrer des outils externes via OAuth (commençant par Google Calendar)
- Utiliser le function calling des LLM pour interagir avec les APIs externes
- Supabase totalement masqué côté client (aucune exposition des credentials)
- Déploiement Vercel uniquement avec migrations DB automatiques en production

## 🛠️ Stack technique

- **Framework** : Next.js 14+ (App Router)
- **Base de données** : Supabase (PostgreSQL)
- **ORM** : Drizzle ORM
- **Styling** : Tailwind CSS + shadcn/ui
- **IA** : Mistral API (mistral-small-latest)
- **Hébergement** : Vercel (frontend + backend) + Supabase (base de données)
- **Intégrations** : Google Calendar API via OAuth 2.0

## 📋 Prérequis

- Node.js 18+ et npm/yarn/pnpm
- Supabase CLI
- Docker (pour Supabase local)
- Compte Mistral (API key)
- Compte Google Cloud (pour OAuth Calendar)

## 🚀 Installation

```bash
# Cloner le repository
git clone <repository-url>
cd saasAIChat

# Installer les dépendances
npm install

# Setup local : démarre Supabase, valorise .env.local, applique les migrations
npm run setup:local

# Démarrer le serveur de développement
npm run dev
```

Le script `setup:local` démarre Supabase (Docker requis), extrait les clés via `supabase status -o env`, met à jour `.env.local` et applique les migrations Drizzle.

**Variables à renseigner manuellement** après le setup (dans `.env.local`) :
- `MISTRAL_API_KEY` : [console.mistral.ai](https://console.mistral.ai/) (requis pour le chat)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` : Google Cloud Console (optionnel, pour Google Calendar et login social Google)


**Important** : En local, utilisez toujours la même URL (`http://localhost:3000` ou `http://127.0.0.1:3000`) pour éviter les problèmes de cookies OAuth entre les deux domaines.

## 🔧 Commandes Supabase (local + Cloud)

### Local (développement)

| Commande | Description |
|----------|-------------|
| `npm run setup:local` | Démarre Supabase, remplit `.env.local`, applique les migrations |
| `npm run supabase:start` | Démarre Supabase local (Docker requis) |
| `npm run supabase:stop` | Arrête Supabase local |
| `npx supabase status -o env` | Affiche les variables d'environnement locales |

### Cloud (production)

| Commande | Description |
|----------|-------------|
| `npx supabase login` | Connexion au compte Supabase (token stocké localement) |
| `npx supabase link --project-ref <REF>` | Lie le projet local au projet Cloud |
| `npx supabase db push` | Pousse les migrations Supabase vers le Cloud (schéma, triggers, storage, RLS) |
| `npx supabase config push` | Pousse `config.toml` vers le Cloud (site_url, redirect URLs, etc.) |
| `npx supabase projects list` | Liste les projets Supabase accessibles |

**Workflow Cloud** : après modification de `supabase/config.toml` (ex. `site_url`, `additional_redirect_urls`), exécuter `npx supabase config push` pour synchroniser le projet lié. Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) et [docs/adr/0001-oauth-supabase-architecture.md](docs/adr/0001-oauth-supabase-architecture.md).

**Google Cloud Console** : ajouter les URI de redirection : `http://127.0.0.1:54321/auth/v1/callback` (local), `https://<projet>.supabase.co/auth/v1/callback` (prod), `https://votre-app.vercel.app/auth/callback` (callback OAuth).

## 🔐 Variables d'environnement

Le fichier `.env.local` est créé/mis à jour par `npm run setup:local`. Variables principales :

### Local (développement)

```env
# Database (auto-rempli par setup:local)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Supabase (auto-rempli par setup:local)
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>

# Mistral (manuel - https://console.mistral.ai/)
MISTRAL_API_KEY=<your-mistral-api-key>

# Google OAuth (optionnel - Google Cloud Console)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Encryption (auto-généré par setup:local)
ENCRYPTION_KEY=<32-character-encryption-key>
```

### Production (Vercel)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL pooler Supabase (port 6543) — **requis** pour le runtime |
| `SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` |
| `SUPABASE_ANON_KEY` | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | Même que SUPABASE_URL (requis pour OAuth client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Même que SUPABASE_ANON_KEY |
| `MISTRAL_API_KEY` | Clé API Mistral |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `ENCRYPTION_KEY` | 32+ caractères aléatoires |

**Supabase Cloud** : `SUPABASE_ACCESS_TOKEN` (token personnel du Dashboard) pour `supabase link` et `supabase config push`. Stocké dans `~/.supabase/access-token` après `supabase login`.

## 🏗️ Architecture

### Schéma d'architecture globale

```mermaid
graph TB
    subgraph Client["Client (Navigateur)"]
        UI["Interface React<br/>Next.js App Router"]
    end
    
    subgraph Vercel["Vercel (Backend)"]
        API["API Routes<br/>Next.js"]
        Auth["Auth Middleware"]
        RateLimit["Rate Limiting"]
    end
    
    subgraph Supabase["Supabase"]
        DB["PostgreSQL<br/>avec RLS"]
        AuthService["Auth Service"]
        Storage["Storage<br/>Photos de profil"]
    end
    
    subgraph External["Services Externes"]
        Mistral["Mistral API<br/>LLM"]
        Google["Google Calendar API"]
    end
    
    UI -->|HTTPS| API
    API -->|Impersonation| AuthService
    API -->|Queries avec RLS| DB
    API -->|Upload| Storage
    API -->|Streaming| Mistral
    API -->|OAuth Tokens| Google
    
    Auth -->|Protection routes| API
    RateLimit -->|60 req/h| API
    
    style Client fill:#e1f5ff
    style Vercel fill:#fff4e1
    style Supabase fill:#3ecf8e
    style External fill:#ffd4e1
```

### Flux de données

```mermaid
graph LR
    subgraph Frontend["Frontend"]
        Pages["Pages React"]
        Components["Client Components"]
    end
    
    subgraph Backend["Backend API"]
        Routes["API Routes"]
        Lib["Lib Utilities"]
    end
    
    subgraph Database["Database"]
        Tables["Tables PostgreSQL"]
        RLS["Row Level Security"]
    end
    
    Pages -->|Requêtes HTTP| Routes
    Components -->|Requêtes HTTP| Routes
    Routes -->|Drizzle ORM| Tables
    Routes -->|Supabase Client| Tables
    Tables -->|Politiques| RLS
    
    style Frontend fill:#e1f5ff
    style Backend fill:#fff4e1
    style Database fill:#3ecf8e
```

## 📊 Diagrammes de séquence

### Flux d'authentification

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend API
    participant SA as Supabase Auth
    participant DB as Database

    Note over U,DB: Inscription
    U->>F: Remplit formulaire inscription
    F->>B: POST /api/auth/signup
    B->>SA: Créer utilisateur
    SA->>SA: Envoyer email confirmation
    SA->>B: Utilisateur créé (non confirmé)
    B->>F: Redirection /verify-email
    F->>U: Affiche page vérification
    
    Note over U,DB: Confirmation email
    U->>F: Clique lien email
    F->>B: GET /auth/confirm?token=...
    B->>SA: Vérifier token OTP
    SA->>B: Token valide
    B->>SA: Créer session
    SA->>B: Cookies httpOnly
    B->>F: Redirection /app
    F->>U: Interface principale
    
    Note over U,DB: Connexion
    U->>F: Remplit formulaire connexion
    F->>B: POST /api/auth/login
    B->>SA: Authentifier
    SA->>DB: Vérifier credentials
    DB->>SA: Utilisateur valide
    SA->>B: Session créée
    B->>F: Succès
    F->>U: Redirection /app
```

### Flux de chat avec LLM

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend API
    participant DB as Database
    participant M as Mistral API

    U->>F: Écrit message
    F->>B: POST /api/messages<br/>(créer message user)
    B->>DB: Insérer message (role='user')
    DB->>B: Message créé
    B->>F: Message sauvegardé
    
    F->>B: POST /api/chat<br/>(streaming)
    B->>B: Vérifier rate limit
    B->>DB: Lire historique conversation
    DB->>B: Historique
    B->>M: Appel API avec contexte
    M-->>B: Stream réponse
    B-->>F: Stream chunks
    F-->>U: Affiche réponse en temps réel
    
    B->>DB: Insérer message assistant<br/>(via service role)
    DB->>B: Message sauvegardé
```

### Flux OAuth Google Calendar

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend API
    participant G as Google OAuth
    participant GC as Google Calendar API
    participant DB as Database

    U->>F: Clique "Connecter Google Calendar"
    F->>B: GET /api/oauth/google/authorize
    B->>G: Redirection avec Client ID
    G->>U: Page d'autorisation Google
    U->>G: Autorise l'application
    G->>B: Callback avec code
    B->>G: Échange code contre tokens
    G->>B: Access token + Refresh token
    B->>B: Chiffrer tokens
    B->>DB: Stocker tokens chiffrés
    DB->>B: Tokens sauvegardés
    B->>F: Connexion réussie
    F->>U: Affiche "Connecté"
    
    Note over U,GC: Utilisation dans le chat
    U->>F: "Quels sont mes rendez-vous aujourd'hui ?"
    F->>B: POST /api/chat
    B->>M: Appel Mistral avec function definitions
    M->>B: Réponse avec function call
    B->>DB: Récupérer tokens (déchiffrer)
    DB->>B: Tokens
    B->>GC: GET /calendar/v3/events<br/>(avec access token)
    GC->>B: Liste des événements
    B->>M: Résultat de la fonction
    M->>B: Réponse textuelle formatée
    B->>F: Réponse du LLM
    F->>U: Affiche la réponse
```

### Flux de function calling

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend API
    participant M as Mistral API
    participant FH as Function Handler
    participant GC as Google Calendar API
    participant DB as Database

    U->>F: "Quels sont mes rendez-vous cette semaine ?"
    F->>B: POST /api/chat
    B->>DB: Lire historique
    DB->>B: Historique
    B->>M: Message + Function definitions
    M->>B: Réponse avec function_call<br/>(get_upcoming_events)
    
    B->>FH: Exécuter function call
    FH->>DB: Récupérer tokens OAuth
    DB->>FH: Tokens (déchiffrés)
    FH->>GC: GET events (7 jours)
    GC->>FH: Événements
    FH->>B: Résultat fonction
    
    B->>M: Résultat + continuer conversation
    M->>B: Réponse textuelle formatée
    B-->>F: Stream réponse
    F-->>U: Affiche réponse formatée
```

## 🔒 Sécurité

### Principes fondamentaux

1. **Supabase masqué** : Aucune variable `NEXT_PUBLIC_*` exposant Supabase
2. **RLS obligatoire** : Toutes les tables avec politiques Row Level Security
3. **Service role strict** : Uniquement pour messages assistant
4. **Confirmation email** : Obligatoire avant création de session
5. **Rate limiting** : 60 requêtes/heure global
6. **Tokens OAuth** : Chiffrement des tokens stockés en base

### Row Level Security (RLS)

- **Lecture** : User peut lire uniquement ses propres données
- **Écriture** : 
  - User peut écrire uniquement `role='user'`
  - User ne peut jamais écrire `role='assistant'`
  - Backend (service role) peut écrire `role='assistant'`

## 📁 Structure du projet

```
saasAIChat/
├── src/
│   ├── app/
│   │   ├── api/              # API Routes
│   │   │   ├── auth/         # Authentification
│   │   │   ├── user/         # Profil utilisateur
│   │   │   ├── chat/         # Chat et LLM
│   │   │   ├── messages/     # Messages
│   │   │   ├── conversations/# Conversations
│   │   │   └── oauth/        # OAuth Google
│   │   ├── app/              # Pages app (protégées)
│   │   ├── auth/             # Routes auth
│   │   ├── login/            # Page connexion
│   │   ├── signup/           # Page inscription
│   │   └── verify-email/     # Page vérification email
│   ├── components/
│   │   ├── ui/               # shadcn/ui
│   │   ├── auth/             # Composants auth
│   │   ├── chat/             # Composants chat
│   │   ├── layout/           # Layout app
│   │   ├── profile/          # Composants profil
│   │   └── settings/         # Composants paramètres
│   ├── lib/
│   │   ├── supabase/         # Client Supabase
│   │   ├── mistral/          # Client Mistral
│   │   ├── google-calendar/  # Google Calendar API
│   │   ├── oauth/            # OAuth Google
│   │   └── ...               # Autres utilitaires
│   ├── db/
│   │   ├── schema.ts         # Schéma Drizzle
│   │   ├── index.ts          # Connexion DB
│   │   └── migrate.ts        # Script migration
│   └── middleware.ts         # Middleware Next.js
├── drizzle/                  # Migrations SQL
├── supabase/                 # Config Supabase
│   ├── config.toml
│   └── migrations/
├── .cursor/rules/            # Règles Cursor
├── public/                   # Assets statiques
├── PRD.md                    # Product Requirements Document
└── README.md                 # Ce fichier
```

## 🚀 Déploiement

### Production (Vercel)

1. Connecter le repository à Vercel
2. Configurer les variables d'environnement dans Vercel (voir ci-dessous)
3. Les migrations s'exécutent automatiquement pendant le build (si `VERCEL_ENV=production`)

**Variables d'environnement production :**
- `DATABASE_URL` - URL PostgreSQL pooler Supabase (port 6543)
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` - URL du projet Supabase
- `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé anonyme Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé service role Supabase
- `MISTRAL_API_KEY` - Clé API Mistral
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth Google
- `ENCRYPTION_KEY` - Clé de chiffrement (32 caractères min) pour tokens OAuth

Voir [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour le guide complet.

### Migrations

```bash
# Local
npm run db:migrate

# Production (automatique via Vercel build)
# Script exécuté uniquement si VERCEL_ENV=production
```

## 📝 Endpoints API

### Authentification
- `POST /api/auth/signup` - Création de compte
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/resend` - Renvoyer email confirmation
- `POST /api/auth/forgot-password` - Demande réinitialisation mot de passe
- `POST /api/auth/reset-password` - Nouveau mot de passe (session recovery)
- `GET /api/auth/me` - Utilisateur connecté
- `GET /auth/confirm` - Confirmation email / récupération mot de passe

### Profil
- `GET /api/user/profile` - Récupération profil
- `PUT /api/user/profile` - Mise à jour profil
- `POST /api/user/profile/picture` - Upload photo
- `DELETE /api/user/profile/picture` - Suppression photo

### Chat
- `POST /api/messages` - Créer message
- `POST /api/chat` - Chat avec LLM (streaming)
- `GET /api/conversations` - Liste conversations
- `POST /api/conversations` - Créer conversation
- `GET /api/messages?conversation_id=...` - Messages d'une conversation

### OAuth Google Calendar
- `GET /api/oauth/google/authorize` - Initier OAuth
- `GET /api/oauth/google/callback` - Callback OAuth
- `GET /api/oauth/google/status` - Statut connexion
- `DELETE /api/oauth/google/disconnect` - Déconnexion

## 🧪 Développement

```bash
# Setup complet (Supabase + .env.local + migrations)
npm run setup:local

# Ou manuellement :
npm run supabase:start   # Démarrer Supabase
npm run supabase:stop   # Arrêter Supabase
npm run db:migrate      # Appliquer les migrations
npm run db:generate     # Générer les types Drizzle

# Démarrer le serveur de développement
npm run dev

# Build production
npm run build
```

## 📚 Documentation

- [PRD.md](./PRD.md) - Product Requirements Document complet
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Guide de déploiement Vercel + Supabase Cloud
- [docs/adr/0001-oauth-supabase-architecture.md](docs/adr/0001-oauth-supabase-architecture.md) - ADR Architecture OAuth et Supabase
- [.cursor/rules/](./.cursor/rules/) - Règles de développement Cursor

## 🤝 Contribution

Ce projet est en développement actif. Consultez le PRD pour comprendre les fonctionnalités et contraintes.

## 📄 Licence

[À définir]

