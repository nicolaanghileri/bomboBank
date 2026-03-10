from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import upload
import os

app = FastAPI(title="bomboBank API", version="1.0.0")

# CORS — configurable via ALLOWED_ORIGINS env var (comma-separated)
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes einbinden
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
@app.get("/")
def root():
    return {"message": "bomboBank API läuft! 🚀"}

@app.get("/health")
def health():
    return {"status": "ok"}




