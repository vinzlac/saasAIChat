-- Row Level Security policies

-- conversations: user can read/write own conversations
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_own" ON "public"."conversations"
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "conversations_insert_own" ON "public"."conversations"
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update_own" ON "public"."conversations"
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "conversations_delete_own" ON "public"."conversations"
  FOR DELETE USING (auth.uid() = created_by);

-- messages: user can read messages from own conversations, insert only role='user'
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own_conversations" ON "public"."messages"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "public"."conversations" c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- User can only insert messages with role='user' and created_by=their id
CREATE POLICY "messages_insert_user_only" ON "public"."messages"
  FOR INSERT WITH CHECK (
    role = 'user' AND created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM "public"."conversations" c
      WHERE c.id = conversation_id AND c.created_by = auth.uid()
    )
  );

-- Service role will insert assistant messages - no policy for that (bypasses RLS with service role)
-- User cannot update or delete messages (assistant messages are immutable by user)

-- profiles: user can read/update own profile
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own" ON "public"."profiles"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE USING (auth.uid() = user_id);

-- oauth_connections: user can read/insert/update/delete own connections
ALTER TABLE "public"."oauth_connections" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_select_own" ON "public"."oauth_connections"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "oauth_insert_own" ON "public"."oauth_connections"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oauth_update_own" ON "public"."oauth_connections"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "oauth_delete_own" ON "public"."oauth_connections"
  FOR DELETE USING (auth.uid() = user_id);
