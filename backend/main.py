from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import test

app = FastAPI(title="bomboBank API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes einbinden
app.include_router(test.router, prefix="/api/test", tags=["test"])

@app.get("/")
def root():
    return {"message": "API läuft!"}