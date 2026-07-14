"""
Minimal FastAPI server that mints LiveKit access tokens for the frontend.
The actual voice conversation is handled by agent.py (a separate process).

Run with:  uvicorn server:app --reload --port 8000
"""

import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="Voice Agent Token Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenRequest(BaseModel):
    identity: str | None = None


@app.post("/api/token")
def create_token(req: TokenRequest):
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    livekit_url = os.getenv("LIVEKIT_URL")

    if not (api_key and api_secret and livekit_url):
        raise HTTPException(500, "LiveKit env vars are not configured on the server")

    identity = req.identity or f"user-{uuid.uuid4().hex[:8]}"
    room_name = f"voice-room-{identity}"

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(api.VideoGrants(room_join=True, room=room_name))
    )

    return {"token": token.to_jwt(), "url": livekit_url, "room": room_name}


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve static files for Next.js frontend (production bundle)
from fastapi.staticfiles import StaticFiles
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

