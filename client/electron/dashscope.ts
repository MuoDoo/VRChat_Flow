import WebSocket from "ws";
import { randomUUID } from "crypto";

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

export interface TranscribeResult {
  transcription: string;
  translation: string;
  audioDuration: number;
  usage?: UsageInfo;
  generationId?: string;
  isNoise?: boolean;
}

export async function transcribeAudio(
  wavBuffer: Buffer,
  apiKey: string,
  sourceLang: string,
  targetLang: string
): Promise<TranscribeResult> {
  return new Promise((resolve, reject) => {
    const taskId = randomUUID();
    let resolved = false;
    let transcription = "";
    let translation = "";

    const ws = new WebSocket(
      "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
      { headers: { Authorization: `bearer ${apiKey}` } }
    );

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error("TRANSCRIBE_TIMEOUT"));
      }
    }, 30000);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          header: {
            action: "run-task",
            task_id: taskId,
            streaming: "duplex",
          },
          payload: {
            model: "gummy-chat-v1",
            task_group: "audio",
            task: "asr",
            function: "recognition",
            input: {},
            parameters: {
              format: "wav",
              sample_rate: 16000,
              transcription_enabled: true,
              translation_enabled: true,
              translation_target_languages: [targetLang],
              source_language: sourceLang,
            },
          },
        })
      );
    });

    ws.on("message", (data: WebSocket.Data) => {
      if (resolved) return;
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      const header = msg.header as Record<string, unknown> | undefined;
      const event = header?.event as string | undefined;

      console.log("[dashscope] event:", event, "msg:", JSON.stringify(msg, null, 2));

      if (event === "task-started") {
        // Send audio in 12800-byte chunks
        const CHUNK_SIZE = 12800;
        for (let i = 0; i < wavBuffer.length; i += CHUNK_SIZE) {
          ws.send(wavBuffer.subarray(i, Math.min(i + CHUNK_SIZE, wavBuffer.length)));
        }
        console.log("[dashscope] sent audio:", wavBuffer.length, "bytes");
        // Signal end of audio
        ws.send(
          JSON.stringify({
            header: {
              action: "finish-task",
              task_id: taskId,
              streaming: "duplex",
            },
            payload: { input: {} },
          })
        );
      } else if (event === "result-generated") {
        const payload = msg.payload as Record<string, unknown> | undefined;
        const output = payload?.output as Record<string, unknown> | undefined;
        if (output) {
          const trans = output.transcription as { text?: string; sentence_end?: boolean } | undefined;
          if (trans?.text) transcription = trans.text;
          const translations = output.translations as Array<{ text?: string; sentence_end?: boolean }> | undefined;
          if (translations && translations.length > 0 && translations[0].text) {
            translation = translations[0].text;
          }
        }
      } else if (event === "task-finished") {
        console.log("[dashscope] finished, transcription:", transcription, "translation:", translation);
        resolved = true;
        clearTimeout(timeout);
        ws.close();
        // Calculate duration from WAV header: byte rate at offset 28, data size at offset 40
        let audioDuration = 0;
        if (wavBuffer.length >= 44) {
          const byteRate = wavBuffer.readUInt32LE(28);
          const dataSize = wavBuffer.readUInt32LE(40);
          if (byteRate > 0) audioDuration = dataSize / byteRate;
        }
        resolve({ transcription, translation, audioDuration });
      } else if (event === "task-failed") {
        resolved = true;
        clearTimeout(timeout);
        ws.close();
        const errorMsg =
          (header?.error_message as string) || "Transcription failed";
        reject(new Error(errorMsg));
      }
    });

    ws.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    ws.on("close", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error("WebSocket closed unexpectedly"));
      }
    });
  });
}
