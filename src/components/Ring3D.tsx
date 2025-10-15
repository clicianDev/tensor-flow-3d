import { useRef } from 'react';
import { Mesh } from 'three';
import { useFrame } from '@react-three/fiber';

interface Ring3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
}

const Ring3D: React.FC<Ring3DProps> = ({ 
  position, 
  rotation = [0, 0, 0], 
  scale = 1,
  color = '#FFD700' // Gold color by default
}) => {
  const meshRef = useRef<Mesh>(null);

  // Optional: Add subtle animation
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle rotation animation
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Main ring - torus shape */}
      <mesh ref={meshRef}>
        <torusGeometry args={[0.025, 0.008, 16, 32]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.9}
          roughness={0.1}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Gem/Diamond on top */}
      <mesh position={[0, 0.028, 0]}>
        <sphereGeometry args={[0.012, 16, 16]} />
        <meshStandardMaterial 
          color="#4ECDC4"
          metalness={0.1}
          roughness={0.1}
          emissive="#4ECDC4"
          emissiveIntensity={0.7}
          transparent
          opacity={0.95}
        />
      </mesh>
      
      {/* Inner glow */}
      <mesh>
        <torusGeometry args={[0.025, 0.005, 16, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {/* Outer glow effect */}
      <mesh>
        <torusGeometry args={[0.025, 0.012, 16, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
};

export default Ring3D;
