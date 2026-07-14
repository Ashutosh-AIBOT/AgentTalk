"use client";

import { useState } from "react";
import VoiceStage from "@/components/VoiceStage";
import Orb from "@/components/Orb";

const TOKEN_SERVER_URL = process.env.NEXT_PUBLIC_TOKEN_SERVER_URL ?? "http://localhost:8000";

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

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-[radial-gradient(circle_at_50%_20%,#17151f_0%,#0a0a0d_60%)] px-8 text-center">
      <p className="text-xs tracking-[0.18em] text-white/40 uppercase">Voice Assistant</p>
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {session ? "You're connected." : "Tap start, then just talk."}
      </h1>

      {session ? (
        <VoiceStage
          token={session.token}
          serverUrl={session.url}
          onDisconnect={() => setSession(null)}
        />
      ) : (
        <>
          <Orb color="#3a3844" />
          <button
            className="rounded-full bg-gradient-to-br from-violet-500 to-blue-500 px-9 py-3.5 text-sm font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
            onClick={startConversation}
            disabled={loading}
          >
            {loading ? "Connecting…" : "Start conversation"}
          </button>
          {error && <p className="max-w-[340px] text-sm text-red-400">{error}</p>}
        </>
      )}
    </main>
  );
}
