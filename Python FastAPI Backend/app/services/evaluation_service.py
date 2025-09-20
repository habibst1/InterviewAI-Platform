# evaluation_service.py
from fastapi import HTTPException
from groq import Groq # Import Groq client
import json
from app.core.config import settings # Import settings to get the API key
from app.models import EvaluationResult

print("Initializing Evaluation service...")

# Initialize Groq client
print("Initializing Groq client...")

groq_client = Groq(api_key=settings.GROQ_API_KEY) # Use key from settings

print("Groq client initialized")

GROQ_MODEL_NAME = "openai/gpt-oss-120b"

PROMPT_TEMPLATE = """
You are an AI interview evaluation assistant. Analyze this response:

Question: {question}
Ideal Answer: {ideal_answer}
Candidate Response: {response}

Provide evaluation in this exact JSON format:
{{
    "score": <number between 0-100>,
    "feedback": "<detailed analysis>"
}}

Important:
- Return ONLY valid JSON
- No additional text or markdown
- Keep scores between 0-100
- Escape all special characters in feedback
"""

async def evaluate(question: str, ideal_answer: str, response: str) -> EvaluationResult:
    print("Starting evaluation...")
    print(f"Question length: {len(question)}")
    print(f"Ideal answer length: {len(ideal_answer)}")
    print(f"Response length: {len(response)}")
    
    try:
        prompt = PROMPT_TEMPLATE.format(
            question=question,
            ideal_answer=ideal_answer,
            response=response
        )
        print("Prompt formatted")
        
        print(f"Sending request to Groq model {GROQ_MODEL_NAME}...")
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=GROQ_MODEL_NAME,
            temperature=0.3,
            response_format={"type": "json_object"}, # Request JSON response
        )
        print("Received response from Groq")
        
        # Extract the response text
        result_text = chat_completion.choices[0].message.content
        print("Parsing JSON response...")
        evaluation_data = json.loads(result_text)
        print(f"Evaluation score: {evaluation_data.get('score', 'N/A')}")
        
        return EvaluationResult(
            score=evaluation_data["score"],
            feedback=evaluation_data["feedback"]
        )
        
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {str(e)}")
        # Safely get the result text if available
        error_text = result_text if 'result_text' in locals() else 'N/A'
        print(f"Response text: {error_text}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Invalid JSON response from AI",
                "message": f"Failed to parse: {error_text}"
            }
        )
    except Exception as e: # Catch Groq API errors or other issues
        print(f"Evaluation Error: {str(e)}")
        # Check if it's a Groq API error and potentially include more details
        error_detail = str(e)
        if hasattr(e, 'response') and e.response is not None:
             # Try to extract error message from Groq response if possible
             try:
                 error_json = e.response.json()
                 error_detail = error_json.get('error', {}).get('message', str(e))
             except:
                 pass # If parsing fails, stick with str(e)

        raise HTTPException(
            status_code=500,
            detail={
                "error": "Evaluation Failed",
                "message": error_detail # Provide more specific error info
            }
        )

print("Evaluation service initialized")