from fastapi import FastAPI
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title=os.getenv("APP_NAME", "portfolio"))


@app.get("/")
async def root():
    return {"status": "ok", "app": os.getenv("APP_NAME", "portfolio")}


@app.get("/health")
async def health():
    return {"db": os.getenv("DATABASE_URL", "not-configured")}
