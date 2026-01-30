const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MODEL = "mistral-small-latest";

export interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MistralToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface MistralTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type StreamResult =
  | { type: "content"; content: string }
  | { type: "tool_calls"; toolCalls: MistralToolCall[] };

export async function* streamMistralChat(
  messages: MistralMessage[],
  tools?: MistralTool[]
): AsyncGenerator<StreamResult, void, unknown> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY non configurée");
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  const toolCallsAccumulator: Record<
    number,
    { id: string; name: string; arguments: string }
  > = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;

          if (delta?.content) {
            yield { type: "content", content: delta.content };
          }

          const toolCalls = delta?.tool_calls;
          if (toolCalls) {
            for (const tc of toolCalls) {
              const idx = tc.index ?? 0;
              if (!toolCallsAccumulator[idx]) {
                toolCallsAccumulator[idx] = {
                  id: tc.id ?? "",
                  name: tc.function?.name ?? "",
                  arguments: tc.function?.arguments ?? "",
                };
              } else {
                toolCallsAccumulator[idx].arguments +=
                  tc.function?.arguments ?? "";
              }
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  const toolCalls = Object.values(toolCallsAccumulator).filter(
    (tc) => tc.name
  );
  if (toolCalls.length > 0) {
    yield {
      type: "tool_calls",
      toolCalls: toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
    };
  }
}
