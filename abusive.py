from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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
abusive_words = {"badword1", "badword2", "badword3", "stupid"}  # Replace with actual abusive words

class WordRequest(BaseModel):
    word: str

@app.post("/detect-abuse")
async def detect_abuse(request: WordRequest):
    words = request.word.lower().split()  # Split input into words using space as a delimiter
    abusive_detected = any(word in abusive_words for word in words)  # Check if any word is abusive

    if abusive_detected:
        return {"abusive_detected": True, "message": "Abusive language detected."}
    return {"abusive_detected": False, "message": "No abusive language detected."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("abusive:app", host="0.0.0.0", port=8000, reload=True)