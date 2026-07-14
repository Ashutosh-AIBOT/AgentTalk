"use client";

import { useState } from "react";
import { useVoiceAssistant, useTrackVolume, useLocalParticipant, TrackToggle } from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import { Track } from "livekit-client";
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
  listening: { color: "#4f8cf7", label: "Listening" },
  thinking: { color: "#f5a623", label: "Thinking" },
  speaking: { color: "#7c6cf0", label: "Speaking" },
};

const AVATARS = [
  { id: "orbit", name: "Glow Orb", type: "2d" },
  { id: "yuki", name: "Yuki", type: "3d", url: "/avatars/avatar1.vrm" },
  { id: "sakura", name: "Sakura", type: "3d", url: "/avatars/avatar2.vrm" },
  { id: "takumi", name: "Takumi", type: "3d", url: "/avatars/avatar3.vrm" },
];

interface VoiceOrbProps {
  onDisconnect: () => void;
}

export default function VoiceOrb({ onDisconnect }: VoiceOrbProps) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const { microphoneTrack } = useLocalParticipant();
  const [selectedAvatarId, setSelectedAvatarId] = useState("orbit");

  const agentVolume = useTrackVolume(audioTrack);
  const myVolume = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);

  const meta = STATE_META[state] ?? STATE_META.disconnected;

  const liveVolume = state === "speaking" ? agentVolume : state === "listening" ? myVolume : 0;
  const scale = 1 + Math.min(liveVolume * 1.5, 0.35);
  const glow = 15 + Math.min(liveVolume * 140, 85);

  const caption = agentTranscriptions.at(-1)?.text;
  const selectedAvatar = AVATARS.find((av) => av.id === selectedAvatarId) || AVATARS[0];

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[radial-gradient(circle_at_50%_30%,#13111c_0%,#07070a_80%)] flex flex-col justify-between text-white font-sans z-40 select-none">
      
      {/* 3D VRM Character Background Layer (Covers the whole screen under header/footer) */}
      {selectedAvatar.type === "3d" && (
        <div className="absolute inset-0 w-full h-full z-0">
          <VRMScene
            avatarUrl={selectedAvatar.url || ""}
            state={state}
            volume={agentVolume}
          />
        </div>
      )}

      {/* 1. TOP STATUS BAR (Header) */}
      <header className="relative w-full p-4 sm:p-5 md:p-6 lg:px-8 flex flex-row items-center justify-between border-b border-white/5 bg-black/25 backdrop-blur-md z-30 select-none">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_#6366f1]" />
          <span className="font-semibold tracking-[0.2em] text-[10px] sm:text-xs md:text-sm uppercase text-white/90">
            AURA VOICE ASSISTANT
          </span>
        </div>

        {/* Pulse State Indicator */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              state === "speaking" ? "bg-violet-400" : state === "listening" ? "bg-blue-400" : state === "thinking" ? "bg-amber-400" : "bg-emerald-400"
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              state === "speaking" ? "bg-violet-500" : state === "listening" ? "bg-blue-500" : state === "thinking" ? "bg-amber-500" : "bg-emerald-500"
            }`}></span>
          </span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/80">
            {meta.label}
          </span>
        </div>

        {/* Connection details (hidden on small viewports) */}
        <div className="hidden md:flex items-center gap-4 text-[10px] sm:text-xs text-white/40">
          <span>Engine: GPT-4o</span>
          <span>•</span>
          <span>Latency: Low-latency WebRTC</span>
        </div>
      </header>

      {/* 2. VISUAL ASSISTANT STAGE (Center Area - transparent for 3D, holds Orb for 2D) */}
      <div className="relative flex-grow w-full flex items-center justify-center overflow-hidden z-10 pointer-events-none">
        {selectedAvatar.type === "2d" && (
          // Orbit/Glow Orb mode
          <div className="relative z-10 flex items-center justify-center scale-90 sm:scale-100 md:scale-110 lg:scale-125 xl:scale-135 2xl:scale-150 transition-all duration-500 pointer-events-auto">
            <Orb
              color={meta.color}
              scale={scale}
              glow={glow}
              spin={state === "thinking"}
            />
          </div>
        )}
      </div>


      {/* 3. INTERACTIVE HUD OVERLAYS (Bottom Area) */}
      <footer className="w-full flex flex-col items-center gap-4 sm:gap-5 md:gap-6 p-4 sm:p-6 lg:p-8 z-30 select-none">
        
        {/* Transcription Captions Card (Shown for all modes/avatars) */}
        <div className={`w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl px-5 py-3 sm:px-6 sm:py-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl text-center transition-all duration-500 ${
          caption ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}>
          <div className="text-[9px] sm:text-[10px] md:text-xs text-indigo-400 font-bold tracking-widest uppercase mb-1">
            {state === "speaking" ? "AI Assistant" : "User"}
          </div>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-white/95 font-medium leading-relaxed italic">
            "{caption}"
          </p>
        </div>

        {/* Dashboard Console controls panel */}
        <div className="w-full max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl">
          
          {/* Persona selector (Left) */}
          <div className="flex flex-col items-center md:items-start gap-1.5 w-full md:w-auto">
            <span className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Select Persona</span>
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-black/30 border border-white/5 max-w-full overflow-x-auto scrollbar-none">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => {
                    setSelectedAvatarId(av.id);
                  }}
                  className={`rounded-full px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-semibold tracking-wide transition-all duration-250 cursor-pointer whitespace-nowrap ${
                    selectedAvatarId === av.id
                      ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {av.name}
                </button>
              ))}
            </div>
          </div>


          {/* Connection Call buttons (Right) */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-center">
            {/* Mic Mute Toggle */}
            <TrackToggle
              source={Track.Source.Microphone}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-all cursor-pointer hover:bg-white/10 active:scale-95 data-[lk-enabled=false]:border-red-500/40 data-[lk-enabled=false]:bg-red-950/40 data-[lk-enabled=false]:text-red-400"
            />
            
            {/* End Call / Disconnect */}
            <button
              onClick={onDisconnect}
              className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/20 hover:bg-red-950/40 px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-red-300 transition-all cursor-pointer active:scale-95 shadow-md shadow-red-500/5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Disconnect
            </button>
          </div>
          
        </div>
      </footer>
    </div>
  );
}


