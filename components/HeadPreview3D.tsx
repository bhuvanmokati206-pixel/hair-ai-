"use client";

// Interactive 3D mannequin head for the customize studio. A faceless salon bust
// (so it never looks uncanny) with a hair cap that takes the selected colour and
// volume. Drag to rotate; it reacts with a little pop when you pick a style or
// tap it. This is a decorative/interactive preview — it does not render the
// actual generated haircut (see the generated result area for that).

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { Group, Mesh } from "three";

type Props = {
  hairColor: string;   // hex
  volume: number;      // 0..1 → hair cap scale
  lit: boolean;        // lighting toggle
  /** Changes whenever a style is selected — triggers a pop animation. */
  reactKey: number;
};

function Bust({ hairColor, volume, reactKey }: Omit<Props, "lit">) {
  const group = useRef<Group>(null);
  const hair = useRef<Mesh>(null);
  // Pop progress lives in a ref, not state — it animates every frame and must
  // not trigger React re-renders.
  const pop = useRef(0);

  // Fire a pop whenever the selection (reactKey) changes.
  useEffect(() => { pop.current = 1; }, [reactKey]);

  useFrame((_, delta) => {
    if (pop.current > 0) {
      pop.current = Math.max(0, pop.current - delta * 3);
      if (group.current) {
        const s = 1 + Math.sin(pop.current * Math.PI) * 0.08; // ease pop
        group.current.scale.setScalar(s);
      }
    }
  });

  const capScale = 1.02 + volume * 0.28;

  return (
    <group ref={group} onClick={() => { pop.current = 1; }}>
      {/* neck */}
      <mesh position={[0, -1.15, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.9, 32]} />
        <meshStandardMaterial color="#d9c3b0" roughness={0.9} />
      </mesh>
      {/* head — slightly egg-shaped, faceless */}
      <mesh position={[0, 0, 0]} scale={[1, 1.18, 1.05]}>
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshStandardMaterial color="#e7d3c2" roughness={0.85} />
      </mesh>
      {/* hair cap — colour + volume from the selection */}
      <mesh ref={hair} position={[0, 0.28, -0.05]} scale={[capScale, capScale * 1.05, capScale]}>
        <sphereGeometry args={[0.86, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={hairColor} roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  );
}

export default function HeadPreview3D({ hairColor, volume, lit, reactKey }: Props) {
  // R3F's first size measurement doesn't fire when the Canvas mounts inside a
  // dynamic()/ssr:false wrapper — the canvas stays at the default 300×150 until
  // something triggers a re-measure. Nudge it once after mount.
  useEffect(() => {
    const id = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(id);
  }, []);

  return (
    <Canvas camera={{ position: [0, 0.2, 4.2], fov: 40 }} dpr={[1, 2]} style={{ width: "100%", height: "100%", touchAction: "none" }}>
      <ambientLight intensity={lit ? 0.9 : 0.4} />
      <directionalLight position={[3, 4, 5]} intensity={lit ? 1.3 : 0.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} color="#8FA79A" />
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.5}>
        <Bust hairColor={hairColor} volume={volume} reactKey={reactKey} />
      </Float>
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={3}
        maxDistance={6}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
      />
    </Canvas>
  );
}
