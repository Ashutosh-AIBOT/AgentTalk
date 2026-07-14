"use client";

import { useVoiceAssistant, useTrackVolume, useLocalParticipant } from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import Orb from "./Orb";

const STATE_META: Record<string, { color: string; label: string }> = {
  disconnected: { color: "#6b6a75", label: "Disconnected" },
  connecting: { color: "#6b6a75", label: "Connecting…" },
  "pre-connect-buffering": { color: "#6b6a75", label: "Connecting…" },
  failed: { color: "#f27373", label: "Connection failed" },
  initializing: { color: "#8b8a94", label: "Getting ready…" },
  idle: { color: "#7c6cf0", label: "Ready" },
  listening: { color: "#4f8cf7", label: "Listening — go ahead, talk" },
  thinking: { color: "#f5a623", label: "Thinking" },
  speaking: { color: "#7c6cf0", label: "Speaking" },
};

export default function VoiceOrb() {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { microphoneTrack } = useLocalParticipant();

  const agentVolume = useTrackVolume(audioTrack);
  const myVolume = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);

  const meta = STATE_META[state] ?? STATE_META.disconnected;

  // While the agent talks the orb pulses with its voice; while you talk it
  // pulses with yours - so it visibly reacts to whoever is speaking.
  const liveVolume = state === "speaking" ? agentVolume : state === "listening" ? myVolume : 0;
  const scale = 1 + Math.min(liveVolume * 1.8, 0.35);
  const glow = 18 + Math.min(liveVolume * 160, 90);

  const caption = agentTranscriptions.at(-1)?.text;

  return (
    <>
      <Orb color={meta.color} scale={scale} glow={glow} spin={state === "thinking"} label={meta.label} />
      <p className="max-w-[420px] min-h-[1.4em] text-sm text-white/50 italic">{caption ?? " "}</p>
    </>
  );
}
