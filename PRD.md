# PRD - Application SaaS de Chat avec LLM

## 1. Vue d'ensemble du produit

### 1.1 Description
Application SaaS permettant aux utilisateurs de discuter avec un LLM (Mistral) via une interface de chat, avec la possibilité d'intégrer des outils externes (tools) pour étendre les capacités du LLM. La première intégration proposée est Google Calendar via OAuth.

### 1.2 Objectifs
- Construire une application SaaS de chat avec assistant IA, sécurisée, scalable et orientée production
- Offrir une interface de chat intuitive avec un LLM performant et gratuit (Mistral)
- Permettre l'authentification email + mot de passe avec confirmation email obligatoire
- Architecture prête pour RAG (Retrieval Augmented Generation)
- Intégrer des outils externes via OAuth (commençant par Google Calendar)
- Utiliser le function calling des LLM pour interagir avec les APIs externes
- Supabase totalement masqué côté client (aucune exposition des credentials)
- Déploiement Vercel uniquement avec migrations DB automatiques en production

### 1.3 Public cible
Utilisateurs professionnels et personnels souhaitant interagir avec un assistant IA pour gérer leur calendrier et d'autres tâches via des outils connectés.

## 2. Fonctionnalités principales

### 2.1 Authentification et gestion de compte

#### 2.1.1 Création de compte
- **Champs requis** :
  - Email (validation format email)
  - Nom (obligatoire)
  - Prénom (obligatoire)
  - Mot de passe (minimum 8 caractères, avec validation de sécurité)
- **Validation** : Vérification de l'unicité de l'email
- **Confirmation** : **Confirmation email obligatoire**
  - Aucune session créée tant que l'email n'est pas confirmé
  - Email de confirmation envoyé automatiquement
  - Redirection vers `/verify-email` après inscription

#### 2.1.2 Connexion
- Authentification par email/mot de passe
- Gestion des sessions via cookies httpOnly (Supabase Auth)
- Auto-login après confirmation d'email
- Récupération de mot de passe (oublié)

#### 2.1.3 Page de vérification email
- Route : `/verify-email`
- Message explicatif
- Champ email
- Bouton "Renvoyer l'email"
- Backend : `POST /api/auth/resend` avec réponse générique (anti-énumération)

#### 2.1.4 Confirmation + auto-login
- Lien email → `/auth/confirm`
- Backend :
  - Vérifie OTP
  - Crée la session
  - Pose les cookies httpOnly
  - Redirection vers `/app`
- Lien expiré : redirection vers `/verify-email?error=expired`

#### 2.1.5 Déconnexion
- Bouton de déconnexion accessible depuis le profil
- Endpoint : `POST /api/auth/logout`
- Invalidation de la session côté serveur
- Suppression des cookies
- Redirection vers la page de connexion

### 2.2 Gestion de profil utilisateur

#### 2.2.1 Informations de base
- Affichage des informations de compte (email, nom, prénom) - non modifiables après création
- Modification de la description personnelle (texte libre, max 500 caractères)
- Upload et modification de la photo de profil
  - Formats acceptés : JPG, PNG, WebP
  - Taille maximale : 5 MB
  - Dimensions recommandées : 200x200px (redimensionnement automatique)
- Gestion des passe-temps (hobbies)
  - Ajout/suppression de passe-temps
  - Liste de passe-temps (tags/chips)
  - Maximum 10 passe-temps

#### 2.2.2 Interface profil
- Page dédiée accessible depuis le menu utilisateur
- Formulaire d'édition avec sauvegarde
- Prévisualisation de la photo avant upload

### 2.3 Interface de chat avec LLM

#### 2.3.1 Bouton IA
- Bouton flottant ou dans la barre de navigation
- Icône distinctive (robot/IA)
- Ouverture d'une fenêtre modale/fenêtre de chat

#### 2.3.2 Fenêtre de chat
- Interface de chat en temps réel
- Zone de saisie de message
- Historique des conversations (sauvegarde persistante en base de données)
- Streaming des réponses LLM (HTTP streaming - SSE ou fetch streaming)
- Indicateur de frappe (typing indicator)
- Affichage des réponses du LLM avec formatage markdown
- Possibilité de copier les réponses
- Bouton pour effacer l'historique de conversation
- Multi-utilisateurs : chaque utilisateur a son propre historique (pas de partage de conversations)
- **Architecture prête pour RAG** : structure de données prévue pour intégration future

#### 2.3.3 Intégration Mistral
- Utilisation de l'API Mistral avec le modèle **mistral-small-latest**
- Gestion des erreurs API (rate limiting, timeouts)
- Streaming des réponses pour une meilleure UX (HTTP streaming - SSE ou fetch streaming)
- Gestion du contexte de conversation (historique)
- Rate limiting global : 60 requêtes/heure en tout
- **Backend-only** : Aucun appel IA côté client

#### 2.3.4 Flow standard du chat
1. User écrit un message
2. Frontend → `POST /api/messages` (crée le message utilisateur en DB)
3. Frontend → `POST /api/chat` (envoie au LLM)
4. Backend :
   - Vérifie accès conversation
   - Lit l'historique
   - Appelle le LLM (Mistral)
   - Stream la réponse
   - Écrit le message assistant en DB (via service role)
5. Frontend affiche la réponse en streaming

### 2.4 Intégration Google Calendar (Tools)

#### 2.4.1 Connexion OAuth
- Bouton "Connecter Google Calendar" dans les paramètres/compte
- Flux OAuth 2.0 avec Google
  - Redirection vers Google pour authentification
  - Autorisation des scopes nécessaires : `https://www.googleapis.com/auth/calendar.readonly` (au minimum)
  - Récupération du token d'accès et refresh token
  - Stockage sécurisé des tokens (chiffrement)
- Gestion de la déconnexion de Google Calendar
- Indicateur visuel de l'état de connexion (connecté/déconnecté)

#### 2.4.2 Configuration OAuth
- Stockage des credentials Google (Client ID, Client Secret) dans les variables d'environnement
- Support de différents environnements (dev, staging, prod)

#### 2.4.3 Function Calling / Tool Calling
- Définition des fonctions disponibles pour le LLM :
  - `get_calendar_events(date: string, timeMin?: string, timeMax?: string)` : Récupérer les événements du calendrier
  - `get_today_events()` : Récupérer les événements d'aujourd'hui
  - `get_upcoming_events(days: number)` : Récupérer les prochains événements
- Le LLM peut appeler ces fonctions automatiquement selon la requête de l'utilisateur
- Format des réponses : texte naturel généré par le LLM à partir des données du calendrier
- Gestion des erreurs API Google (token expiré, permissions insuffisantes, etc.)

#### 2.4.4 Exemples d'utilisation
- "Quels sont mes rendez-vous prévus aujourd'hui ?"
- "Qu'est-ce que j'ai de prévu cette semaine ?"
- "Quel est mon prochain rendez-vous ?"
- "Résume-moi mes événements de demain"

#### 2.4.5 Extensibilité
- Architecture modulaire pour permettre l'ajout d'autres intégrations (tools) à l'avenir
- Exemples d'intégrations futures : Slack, Gmail, etc.

## 3. Architecture technique

### 3.1 Stack technique

#### Frontend / Backend
- **Framework** : Next.js (App Router)
  - Server Components (SSR, sécurité, auth)
  - Client Components (UI, chat, streaming)
- **Déploiement** : Vercel uniquement

#### UI / Design System
- **Styling** : Tailwind CSS
  - Styling utilitaire
  - Thème centralisé
  - Dark mode via class
- **Composants** : shadcn/ui
  - Composants accessibles (Radix UI)
  - Code copié dans le repo (pas de dépendance runtime)
  - Customisation via Tailwind
  - Zéro vendor lock-in

#### Backend & Base de données
- **Base de données** : Supabase
  - Auth (email + password)
  - PostgreSQL
  - Row Level Security (RLS) obligatoire
  - Supabase CLI pour développement local
  - DB locale (Docker)
- **ORM** : Drizzle ORM
  - Schéma typé
  - Migrations SQL versionnées

#### IA
- **LLM** : Backend-only (API externe)
  - Streaming HTTP (SSE ou fetch streaming)
  - Aucun appel IA côté client
  - API Mistral (modèle mistral-small-latest)

#### Intégrations
- API Google Calendar : Google APIs Client Library
- OAuth 2.0 : Bibliothèque OAuth standard

### 3.2 Architecture des données

#### Tables principales (v1)

**conversations**
```
id: uuid (PK)
created_by: uuid (FK -> auth.users)
title: text
created_at: timestamp
```

**messages**
```
id: uuid (PK)
conversation_id: uuid (FK -> conversations)
role: enum ('user', 'assistant')
content: text
created_by: uuid / NULL (FK -> auth.users, NULL pour assistant)
created_at: timestamp
```

#### Row Level Security (RLS) - Obligatoire

**Lecture**
- User peut lire :
  - Ses propres conversations
  - Tous les messages associés à ses conversations

**Écriture**
- User :
  - Peut écrire uniquement `role = 'user'`
  - Ne peut jamais écrire `role = 'assistant'`
- Backend (service role / RPC) :
  - Peut écrire `role = 'assistant'`

#### Modèle Utilisateur (Supabase Auth)
- Géré par Supabase Auth (table `auth.users`)
- Profil utilisateur étendu via table `profiles` si nécessaire

#### Modèle OAuth Connection
```
oauth_connections {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users)
  provider: string (e.g., "google_calendar")
  access_token: text (encrypted)
  refresh_token: text (encrypted, nullable)
  token_expires_at: timestamp (nullable)
  scopes: text[]
  created_at: timestamp
  updated_at: timestamp
}
```

### 3.3 Principes d'architecture fondamentaux

#### 3.3.1 Supabase masqué à 100%
- ❌ Pas de `SUPABASE_URL` côté client
- ❌ Pas de `ANON_KEY` côté client
- ❌ Pas de SDK Supabase dans le navigateur
- ✅ Frontend → API Next.js uniquement
- ✅ Backend → Supabase uniquement
- ❌ Aucune variable `NEXT_PUBLIC_*` exposant Supabase

#### 3.3.2 Auth & Impersonation
- Supabase Auth = IAM officiel
- Sessions stockées en cookies httpOnly
- Le backend :
  - Lit le JWT depuis les cookies
  - Appelle Supabase en impersonation
  - RLS s'applique comme si l'utilisateur appelait directement la DB

#### 3.3.3 Service Role (usage strict)
Utilisée uniquement pour :
- Écrire les messages assistant
- Jobs système
- Webhooks
- Opérations admin

❌ Jamais pour le CRUD utilisateur standard

#### 3.3.4 Rendering & Components

**Server Components (SSR)**
Utilisés pour :
- Landing page
- Pages auth
- Layout app
- Protection des routes (`/app`)

Avantages :
- Lecture directe des cookies
- Pas de flash "logged out"
- Sécurité native

**Client Components**
Utilisés pour :
- UI du chat
- Formulaires interactifs
- Streaming des réponses

**Structure UI**
```
/components/ui/        → shadcn/ui
/components/chat/      → UI métier chat
/components/layout/    → layout app
```

UI = affichage uniquement. Aucune logique métier dans les composants.

### 3.4 Environnements

#### 3.4.1 Environnements supportés

| Environnement | Usage |
|--------------|-------|
| Local | Développement + preview |
| Production | Utilisateurs réels |

- ❌ Pas d'environnement "preview" Vercel
- ❌ Pas de GitHub Actions
- ✅ Local = preview unique

#### 3.4.2 Bases de données

**Local**
- Supabase CLI (`supabase start`)
- PostgreSQL Docker
- `DATABASE_URL` → DB locale

**Production**
- Supabase Cloud
- `DATABASE_URL` → DB production

Chaque environnement possède sa base dédiée.

### 3.5 Migrations DB (Drizzle)

#### 3.5.1 Outil
- Drizzle ORM
- Migrations SQL versionnées (`/drizzle/*.sql`)

#### 3.5.2 Local
- Supabase CLI
- `DATABASE_URL` → DB locale
- Migrations appliquées manuellement

#### 3.5.3 Production (Vercel uniquement)
- Migrations exécutées pendant le build
- Script `db:migrate` :
  - PostgreSQL advisory lock
  - `drizzle-kit migrate`
  - Exécuté uniquement si `VERCEL_ENV=production`

#### 3.5.4 Sécurité migrations
- Une migration à la fois
- Pas de migrations en preview
- Migrations additives recommandées

### 3.6 Variables d'environnement

#### Local
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

#### Production (Vercel)
```env
DATABASE_URL=postgresql://postgres:***@db.<project>.supabase.co:5432/postgres
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

❌ Aucune variable `NEXT_PUBLIC_*`

### 3.7 Flux d'authentification OAuth

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant B as Backend
    participant G as Google OAuth
    participant GC as Google Calendar API

    U->>F: Clique "Connecter Google Calendar"
    F->>B: GET /api/oauth/google/authorize
    B->>G: Redirection avec Client ID
    G->>U: Page d'autorisation Google
    U->>G: Autorise l'application
    G->>B: Callback avec code d'autorisation
    B->>G: Échange code contre tokens
    G->>B: Access token + Refresh token
    B->>B: Stocke tokens (chiffrés)
    B->>F: Confirmation de connexion
    F->>U: Affiche "Connecté"
    
    Note over U,GC: Utilisation dans le chat
    U->>F: "Quels sont mes rendez-vous aujourd'hui ?"
    F->>B: POST /api/chat (message)
    B->>B: Appelle Mistral API avec function definitions
    B->>Mistral: Requête avec message + tools
    Mistral->>B: Réponse avec function call
    B->>GC: GET /calendar/v3/events (avec access token)
    GC->>B: Liste des événements
    B->>Mistral: Résultat de la fonction
    Mistral->>B: Réponse textuelle formatée
    B->>F: Réponse du LLM
    F->>U: Affiche la réponse
```

## 4. Sécurité (non négociable)

### 4.1 Authentification
- Hashage des mots de passe via Supabase Auth
- Cookies httpOnly pour les sessions
- Validation des entrées utilisateur
- Protection CSRF
- Rate limiting sur les endpoints d'authentification (60 requêtes/heure global)

### 4.2 Supabase invisible côté client
- Aucune exposition des credentials Supabase
- Toutes les interactions passent par l'API Next.js
- Service role jamais exposée

### 4.3 Row Level Security (RLS)
- RLS activé partout
- Politiques de sécurité au niveau de la base de données
- Backend valide toujours l'identité

### 4.4 Tokens OAuth
- Chiffrement des tokens stockés en base de données
- Refresh automatique des tokens expirés
- Révocation des tokens en cas de déconnexion
- Stockage sécurisé des credentials OAuth (variables d'environnement)

### 4.5 Données utilisateur
- Validation et sanitization des inputs
- Protection contre les injections SQL/NoSQL
- HTTPS obligatoire en production
- CORS configuré correctement

## 5. Expérience utilisateur (UX)

### 5.1 Design
- Interface moderne et épurée
- Mode sombre/clair (optionnel mais recommandé)
- Responsive design (mobile, tablette, desktop)
- Animations subtiles pour les interactions

### 5.2 Performance
- Temps de chargement initial < 3 secondes
- Streaming des réponses LLM pour une perception de rapidité
- Lazy loading des composants
- Mise en cache des données statiques

### 5.3 Accessibilité
- Support du clavier (navigation)
- Contraste de couleurs suffisant
- Labels ARIA pour les éléments interactifs
- Support des lecteurs d'écran

## 6. Décisions techniques et fonctionnelles

### 6.1 Stack technique
- **Frontend/Backend** : Next.js (App Router)
- **Base de données** : Supabase (PostgreSQL)
- **ORM** : Drizzle ORM
- **Hébergement** : Vercel uniquement (frontend + backend) + Supabase (base de données)
- **Modèle Mistral** : mistral-small-latest

### 6.2 Fonctionnalités
- **Historique des conversations** : Sauvegarde persistante en base de données
- **Rate limiting** : 60 requêtes/heure en tout (global)
- **Multi-utilisateurs** : Oui, mais pas de partage de conversations (chaque utilisateur a son propre historique)
- **Tools** : Google Calendar pour le moment, architecture prévue pour ajouter d'autres intégrations (Slack, etc.)

### 6.3 Business
- **Modèle de pricing** : Gratuit
- **Support** : Aucun support client prévu

## 7. Roadmap

### Phase 1 - MVP
- Authentification (création, connexion, déconnexion)
- Gestion de profil (description, photo, passe-temps)
- Interface de chat basique avec Mistral

### Phase 2 - Intégrations
- Intégration Google Calendar OAuth
- Function calling pour Google Calendar

### Phase 3 - Améliorations
- Historique des conversations (sauvegarde persistante)
- Amélioration de l'UX du chat
- Gestion avancée des erreurs
- Tests et optimisations

### Phase 4 - Extensions
- Autres intégrations (Slack, etc.)
- Application mobile en PWA (Progressive Web App)

## 8. Métriques de succès

- Taux d'inscription et d'activation
- Nombre de messages par utilisateur
- Temps de réponse moyen du LLM
- Taux d'erreur des appels API

## 9. Risques et mitigations

### Risques techniques
- **API Mistral indisponible** : Gestion des erreurs, retry logic, fallback
- **Token OAuth expiré** : Refresh automatique, notification utilisateur
- **Rate limiting** : Queue des requêtes, gestion des limites (60 requêtes/heure)

### Risques sécurité
- **Attaques** : Rate limiting, validation stricte, monitoring

## 10. Dépendances externes

- API Mistral (disponibilité et limites)
- Services d'hébergement : Vercel
- Services de base de données : Supabase

## 11. Spécifications techniques détaillées

### 11.1 Endpoints API

#### Authentification
- `POST /api/auth/signup` - Création de compte (redirige vers `/verify-email`)
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `POST /api/auth/resend` - Renvoyer l'email de confirmation (réponse générique anti-énumération)
- `GET /api/auth/me` - Récupération de l'utilisateur connecté
- `GET /auth/confirm` - Confirmation d'email (lien depuis email, auto-login + redirection vers `/app`)
- Route `/verify-email` - Page de vérification email (avec champ email et bouton renvoyer)

#### Profil utilisateur
- `GET /api/user/profile` - Récupération du profil
- `PUT /api/user/profile` - Mise à jour du profil
- `POST /api/user/profile/picture` - Upload de la photo de profil
- `DELETE /api/user/profile/picture` - Suppression de la photo

#### Chat
- `POST /api/messages` - Création d'un message utilisateur
- `POST /api/chat` - Envoi d'un message au LLM (streaming)
- `GET /api/conversations` - Liste des conversations
- `POST /api/conversations` - Création d'une conversation
- `GET /api/messages` - Récupération des messages d'une conversation

#### OAuth Google Calendar
- `GET /api/oauth/google/authorize` - Initiation du flux OAuth
- `GET /api/oauth/google/callback` - Callback OAuth
- `GET /api/oauth/google/status` - Statut de la connexion
- `DELETE /api/oauth/google/disconnect` - Déconnexion

### 11.2 Schémas de données détaillés

#### Requête de création de compte
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePassword123!"
}
```

#### Réponse de profil utilisateur
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "description": "Développeur passionné",
  "profile_picture_url": "https://...",
  "hobbies": ["programmation", "lecture", "sport"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

#### Requête de chat
```json
{
  "message": "Quels sont mes rendez-vous prévus aujourd'hui ?",
  "conversation_id": "uuid (optionnel)"
}
```

#### Réponse de chat avec function calling
```json
{
  "response": "Vous avez 3 rendez-vous aujourd'hui...",
  "conversation_id": "uuid",
  "function_calls": [
    {
      "function": "get_today_events",
      "result": {...}
    }
  ]
}
```

### 11.3 Définition des fonctions pour Mistral

#### get_today_events
```json
{
  "name": "get_today_events",
  "description": "Récupère tous les événements du calendrier pour aujourd'hui",
  "parameters": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

#### get_calendar_events
```json
{
  "name": "get_calendar_events",
  "description": "Récupère les événements du calendrier pour une période donnée",
  "parameters": {
    "type": "object",
    "properties": {
      "date": {
        "type": "string",
        "description": "Date au format ISO 8601 (YYYY-MM-DD)"
      },
      "timeMin": {
        "type": "string",
        "description": "Heure de début au format ISO 8601 (optionnel)"
      },
      "timeMax": {
        "type": "string",
        "description": "Heure de fin au format ISO 8601 (optionnel)"
      }
    },
    "required": ["date"]
  }
}
```

#### get_upcoming_events
```json
{
  "name": "get_upcoming_events",
  "description": "Récupère les prochains événements pour un nombre de jours donné",
  "parameters": {
    "type": "object",
    "properties": {
      "days": {
        "type": "integer",
        "description": "Nombre de jours à partir d'aujourd'hui",
        "minimum": 1,
        "maximum": 30
      }
    },
    "required": ["days"]
  }
}
```

## 12. Contraintes et limitations

### 12.1 Contraintes techniques
- Dépendance à la disponibilité de l'API Mistral
- Rate limiting global : 60 requêtes/heure en tout
- Quotas de l'API Google Calendar (1 000 000 requêtes/jour par défaut)
- Limites de stockage Supabase pour les photos de profil
- Limites de taille des messages dans le chat
- Limites des fonctions serverless Vercel (timeout, mémoire)

### 12.2 Contraintes fonctionnelles
- Un seul compte Google Calendar par utilisateur
- Historique des conversations : sauvegarde persistante (pas de limite définie pour le moment)
- Multi-utilisateurs : oui, mais pas de partage de conversations
- Taille maximale des messages (à définir selon les limites de l'API Mistral)

## 13. Évolutions prévues (hors v1)

### 13.1 RAG (Retrieval Augmented Generation)
- Table `documents` : stockage des documents utilisateur
- Table `document_chunks` : chunks de documents pour l'indexation
- Table `embeddings` : vecteurs d'embeddings (pgvector)
- Retrieval dans `/api/chat` : recherche sémantique avant appel LLM

### 13.2 SaaS Multi-tenant
- Table `workspaces` : organisations/équipes
- Table `workspace_members` : membres des workspaces
- Rôles : owner, admin, member
- Quotas par workspace
- Billing : facturation par workspace

### 13.3 Audit logs
- Table `audit_logs` : traçabilité des actions
- Logs des appels API
- Logs des modifications de données sensibles

## 14. Glossaire

- **LLM** : Large Language Model (Modèle de langage à grande échelle)
- **OAuth** : Protocole d'autorisation ouvert permettant à des applications d'accéder à des ressources protégées
- **Function Calling / Tool Calling** : Capacité des LLM à appeler des fonctions externes basées sur le contexte de la conversation
- **MCP** : Model Context Protocol (protocole permettant aux LLM d'interagir avec des outils externes)
- **JWT** : JSON Web Token, standard pour l'authentification
- **SSE** : Server-Sent Events, protocole permettant au serveur d'envoyer des données au client en temps réel

