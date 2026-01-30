"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { TypingIndicator } from "./typing-indicator";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  className?: string;
}

export function MessageList({
  messages,
  streamingContent,
  className,
}: MessageListProps) {
  return (
    <div className={cn("flex flex-col gap-4 overflow-y-auto p-4", className)}>
      {messages.length === 0 && !streamingContent && (
        <p className="text-center text-muted-foreground py-8">
          Commencez une conversation en écrivant un message ci-dessous.
        </p>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "rounded-lg px-4 py-2 max-w-[85%]",
            msg.role === "user"
              ? "ml-auto bg-primary text-primary-foreground"
              : "mr-auto bg-muted"
          )}
        >
          {msg.role === "assistant" ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          )}
        </div>
      ))}
      {streamingContent && (
        <div className="mr-auto rounded-lg bg-muted px-4 py-2 max-w-[85%]">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{streamingContent}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
