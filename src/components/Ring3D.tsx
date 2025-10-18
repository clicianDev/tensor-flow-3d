import { useRef, useEffect } from 'react';
import { Group, Mesh, MeshStandardMaterial, Plane, Vector3, Euler, Quaternion } from 'three';
import { useGLTF } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';

interface Ring3DProps {
  position: [number, number, number];
  rotationOffset?: [number, number, number];
  scale?: number;
  color?: string;
  enableClipping?: boolean;
}

const Ring3D: React.FC<Ring3DProps> = ({ 
  position, 
  rotationOffset = [0, 0, 0], 
  scale = 0.2,
  enableClipping = true,
}) => {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF('/models/diamond_ring.glb');
  const { camera, gl } = useThree();
  const clippingPlaneRef = useRef<Plane>(new Plane(new Vector3(0, 0, 1), 0));
  const rotationOffsetQuatRef = useRef<Quaternion>(new Quaternion());

  // Cache rotation offset as quaternion so we can compose with camera orientation each frame
  useEffect(() => {
    rotationOffsetQuatRef.current.setFromEuler(new Euler(...rotationOffset));
  }, [rotationOffset]);

  // Enhance materials for better reflections and enable clipping
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        if (mesh.material && (mesh.material as MeshStandardMaterial).isMeshStandardMaterial) {
          const material = mesh.material as MeshStandardMaterial;
          // Enable environment mapping for reflections
          material.envMapIntensity = 1.5;
          
          // Enable clipping planes
          if (enableClipping) {
            material.clippingPlanes = [clippingPlaneRef.current];
            material.clipShadows = true;
          }
          
          material.needsUpdate = true;
        }
      }
    });

    // Enable local clipping on the renderer
    if (enableClipping) {
      gl.localClippingEnabled = true;
    }
  }, [scene, enableClipping, gl]);

  // Update orientation and clipping plane based on camera position
  useFrame(() => {
    if (!groupRef.current) return;

    // Keep the ring facing the camera while respecting manual offsets
    groupRef.current.quaternion.copy(camera.quaternion).multiply(rotationOffsetQuatRef.current);

    if (!enableClipping) return;

    // Get the ring's world position
    const ringWorldPos = new Vector3();
    groupRef.current.getWorldPosition(ringWorldPos);
    
    // Calculate the vector from ring to camera
    const ringToCam = new Vector3().subVectors(camera.position, ringWorldPos).normalize();
    
    // Set clipping plane normal to point towards the camera
    clippingPlaneRef.current.normal.copy(ringToCam);
    
    // Plane passes through ring center; negative keeps front side visible
    clippingPlaneRef.current.constant = -ringWorldPos.dot(ringToCam);
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <primitive object={scene.clone()} />
    </group>
  );
};

export default Ring3D;
