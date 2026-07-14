"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
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
      <VoiceOrb onDisconnect={onDisconnect} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

