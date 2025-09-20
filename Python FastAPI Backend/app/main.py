import os
os.environ['KMP_DUPLICATE_LIB_OK']='True'

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.services import tts_service, stt_service, evaluation_service
from app.models import EvaluationResult

print("Initializing FastAPI application...")
app = FastAPI()

# Create temp directory if it doesn't exist
print(f"Creating temp directory at {os.path.abspath('temp/audio')}")
os.makedirs("temp/audio", exist_ok=True)

# Serve static files
print("Mounting static files directory...")
app.mount("/temp/audio", StaticFiles(directory="temp/audio"), name="audio")

# Create TTS and STT temp directories
os.makedirs("temp/audio/tts", exist_ok=True)
os.makedirs("temp/audio/stt", exist_ok=True)

# Serve static files
app.mount("/temp/audio/tts", StaticFiles(directory="temp/audio/tts"), name="tts_audio")
app.mount("/temp/audio/stt", StaticFiles(directory="temp/audio/stt"), name="stt_audio")



# CORS Configuration
print("Configuring CORS middleware...")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/tts")
async def text_to_speech(request: dict):
    print(f"TTS request received with text length: {len(request.get('text', ''))}")
    try:
        text = request["text"]
        voice_id = request.get("voice_id", "af_heart")
        print(f"Generating TTS for voice: {voice_id}")
        audio_url = await tts_service.generate_tts(text, voice_id)
        print(f"TTS generation successful, URL: {audio_url}")
        return audio_url
    except Exception as e:
        print(f"TTS Generation Failed: {str(e)}")
        raise HTTPException(500, f"TTS Generation Failed: {str(e)}")

@app.post("/stt")
async def speech_to_text(audio: UploadFile):
    print(f"STT request received with file: {audio.filename}")
    try:
        print("Starting audio transcription...")
        transcription = await stt_service.transcribe_audio(audio)
        print(f"Transcription successful: {transcription[:50]}...")  # Print first 50 chars
        return {"text": transcription}
    except Exception as e:
        print(f"STT Processing Failed: {str(e)}")
        raise HTTPException(500, f"STT Processing Failed: {str(e)}")

@app.post("/evaluate")
async def evaluate_response(request: dict):
    print("Evaluation request received")
    try:
        audio_url = request["audio_url"]
        question_text = request["question_text"]
        ideal_answer = request["ideal_answer"]
        
        print(f"Audio URL: {audio_url}")
        print(f"Question length: {len(question_text)}")
        print(f"Ideal answer length: {len(ideal_answer)}")
        
        print("Starting audio transcription...")
        transcription = await stt_service.transcribe_from_url(audio_url)
        print(f"Transcription result: {transcription[:50]}...")
        
        print("Starting evaluation...")
        evaluation = await evaluation_service.evaluate(
            question_text,
            ideal_answer,
            transcription
        )
        
        print(f"Evaluation complete. Score: {evaluation.score}")
        return {
            "score": evaluation.score,
            "feedback": evaluation.feedback,
            "transcription": transcription 
        }

        
    except HTTPException as he:
        print(f"HTTP Exception during evaluation: {he.detail}")
        raise
    except Exception as e:
        print(f"Evaluation Process Failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Evaluation Process Failed",
                "message": str(e)
            }
        )

print("FastAPI application setup complete")