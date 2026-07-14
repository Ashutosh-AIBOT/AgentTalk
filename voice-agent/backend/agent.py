import json
import logging
import os
from dotenv import load_dotenv

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli, room_io
from livekit.agents import AgentStateChangedEvent, MetricsCollectedEvent, metrics
from livekit.agents import llm, stt, tts, inference
from livekit.plugins import noise_cancellation, silero

logger = logging.getLogger(__name__)
load_dotenv()

INSTRUCTIONS = (
    "You are a warm, friendly voice assistant having a natural spoken "
    "conversation. Keep replies short and conversational, like a real "
    "person talking - no long lists, no markdown, no reading out symbols. "
    "Ask follow-up questions when it feels natural."
)


class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=INSTRUCTIONS)


async def entrypoint(ctx: JobContext):
    # Wait for the participant to connect
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Load past conversation history from user_context.json
    context_file = "user_context.json"
    past_messages = []
    if os.path.exists(context_file):
        try:
            with open(context_file, "r") as f:
                data = json.load(f)
                past_messages = data.get(participant.identity, [])
            logger.info(f"Loaded {len(past_messages)} past messages for {participant.identity}")
        except Exception as e:
            logger.error(f"Failed to load user context: {e}")

    # Set up the fallback-capable pipeline session
    session = AgentSession(
        stt=stt.FallbackAdapter(
            [
                inference.STT.from_model_string("assemblyai/universal-streaming:en"),
                inference.STT.from_model_string("deepgram/nova-3"),
            ]
        ),
        llm=llm.FallbackAdapter(
            [
                inference.LLM.from_model_string("openai/gpt-4o-mini"),
                inference.LLM.from_model_string("anthropic/claude-3.5-sonnet"),
            ]
        ),
        tts=tts.FallbackAdapter(
            [
                inference.TTS.from_model_string("cartesia/sonic-3"),
                inference.TTS.from_model_string("openai/tts-1"),
            ]
        ),
        vad=silero.VAD.load(
            min_silence_duration=0.25,
            prefix_padding_duration=0.2,
        ),
        turn_detection="vad",
        preemptive_generation=True,
        min_endpointing_delay=0.25,
        max_endpointing_delay=0.6,
    )

    # Pre-populate session history with past context
    for msg in past_messages:
        session.history.add_message(role=msg["role"], content=msg["content"])

    # Register observability and performance logging
    @session.on("agent_state_changed")
    def on_agent_state_changed(event: AgentStateChangedEvent):
        logger.info(f"Agent state changed from {event.old_state} to {event.new_state}")

    @session.on("metrics_collected")
    def on_metrics_collected(event: MetricsCollectedEvent):
        metrics.log_metrics(event.metrics, logger=logger)

    try:
        await session.start(
            agent=Assistant(),
            room=ctx.room,
            room_options=room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(
                    noise_cancellation=noise_cancellation.BVC(),
                ),
            ),
        )
    except Exception as e:
        logger.error(f"Error starting session: {e}")

    async def save_context(reason: str = ""):
        # Save updated conversation context to user_context.json
        updated_messages = []
        for item in session.history.messages():
            content_str = ""
            if isinstance(item.content, list):
                content_str = " ".join([c for c in item.content if isinstance(c, str)])
            elif isinstance(item.content, str):
                content_str = item.content

            if content_str:
                updated_messages.append({
                    "role": item.role,
                    "content": content_str
                })

        try:
            data = {}
            if os.path.exists(context_file):
                with open(context_file, "r") as f:
                    data = json.load(f)

            data[participant.identity] = updated_messages

            with open(context_file, "w") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Successfully saved {len(updated_messages)} messages context for participant {participant.identity}")
        except Exception as e:
            logger.error(f"Failed to save user context: {e}")

    ctx.add_shutdown_callback(save_context)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

