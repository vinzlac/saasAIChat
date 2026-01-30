"use client";

import { useState, useCallback } from "react";
import { MessageList, type Message } from "./message-list";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatWindowProps {
  conversationId: string | null;
  initialMessages: Message[];
  onNewConversation?: () => void;
  onDeleteConversation?: () => void;
  className?: string;
}

export function ChatWindow({
  conversationId,
  initialMessages,
  onNewConversation,
  onDeleteConversation,
  className,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;
      setError("");
      setLoading(true);
      setStreamingContent("");

      try {
        const msgRes = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId, content }),
        });

        if (!msgRes.ok) {
          const data = await msgRes.json();
          throw new Error(data.error || "Erreur");
        }

        const msgData = await msgRes.json();
        setMessages((prev) => [
          ...prev,
          { id: msgData.id, role: "user", content },
        ]);

        const chatRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId }),
        });

        if (!chatRes.ok) {
          const data = await chatRes.json();
          throw new Error(data.error || "Erreur lors du chat");
        }

        const reader = chatRes.body?.getReader();
        if (!reader) throw new Error("Pas de réponse");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
          setStreamingContent(fullContent);
        }

        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: fullContent },
        ]);
        setStreamingContent("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    },
    [conversationId]
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full border rounded-lg bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-semibold">Chat</h2>
        <div className="flex gap-2">
          {onNewConversation && (
            <Button variant="outline" size="sm" onClick={onNewConversation}>
              Nouvelle conversation
            </Button>
          )}
          {onDeleteConversation && messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDeleteConversation}
              aria-label="Effacer l'historique"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
        />
        {loading && !streamingContent && <TypingIndicator />}
      </div>
      {error && (
        <p className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          {error}
        </p>
      )}
      <div className="p-4 border-t">
        <MessageInput
          onSend={sendMessage}
          disabled={loading || !conversationId}
        />
      </div>
    </div>
  );
}
