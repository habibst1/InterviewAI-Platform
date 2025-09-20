import os
import torch
import soundfile as sf
from kokoro import KPipeline
from app.core.config import settings
from fastapi import HTTPException
from urllib.parse import urljoin

print("Initializing TTS service...")

# Initialize Kokoro pipeline
print("Loading Kokoro pipeline...")
tts_pipeline = KPipeline(lang_code='a')

# Configure device
use_cuda = settings.USE_CUDA
device = torch.device("cuda" if use_cuda and torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

async def generate_tts(text: str, voice_id: str = 'af_heart') -> str:
    print(f"Starting TTS generation for voice: {voice_id}")
    try:
        print("Ensuring temp directory exists...")
        tts_dir = "temp/audio/tts"
        os.makedirs(tts_dir, exist_ok=True)
        filename = f"tts_{hash(text)}_{os.getpid()}.wav"
        filepath = os.path.join(tts_dir, filename)
        print(f"Generated filename: {filename}")
        
        print("Generating audio...")
        generator = tts_pipeline(text, voice=voice_id)
        full_audio = []
        
        print("Processing audio chunks...")
        for i, (_, _, audio) in enumerate(generator):
            full_audio.extend(audio)
            if i % 10 == 0:  # Print progress every 10 chunks
                print(f"Processed {i} audio chunks...")
        
        print(f"Saving audio file to {filepath}")
        sf.write(filepath, full_audio, 24000)
        
        base_url = settings.BASE_URL.rstrip('/')
        audio_url = urljoin(f"{base_url}/", f"{tts_dir}/{filename}")
        print(f"Audio generation complete. URL: {audio_url}")
        return audio_url
    
    except Exception as e:
        print(f"TTS Generation Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "TTS Generation Failed",
                "message": str(e)
            }
        )

print("TTS service initialized")