-- Fix RLS: ensure all public tables have Row Level Security enabled
-- Idempotent: safe to run even if RLS was partially applied

-- profiles
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON "public"."profiles";
DROP POLICY IF EXISTS "profiles_insert_own" ON "public"."profiles";
DROP POLICY IF EXISTS "profiles_update_own" ON "public"."profiles";
CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON "public"."profiles"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE USING (auth.uid() = user_id);

-- conversations
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select_own" ON "public"."conversations";
DROP POLICY IF EXISTS "conversations_insert_own" ON "public"."conversations";
DROP POLICY IF EXISTS "conversations_update_own" ON "public"."conversations";
DROP POLICY IF EXISTS "conversations_delete_own" ON "public"."conversations";
CREATE POLICY "conversations_select_own" ON "public"."conversations"
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "conversations_insert_own" ON "public"."conversations"
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "conversations_update_own" ON "public"."conversations"
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "conversations_delete_own" ON "public"."conversations"
  FOR DELETE USING (auth.uid() = created_by);

-- messages
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_own_conversations" ON "public"."messages";
DROP POLICY IF EXISTS "messages_insert_user_only" ON "public"."messages";
CREATE POLICY "messages_select_own_conversations" ON "public"."messages"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."conversations" c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );
CREATE POLICY "messages_insert_user_only" ON "public"."messages"
  FOR INSERT WITH CHECK (
    role = 'user' AND created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM "public"."conversations" c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- oauth_connections (sensitive: access_token, refresh_token)
ALTER TABLE "public"."oauth_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oauth_select_own" ON "public"."oauth_connections";
DROP POLICY IF EXISTS "oauth_insert_own" ON "public"."oauth_connections";
DROP POLICY IF EXISTS "oauth_update_own" ON "public"."oauth_connections";
DROP POLICY IF EXISTS "oauth_delete_own" ON "public"."oauth_connections";
CREATE POLICY "oauth_select_own" ON "public"."oauth_connections"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "oauth_insert_own" ON "public"."oauth_connections"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "oauth_update_own" ON "public"."oauth_connections"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "oauth_delete_own" ON "public"."oauth_connections"
  FOR DELETE USING (auth.uid() = user_id);
