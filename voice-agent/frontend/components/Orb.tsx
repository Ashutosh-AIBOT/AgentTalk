"use client";

interface OrbProps {
  color: string;
  scale?: number;
  glow?: number;
  spin?: boolean;
  label?: string;
}

// Layout, sizing, and static styling are all Tailwind utility classes.
// Only genuinely dynamic values (live color/scale/glow, computed at runtime
// from agent state and audio volume) use inline style - Tailwind classes are
// compiled ahead of time, so they can't express "whatever the mic volume is
// this frame."
export default function Orb({ color, scale = 1, glow = 16, spin = false, label }: OrbProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <div className="animate-ring-spin absolute inset-0 rounded-full border border-white/10">
          <span
            className="absolute -top-px left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px 2px ${color}` }}
          />
        </div>
        <div
          className={`h-32 w-32 rounded-full transition-[transform,box-shadow] duration-100 ease-out ${
            spin ? "animate-orb-think" : "animate-orb-pulse"
          }`}
          style={{
            transform: `scale(${scale})`,
            background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color}55 60%, transparent 78%)`,
            boxShadow: `0 0 ${glow}px ${glow / 2.5}px ${color}55`,
          }}
        />
      </div>
      {label && (
        <p className="min-h-[1.2em] text-sm text-white/50">
          <span className="font-medium text-white/90">{label}</span>
        </p>
      )}
    </div>
  );
}
