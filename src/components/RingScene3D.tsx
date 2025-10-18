import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useControls } from 'leva';
import Ring3D from './Ring3D';
import * as THREE from "three";


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

const BASE_CAMERA_DISTANCE = 1;
const CAMERA_DISTANCE = 100; // Must stay in sync with Canvas camera position

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
    enableClipping: { value: true, label: 'Enable Clipping Plane' },
  });

  const cameraSettings = React.useMemo(() => ({ position: [0, 0, CAMERA_DISTANCE] as [number, number, number], fov: 75 }), []);

  return (
    <Canvas
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '8px'
      }}
      dpr={[1, 2]}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        camera={cameraSettings}
      frameloop="always" // Continuous rendering for instant updates
    >
      <ambientLight intensity={1} />
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.5} 
        castShadow
      />
      <directionalLight 
        position={[-3, -3, 3]} 
        intensity={0.8} 
        color="#b8d4ff"
      />
      <pointLight 
        position={[0, 5, 2]} 
        intensity={1.0}
        color="#ffffff"
      />
      <spotLight
        position={[2, 3, 3]}
        angle={0.5}
        penumbra={0.5}
        intensity={2.0}
        color="#ffffff"
        castShadow
      />
      <Environment preset="city" resolution={1080} />

      
      {ringPositions.slice(0, 1).map((pos, index) => {
        // Only render ring on the first detected hand
        // Perfect pixel-to-3D mapping
        // Account for camera FOV and aspect ratio
        const aspect = width / height;
        const fov = 75; // degrees
  const cameraZ = CAMERA_DISTANCE;
        
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
        const x3D = -worldX * controls.positionScale + controls.positionOffsetX * cameraZ;
        const y3D = worldY * controls.positionScale + controls.positionOffsetY * cameraZ;
        const z3D = ((pos.z || 0) * -0.01 + controls.positionOffsetZ) * cameraZ;

        const adjustedScale = controls.scale * (cameraZ / BASE_CAMERA_DISTANCE);
        
        // Rotation offsets tweak the ring orientation relative to the viewer
        return (
          <Ring3D
            key={`${pos.handedness}-${index}`}
            position={[x3D, y3D, z3D]}
            rotationOffset={[
              controls.rotationOffsetX,
              controls.rotationOffsetY,
              controls.rotationOffsetZ
            ]}
            scale={adjustedScale}
            enableClipping={controls.enableClipping}
          />
        );
      })}
    </Canvas>
  );
});

RingScene3D.displayName = 'RingScene3D';

export default RingScene3D;
