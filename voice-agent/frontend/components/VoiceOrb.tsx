"use client";

import { useState } from "react";
import { useVoiceAssistant, useTrackVolume, useLocalParticipant } from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import dynamic from "next/dynamic";
import Orb from "./Orb";

// Dynamically import VRMScene to disable server-side rendering (SSR) for Three.js
const VRMScene = dynamic(() => import("./VRMScene"), { ssr: false });

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

const AVATARS = [
  { name: "Yuki", url: "/avatars/avatar1.vrm" },
  { name: "Sakura", url: "/avatars/avatar2.vrm" },
  { name: "Takumi", url: "/avatars/avatar3.vrm" },
];

export default function VoiceOrb() {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { microphoneTrack } = useLocalParticipant();
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].url);

  const agentVolume = useTrackVolume(audioTrack);
  const myVolume = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);

  const meta = STATE_META[state] ?? STATE_META.disconnected;

  const liveVolume = state === "speaking" ? agentVolume : state === "listening" ? myVolume : 0;
  const scale = 1 + Math.min(liveVolume * 1.5, 0.35);
  const glow = 15 + Math.min(liveVolume * 140, 85);

  const caption = agentTranscriptions.at(-1)?.text;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* 3D Scene Layered on top of the Ambient Glowing Orb */}
      <div className="relative flex h-80 w-80 items-center justify-center">
        {/* Ambient background glowing orb */}
        <div className="absolute inset-0 flex items-center justify-center opacity-70 scale-90 pointer-events-none">
          <Orb
            color={meta.color}
            scale={scale}
            glow={glow}
            spin={state === "thinking"}
          />
        </div>

        {/* 3D VRM Canvas in front */}
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <VRMScene
            avatarUrl={selectedAvatar}
            state={state}
            audioTrack={audioTrack}
          />
        </div>
      </div>

      {/* Label and Status */}
      <div className="text-center">
        <p className="min-h-[1.2em] text-sm text-white/50">
          <span className="font-semibold text-white/90">{meta.label}</span>
        </p>
      </div>

      {/* Real-time Transcription Captions */}
      <p className="max-w-[420px] min-h-[1.4em] text-sm text-white/60 italic px-4">
        {caption ?? " "}
      </p>

      {/* Character Switcher Panel */}
      <div className="flex items-center gap-2 rounded-full bg-white/5 p-1.5 border border-white/10 mt-2 z-20">
        {AVATARS.map((av) => (
          <button
            key={av.url}
            onClick={() => setSelectedAvatar(av.url)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedAvatar === av.url
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            {av.name}
          </button>
        ))}
      </div>
    </div>
  );
}

