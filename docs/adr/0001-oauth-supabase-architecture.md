# ADR 0001 : Architecture OAuth et Supabase (local + Cloud)

## Statut

Accepté (2026-01-30)

## Contexte

L'application SaaS AI Chat utilise Supabase pour l'authentification (email/mot de passe + OAuth Google). Le déploiement sur Vercel avec Supabase Cloud a nécessité de résoudre plusieurs problèmes d'architecture :

1. **PKCE flow** : Supabase utilise PKCE pour OAuth. Le code verifier est stocké côté client avant la redirection et doit être lu côté serveur lors du callback.
2. **Configuration multi-environnement** : Même fichier `config.toml` pour le développement local (Supabase local) et la production (Supabase Cloud).
3. **Redirect URLs** : Les URLs de callback OAuth doivent être autorisées dans Supabase et correspondre exactement au domaine utilisé (Vercel peut avoir plusieurs domaines : production, preview, etc.).
4. **Cookies en serverless** : Sur Vercel, le callback OAuth s'exécute en serverless ; la lecture des cookies doit être fiable.

## Décisions

### 1. OAuth côté client avec PKCE

- **signInWithOAuth** est appelé côté client (`createBrowserClient` de `@supabase/ssr`) pour que le code verifier PKCE soit stocké dans les cookies du navigateur avant la redirection vers Google.
- **redirectTo** utilise systématiquement `window.location.origin + '/auth/callback'` pour garantir que l'utilisateur revient sur le même domaine (évite les problèmes de cookies cross-domain).

### 2. Callback OAuth avec request/response explicites

- Le callback `/auth/callback` utilise `createServerClient` avec des handlers de cookies explicites :
  - `getAll()` : lit depuis `request.cookies.getAll()`
  - `setAll()` : écrit vers `response.cookies.set()`
- Cette approche (identique au middleware) assure une lecture fiable des cookies sur Vercel, par rapport à `cookies()` de `next/headers` qui peut avoir des comportements différents en serverless.
- **Construction de l'URL de redirection** : `protocol` doit inclure le `:` (ex. `"https:"`) pour éviter des URLs malformées (`https//...` au lieu de `https://...`). Utilisation de `x-forwarded-proto` et `x-forwarded-host` pour le reverse proxy Vercel.

### 3. Middleware et matcher

- Le middleware inclut `/auth/callback` dans son matcher pour que les requêtes OAuth passent par le middleware (gestion des cookies, refresh de session).
- Le middleware utilise `createServerClient` avec `request.cookies` et `response.cookies` pour la cohérence avec le callback.

### 4. Config Supabase : config.toml comme source de vérité

- **Un seul fichier** `supabase/config.toml` pour local et Cloud.
- **site_url** : URL de production (ex. `https://saas-ai-chat-xi.vercel.app/`).
- **additional_redirect_urls** : inclut à la fois les URLs local (localhost, 127.0.0.1) et prod (Vercel) avec wildcards pour les preview deployments.
- **Synchronisation Cloud** : `npx supabase config push` pousse la config locale vers le projet Cloud lié (`supabase link`).
- Après toute modification de `site_url` ou `additional_redirect_urls`, exécuter `supabase config push`.

### 5. Variables d'environnement

- **Local** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (auto-remplies par `setup:local`).
- **Production** : mêmes variables + `DATABASE_URL` (URL pooler Supabase, port 6543) pour Drizzle et le runtime Vercel.
- **NEXT_PUBLIC_*** : requis pour `signInWithOAuth` côté client (createBrowserClient).

### 6. Google Cloud Console

- **Authorized redirect URIs** doit inclure :
  - `https://[PROJECT_REF].supabase.co/auth/v1/callback` (Supabase Auth)
  - `https://[ton-domaine-vercel].vercel.app/auth/callback` (callback de l'app)

## Conséquences

### Positives

- OAuth Google fonctionne en local et en production.
- Config versionnée dans Git via `config.toml`.
- Redéploiement reproductible avec `supabase config push`.
- Pas de divergence entre config locale et Cloud si le workflow est respecté.

### Négatives / Points d'attention

- **site_url** en prod dans config.toml : en dev local, les liens générés par Auth (ex. reset password) pointent vers la prod. Acceptable car les emails ne sont généralement pas envoyés en local.
- **Nouveau domaine Vercel** : ajouter l'URL dans `additional_redirect_urls` et exécuter `supabase config push`.
- **SUPABASE_ACCESS_TOKEN** : requis pour `supabase config push` et `supabase link` (token personnel Supabase Dashboard).

## Références

- [Supabase Auth PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase SSR Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase config push](https://supabase.com/docs/reference/cli/supabase-config-push)
- [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
