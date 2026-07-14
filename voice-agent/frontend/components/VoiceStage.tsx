"use client";

import { LiveKitRoom, RoomAudioRenderer, TrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import VoiceOrb from "./VoiceOrb";

interface VoiceStageProps {
  token: string;
  serverUrl: string;
  onDisconnect: () => void;
}

export default function VoiceStage({ token, serverUrl, onDisconnect }: VoiceStageProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={false}
      onDisconnected={onDisconnect}
      className="contents"
    >
      <VoiceOrb />
      <RoomAudioRenderer />
      <div className="flex items-center gap-3">
        <TrackToggle
          source={Track.Source.Microphone}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors data-[lk-enabled=false]:border-red-400/40 data-[lk-enabled=false]:bg-red-950/60 data-[lk-enabled=false]:text-red-400"
        />
        <button
          className="rounded-full border border-white/10 bg-white/5 px-8 py-3 text-sm font-semibold text-white transition-transform active:scale-95"
          onClick={onDisconnect}
        >
          End conversation
        </button>
      </div>
    </LiveKitRoom>
  );
}
