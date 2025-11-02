from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import torch
import json
import os
from datetime import datetime
from contextlib import asynccontextmanager
from text_sniffer import detect_abuse
from fastapi.responses import JSONResponse, FileResponse

# Modern lifespan event handler (replaces @app.on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 CyberShield API starting up...")
    yield
    # Shutdown
    print("🛑 CyberShield API shutting down...")
    torch.multiprocessing.set_sharing_strategy("file_system")

app = FastAPI(
    title="CyberShield API",
    description="Abuse Detection and Comment Reporting System",
    version="1.0.0",
    lifespan=lifespan
)

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/favicon.ico")
async def favicon():
    return FileResponse("favicon.ico")
# Models
class RawDataRequest(BaseModel):
    filename: str
    data: dict | list

class WordRequest(BaseModel):
    text: str
    abusive_words: list[str]

class ReportRequest(BaseModel):
    commentId: str
    username: str
    commentText: str
    reason: str
    timestamp: str
    reportedBy: str

# Add root endpoint to eliminate 404s
@app.get("/")
async def root():
    return {
        "message": "CyberShield API is running",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": {
            "save_raw_data": "/save-raw-data",
            "load_raw_data": "/load-raw-data/{filename}",
            "detect_abuse": "/detect-abuse",
            "report_comment": "/report-comment", 
            "get_reports": "/reports",
            "update_report_status": "/reports/{report_id}/status",
            "api_docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "CyberShield API"
    }

# Save raw data
@app.post("/save-raw-data")
async def save_raw_data(request: RawDataRequest):
    try:
        raw_data_dir = "raw_data"
        if not os.path.exists(raw_data_dir):
            os.makedirs(raw_data_dir)

        file_path = os.path.join(raw_data_dir, request.filename)

        # ✅ If file already exists, do NOT save again
        if os.path.exists(file_path):
            return {
                "status": "exists",
                "message": f"File {request.filename} already saved — skipping."
            }

        # ✅ Write new file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(request.data, f, indent=2, ensure_ascii=False)

        return {"status": "success", "message": f"Raw data saved as {request.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save raw data: {e}")
# Load saved data
@app.get("/load-raw-data/{filename}")
async def load_raw_data(filename: str):
    try:
        file_path = os.path.join("raw_data", filename)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load raw data: {e}")

# Existing detect-abuse endpoint
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

# New endpoint to collect reports
@app.post("/report-comment")
async def collect_report(report: ReportRequest):
    try:
        reports_dir = "reports"
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)
        
        reports_file = os.path.join(reports_dir, "collected_reports.json")
        if os.path.exists(reports_file):
            with open(reports_file, "r", encoding="utf-8") as f:
                reports = json.load(f)
        else:
            reports = []
        
        report_entry = {
            **report.dict(),
            "processed_at": datetime.now().isoformat(),
            "status": "pending"
        }
        reports.append(report_entry)
        
        with open(reports_file, "w", encoding="utf-8") as f:
            json.dump(reports, f, indent=2, ensure_ascii=False)
        
        print(f"Report collected: {report.username} - {report.reason}")
        
        return {
            "status": "success",
            "message": "Report collected successfully",
            "report_id": len(reports)
        }
        
    except Exception as e:
        print(f"Error collecting report: {e}")
        raise HTTPException(status_code=500, detail="Failed to collect report")

# Endpoint to retrieve all reports
@app.get("/reports")
async def get_all_reports():
    try:
        reports_file = "reports/collected_reports.json"
        
        if not os.path.exists(reports_file):
            return {"reports": [], "total": 0, "pending": 0, "processed": 0}
        
        with open(reports_file, "r", encoding="utf-8") as f:
            reports = json.load(f)
        
        return {
            "reports": reports,
            "total": len(reports),
            "pending": len([r for r in reports if r.get("status") == "pending"]),
            "processed": len([r for r in reports if r.get("status") == "processed"])
        }
        
    except Exception as e:
        print(f"Error retrieving reports: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve reports")

# Endpoint to update report status
@app.put("/reports/{report_id}/status")
async def update_report_status(report_id: int, status: str):
    try:
        reports_file = "reports/collected_reports.json"
        
        if not os.path.exists(reports_file):
            raise HTTPException(status_code=404, detail="No reports found")
        
        with open(reports_file, "r", encoding="utf-8") as f:
            reports = json.load(f)
        
        if report_id < 1 or report_id > len(reports):
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Update status (report_id is 1-based)
        reports[report_id - 1]["status"] = status
        reports[report_id - 1]["updated_at"] = datetime.now().isoformat()
        
        with open(reports_file, "w", encoding="utf-8") as f:
            json.dump(reports, f, indent=2, ensure_ascii=False)
        
        return {"status": "success", "message": f"Report {report_id} status updated to {status}"}
        
    except Exception as e:
        print(f"Error updating report status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update report status")

# Removed the old @app.on_event("shutdown") - now using lifespan above

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)