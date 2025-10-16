import { useRef, useEffect } from 'react';
import { Group, Mesh, MeshStandardMaterial } from 'three';
import { useGLTF } from '@react-three/drei';

interface Ring3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  color?: string;
}

const Ring3D: React.FC<Ring3DProps> = ({ 
  position, 
  rotation = [0, 0, 0], 
  scale = 0.2,
}) => {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF('/models/diamond_ring.glb');

  // Enhance materials for better reflections
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        if (mesh.material && (mesh.material as MeshStandardMaterial).isMeshStandardMaterial) {
          const material = mesh.material as MeshStandardMaterial;
          // Enable environment mapping for reflections
          material.envMapIntensity = 1.5;
          material.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene.clone()} />
    </group>
  );
};

export default Ring3D;
