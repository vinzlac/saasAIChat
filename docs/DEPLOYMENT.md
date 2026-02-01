# Guide de déploiement Vercel + Supabase Cloud

## 1. Créer le projet Supabase Cloud

1. Va sur [supabase.com](https://supabase.com) et crée un nouveau projet
2. Choisis une région proche de tes utilisateurs
3. Note le **Project Ref** (ex: `graislisfhgrlprygoec`) et le mot de passe de la base

## 2. Appliquer les migrations Supabase

Les migrations dans `supabase/migrations/` créent le schéma, les triggers (profil), le bucket Storage et les RLS.

```bash
# Lier le projet local au projet Supabase Cloud
npx supabase link --project-ref <PROJECT_REF>

# Appliquer les migrations (schéma, triggers, storage, RLS)
npx supabase db push
```

> **Important** : Exécute `supabase db push` **avant** le premier déploiement Vercel. Cela crée les tables, le trigger `handle_new_user`, le bucket `avatars` et les politiques RLS.

## 3. Configurer Auth (Google OAuth) sur Supabase Cloud

Le `config.toml` local ne s'applique **pas** au projet cloud. Configure Google OAuth dans le dashboard :

1. **Supabase Dashboard** → **Authentication** → **Providers** → **Google**
2. Active le provider
3. Saisis `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` (mêmes que en local)
4. **Authentication** → **URL Configuration** :
   - **Site URL** : `https://ton-app.vercel.app` (ou ton domaine)
   - **Redirect URLs** : ajoute `https://ton-app.vercel.app/auth/callback`

## 4. Récupérer les variables Supabase

Dans **Supabase Dashboard** → **Project Settings** → **API** :

- **Project URL** → `SUPABASE_URL`
- **anon public** → `SUPABASE_ANON_KEY` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

Dans **Project Settings** → **Database** :

- **Connection string** → Mode **URI**, choisir **Transaction** (pooler) pour Vercel
- Format : `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
- → `DATABASE_URL`

## 5. Configurer Google Cloud Console (prod)

Dans **APIs & Services** → **Credentials** → ton client OAuth :

**Authorized redirect URIs** (ajoute) :
- `https://[PROJECT_REF].supabase.co/auth/v1/callback` (Supabase Auth prod)
- `https://ton-app.vercel.app/auth/callback` (callback de ton app)

## 6. Variables d'environnement Vercel

Dans **Vercel** → **Project** → **Settings** → **Environment Variables** :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `DATABASE_URL` | URL pooler Supabase (port 6543) | Production |
| `SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` | Production |
| `SUPABASE_ANON_KEY` | Clé anon Supabase | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role Supabase | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | Même que SUPABASE_URL | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Même que SUPABASE_ANON_KEY | Production |
| `MISTRAL_API_KEY` | Ta clé Mistral | Production |
| `GOOGLE_CLIENT_ID` | Client ID Google | Production |
| `GOOGLE_CLIENT_SECRET` | Client secret Google | Production |
| `ENCRYPTION_KEY` | 32+ caractères aléatoires | Production |

> `NEXT_PUBLIC_*` sont requis pour OAuth côté client (signInWithOAuth dans le navigateur).

> `APP_URL` / `NEXT_PUBLIC_APP_URL` : non nécessaire en prod, `getAppUrl()` utilise `VERCEL_URL`.

## 7. Migrations Drizzle au build

Le script `db:migrate:prod` s'exécute pendant `npm run build` **uniquement** si :
- `VERCEL_ENV=production`
- `DATABASE_URL` est défini

Il lance `drizzle-kit migrate` pour appliquer les migrations Drizzle. Si tu as déjà fait `supabase db push`, les tables existent ; Drizzle utilise `CREATE TABLE IF NOT EXISTS` donc pas de conflit.

## 8. Ordre des opérations (résumé)

```
1. Créer projet Supabase Cloud
2. supabase link + supabase db push
3. Configurer Google OAuth dans Supabase Dashboard
4. Ajouter redirect URIs dans Google Cloud Console
5. Configurer les variables dans Vercel
6. Déployer (push sur main ou connecter le repo)
```

## 9. Vérifications post-déploiement

- [ ] Login email/mot de passe fonctionne
- [ ] Login Google fonctionne
- [ ] Upload photo de profil fonctionne (bucket `avatars`)
- [ ] Chat avec Mistral fonctionne
- [ ] Les migrations n'échouent pas au build (vérifier les logs Vercel)

## Dépannage

**"Bucket not found"** : Le bucket `avatars` est créé par `supabase db push`. Si absent, le code crée le bucket automatiquement au premier upload.

**"Profil non trouvé"** : Le trigger `handle_new_user` est créé par `supabase db push`. Vérifie que les migrations ont bien été appliquées.

**Migrations Drizzle échouent** : Vérifie que `DATABASE_URL` utilise l'URL **pooler** (port 6543), pas la connexion directe (port 5432). Vercel/serverless nécessite le pooler.
