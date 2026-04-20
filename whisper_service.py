import os

_model = None

def get_model():
    global _model
    if _model is None:
        import whisper
        print("⏳ تحميل نموذج Whisper...")
        _model = whisper.load_model("base")
        print("✅ النموذج جاهز")
    return _model

def transcribe_audio(file_path: str) -> dict:
    """
    تحويل ملف صوتي إلى نص
    يقبل أي صيغة صوتية (webm, ogg, mp3, wav...)
    يرجع dict فيه {"text": "..."} عشان يتوافق مع app.py
    """
    model = get_model()
    result = model.transcribe(file_path)
    return {"text": result["text"].strip()}