import { useEffect, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

function Phone() {
  return (
    <group position={[0, -0.4, 0]} rotation={[0.15, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.4, 2.6, 0.15]} />
        <meshStandardMaterial color="#111827" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.05, 0.077]}>
        <planeGeometry args={[1.24, 2.3]} />
        <meshStandardMaterial
          color="#0b1220"
          emissive="#1e40af"
          emissiveIntensity={0.35}
        />
      </mesh>
    </group>
  );
}

function ApproachingCard() {
  const groupRef = useRef<THREE.Group>(null);
  const wavesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      // Card floats down towards phone, then back up (loop)
      const cycle = (Math.sin(t * 0.9) + 1) / 2; // 0..1
      groupRef.current.position.y = 1.6 - cycle * 1.2;
      groupRef.current.position.z = 0.4 + cycle * 0.3;
      groupRef.current.rotation.x = -0.3 + cycle * 0.2;
      groupRef.current.rotation.z = Math.sin(t * 0.6) * 0.08;
    }
    if (wavesRef.current) {
      wavesRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const phase = (t * 1.5 + i * 0.5) % 1.5;
        mesh.scale.setScalar(0.3 + phase * 0.9);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - phase / 1.5) * 0.7;
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.6, 0.4]} rotation={[-0.3, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.0, 0.05]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[-0.5, 0.2, 0.03]}>
        <boxGeometry args={[0.3, 0.22, 0.015]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={0.6}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0, -0.35, 0.03]}>
        <planeGeometry args={[1.6, 0.15]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.6} />
      </mesh>
      {/* Emanating waves between card and phone */}
      <group ref={wavesRef} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <ringGeometry args={[0.35, 0.42, 48]} />
            <meshBasicMaterial
              color="#60a5fa"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function ScanScene3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-64 w-64" />;

  return (
    <div className="h-72 w-72 sm:h-80 sm:w-80">
      <Canvas
        camera={{ position: [0, 0.3, 4.5], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[2, 4, 3]} intensity={1.1} />
        <pointLight position={[0, 1, 1.5]} intensity={1.2} color="#3b82f6" />
        <Suspense fallback={null}>
          <Phone />
          <ApproachingCard />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
