"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, VRM } from "@pixiv/three-vrm";
import type { TrackReference } from "@livekit/components-react";

interface VRMSceneProps {
  avatarUrl: string;
  state: string;
  audioTrack?: TrackReference;
}

export default function VRMScene({ avatarUrl, state, audioTrack }: VRMSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Three.js and animation refs
  const currentVRMRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Animation logic refs
  const blinkProgressRef = useRef<number | null>(null);
  const nextBlinkTimeRef = useRef<number>(0);
  const currentMouthYRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize Three.js Scene (Runs once)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 320;
    const height = containerRef.current.clientHeight || 320;

    // Create Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    // Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create Camera
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 20.0);
    // Position camera to frame chest and head (avatar pivot is at ground y=0)
    camera.position.set(0.0, 1.35, 1.85);
    cameraRef.current = camera;

    // Add Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Key Light (Directional, main light from front-top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(1.5, 2.5, 2.0);
    scene.add(keyLight);

    // Fill Light (Directional, softer light from front-left)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-1.5, 1.5, 1.5);
    scene.add(fillLight);

    // Rim Light (Point light behind avatar to outline edges)
    const rimLight = new THREE.PointLight(0xffffff, 2.0, 6);
    rimLight.position.set(0.0, 1.6, -1.5);
    scene.add(rimLight);

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Start Clock
    clockRef.current.start();

    // Render loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      // Custom VRM animation updates
      if (currentVRMRef.current) {
        // 1. Spine Breathing
        const spine = currentVRMRef.current.humanoid?.getRawBoneNode("spine");
        if (spine) {
          const breathingScale = 1.0 + Math.sin(elapsed * 1.6) * 0.004;
          spine.scale.set(1.0, breathingScale, 1.0);
        }

        // 2. Random Head Sway & State tilts
        const head = currentVRMRef.current.humanoid?.getRawBoneNode("head");
        if (head) {
          let targetRotX = Math.sin(elapsed * 0.5) * 0.015;
          let targetRotY = Math.cos(elapsed * 0.4) * 0.015;
          let targetRotZ = 0;

          if (state === "listening") {
            targetRotX = 0.04; // look forward/attentive
            targetRotY = Math.sin(elapsed * 0.5) * 0.02; // slight attentive sway
          } else if (state === "thinking") {
            targetRotX = 0.12; // tilt head down slightly
            targetRotY = 0.0;
          }

          head.rotation.x += (targetRotX - head.rotation.x) * 0.1;
          head.rotation.y += (targetRotY - head.rotation.y) * 0.1;
          head.rotation.z += (targetRotZ - head.rotation.z) * 0.1;
        }

        // 3. Eye Blinking (Non-periodic)
        if (elapsed > nextBlinkTimeRef.current) {
          blinkProgressRef.current = 0;
          nextBlinkTimeRef.current = elapsed + 3 + Math.random() * 4;
        }

        if (blinkProgressRef.current !== null) {
          blinkProgressRef.current += delta;
          const blinkDuration = 0.16; // 160ms total
          const progress = blinkProgressRef.current / blinkDuration;

          if (progress >= 1) {
            blinkProgressRef.current = null;
            currentVRMRef.current.expressionManager?.setValue("blink", 0);
          } else {
            let weight = 0;
            if (progress < 0.35) {
              weight = progress / 0.35; // Closing
            } else {
              weight = 1.0 - (progress - 0.35) / 0.65; // Opening
            }
            currentVRMRef.current.expressionManager?.setValue("blink", weight);
          }
        }

        // 4. Lip-sync (Aa mouth shape)
        if (state === "speaking" && analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          const startBin = 2;
          const endBin = 32;
          for (let i = startBin; i < endBin; i++) {
            sum += dataArray[i];
          }
          const avg = sum / (endBin - startBin);

          // Map raw amplitude to mouth open value [0, 1]
          const targetMouthY = Math.min(avg / 65.0, 1.0);
          currentMouthYRef.current += (targetMouthY - currentMouthYRef.current) * 0.28;
          currentVRMRef.current.expressionManager?.setValue("aa", currentMouthYRef.current);
        } else {
          // Interpolate mouth closed
          if (currentMouthYRef.current > 0.01) {
            currentMouthYRef.current += (0 - currentMouthYRef.current) * 0.3;
            currentVRMRef.current.expressionManager?.setValue("aa", currentMouthYRef.current);
          } else {
            currentMouthYRef.current = 0;
            currentVRMRef.current.expressionManager?.setValue("aa", 0);
          }
        }

        // Update spring bone physics
        currentVRMRef.current.update(delta);
      }

      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Clean up
    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      
      // Dispose Renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [state]);

  // Audio Analyser Setup
  useEffect(() => {
    if (state !== "speaking" || !audioTrack?.publication?.track?.mediaStreamTrack) {
      analyserRef.current = null;
      return;
    }

    let audioContext: AudioContext | null = null;
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let analyserNode: AnalyserNode | null = null;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const mediaStream = new MediaStream([audioTrack.publication.track.mediaStreamTrack]);
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      sourceNode.connect(analyserNode);
      analyserRef.current = analyserNode;
    } catch (err) {
      console.error("Failed to initialize audio analyser:", err);
    }

    return () => {
      if (sourceNode) sourceNode.disconnect();
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
      analyserRef.current = null;
    };
  }, [state, audioTrack]);

  // Load and swap VRM Model
  useEffect(() => {
    if (!sceneRef.current) return;

    setLoading(true);
    setError(null);

    // Clean up previous VRM to prevent memory leaks
    if (currentVRMRef.current) {
      sceneRef.current.remove(currentVRMRef.current.scene);
      VRMUtils.deepDispose(currentVRMRef.current.scene);
      currentVRMRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      avatarUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm;
        if (!vrm) {
          setError("Failed to extract VRM data from model.");
          setLoading(false);
          return;
        }

        // Adjust facing direction if VRM 0.0 spec model
        if (vrm.meta?.metaVersion === "0") {
          VRMUtils.rotateVRM0(vrm);
        }

        currentVRMRef.current = vrm;
        sceneRef.current?.add(vrm.scene);

        // Setup lookAt direction (look forward)
        if (vrm.lookAt) {
          vrm.lookAt.target = new THREE.Object3D();
          vrm.lookAt.target.position.set(0, 1.4, 5.0);
        }

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("VRM loader error:", err);
        setError("Error loading VRM avatar.");
        setLoading(false);
      }
    );
  }, [avatarUrl]);

  return (
    <div ref={containerRef} className="relative h-80 w-80 max-w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-red-400">
          {error}
        </div>
      )}
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
