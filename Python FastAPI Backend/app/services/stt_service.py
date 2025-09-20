import uuid
import torch
import requests
from io import BytesIO
from fastapi import HTTPException, UploadFile
from tempfile import NamedTemporaryFile
from transformers import pipeline
from app.core.config import settings
import os

TEMP_DIR = os.path.join(os.getcwd(), "temp", "audio", "stt")
os.makedirs(TEMP_DIR, exist_ok=True)


print("Initializing STT service...")

# Device configuration
use_cuda = settings.USE_CUDA
device = torch.device("cuda" if use_cuda and torch.cuda.is_available() else "cpu")
torch_dtype = torch.float16 if device.type == 'cuda' else torch.float32
print(f"Using device: {device} with dtype: {torch_dtype}")

print("Loading Whisper model...")
stt_pipe = pipeline(
    "automatic-speech-recognition",
    model="openai/whisper-large-v3-turbo",
    torch_dtype=torch_dtype,
    device=device,
    generate_kwargs={"language": "english"}
)
print("Whisper model loaded")

async def transcribe_audio(audio_file: UploadFile) -> str:
    print(f"Transcribing audio file: {audio_file.filename}")
    try:
        content = await audio_file.read()
        print(f"Read {len(content)} bytes")

        temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.mp3")
        print(f"Writing to temp file: {temp_path}")

        with open(temp_path, "wb") as f:
            f.write(content)

        print("Starting transcription...")
        result = stt_pipe(temp_path)
        transcription = result["text"]
        print(f"Transcription complete: {transcription[:50]}...")

        os.remove(temp_path)  # clean up temp file

        return transcription

    except Exception as e:
        print(f"STT Processing Error: {str(e)}")
        raise HTTPException(500, f"STT Processing Failed: {str(e)}")


async def transcribe_from_url(audio_url: str) -> str:
    print(f"Transcribing audio from URL: {audio_url}")
    try:
        print("Downloading audio...")
        response = requests.get(audio_url, timeout=10)
        response.raise_for_status()
        print(f"Downloaded {len(response.content)} bytes")

        if not response.content:
            print("Error: Empty audio file received")
            raise ValueError("Empty audio file received")

        temp_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}.mp3")
        print(f"Writing downloaded content to temp file: {temp_path}")

        with open(temp_path, "wb") as f:
            f.write(response.content)

        print("Starting transcription...")
        result = stt_pipe(temp_path)

        if not result.get("text"):
            print("Error: No transcription returned")
            raise ValueError("No transcription returned")

        transcription = result["text"]
        print(f"Transcription complete: {transcription[:50]}...")

        os.remove(temp_path)  # clean up temp file

        return transcription

    except requests.exceptions.RequestException as e:
        print(f"Audio download failed: {str(e)}")
        raise HTTPException(502, f"Audio download failed: {str(e)}")
    except Exception as e:
        print(f"STT processing error: {str(e)}")
        raise HTTPException(500, f"STT processing error: {str(e)}")