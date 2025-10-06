from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch
from text_sniffer import  detect_abuse


app = FastAPI()


# Allow frontend (React) to talk to backend (FastAPI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5500"],  # Added 127.0.0.1:5500
    allow_credentials=True,
    allow_methods=["*"],  # allows POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

# List of abusive words
class WordRequest(BaseModel):
    text: str
    abusive_words: list[str]

@app.get("/")
async def root():
    return {"message": "Welcome to the Abusive Word Detection API. Use the /analyze endpoint to analyze text."}

@app.post("/detect-abuse")
async def detect_abuse_endpoint(request: WordRequest):
    if not request.text or not request.abusive_words:
        raise HTTPException(status_code=400, detail="Both 'text' and 'abusive_words' are required.")
    print("Received payload:", request.dict())
    report = detect_abuse(request.text, request.abusive_words, similarity_threshold=0.6)
    return {
        "input_text": request.text,
        "analysis": {
            **report,
            "sentiment": {
                "sentiment": report["sentiment"]["sentiment"],
                "confidence": f"{report["sentiment"]["confidence"] * 100:.2f}%"
            }
        }
    }

@app.on_event("shutdown")
async def shutdown_event():
    # Clean up PyTorch resources
    torch.multiprocessing.set_sharing_strategy("file_system")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("abusive:app", host="0.0.0.0", port=8000, reload=True)