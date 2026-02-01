import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { messages, conversations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const postSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const conversationId = request.nextUrl.searchParams.get("conversation_id");
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversation_id requis" },
        { status: 400 }
      );
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.createdBy, user.id)
        )
      )
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 });
    }

    const list = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({ messages: list });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { conversation_id, content } = parsed.data;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversation_id),
          eq(conversations.createdBy, user.id)
        )
      )
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 });
    }

    const [message] = await db
      .insert(messages)
      .values({
        conversationId: conversation_id,
        role: "user",
        content,
        createdBy: user.id,
      })
      .returning();

    return NextResponse.json(message);
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    );
  }
}
