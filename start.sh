#!/bin/bash

# Start the LiveKit agent worker in the background
python agent.py start &

# Start the FastAPI token server on port 7860 (Hugging Face default port)
uvicorn server:app --host 0.0.0.0 --port 7860
