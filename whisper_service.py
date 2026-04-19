import os
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def transcribe_audio(file_path):
    try:
        with open(file_path, "rb") as f:
            result = client.audio.transcriptions.create(
                model="whisper-1",
                file=f
            )
        return {"text": result.text, "language": None}
    except Exception as e:
        print("Whisper API error:", str(e))
        return {"text": "", "language": None}
