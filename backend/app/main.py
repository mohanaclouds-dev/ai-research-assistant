import os
from dotenv import load_dotenv

# 1. LOAD THIS FIRST!
load_dotenv()

# 2. THEN IMPORT THE REST
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(title="AI Research Assistant API")

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # <--- Change to allow all origins ("*")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy"}
