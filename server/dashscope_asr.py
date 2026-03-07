import logging
import threading
from dataclasses import dataclass, field

from dashscope.audio.asr import (
    TranslationRecognizerChat,
    TranslationRecognizerCallback,
)

from config import settings

logger = logging.getLogger(__name__)

# Chunk size for feeding audio to SDK (matches official example)
CHUNK_SIZE = 12800


@dataclass
class ASRResult:
    transcription: str = ""
    translation: str = ""


class _Collector(TranslationRecognizerCallback):
    """Collect SDK callback results. Signals completion via threading.Event."""

    def __init__(self, target_lang: str) -> None:
        self.target_lang = target_lang
        self.transcriptions: list[str] = field(default_factory=list) if False else []
        self.translations: list[str] = field(default_factory=list) if False else []
        self.error: str | None = None
        self._done = threading.Event()

    def on_open(self) -> None:
        logger.debug("ASR connection opened")

    def on_close(self) -> None:
        logger.debug("ASR connection closed")

    def on_event(
        self,
        request_id: str,
        transcription_result: object,
        translation_result: object,
        usage: object,
    ) -> None:
        # Accumulate intermediate and final results; take last one as final
        if transcription_result is not None:
            text = getattr(transcription_result, "text", "")
            if text:
                self.transcriptions.append(text)

        if translation_result is not None:
            # get_translation returns a TranslationResult for the target language
            t = getattr(translation_result, "get_translation", None)
            if t:
                tr = t(self.target_lang)
                if tr and getattr(tr, "text", ""):
                    self.translations.append(tr.text)

    def on_error(self, message: object) -> None:
        self.error = str(message)
        logger.error("ASR error: %s", message)
        self._done.set()

    def on_complete(self) -> None:
        self._done.set()

    def wait(self, timeout: float = 30.0) -> ASRResult:
        self._done.wait(timeout=timeout)
        if self.error:
            raise RuntimeError(self.error)
        return ASRResult(
            transcription=self.transcriptions[-1] if self.transcriptions else "",
            translation=self.translations[-1] if self.translations else "",
        )


def transcribe_audio(
    wav_data: bytes, source_lang: str, target_lang: str
) -> ASRResult:
    """
    Synchronous function. Receives complete WAV bytes, returns ASR + translation.
    Must be called via asyncio.to_thread() in FastAPI handlers.

    SDK parameter names follow DashScope TranslationRecognizerChat docs.
    If actual parameter names differ, adjust accordingly.
    """
    collector = _Collector(target_lang=target_lang)

    translator = TranslationRecognizerChat(
        model="gummy-chat-v1",
        format="wav",
        sample_rate=16000,
        transcription_enabled=True,
        translation_enabled=True,
        translation_target_languages=[target_lang],
        source_language=source_lang,
        callback=collector,
        api_key=settings.dashscope_api_key,
    )

    translator.start()
    try:
        offset = 0
        while offset < len(wav_data):
            chunk = wav_data[offset : offset + CHUNK_SIZE]
            if not translator.send_audio_frame(chunk):
                break
            offset += CHUNK_SIZE
    finally:
        translator.stop()

    return collector.wait(timeout=30.0)
