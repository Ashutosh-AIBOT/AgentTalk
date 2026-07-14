"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, VRM } from "@pixiv/three-vrm";

class CustomClock {
  private startTime: number;
  private oldTime: number;
  constructor() {
    this.startTime = performance.now();
    this.oldTime = performance.now();
  }
  start() {
    this.startTime = performance.now();
    this.oldTime = performance.now();
  }
  getDelta() {
    const newTime = performance.now();
    const diff = (newTime - this.oldTime) / 1000;
    this.oldTime = newTime;
    return diff;
  }
  getElapsedTime() {
    return (performance.now() - this.startTime) / 1000;
  }
}

interface VRMSceneProps {
  avatarUrl: string;
  state: string;
  volume: number;
}

export default function VRMScene({ avatarUrl, state, volume }: VRMSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sceneInitialized, setSceneInitialized] = useState(false);

  // Three.js and animation refs
  const currentVRMRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const clockRef = useRef<CustomClock>(new CustomClock());

  // Animation logic refs
  const blinkProgressRef = useRef<number | null>(null);
  const nextBlinkTimeRef = useRef<number>(0);
  const currentMouthYRef = useRef<number>(0);

  // Sync state to ref to avoid recreating Three.js scene on every state change
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Dynamic glance/lookAt target tracking
  const lookAtTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.4, 5));
  const nextLookAtTimeRef = useRef<number>(0);

  // Initialize Three.js Scene (Runs once)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Create WebGLRenderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create PerspectiveCamera
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 20.0);
    // Position camera further away (afar) and lower target to show more of the body
    const initialAspect = width / height;
    if (initialAspect < 1.0) {
      // Mobile portrait view - further away to show upper body/thighs
      camera.fov = 36;
      camera.position.set(0.0, 1.1, 3.1);
    } else {
      // Widescreen desktop view - further away to show upper body/hips
      camera.fov = 28;
      camera.position.set(0.0, 1.2, 2.6);
    }
    camera.lookAt(new THREE.Vector3(0.0, 1.15, 0.0));
    cameraRef.current = camera;

    // Soft Ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    // Key Light (Bright directional light, front-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1.5, 2.5, 2.0);
    scene.add(keyLight);

    // Fill Light (Softer directional light, front-left)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);
    fillLight.position.set(-1.5, 1.5, 1.5);
    scene.add(fillLight);

    // Rim Light (Brilliant white outline light from behind character)
    const rimLight = new THREE.PointLight(0xffffff, 2.5, 5);
    rimLight.position.set(0.0, 1.6, -1.8);
    scene.add(rimLight);

    // Handle Window Resize / Orientation Change
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      const aspect = w / h;
      cameraRef.current.aspect = aspect;

      // Adjust camera to frame more body area
      if (aspect < 1.0) {
        cameraRef.current.fov = 36;
        cameraRef.current.position.set(0.0, 1.1, 3.1);
      } else {
        cameraRef.current.fov = 28;
        cameraRef.current.position.set(0.0, 1.2, 2.6);
      }
      cameraRef.current.lookAt(new THREE.Vector3(0.0, 1.15, 0.0));
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Start rendering clock
    clockRef.current.start();

    // Render loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);

      // Do not spend rendering resources if tab is backgrounded
      if (document.visibilityState !== "visible") return;

      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      // Custom VRM animation updates
      if (currentVRMRef.current) {
        
        // 1. Natural A-Pose Resting posture (Removes stiff T-pose arms)
        const leftUpperArm = currentVRMRef.current.humanoid?.getNormalizedBoneNode("leftUpperArm");
        if (leftUpperArm) {
          leftUpperArm.rotation.x = 0.0;
          leftUpperArm.rotation.y = 0.0;
          leftUpperArm.rotation.z = 1.25; // Rotate left arm downwards
        }
        const rightUpperArm = currentVRMRef.current.humanoid?.getNormalizedBoneNode("rightUpperArm");
        if (rightUpperArm) {
          rightUpperArm.rotation.x = 0.0;
          rightUpperArm.rotation.y = 0.0;
          rightUpperArm.rotation.z = -1.25; // Rotate right arm downwards
        }
        const leftLowerArm = currentVRMRef.current.humanoid?.getNormalizedBoneNode("leftLowerArm");
        if (leftLowerArm) {
          leftLowerArm.rotation.y = 0.0;
        }
        const rightLowerArm = currentVRMRef.current.humanoid?.getNormalizedBoneNode("rightLowerArm");
        if (rightLowerArm) {
          rightLowerArm.rotation.y = 0.0;
        }

        // 2. Breathing Behavior (Chest expansion + spine micro sway)
        const spine = currentVRMRef.current.humanoid?.getNormalizedBoneNode("spine");
        if (spine) {
          const breathingScale = 1.0 + Math.sin(elapsed * 1.5) * 0.005;
          spine.scale.set(1.0, breathingScale, 1.0);
        }
        const chest = currentVRMRef.current.humanoid?.getNormalizedBoneNode("chest");
        if (chest) {
          // Subtle rotate expansion
          const breathingAngle = Math.sin(elapsed * 1.5) * 0.004;
          chest.rotation.x = breathingAngle;
        }

        // 2. Head movements & Conversational tilts
        const head = currentVRMRef.current.humanoid?.getNormalizedBoneNode("head");
        if (head) {
          // Slow passive head sway
          let targetRotX = Math.sin(elapsed * 0.4) * 0.015;
          let targetRotY = Math.cos(elapsed * 0.35) * 0.015;
          let targetRotZ = 0;

          if (stateRef.current === "listening") {
            // Forward attentive look
            targetRotX = 0.04;
            targetRotY = Math.sin(elapsed * 0.4) * 0.02;
          } else if (stateRef.current === "thinking") {
            // Tilt head down/slightly sideways to ponder
            targetRotX = 0.12;
            targetRotY = 0.02 * Math.sin(elapsed * 0.8);
          } else if (stateRef.current === "speaking") {
            // Add conversational micro-nods synced with voice amplitude
            const nod = Math.sin(elapsed * 11) * currentMouthYRef.current * 0.035;
            targetRotX += nod;
            targetRotY += Math.cos(elapsed * 2.5) * currentMouthYRef.current * 0.02;
          }

          // Smoothly interpolate rotation to prevent sudden robotic jerks
          head.rotation.x += (targetRotX - head.rotation.x) * 0.08;
          head.rotation.y += (targetRotY - head.rotation.y) * 0.08;
          head.rotation.z += (targetRotZ - head.rotation.z) * 0.08;
        }

        // 3. Eye Blinking (Non-periodic)
        if (elapsed > nextBlinkTimeRef.current) {
          blinkProgressRef.current = 0;
          nextBlinkTimeRef.current = elapsed + 3.0 + Math.random() * 5.0;
        }

        if (blinkProgressRef.current !== null) {
          blinkProgressRef.current += delta;
          const blinkDuration = 0.16; // 160ms total duration
          const progress = blinkProgressRef.current / blinkDuration;

          if (progress >= 1.0) {
            blinkProgressRef.current = null;
            currentVRMRef.current.expressionManager?.setValue("blink", 0);
          } else {
            let weight = 0;
            if (progress < 0.35) {
              weight = progress / 0.35; // Closing eyelids
            } else {
              weight = 1.0 - (progress - 0.35) / 0.65; // Re-opening eyelids
            }
            currentVRMRef.current.expressionManager?.setValue("blink", weight);
          }
        }

        // 4. Natural Eye Glancing / LookAt Target lerp
        if (elapsed > nextLookAtTimeRef.current) {
          // Glances slightly off center around the camera plane
          lookAtTargetPosRef.current.set(
            (Math.random() - 0.5) * 1.6,
            1.35 + (Math.random() - 0.5) * 0.3,
            2.5
          );
          nextLookAtTimeRef.current = elapsed + 4.0 + Math.random() * 6.0;
        }
        if (currentVRMRef.current.lookAt?.target) {
          currentVRMRef.current.lookAt.target.position.lerp(lookAtTargetPosRef.current, 0.06);
        }

        // 5. Lip-Sync mouth movement (aa, oh, ee viseme blend)
        const expressionManager = currentVRMRef.current.expressionManager;
        if (expressionManager) {
          if (stateRef.current === "speaking") {
            // Map real-time volume to mouth open value [0, 1]
            // useTrackVolume returns value between 0 and 1, we scale it for natural movement
            const targetMouthY = Math.min(volumeRef.current * 4.0, 1.0);
            // Smooth viseme scale
            currentMouthYRef.current += (targetMouthY - currentMouthYRef.current) * 0.3;

            // Blend multiple shapes for a more organic mouth visual
            expressionManager.setValue("aa", currentMouthYRef.current * 0.72);
            expressionManager.setValue("oh", currentMouthYRef.current * 0.22);
            expressionManager.setValue("ee", currentMouthYRef.current * 0.12);
          } else {
            // Smoothly close mouth
            if (currentMouthYRef.current > 0.01) {
              currentMouthYRef.current += (0 - currentMouthYRef.current) * 0.28;
              expressionManager.setValue("aa", currentMouthYRef.current * 0.72);
              expressionManager.setValue("oh", currentMouthYRef.current * 0.22);
              expressionManager.setValue("ee", currentMouthYRef.current * 0.12);
            } else {
              currentMouthYRef.current = 0.0;
              expressionManager.setValue("aa", 0.0);
              expressionManager.setValue("oh", 0.0);
              expressionManager.setValue("ee", 0.0);
            }
          }
        }

        // Update springbone dynamics
        currentVRMRef.current.update(delta);
      }

      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
    setSceneInitialized(true);

    // Clean up
    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);



  // Load and Swap VRM Model
  useEffect(() => {
    if (!sceneRef.current || !sceneInitialized) return;

    let active = true;
    setLoading(true);
    setError(null);

    // Clean up previous VRM instance
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
        if (!active) {
          const vrm = gltf.userData.vrm;
          if (vrm) VRMUtils.deepDispose(vrm.scene);
          return;
        }

        const vrm = gltf.userData.vrm;
        if (!vrm) {
          setError("Failed to extract VRM data from model.");
          setLoading(false);
          return;
        }

        // Adjust direction if VRM 0.0 spec model
        if (vrm.meta?.metaVersion === "0") {
          VRMUtils.rotateVRM0(vrm);
        }

        currentVRMRef.current = vrm;
        sceneRef.current?.add(vrm.scene);

        // Setup eye lookAt target
        if (vrm.lookAt) {
          vrm.lookAt.target = new THREE.Object3D();
          vrm.lookAt.target.position.set(0, 1.4, 5.0);
        }

        setLoading(false);
      },
      undefined,
      (err) => {
        if (!active) return;
        console.error("VRM loader error:", err);
        setError("Error loading VRM avatar.");
        setLoading(false);
      }
    );

    return () => {
      active = false;
      // Clean up previous VRM instance immediately on swap/unmount to prevent overlapping!
      if (currentVRMRef.current && sceneRef.current) {
        sceneRef.current.remove(currentVRMRef.current.scene);
        VRMUtils.deepDispose(currentVRMRef.current.scene);
        currentVRMRef.current = null;
      }
    };
  }, [avatarUrl, sceneInitialized]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-50 pointer-events-auto">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500/20 border-t-violet-500" />
            <span className="text-xs text-white/60 tracking-wider">Summoning Avatar...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-400 z-50 pointer-events-auto">
          <div className="bg-red-950/40 border border-red-500/20 px-6 py-3 rounded-2xl backdrop-blur-md">
            {error}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="h-full w-full block pointer-events-auto" />
    </div>
  );
}

