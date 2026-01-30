import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { messages, conversations } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  streamMistralChat,
  type MistralMessage,
} from "@/lib/mistral/client";
import { mistralTools } from "@/lib/mistral/functions";
import { executeFunction } from "@/lib/mistral/function-handler";
import { z } from "zod";

const postSchema = z.object({
  conversation_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Limite de requêtes atteinte. Réessayez plus tard.",
          retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "conversation_id requis" },
        { status: 400 }
      );
    }

    const { conversation_id } = parsed.data;

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
      return NextResponse.json(
        { error: "Conversation non trouvée" },
        { status: 404 }
      );
    }

    const history = await db
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, conversation_id))
      .orderBy(asc(messages.createdAt));

    let mistralMessages: MistralMessage[] = [
      {
        role: "system",
        content:
          "Tu es un assistant IA utile et amical. Réponds en français de manière concise et naturelle. Tu peux utiliser les fonctions du calendrier Google pour répondre aux questions sur les rendez-vous et événements.",
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        let currentMessages = mistralMessages;
        let maxIterations = 5;
        let iteration = 0;

        try {
          while (iteration < maxIterations) {
            iteration++;
            let hadToolCalls = false;
            let toolCallsResult: { toolCalls: { id: string; name: string; arguments: string }[] } | null = null;

            for await (const result of streamMistralChat(
              currentMessages,
              mistralTools
            )) {
              if (result.type === "content") {
                fullContent += result.content;
                controller.enqueue(encoder.encode(result.content));
              } else if (result.type === "tool_calls") {
                hadToolCalls = true;
                toolCallsResult = result;
              }
            }

            if (!hadToolCalls || !toolCallsResult) break;

            const toolMessages: MistralMessage[] = [];
            for (const tc of toolCallsResult.toolCalls) {
              const fnResult = await executeFunction(user.id, {
                name: tc.name,
                arguments: tc.arguments,
              });
              toolMessages.push({
                role: "user",
                content: `Résultat de la fonction ${tc.name}: ${fnResult}`,
              });
            }

            currentMessages = [
              ...currentMessages,
              {
                role: "assistant",
                content: `[Appel des fonctions: ${toolCallsResult.toolCalls.map((tc) => tc.name).join(", ")}]`,
              },
              ...toolMessages,
            ];
            fullContent = "";
          }

          controller.close();

          await db.insert(messages).values({
            conversationId: conversation_id,
            role: "assistant",
            content: fullContent || "[Réponse avec fonction]",
            createdBy: null,
          });
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chat" },
      { status: 500 }
    );
  }
}
