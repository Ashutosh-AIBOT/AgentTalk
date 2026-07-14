"use client";

import { useState } from "react";
import VoiceStage from "@/components/VoiceStage";
import Orb from "@/components/Orb";

const TOKEN_SERVER_URL = process.env.NEXT_PUBLIC_TOKEN_SERVER_URL ?? "";

export default function Page() {
  const [session, setSession] = useState<{ token: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConversation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${TOKEN_SERVER_URL}/api/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Could not reach the token server");
      const data = await res.json();
      setSession({ token: data.token, url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // If connected, render the fullscreen voice stage directly
  if (session) {
    return (
      <VoiceStage
        token={session.token}
        serverUrl={session.url}
        onDisconnect={() => setSession(null)}
      />
    );
  }

  // Render a premium, futuristic landing page
  return (
    <main className="flex min-h-dvh flex-col items-center justify-between bg-[radial-gradient(circle_at_50%_25%,#18152b_0%,#07070a_75%)] text-white px-6 py-12 text-center select-none font-sans">
      
      {/* Header */}
      <div className="flex flex-col items-center gap-2 mt-4 sm:mt-8">
        <p className="text-[10px] sm:text-xs tracking-[0.25em] text-indigo-400 font-bold uppercase">
          Next-Gen Interface
        </p>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-indigo-200 to-blue-300">
          AURA AI
        </h1>
        <p className="max-w-[460px] text-xs sm:text-sm text-white/50 leading-relaxed px-4 mt-2">
          Experience real-time, zero-latency conversation with highly responsive 3D anime avatars featuring audio-reactive lip-syncing.
        </p>
      </div>

      {/* Central Visual */}
      <div className="my-8 sm:my-12 md:my-16 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-indigo-500/10 blur-[100px] rounded-full scale-150 animate-pulse pointer-events-none" />
        <div className="relative z-10 transition-transform duration-700 hover:scale-105">
          <Orb color="#4f46e5" scale={1} glow={24} />
        </div>
      </div>

      {/* Action Button & Features */}
      <div className="flex flex-col items-center gap-8 w-full max-w-2xl mb-4 sm:mb-8">
        <div className="flex flex-col items-center gap-3">
          <button
            className="group relative rounded-full p-0.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 transition-all duration-350 active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_0_25px_rgba(99,102,241,0.2)] hover:shadow-[0_0_35px_rgba(99,102,241,0.4)]"
            onClick={startConversation}
            disabled={loading}
          >
            <div className="px-8 py-3.5 sm:px-10 sm:py-4 rounded-full bg-[#0d0b16] text-sm sm:text-base font-bold tracking-wide text-white group-hover:bg-transparent transition-all duration-300">
              {loading ? "Establishing Link…" : "Start conversation"}
            </div>
          </button>

          {error && (
            <p className="max-w-[340px] text-xs sm:text-sm text-red-400 font-medium bg-red-950/20 border border-red-500/10 px-4 py-2 rounded-xl mt-2 animate-pulse">
              {error}
            </p>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full px-4 mt-4 text-left">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-sm">🎙️</span>
            <h3 className="text-xs sm:text-sm font-bold text-white/80 mt-1">Real-Time Speech</h3>
            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 leading-relaxed">
              Powered by LiveKit WebRTC & GPT-4o voice-to-voice.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-sm">🎭</span>
            <h3 className="text-xs sm:text-sm font-bold text-white/80 mt-1">3D Anime VRM</h3>
            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 leading-relaxed">
              Multiple avatars with full physics and eye glances.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <span className="text-sm">⚡</span>
            <h3 className="text-xs sm:text-sm font-bold text-white/80 mt-1">Viseme Lip-Sync</h3>
            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 leading-relaxed">
              Audio-reactive facial meshes that match speech volume.
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}

