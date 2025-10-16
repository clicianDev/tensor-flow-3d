import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useControls } from 'leva';
import Ring3D from './Ring3D';

interface RingPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
  handedness: 'Left' | 'Right';
}

interface RingScene3DProps {
  ringPositions: RingPosition[];
  width: number;
  height: number;
}

const RingScene3D: React.FC<RingScene3DProps> = React.memo(({ ringPositions, width, height }) => {
  // Leva controls for fine-tuning ring position and rotation
  const controls = useControls('Ring Adjustments', {
    positionOffsetX: { value: 0.0, min: -0.5, max: 0.5, step: 0.01, label: 'Offset X' },
    positionOffsetY: { value: 0.0, min: -0.5, max: 0.5, step: 0.01, label: 'Offset Y' },
    positionOffsetZ: { value: 0.0, min: -0.5, max: 0.5, step: 0.01, label: 'Offset Z' },
    positionScale: { value: 1.0, min: 0.5, max: 2.0, step: 0.01, label: 'Position Scale' },
    rotationOffsetX: { value: -1.3, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Rotation X' },
    rotationOffsetY: { value: -1.2, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Rotation Y' },
    rotationOffsetZ: { value: -2.9, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Rotation Z' },
    scale: { value: 0.005, min: 0.001, max: 0.02, step: 0.0001, label: 'Ring Scale' },
  });

  return (
    <Canvas
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '8px'
      }}
      camera={{ 
        position: [0, 0, 1],
        near: 0.1,
        far: 1000,
        fov: 75  // Wider FOV for better alignment
      }}
      orthographic={false}
      frameloop="always" // Continuous rendering for instant updates
    >
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={1} />
      
      {/* Main directional light (sun-like) */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.5} 
        castShadow
      />
      
      {/* Fill light from the opposite side */}
      <directionalLight 
        position={[-3, -3, 3]} 
        intensity={0.8} 
        color="#b8d4ff"
      />
      
      {/* Top light for highlights */}
      <pointLight 
        position={[0, 5, 2]} 
        intensity={1.0}
        color="#ffffff"
      />
      
      {/* Spot light for diamond sparkle effect */}
      <spotLight
        position={[2, 3, 3]}
        angle={0.5}
        penumbra={0.5}
        intensity={2.0}
        color="#ffffff"
        castShadow
      />
      
      {/* Rim light for edge definition */}
      <pointLight 
        position={[0, 0, -5]} 
        intensity={0.8}
        color="#ffd4a3"
      />
      
      {/* Environment for realistic reflections */}
      <Environment
        preset="studio"
        background={false}
        blur={0.5}
      />
      
      {ringPositions.map((pos, index) => {
        // Perfect pixel-to-3D mapping
        // Account for camera FOV and aspect ratio
        const aspect = width / height;
        const fov = 75; // degrees
        const cameraZ = 1; // camera distance
        
        // Calculate visible height at camera distance
        const vFov = (fov * Math.PI) / 180; // vertical FOV in radians
        const visibleHeight = 2 * Math.tan(vFov / 2) * cameraZ;
        const visibleWidth = visibleHeight * aspect;
        
        // Normalize pixel coordinates to 0-1
        const normX = pos.x / width;
        const normY = pos.y / height;
        
        // Convert to 3D world coordinates
        // Center at (0.5, 0.5), map to world space
        const worldX = (normX - 0.5) * visibleWidth;
        const worldY = -(normY - 0.5) * visibleHeight; // Negative because Y is inverted
        
        // Apply mirroring for video
        const x3D = -worldX * controls.positionScale + controls.positionOffsetX;
        const y3D = worldY * controls.positionScale + controls.positionOffsetY;
        const z3D = (pos.z || 0) * -0.01 + controls.positionOffsetZ;
        
        return (
          <Ring3D
            key={`${pos.handedness}-${index}`}
            position={[x3D, y3D, z3D]}
            rotation={[
              controls.rotationOffsetX, 
              controls.rotationOffsetY, 
              controls.rotationOffsetZ
            ]}
            scale={controls.scale}
            color={pos.handedness === 'Left' ? '#FFD700' : '#FFA500'}
          />
        );
      })}
    </Canvas>
  );
});

RingScene3D.displayName = 'RingScene3D';

export default RingScene3D;
