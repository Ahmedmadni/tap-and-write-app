import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function NfcCard() {
  const cardRef = useRef<THREE.Group>(null);
  const chipRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (cardRef.current) {
      cardRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.4;
      cardRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.35) * 0.15;
    }
    if (chipRef.current) {
      const mat = chipRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  // NFC wave rings
  const rings = [0.35, 0.55, 0.75];

  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.6}>
      <group ref={cardRef}>
        {/* Card body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 1.65, 0.08]} />
          <meshStandardMaterial
            color="#0b1220"
            metalness={0.85}
            roughness={0.25}
          />
        </mesh>
        {/* Accent stripe */}
        <mesh position={[0, -0.55, 0.041]}>
          <planeGeometry args={[2.6, 0.28]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.5}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        {/* NFC chip */}
        <mesh ref={chipRef} position={[-0.85, 0.35, 0.045]}>
          <boxGeometry args={[0.42, 0.32, 0.02]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={0.4}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        {/* NFC waves */}
        {rings.map((r, i) => (
          <mesh key={i} position={[0.55, 0.2, 0.05]} rotation={[0, 0, 0]}>
            <torusGeometry args={[r, 0.015, 16, 64, Math.PI * 0.8]} />
            <meshStandardMaterial
              color="#60a5fa"
              emissive="#3b82f6"
              emissiveIntensity={0.8 - i * 0.2}
              transparent
              opacity={0.9 - i * 0.2}
            />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

export function NfcHero3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-48 w-full rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5" />;
  }

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <Canvas
        camera={{ position: [0, 0.6, 4.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 3]} intensity={1.2} castShadow />
        <pointLight position={[-3, -2, -2]} intensity={0.6} color="#3b82f6" />
        <Suspense fallback={null}>
          <NfcCard />
          <ContactShadows
            position={[0, -1.1, 0]}
            opacity={0.4}
            scale={6}
            blur={2.4}
            far={2}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
