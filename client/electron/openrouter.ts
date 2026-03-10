import type { TranscribeResult } from "./dashscope";

const LANG_NAMES: Record<string, string> = {
  zh: "Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
};

export async function transcribeAudioOpenRouter(
  wavBuffer: Buffer,
  apiKey: string,
  model: string,
  sourceLang: string,
  targetLang: string
): Promise<TranscribeResult> {
  const base64Audio = wavBuffer.toString("base64");
  const sourceLangName = LANG_NAMES[sourceLang] || sourceLang;
  const targetLangName = LANG_NAMES[targetLang] || targetLang;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...(model.startsWith("google/") ? { reasoning: { enabled: false } } : {}),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: base64Audio,
                format: "wav",
              },
            },
            {
              type: "text",
              text: `${sourceLangName} (may be mixed) → ${targetLangName}`,
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_transcription",
            description: `ASR + translate to ${targetLangName}`,
            parameters: {
              type: "object",
              properties: {
                transcription: { type: "string" },
                translation: { type: "string" },
              },
              required: ["transcription", "translation"],
            },
          },
        }
      ],
      tool_choice: {
        type: "function",
        function: { name: "submit_transcription" },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[openrouter] API error:", response.status, errorText);
    let message = `OpenRouter API error: ${response.status}`;
    try {
      const err = JSON.parse(errorText);
      if (err?.error?.message) message = err.error.message;
    } catch { /* use default */ }
    throw new Error(message);
  }

  const data = await response.json();
  console.log("[openrouter] response:", JSON.stringify(data, null, 2));

  // Parse result — prefer tool call, fallback to content JSON
  let transcription = "";
  let translation = "";

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    transcription = parsed.transcription || "";
    translation = parsed.translation || "";
  } else {
    const content = data.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      throw new Error("Empty response from OpenRouter");
    }
    const parsed = parseJsonResponse(content);
    transcription = parsed.transcription || "";
    translation = parsed.translation || "";
  }

  // Calculate audio duration from WAV header
  let audioDuration = 0;
  if (wavBuffer.length >= 44) {
    const byteRate = wavBuffer.readUInt32LE(28);
    const dataSize = wavBuffer.readUInt32LE(40);
    if (byteRate > 0) audioDuration = dataSize / byteRate;
  }

  // Inline usage from response (cost included directly)
  const usage = data.usage
    ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
        cost: typeof data.usage.cost === "number" ? data.usage.cost : undefined,
      }
    : undefined;

  return {
    transcription,
    translation,
    audioDuration,
    usage,
    generationId: data.id || undefined,
  };
}


/** Extract JSON from model response, handling markdown fences and loose text */
function parseJsonResponse(content: string): { transcription: string; translation: string } {
  try { return JSON.parse(content); } catch { /* continue */ }

  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  }

  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
  }

  console.error("[openrouter] could not parse JSON from:", content);
  throw new Error("Failed to parse JSON from model response");
}
