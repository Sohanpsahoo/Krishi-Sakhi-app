import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import the individual FastAPI apps
from api import app as crop_app
from disease_api import app as disease_app

# Create a unified parent app
app = FastAPI(title="Unified ML API for Krishi Sakhi", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "message": "Unified ML API is running"}

# Mount the sub-applications
# Crop Recommendation API will be available at /crop/predict
app.mount("/crop", crop_app)

# Disease Detection API will be available at /disease/predict
app.mount("/disease", disease_app)

if __name__ == "__main__":
    print("🚀 Starting Unified ML API on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
