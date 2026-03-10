export interface ModelInfo {
  id: string;
  name: string;
  recommended?: boolean;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricing: {
    inputText: number;   // USD per 1M tokens
    outputText: number;  // USD per 1M tokens
    inputAudio?: number; // USD per 1M tokens or 1M seconds (see audioPricingUnit)
    audioPricingUnit?: "tokens" | "seconds"; // default: "tokens"
    outputAudio?: number;
  };
  notes: string[];
  audioFormats: string[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  keyPrefix: string;
  keyPlaceholder: string;
  getKeyUrl: string;
  models?: ModelInfo[];
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "dashscope",
    name: "Aliyun DashScope",
    keyPrefix: "sk-",
    keyPlaceholder: "sk-...",
    getKeyUrl: "https://bailian.console.aliyun.com/cn-beijing/?apiKey=1&tab=model#/api-key",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    keyPrefix: "sk-or-",
    keyPlaceholder: "sk-or-...",
    getKeyUrl: "https://openrouter.ai/keys",
    models: [
      {
        id: "mistralai/voxtral-small-24b-2507",
        name: "Voxtral Small 24B",
        recommended: true,
        description: "Mistral's audio-capable model with state-of-the-art speech transcription, translation, and audio understanding. Retains best-in-class text performance.",
        contextWindow: 32000,
        maxOutputTokens: 8192,
        pricing: {
          inputText: 0.10,
          outputText: 0.30,
          inputAudio: 100,
          audioPricingUnit: "seconds",
        },
        notes: [
          "Supports tool use / function calling",
          "Excels at speech transcription, translation, and audio understanding",
          "Audio input at $100/1M seconds (~$0.006/min), text input at $0.10/1M tokens",
          "Very low cost for short audio segments",
        ],
        audioFormats: ["wav", "mp3", "flac", "opus", "ogg"],
      },
      {
        id: "google/gemini-3.1-flash-lite-preview",
        name: "Gemini 3.1 Flash Lite",
        description: "Google's high-efficiency model optimized for high-volume use cases. Improvements in audio input/ASR, translation, and data extraction. Half the cost of Gemini 3 Flash.",
        contextWindow: 1048576,
        maxOutputTokens: 65536,
        pricing: {
          inputText: 0.25,
          outputText: 1.50,
          inputAudio: 0.50,
        },
        notes: [
          "Supports tool use / function calling",
          "1M context window, 65K max output tokens",
          "Audio input at $0.50/1M tokens, text input at $0.25/1M tokens",
          "Supports text, image, video, file, and audio input",
          "Implicit caching supported (cache read: $0.025/1M tokens)",
        ],
        audioFormats: ["wav", "mp3", "flac", "opus", "ogg"],
      },
    ],
  },
];

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModel(providerId: string, modelId: string): ModelInfo | undefined {
  const provider = getProvider(providerId);
  return provider?.models?.find((m) => m.id === modelId);
}

/** Estimate cost in USD from token usage */
export function estimateCost(
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  for (const p of PROVIDERS) {
    const model = p.models?.find((m) => m.id === modelId);
    if (model) {
      // Use audio input pricing if available (audio models)
      const inputPrice = model.pricing.inputAudio ?? model.pricing.inputText;
      const outputPrice = model.pricing.outputText;
      return (promptTokens * inputPrice + completionTokens * outputPrice) / 1_000_000;
    }
  }
  return 0;
}
