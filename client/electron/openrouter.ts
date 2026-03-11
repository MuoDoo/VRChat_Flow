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
          role: "system",
          content: [
            {
              type: "text",
              text: `You are a real-time speech transcription and translation tool. Your task:
1. First, determine if the audio contains meaningful speech or is just noise/ambient sound.
2. If it IS noise, set is_noise to true and return empty strings for transcription and translation.
3. If it IS speech, transcribe EXACTLY as spoken and translate into ${targetLangName}.

Noise detection rules (set is_noise = true for ANY of these):
- Background noise, static, hissing, humming, clicking, or ambient sounds with no clear words
- Unintelligible mumbling where no specific words can be confidently identified
- Very short bursts of sound (coughs, sighs, breathing, lip smacks, keyboard clicks)
- Audio where you are less than 80% confident that actual words were spoken
- Single filler sounds like "嗯", "ah", "um", "えっと" with no other content

Transcription rules (only when is_noise = false):
- Transcribe EXACTLY what was spoken — do not add, infer, or fabricate any words
- The audio is a short voice clip (often just a few words or a single phrase)
- NEVER generate extra sentences, context, or commentary beyond what was spoken
- NEVER hallucinate or guess content that is not in the audio
- The speaker primarily uses ${sourceLangName}, but may mix in other languages.`,
            },
          ],
        },
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
              text: `Transcribe this audio (${sourceLangName}) and translate to ${targetLangName}. If the audio is just noise or no clear speech, set is_noise=true with empty strings.`,
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "submit_transcription",
            description: `Submit the transcription result. Set is_noise=true if the audio is noise/ambient sound with no clear speech.`,
            parameters: {
              type: "object",
              properties: {
                is_noise: {
                  type: "boolean",
                  description: "true if the audio is noise, ambient sound, or unintelligible with no clear speech. false if clear speech is present.",
                },
                transcription: {
                  type: "string",
                  description: "Exact transcription of the spoken audio. Must be empty string when is_noise is true.",
                },
                translation: {
                  type: "string",
                  description: `Translation into ${targetLangName}. Must be empty string when is_noise is true.`,
                },
              },
              required: ["is_noise", "transcription", "translation"],
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
  let isNoise = false;

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    isNoise = parsed.is_noise === true;
    transcription = isNoise ? "" : (parsed.transcription || "");
    translation = isNoise ? "" : (parsed.translation || "");
  } else {
    const content = data.choices?.[0]?.message?.content as string | undefined;
    if (!content) {
      throw new Error("Empty response from OpenRouter");
    }
    const parsed = parseJsonResponse(content);
    isNoise = (parsed as Record<string, unknown>).is_noise === true;
    transcription = isNoise ? "" : (parsed.transcription || "");
    translation = isNoise ? "" : (parsed.translation || "");
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
    isNoise,
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
