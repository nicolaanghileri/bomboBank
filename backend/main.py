from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import upload
import os

app = FastAPI(title="bomboBank API", version="1.0.0")

_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()] or [
    "http://localhost:5173",
    "https://bombobank.anghileri.ch",
]

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




