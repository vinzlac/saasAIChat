"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import type { Message } from "@/components/chat/message-list";
import Link from "next/link";

export default function AppPage() {
  const [conversations, setConversations] = useState<
    { id: string; title: string }[]
  >([]);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (data.conversations) {
      setConversations(data.conversations);
      if (
        !currentConversationId &&
        data.conversations.length > 0
      ) {
        setCurrentConversationId(data.conversations[0].id);
      }
    }
  }, [currentConversationId]);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(
      `/api/messages?conversation_id=${convId}`
    );
    const data = await res.json();
    if (data.messages) {
      setMessages(
        data.messages.map((m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    } else {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    setLoading(false);
  }, [loadConversations]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, loadMessages]);

  async function handleNewConversation() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nouvelle conversation" }),
    });
    const data = await res.json();
    if (data.id) {
      setConversations((prev) => [
        { id: data.id, title: data.title ?? "Nouvelle conversation" },
        ...prev,
      ]);
      setCurrentConversationId(data.id);
      setMessages([]);
    }
  }

  async function handleDeleteConversation() {
    if (!currentConversationId) return;
    if (!confirm("Effacer cette conversation ?")) return;
    setCurrentConversationId(null);
    setMessages([]);
    setConversations((prev) =>
      prev.filter((c) => c.id !== currentConversationId)
    );
    await fetch(`/api/conversations/${currentConversationId}`, {
      method: "DELETE",
    }).catch(() => {});
  }

  if (loading) {
    return <p className="p-8 text-muted-foreground">Chargement...</p>;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <p className="text-muted-foreground mb-4">
          Aucune conversation. Créez-en une pour commencer.
        </p>
        <button
          onClick={handleNewConversation}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Nouvelle conversation
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4">
      <aside className="w-64 border-r flex flex-col">
        <div className="p-2 border-b">
          <h3 className="font-semibold text-sm">Conversations</h3>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setCurrentConversationId(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm truncate ${
                conv.id === currentConversationId
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {conv.title}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        <ChatWindow
          key={currentConversationId ?? "new"}
          conversationId={currentConversationId}
          initialMessages={messages}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </main>
    </div>
  );
}
