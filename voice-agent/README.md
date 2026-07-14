# Voice Assistant (LiveKit + Next.js + FastAPI + OpenAI)

Real-time, speech-to-speech voice assistant. An animated orb in the middle of
the screen shows what the assistant is doing (listening / thinking /
speaking) and reacts to its voice as it talks.

## How it works

- **`backend/agent.py`** — a LiveKit Agent worker. It joins the room and uses
  OpenAI's Realtime API (voice-to-voice, no separate STT/TTS steps needed)
  to hold a natural conversation.
- **`backend/server.py`** — a tiny FastAPI server with one job: mint a
  LiveKit access token so the browser can join a room.
- **`frontend/`** — a Next.js app styled entirely with **Tailwind CSS v4**
  (no separate CSS framework). It fetches a token, joins the LiveKit room,
  and renders the animated orb using the agent's live state and audio.

```
you (browser) ──token──> FastAPI (server.py)
you (browser) ──WebRTC──> LiveKit room <──WebRTC── agent worker (agent.py)
```

## 1. Prerequisites

- A free LiveKit Cloud project → https://cloud.livekit.io (gives you
  `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)
- An OpenAI API key with Realtime API access
- Python 3.10+, Node.js 18+

## 2. Backend setup

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in your real keys
```

Run two processes (separate terminals):

```bash
# Terminal 1: the token API
uvicorn server:app --reload --port 8000

# Terminal 2: the voice agent worker
python agent.py dev
```

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # defaults to http://localhost:8000, adjust if needed
npm run dev
```

Open http://localhost:3000, click **Start conversation**, allow microphone
access, and talk. The orb turns blue while listening, amber while thinking,
and pulses with the agent's voice while speaking.

## Notes

- The agent worker (`agent.py`) auto-joins any room a token was created for —
  that's how the frontend always finds someone to talk to.
- To change the assistant's voice/personality, edit `INSTRUCTIONS` and the
  `voice=` argument in `backend/agent.py`.
- For production, restrict CORS in `server.py` and run the agent worker with
  `python agent.py start` behind a process manager instead of `dev`.
