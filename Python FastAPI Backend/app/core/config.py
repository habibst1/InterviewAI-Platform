from pydantic_settings import BaseSettings
from urllib.parse import urlparse

class Settings(BaseSettings):
    GEMINI_API_KEY: str = "" # Or remove if not used anymore
    GROQ_API_KEY: str = "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" # Add Groq key
    BASE_URL: str = "http://localhost:8000"
    USE_CUDA: bool = True
    
    @property
    def validated_base_url(self) -> str:
        """Ensure BASE_URL ends without slash"""
        return self.BASE_URL.rstrip('/')
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()