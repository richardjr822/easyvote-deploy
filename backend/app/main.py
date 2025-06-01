from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.router import api_router
from pathlib import Path

app = FastAPI(title="EasyVote API")

# IMPORTANT: Update CORS to allow your Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://easyvote-deploy.vercel.app",
        "https://*.vercel.app",  # Allow all Vercel preview deployments
        "http://localhost:3000",  # For local development
        "http://localhost:5173",  # For Vite dev server
        "http://localhost:8000",  # For local backend testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up paths
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Mount the uploads directory
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Include API router
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to EasyVote API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)