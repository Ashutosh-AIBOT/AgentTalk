# Build Prompt: 3D Anime VRM Voice Assistant (Multi-Character)

Paste this directly into Claude Code (or use as your own spec) to build end-to-end.

---

## 1. Goal

Upgrade the existing "Tap start, then just talk" voice assistant UI (dark theme, glowing orb, orbiting particle ring) into a full 3D anime-avatar voice assistant. Keep the current orbit-ring idle animation as ambient background behind the 3D character — don't discard it, layer the VRM character in front of it so the premium dark aesthetic stays consistent.

Three VRM character files are available. The user must be able to switch between all three at any time, including mid-conversation, without breaking state.

---

## 2. Tech Stack

- **Frontend**: React + Vite + Tailwind (matches existing stack)
- **3D rendering**: `three` + `@pixiv/three-vrm`
- **Audio**: Web Audio API (`AnalyserNode`) for lip-sync amplitude analysis
- **State**: React state/context for conversation state machine (see §4)
- **Model loader**: `GLTFLoader` with `VRMLoaderPlugin`

```bash
npm install three @pixiv/three-vrm
```

---

## 3. Architecture

```
/src
  /avatar
    VRMScene.jsx        -> Three.js canvas, camera, lighting, render loop
    VRMLoader.js         -> load/dispose VRM files, caching
    LipSync.js            -> AnalyserNode -> blendshape mapping
    IdleBehavior.js        -> blink loop, breathing, random glance, springbone update
    CharacterSwitcher.jsx  -> UI to pick between the 3 characters
  /audio
    useMicInput.js        -> mic permission + stream
    useTTSPlayback.js      -> plays TTS audio, exposes analyser node
  /ui
    OrbitRing.jsx          -> your existing orbit/glow animation, now audio-reactive
    VoiceAssistantScreen.jsx -> composes OrbitRing (background) + VRMScene (foreground)
```

Single Three.js `Scene`, `Camera`, and `Renderer` — never recreate them on character switch, only swap which VRM mesh is attached.

---

## 4. Conversation State Machine

Four states drive all animation and audio behavior. This is the core logic — nothing should animate outside of what the current state dictates.

| State | Trigger | Avatar behavior | Orbit ring behavior |
|---|---|---|---|
| **idle** | App loaded, no interaction | Slow blink (every 3-5s randomized), subtle breathing (chest/shoulder bone micro-scale), occasional random glance (head yaw ±10°, every 6-10s) | Slow rotation, dim glow |
| **listening** | Mic active, user speaking | Head tilts slightly toward "camera," blink rate increases slightly, no mouth movement | Ring brightens, pulses with mic input amplitude |
| **thinking** | Waiting for LLM/TTS response | Subtle head-down tilt, slower blink, idle sway continues | Ring rotates faster, steady pulse (not audio-reactive, just a "processing" loop) |
| **speaking** | TTS audio playing | Mouth blendshape driven by audio amplitude (see §5), occasional eyebrow/expression shift for emphasis, head micro-nods synced to loud syllables | Ring pulses directly with TTS audio amplitude — same analyser feeding both mouth and ring |

Transitions must fade, not snap: interpolate blendshape weights and head rotation over ~150-250ms when switching states, or the avatar will look robotic.

---

## 5. Lip-Sync Implementation

1. Feed TTS audio into an `AnalyserNode` (`fftSize: 256` is enough).
2. Every animation frame, read `getByteFrequencyData` and compute average amplitude in the vocal-frequency band (roughly 300Hz-3kHz).
3. Map amplitude (0-255) to VRM's `aa` expression weight (0-1), with smoothing:

```javascript
const targetWeight = Math.min(amplitude / 128, 1);
currentWeight += (targetWeight - currentWeight) * 0.3; // smoothing factor, tune this
vrm.expressionManager.setValue('aa', currentWeight);
```

4. If your TTS provider returns phoneme/viseme timestamps (ElevenLabs, Azure both can), prefer that over raw amplitude — cycle through `aa`, `ih`, `ou`, `ee`, `oh` per phoneme for far more convincing (believable) mouth shapes than amplitude alone gives you.
5. Always call `vrm.expressionManager.setValue('aa', 0)` and reset all mouth shapes on speaking → idle transition, or the mouth freezes open.

---

## 6. Idle "Alive" Behaviors (run continuously, low intensity)

- **Blink**: randomized interval 3-6s, blink itself takes ~120ms (close in 40ms, hold 20ms, open 60ms). Never perfectly periodic — real blinking isn't.
- **Breathing**: scale chest/spine bone by ±0.5-1% on a slow sine wave (~4s cycle).
- **Head sway**: tiny continuous noise-based rotation (±2°) so the head is never perfectly static, even in idle.
- **Springbone physics**: call `vrm.springBoneManager.update(delta)` every frame — this alone makes hair/clothes react to head movement and sells the "alive" feeling more than almost anything else.
- **Eye tracking (optional, high-impact)**: if you have cursor/face position, use `vrm.lookAt` to have eyes track it subtly. This is a large realism boost for relatively little code.

---

## 7. Character Switching — Requirements

- Preload all 3 VRM files at app start (or lazy-load with a loading spinner on first switch — preload is better for a "premium" feel since there's zero delay).
- On switch: fade out current VRM's opacity over ~200ms, swap `scene` reference, fade in new VRM. Never hard-cut.
- **Memory management is critical**: when disposing the old VRM, call `VRMUtils.deepDispose(vrm.scene)` or manually dispose geometries/materials/textures. Without this, switching characters repeatedly will leak GPU memory and eventually crash the tab.
- If switching happens **mid-speech**: either (a) let the current sentence finish on the old character then switch, or (b) cut TTS audio and switch immediately with a fade. Decide this explicitly — don't leave it undefined, it's the most common bug source.
- Each character should remember its own idle-personality quirks if you want them to feel distinct (e.g. blink rate, glance frequency) — store these as a small config object per VRM file rather than hardcoding.

---

## 8. Edge Cases to Handle Explicitly

- **WebGL unsupported / low-end device**: detect via `!window.WebGLRenderingContext` or a try/catch on renderer creation, fall back to your original 2D orbit-circle UI. Don't let the 3D layer hard-crash the app.
- **VRM file fails to load** (corrupt file, wrong format): catch loader errors, show a toast, keep previous character active instead of blank screen.
- **Mic permission denied**: handle gracefully with a clear UI prompt, don't silently fail into a stuck "listening" state.
- **VRM 0.0 vs 1.0 spec differences**: check `gltf.userData.vrm.meta.metaVersion` — VRM 0.0 models face -Z and need `VRMUtils.rotateVRM0(vrm)`, VRM 1.0 models don't. Your 3 uploaded files may not all be the same spec version — check each individually.
- **Audio overlap**: if user interrupts TTS mid-speech (barge-in), make sure the old AnalyserNode/audio source is fully stopped and disposed before starting the new one, or you'll get ghost lip movement from a dead audio stream.
- **Frame rate on mobile**: cap `renderer.setPixelRatio` to max 2, and consider dropping springbone physics update rate (every 2nd frame) on detected low-end devices to protect battery/performance.
- **Tab backgrounded**: pause the render loop (`document.visibilityState`) when the tab isn't active — don't burn GPU/battery for an invisible canvas.

---

## 9. Visual Polish (what makes it feel "premium" not "demo")

- Keep your existing near-black background gradient — don't replace it, let the VRM sit on top of it.
- Three-point lighting rig: soft key light from front-upper, dim fill from the side, subtle rim light to separate the character from the dark background.
- Camera: slight downward angle (not eye-level flat), fixed focal length, subtle depth-of-field blur on background if performance allows.
- Orbit ring (your existing animation) should sit behind/around the character, audio-reactive as described in §4 — this ties your original design language to the new 3D layer instead of looking bolted-on.
- Transition between characters and states should always ease (cubic-bezier), never linear/instant — this single detail separates "polished" from "prototype."

---

## 10. Build Order (do it in this sequence)

1. Get one VRM loading and rendering statically in the existing dark UI, replacing the orb, with no animation yet.
2. Add idle behaviors (§6) — confirm it "breathes" and looks alive doing nothing.
3. Wire the conversation state machine (§4) with dummy/manual state triggers first (buttons), not real audio yet.
4. Connect real mic input for the listening state.
5. Connect real TTS audio + lip-sync (§5) for the speaking state.
6. Add character switching (§7) with proper disposal.
7. Layer the orbit ring back in as audio-reactive background (§4, §9).
8. Handle edge cases (§8) last, once the happy path is solid.

Each step should be independently testable before moving to the next — don't build all 8 steps at once.
